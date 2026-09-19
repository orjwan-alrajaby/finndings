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

/**
 * Models the free tier offers new keys, best first. Each has its own quota.
 *
 * Only models a new key can actually reach: gemini-2.5-flash sat at the end of
 * this list until Google closed it to new keys, and a model that answers every
 * request with 404 buys nothing but a wrong line in the refusal when the rest
 * are spent.
 */
export const FREE_TIER_MODELS = [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    /*
     * A preview alias, and a separate quota bucket: on a key whose numbered
     * models are spent for the day this is often the one left answering.
     */
    "gemini-3-flash-preview",
];

/** Where models resting out of quota are remembered between pages. */
const RESTING_KEY = "finnLensAiResting";

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

    /**
     * When each spent model is worth asking again — kept in storage, not just
     * in this page.
     *
     * A model that's out of requests for the day is out for every page the
     * reader opens. Holding that only in memory meant each new page, and each
     * reopened chat, spent four requests rediscovering it before reaching the
     * model that could answer: slower for the reader, and their own free quota
     * burned on refusals.
     */
    const restingUntil = new Map<string, number>();

    const loaded = browser.storage.local
        .get(RESTING_KEY)
        .then((stored) => {
            const saved = (stored[RESTING_KEY] ?? {}) as Record<string, number>;

            for (const [model, until] of Object.entries(saved)) {
                if (typeof until === "number" && until > Date.now()) restingUntil.set(model, until);
            }
        })
        .catch(() => {});

    const remember = () => {
        const now = Date.now();
        const keep = Object.fromEntries([...restingUntil].filter(([, until]) => until > now && Number.isFinite(until)));

        void browser.storage.local.set({ [RESTING_KEY]: keep }).catch(() => {});
    };

    /**
     * Which free-tier limit a 429 is about.
     *
     * Google says "please retry in 50s" for the per-minute limit and names a
     * per-day metric for the other; the two need different words to the
     * reader — one is "wait a minute", the other is "come back tomorrow" —
     * and a long retry delay is the giveaway when the metric isn't named.
     */
    const limitKind = (error: ApiError): "daily" | "minute" => {
        const message = error.message ?? "";

        return /per\s*day/i.test(message) || retryAfter(message) > 5 * 60 ? "daily" : "minute";
    };

    /** Seconds Google asked us to wait, in either shape it writes them. */
    const retryAfter = (message: string): number =>
        Number(message.match(/"retryDelay":\s*"(\d+(?:\.\d+)?)s"/)?.[1] ?? message.match(/retry in (\d+(?:\.\d+)?)s/i)?.[1] ?? 60);

    function rest(model: string, error: ApiError): void {
        const message = error.message ?? "";

        if (error.status === 404) {
            /*
             * Not offered to this key. Remembered for a month rather than
             * forever, so a key that gains the model later isn't shut out —
             * and so it's a finite number the storage record can hold.
             */
            restingUntil.set(model, Date.now() + 30 * 24 * 60 * 60_000);
        } else if (error.status === 429) {
            /* A daily quota resets on Google's clock; an hour is a cheap, safe guess. */
            const wait = limitKind(error) === "daily" ? 60 * 60_000 : Math.max(retryAfter(message), 5) * 1000;

            restingUntil.set(model, Date.now() + wait);
        }

        remember();
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
        await loaded;

        const candidates = awake();
        let response;
        let served = candidates[0]!;
        /*
         * What the chain refused with, kept across the whole walk. The last
         * model's error alone misleads: a key that isn't offered the oldest
         * model ends every rate-limited turn on its 404, and the reader was
         * told none of Lens's models were available to them when the truth
         * was that the rest were busy.
         */
        let quota: "daily" | "minute" | null = null;

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
                        if (error.status === 429) quota = limitKind(error);
                    }

                    if (index === candidates.length - 1) throw error;

                    log.info(`· ${route} ${candidate} ${slow ? `took over ${PER_MODEL_MS / 1000}s` : `returned ${(error as ApiError).status}`}, trying ${candidates[index + 1]}`);
                }
            }
        } catch (error) {
            if (error instanceof ApiError) {
                log.error(route, `API error ${error.status}`, error.message);

                if (error.status === 429 || quota) {
                    throw new AdapterError(
                        quota === "daily"
                            ? "Lens AI has used today's free Gemini requests. They reset daily — everything else in Lens still works."
                            : "Gemini's free tier is rate-limiting Lens AI. Wait a minute and try again — everything else in Lens still works.",
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
