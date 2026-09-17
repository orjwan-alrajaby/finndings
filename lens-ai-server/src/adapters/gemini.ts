import { ApiError, FinishReason, GoogleGenAI } from "@google/genai";

import type {
    AskRequest,
    AskResult,
    InterpretRequest,
    InterpretResult,
} from "../../../browser-extension/lib/lens-ai/contract.ts";
import { ASK_INSTRUCTIONS, INTERPRET_INSTRUCTIONS } from "../prompts.ts";
import { askSchema, interpretSchema } from "../schemas.ts";
import { log } from "../log.ts";
import { AdapterError, type LensAiAdapter } from "./types.ts";

/**
 * Gemini, through Google's official SDK, with JSON-schema structured output.
 *
 * Chosen because the Gemini API has a free tier (a key from Google AI Studio,
 * no card). The free tier's condition is that Google may use the content to
 * improve its products — which here means the reader's own words and the
 * facts about their shortlist. Fine for an experiment; worth knowing.
 *
 * Both calls send fixed instructions, then Lens's vocabulary, then (for
 * questions) the facts, all as the system instruction; only the reader's words
 * go in the user turn. Gemini caches repeated prefixes implicitly, so asking
 * several questions about one recommendation reuses the facts without any
 * cache markers here.
 */
export function createGeminiAdapter({
    apiKey,
    model,
    fallbackModel,
}: {
    apiKey: string;
    model: string;
    /**
     * Tried when `model` is overloaded (503) or out of free-tier quota (429).
     * Free-tier quotas are per model, so a second model is often still open.
     */
    fallbackModel: string | null;
}): LensAiAdapter {
    const models = [model, ...(fallbackModel && fallbackModel !== model ? [fallbackModel] : [])];

    const client = new GoogleGenAI({ apiKey });

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
    }): Promise<T> {
        let response;
        let served = model;

        try {
            for (const [index, candidate] of models.entries()) {
                try {
                    served = candidate;
                    response = await client.models.generateContent({
                        model: candidate,
                        contents: user,
                        config: {
                            systemInstruction: system.join("\n\n"),
                            responseMimeType: "application/json",
                            responseJsonSchema: schema,
                        },
                    });
                    break;
                } catch (error) {
                    const retryable =
                        error instanceof ApiError && (error.status === 503 || error.status === 429);

                    if (!retryable || index === models.length - 1) throw error;

                    log.info(`· ${route} ${candidate} returned ${(error as ApiError).status}, trying ${models[index + 1]}`);
                }
            }
        } catch (error) {
            if (error instanceof ApiError) {
                log.error(route, `API error ${error.status}`, error.message);

                if (error.status === 429) {
                    throw new AdapterError(
                        "Lens AI has hit the free tier's rate limit — wait a minute and try again.",
                        429,
                    );
                }
                if (error.status === 400 && /api key/i.test(error.message)) {
                    throw new AdapterError("The Lens AI server's Gemini API key was rejected.", 500);
                }
                if (error.status === 401 || error.status === 403) {
                    throw new AdapterError("The Lens AI server's Gemini API key was rejected.", 500);
                }
                if (error.status === 404) {
                    throw new AdapterError(`The model "${served}" isn't available to this key.`, 500);
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
            return JSON.parse(text) as T;
        } catch {
            throw new AdapterError("The model's answer wasn't readable.", 502);
        }
    }

    const scopeBlock = (request: InterpretRequest | AskRequest) =>
        request.scope ? `SCOPE\n${JSON.stringify(request.scope)}\n\n` : "";

    const vocabularyBlock = (request: InterpretRequest | AskRequest) =>
        `LENS_VOCABULARY\n${JSON.stringify(request.vocabulary)}`;

    return {
        name: "gemini",
        model,

        interpret(request) {
            return structured<InterpretResult>({
                route: "interpret",
                schema: interpretSchema(request.vocabulary, request.scope),
                system: [INTERPRET_INSTRUCTIONS, vocabularyBlock(request)],
                user: `CURRENT_ANSWERS\n${JSON.stringify(request.current)}\n\n${scopeBlock(request)}WHAT_THEY_SAID\n${request.text}`,
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
