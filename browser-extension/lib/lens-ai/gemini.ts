import { ApiError, FinishReason, GoogleGenAI } from "@google/genai";

import type {
    AskRequest,
    AskResult,
    ConverseRequest,
    ConverseResult,
    InterpretRequest,
    InterpretResult,
} from "./contract";
import { ASK_INSTRUCTIONS, CONVERSE_INSTRUCTIONS, INTERPRET_INSTRUCTIONS } from "./prompts";
import { askSchema, converseSchema, interpretSchema } from "./schemas";

/**
 * Gemini, called from the extension with the reader's own key, through
 * Google's official SDK and JSON-schema structured output.
 *
 * The key is one the reader created and typed into Settings; it is stored in
 * this browser's extension storage and sent only to Google. Nothing here
 * ships a key, and nothing runs unless the reader turned Lens AI on.
 *
 * Chosen because the Gemini API has a free tier (a key from Google AI Studio,
 * no card). Its conditions shape this file more than anything else:
 *
 * - **Quotas are small and per model** — on a new key, 20 requests a day for
 *   each. So the adapter holds a list of models and moves down it when one is
 *   out of quota, overloaded or not offered to the key, and remembers which
 *   ones are out so a spent model costs no round trip until its window ends.
 * - **Content may be used to improve Google's products** — here, the reader's
 *   own words and the facts about the cars being discussed. Settings says so
 *   before the key is saved.
 */

/** Which of Lens's three calls a request is, for the adapter and the logs. */
export interface LensAiAdapter {
    interpret(request: InterpretRequest): Promise<Answered<InterpretResult>>;
    ask(request: AskRequest): Promise<Answered<AskResult>>;
    converse(request: ConverseRequest): Promise<Answered<ConverseResult>>;
}

/** A result, and which model actually produced it — not always the first. */
export interface Answered<T> {
    result: T;
    model: string | null;
}

/** A failure worth showing the reader in one sentence. */
export class AdapterError extends Error {
    readonly status: number;

    constructor(message: string, status = 502) {
        super(message);
        this.status = status;
    }
}

/* Development-only logging: token usage per call, never the reader's words. */
const log = {
    info(...parts: unknown[]) {
        if (import.meta.env?.DEV) console.debug("[Lens AI]", ...parts);
    },
    error(route: string, ...parts: unknown[]) {
        if (import.meta.env?.DEV) console.warn("[Lens AI]", `✕ ${route}`, ...parts);
    },
    debug(route: string, label: string, value: unknown) {
        if (import.meta.env?.DEV) console.debug("[Lens AI]", `· ${route} ${label}`, value);
    },
};

/** Models the free tier offers new keys, best first. Each has its own quota. */
export const FREE_TIER_MODELS = [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-2.5-flash",
];

/** Worth trying the next model for: out of quota, overloaded, or not offered to this key. */
const MOVE_ON = new Set([429, 503, 404]);

/**
 * How long one model may take before the next is tried. A free-tier model
 * under load can take most of a minute just to say it's overloaded; the
 * reader shouldn't wait for that when another model is free. The last model
 * in the list gets no limit of its own.
 */
const PER_MODEL_MS = 30_000;

const timedOut = (error: unknown) =>
    error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError" || /aborted/i.test(error.message));

export function createGeminiAdapter({
    apiKey,
    models = FREE_TIER_MODELS,
}: {
    apiKey: string;
    models?: string[];
}): LensAiAdapter {
    const client = new GoogleGenAI({ apiKey });

    /** When each spent model is worth asking again. */
    const restingUntil = new Map<string, number>();

    function rest(model: string, error: ApiError): void {
        const message = error.message ?? "";

        if (error.status === 404) {
            /* Not offered to this key: no point asking again this run. */
            restingUntil.set(model, Number.POSITIVE_INFINITY);
        } else if (error.status === 429) {
            const retry = Number(message.match(/"retryDelay":"(\d+)s"/)?.[1] ?? 60);
            const daily = /PerDay/i.test(message);

            /* A daily quota resets on Google's clock; an hour is a cheap, safe guess. */
            restingUntil.set(model, Date.now() + (daily ? 60 * 60_000 : retry * 1000));
        }
    }

    const awake = () => {
        const now = Date.now();
        const available = models.filter((model) => (restingUntil.get(model) ?? 0) <= now);

        /* Every model resting: try the first anyway rather than refuse outright. */
        return available.length ? available : models.slice(0, 1);
    };

    async function structured<T>({
        route,
        system,
        schema,
        user,
    }: {
        route: string;
        system: string[];
        schema: Record<string, unknown>;
        user: string;
    }): Promise<Answered<T>> {
        const candidates = awake();
        let response;
        let served = candidates[0]!;
        let dailyQuota = false;

        try {
            for (const [index, candidate] of candidates.entries()) {
                try {
                    served = candidate;
                    const last = index === candidates.length - 1;

                    response = await client.models.generateContent({
                        model: candidate,
                        contents: user,
                        config: {
                            systemInstruction: system.join("\n\n"),
                            responseMimeType: "application/json",
                            responseJsonSchema: schema,
                            ...(last ? {} : { abortSignal: AbortSignal.timeout(PER_MODEL_MS) }),
                        },
                    });
                    break;
                } catch (error) {
                    const slow = timedOut(error);

                    if (!slow && (!(error instanceof ApiError) || !MOVE_ON.has(error.status))) throw error;

                    if (error instanceof ApiError) {
                        rest(candidate, error);
                        dailyQuota ||= error.status === 429 && /PerDay/i.test(error.message ?? "");
                    }

                    if (index === candidates.length - 1) throw error;

                    log.info(`· ${route} ${candidate} ${slow ? `took over ${PER_MODEL_MS / 1000}s` : `returned ${(error as ApiError).status}`}, trying ${candidates[index + 1]}`);
                }
            }
        } catch (error) {
            if (error instanceof ApiError) {
                log.error(route, `API error ${error.status}`, error.message);

                if (error.status === 429) {
                    throw new AdapterError(
                        dailyQuota
                            ? "Lens AI has used today's free Gemini requests. They reset daily — everything else in Lens still works."
                            : "Lens AI has hit the free tier's rate limit — wait a minute and try again.",
                        429,
                    );
                }
                if ((error.status === 400 && /api key/i.test(error.message)) || error.status === 401 || error.status === 403) {
                    throw new AdapterError("Google rejected the Gemini API key saved in Settings.", 500);
                }
                if (error.status === 404) {
                    throw new AdapterError("None of Lens AI's Gemini models are available to this key.", 500);
                }
                if (error.status === 400) {
                    throw new AdapterError("The model rejected the request.", 502);
                }
                throw new AdapterError("The model is unavailable right now.", 502);
            }
            throw error;
        }

        if (!response) throw new AdapterError("The model is unavailable right now.", 502);

        const usage = response.usageMetadata;

        log.info(
            `· ${route} ${served} in=${usage?.promptTokenCount ?? "?"} out=${usage?.candidatesTokenCount ?? "?"} thinking=${usage?.thoughtsTokenCount ?? 0} cached=${usage?.cachedContentTokenCount ?? 0}`,
        );

        if (response.promptFeedback?.blockReason) {
            throw new AdapterError("The model declined to answer that.", 422);
        }

        const finish = response.candidates?.[0]?.finishReason;

        if (finish === FinishReason.MAX_TOKENS) {
            throw new AdapterError("The answer ran too long and was cut off.", 502);
        }
        if (finish && finish !== FinishReason.STOP) {
            log.error(route, `finish reason ${finish}`);
            throw new AdapterError("The model declined to answer that.", 422);
        }

        const text = response.text ?? "";

        log.debug(route, "raw output", text);

        try {
            return { result: JSON.parse(text) as T, model: served };
        } catch {
            throw new AdapterError("The model's answer wasn't readable.", 502);
        }
    }

    const vocabularyBlock = (request: { vocabulary: InterpretRequest["vocabulary"] }) =>
        `LENS_VOCABULARY\n${JSON.stringify(request.vocabulary)}`;

    const scopeBlock = (request: { scope?: InterpretRequest["scope"] }) =>
        request.scope ? `SCOPE\n${JSON.stringify(request.scope)}\n\n` : "";

    return {

        interpret(request) {
            return structured<InterpretResult>({
                route: "interpret",
                schema: interpretSchema(request.vocabulary, request.scope),
                system: [INTERPRET_INSTRUCTIONS, vocabularyBlock(request)],
                user: `CURRENT_ANSWERS\n${JSON.stringify(request.current)}\n\n${scopeBlock(request)}WHAT_THEY_SAID\n${request.text}`,
            });
        },

        converse(request) {
            const block = (label: string, value: unknown) => `${label}\n${JSON.stringify(value)}`;

            return structured<ConverseResult>({
                route: "converse",
                schema: converseSchema(request.vocabulary, request.evidence.map((item) => item.id), request.scope),
                system: [
                    CONVERSE_INSTRUCTIONS,
                    vocabularyBlock(request),
                    block("EVIDENCE", request.evidence),
                    ...(request.facts ? [block("FACTS", request.facts)] : []),
                ],
                user: [
                    `TODAY\n${request.today}`,
                    request.scope ? block("SCOPE", request.scope) : "",
                    block("UNDERSTANDING", request.understanding),
                    block("OPEN_QUESTION", request.openQuestion),
                    block("ANSWERED", request.answered),
                    request.history.length
                        ? `CONVERSATION_SO_FAR\n${request.history.map((turn) => `${turn.role === "reader" ? "Reader" : "Lens"}: ${turn.text}`).join("\n")}`
                        : "",
                    `MESSAGE\n${request.message}`,
                ]
                    .filter(Boolean)
                    .join("\n\n"),
            });
        },

        ask(request) {
            const history = request.history.length
                ? `EARLIER_IN_THIS_CONVERSATION\n${request.history
                      .map((turn) => `Q: ${turn.question}\nA: ${turn.answer}`)
                      .join("\n\n")}\n\n`
                : "";

            return structured<AskResult>({
                route: "ask",
                schema: askSchema(request.vocabulary, request.scope),
                system: [
                    ASK_INSTRUCTIONS,
                    vocabularyBlock(request),
                    `CURRENT_ANSWERS\n${JSON.stringify(request.current)}\n\nLENS_FACTS\n${JSON.stringify(request.facts)}`,
                ],
                user: `${scopeBlock(request)}${history}QUESTION\n${request.question}`,
            });
        },
    };
}

export type KeyCheck =
    | { ok: true }
    | { ok: false; reason: "rejected" | "unreachable"; message: string };

/**
 * Whether Google accepts a key, without spending any of its daily requests:
 * reading a model's description is free, and fails the same way a bad key
 * fails a real call.
 */
export async function checkGeminiKey(apiKey: string): Promise<KeyCheck> {
    try {
        await new GoogleGenAI({ apiKey }).models.get({
            model: FREE_TIER_MODELS[FREE_TIER_MODELS.length - 1]!,
            config: { abortSignal: AbortSignal.timeout(10_000) },
        });

        return { ok: true };
    } catch (error) {
        if (error instanceof ApiError && [400, 401, 403].includes(error.status)) {
            return { ok: false, reason: "rejected", message: "Google didn't accept this key. Check that you copied all of it." };
        }
        if (error instanceof ApiError && error.status === 429) {
            /* Rate limited, but only a real key gets that far. */
            return { ok: true };
        }

        return { ok: false, reason: "unreachable", message: "Couldn't reach Google to check the key. Try again in a moment." };
    }
}
