import type {
    AiEnvelope,
    AskRequest,
    AskResult,
    HealthResult,
    InterpretRequest,
    InterpretResult,
} from "./contract";

/**
 * The extension's only door to the Lens AI server.
 *
 * No key lives on this side, and no provider is named: the server holds the
 * credential and decides which model answers. Every call resolves — to a
 * result or to a reason — so a server that isn't running, a slow model or a
 * malformed reply degrades one card on the page and nothing else.
 *
 * `WXT_LENS_AI_URL` points it elsewhere; the default is the local server the
 * repo ships (`lens-ai-server/`).
 */

export const LENS_AI_URL: string =
    (import.meta.env?.WXT_LENS_AI_URL as string | undefined) ??
    "http://127.0.0.1:8787";

const TIMEOUT_MS = 60_000;

export type AiCall<T> =
    | { ok: true; result: T; provider: string; model: string | null; ms: number }
    | { ok: false; error: string };

/* Dev-only tracing, so a session with the experiment can be read back. */
function trace(label: string, payload: unknown) {
    if (import.meta.env?.DEV) {
        console.debug(`[Lens AI] ${label}`, payload);
    }
}

async function post<T>(path: string, body: unknown): Promise<AiCall<T>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const started = performance.now();

    trace(`→ ${path}`, body);

    try {
        const response = await fetch(`${LENS_AI_URL}${path}`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
            signal: controller.signal,
        });

        const envelope = (await response.json().catch(() => null)) as AiEnvelope<T> | null;

        if (!envelope) {
            return { ok: false, error: `The Lens AI server replied with ${response.status} and no answer.` };
        }

        trace(`← ${path} (${Math.round(performance.now() - started)} ms)`, envelope);

        return envelope.ok
            ? {
                  ok: true,
                  result: envelope.result,
                  provider: envelope.provider,
                  model: envelope.model,
                  ms: envelope.ms,
              }
            : { ok: false, error: envelope.error };
    } catch (error) {
        trace(`✕ ${path}`, error);

        return {
            ok: false,
            error:
                error instanceof DOMException && error.name === "AbortError"
                    ? "Lens AI took too long to answer."
                    : "Lens AI isn't reachable right now.",
        };
    } finally {
        clearTimeout(timer);
    }
}

export const interpret = (request: InterpretRequest) =>
    post<InterpretResult>("/v1/interpret", request);

export const ask = (request: AskRequest) => post<AskResult>("/v1/ask", request);

/** Whether the server is up, and what's answering. Null when it isn't. */
export async function health(): Promise<HealthResult | null> {
    try {
        const response = await fetch(`${LENS_AI_URL}/health`, {
            signal: AbortSignal.timeout(2_500),
        });

        return response.ok ? ((await response.json()) as HealthResult) : null;
    } catch {
        return null;
    }
}
