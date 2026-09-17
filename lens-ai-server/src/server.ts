import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import type {
    AskRequest,
    ConverseRequest,
    InterpretRequest,
} from "../../browser-extension/lib/lens-ai/contract.ts";
import { createGeminiAdapter, FREE_TIER_MODELS } from "./adapters/gemini.ts";
import { createMockAdapter } from "./adapters/mock.ts";
import { AdapterError, type LensAiAdapter } from "./adapters/types.ts";
import { log } from "./log.ts";

/**
 * The smallest server that lets the extension use a model without holding a
 * key: two POST routes and a health check, bound to localhost.
 *
 * The browser extension is public code running on the reader's machine — a
 * key shipped inside it is a key anyone can read. So the key lives in this
 * process's environment, and the extension only ever sends Lens's vocabulary,
 * the reader's words and the facts Lens already showed them.
 *
 * Environment:
 *   GEMINI_API_KEY           a free key from https://aistudio.google.com/apikey
 *   LENS_AI_PROVIDER         "gemini" | "mock"  (default: gemini if a key is set, else mock)
 *   LENS_AI_MODELS           comma-separated, tried in order; default every free-tier flash model
 *   LENS_AI_MODEL            shorthand for a single model (no fallbacks)
 *   LENS_AI_PORT / HOST      default 8787 on 127.0.0.1
 *   LENS_AI_ALLOWED_ORIGINS  comma-separated exact origins; default any chrome-/moz-extension origin
 *   LENS_AI_DEBUG=1          log raw model output
 */

const PORT = Number(process.env.LENS_AI_PORT ?? 8787);
const HOST = process.env.LENS_AI_HOST ?? "127.0.0.1";
const MAX_BODY_BYTES = 1_000_000;

const allowedOrigins = (process.env.LENS_AI_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

function originAllowed(origin: string | undefined): boolean {
    if (!origin) return true; // curl, health checks: no browser, no CORS question
    if (allowedOrigins.length) return allowedOrigins.includes(origin);

    return /^(chrome|moz)-extension:\/\/[a-z0-9-]+$/i.test(origin);
}

function chooseAdapter(): LensAiAdapter {
    const apiKey = process.env.GEMINI_API_KEY;
    const provider = process.env.LENS_AI_PROVIDER ?? (apiKey ? "gemini" : "mock");

    if (provider === "mock") return createMockAdapter();

    if (provider === "gemini") {
        if (!apiKey) {
            throw new Error("LENS_AI_PROVIDER is gemini but GEMINI_API_KEY isn't set. Get a free key at https://aistudio.google.com/apikey");
        }

        const models = (process.env.LENS_AI_MODELS ?? process.env.LENS_AI_MODEL ?? "")
            .split(",")
            .map((model) => model.trim())
            .filter(Boolean);

        return createGeminiAdapter({
            apiKey,
            models: models.length ? models : FREE_TIER_MODELS,
        });
    }

    throw new Error(`Unknown LENS_AI_PROVIDER "${provider}". Use "gemini" or "mock".`);
}

const adapter = chooseAdapter();

/* -------------------------------------------------------------------------- */

function send(res: ServerResponse, status: number, body: unknown) {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
    let size = 0;
    const chunks: Buffer[] = [];

    for await (const chunk of req) {
        size += (chunk as Buffer).length;
        if (size > MAX_BODY_BYTES) throw new AdapterError("Request too large.", 413);
        chunks.push(chunk as Buffer);
    }

    try {
        return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
        throw new AdapterError("Request body isn't JSON.", 400);
    }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

function checkCommon(body: unknown): asserts body is Record<string, unknown> {
    if (
        !isObject(body) ||
        !isObject(body.vocabulary) ||
        !Array.isArray(body.vocabulary.categories) ||
        !isObject(body.current)
    ) {
        throw new AdapterError("Request is missing Lens's vocabulary or current answers.", 400);
    }
}

function checkInterpret(body: unknown): InterpretRequest {
    checkCommon(body);

    const text = typeof body.text === "string" ? body.text.trim() : "";

    if (!text) throw new AdapterError("Tell Lens something first.", 400);
    if (text.length > 2_000) throw new AdapterError("That's a bit long — try under 2,000 characters.", 400);

    return { ...(body as unknown as InterpretRequest), text };
}

function checkAsk(body: unknown): AskRequest {
    checkCommon(body);

    const question = typeof body.question === "string" ? body.question.trim() : "";

    if (!question) throw new AdapterError("Ask Lens something first.", 400);
    if (question.length > 600) throw new AdapterError("That question is a bit long — try under 600 characters.", 400);
    if (!isObject(body.facts)) throw new AdapterError("Request is missing Lens's facts.", 400);

    return {
        ...(body as unknown as AskRequest),
        question,
        history: Array.isArray(body.history) ? (body.history as AskRequest["history"]).slice(-3) : [],
    };
}

function checkConverse(body: unknown): ConverseRequest {
    if (!isObject(body) || !isObject(body.vocabulary) || !isObject(body.understanding) || !Array.isArray(body.evidence)) {
        throw new AdapterError("Request is missing Lens's vocabulary, evidence or understanding.", 400);
    }

    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!message) throw new AdapterError("Tell Lens something first.", 400);
    if (message.length > 2_000) throw new AdapterError("That's a bit long — try under 2,000 characters.", 400);

    return {
        ...(body as unknown as ConverseRequest),
        message,
        history: Array.isArray(body.history) ? (body.history as ConverseRequest["history"]).slice(-8) : [],
        answered: Array.isArray(body.answered) ? (body.answered as ConverseRequest["answered"]).slice(-8) : [],
    };
}

/* -------------------------------------------------------------------------- */

const server = createServer(async (req, res) => {
    const origin = req.headers.origin;

    if (!originAllowed(origin)) {
        log.error(req.url ?? "?", `blocked origin ${origin}`);
        return send(res, 403, { ok: false, error: "Origin not allowed." });
    }

    if (origin) {
        res.setHeader("access-control-allow-origin", origin);
        res.setHeader("vary", "origin");
    }

    if (req.method === "OPTIONS") {
        res.writeHead(204, {
            "access-control-allow-methods": "GET, POST, OPTIONS",
            "access-control-allow-headers": "content-type",
            "access-control-allow-private-network": "true",
            "access-control-max-age": "600",
        });
        return res.end();
    }

    if (req.method === "GET" && req.url === "/health") {
        return send(res, 200, { ok: true, provider: adapter.name, model: adapter.model });
    }

    const routes: Record<string, (body: unknown) => Promise<{ result: unknown; model: string | null }>> = {
        "/v1/interpret": (body) => adapter.interpret(checkInterpret(body)),
        "/v1/ask": (body) => adapter.ask(checkAsk(body)),
        "/v1/converse": (body) => adapter.converse(checkConverse(body)),
    };

    const handler = req.method === "POST" && req.url ? routes[req.url] : undefined;

    if (!handler) return send(res, 404, { ok: false, error: "Not found." });

    const started = performance.now();

    try {
        const { result, model } = await handler(await readJson(req));
        const ms = Math.round(performance.now() - started);

        log.info(`✓ ${req.url} ${adapter.name}${model ? ` ${model}` : ""} ${ms}ms`);
        log.debug(req.url!, "result", result);

        return send(res, 200, { ok: true, result, provider: adapter.name, model, ms });
    } catch (error) {
        const ms = Math.round(performance.now() - started);

        if (error instanceof AdapterError) {
            log.error(req.url!, `${error.status} ${error.message} (${ms}ms)`);
            return send(res, error.status, { ok: false, error: error.message, provider: adapter.name });
        }

        log.error(req.url!, "unexpected", error);
        return send(res, 500, { ok: false, error: "Lens AI hit an unexpected error.", provider: adapter.name });
    }
});

server.listen(PORT, HOST, () => {
    log.info(
        `Lens AI listening on http://${HOST}:${PORT} — provider ${adapter.name}${adapter.model ? ` (${adapter.model})` : ""}`,
    );

    if (adapter.name === "mock") {
        log.info("Mock mode: answers come from keyword matching. Set GEMINI_API_KEY to use Gemini (free key: https://aistudio.google.com/apikey).");
    }
});
