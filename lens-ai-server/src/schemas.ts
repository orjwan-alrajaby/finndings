import type { LensVocabulary } from "../../browser-extension/lib/lens-ai/contract.ts";

/**
 * JSON schemas for the model's structured output, built per request from the
 * vocabulary the extension sent.
 *
 * The enums are what make the output land inside Lens's concepts rather than
 * near them: a model that wants to say "Family Friendly" has to pick a real
 * priority or say, in `notRepresentable`, that it can't. The extension still
 * validates everything that comes back — the schema narrows what the model
 * can say, it doesn't make what it says true.
 */

const nullable = (schema: object) => ({ anyOf: [schema, { type: "null" }] });

const object = (properties: Record<string, object>) => ({
    type: "object",
    additionalProperties: false,
    required: Object.keys(properties),
    properties,
});

const reason = {
    type: "string",
    description: "Short, in the reader's own terms, second person.",
};

function changeSchema(vocabulary: LensVocabulary) {
    const categories = vocabulary.categories.map((category) => category.id);
    const features = vocabulary.categories.flatMap((category) =>
        category.features.map((feature) => feature.id),
    );
    const profiles = vocabulary.profiles.map((profile) => profile.id);

    return object({
        startFromProfile: nullable({ type: "string", enum: profiles }),
        priorityOrder: nullable({
            type: "array",
            description: "The complete new order, most important first, or null to leave the order alone.",
            items: object({
                category: { type: "string", enum: categories },
                reason,
            }),
        }),
        raise: {
            type: "array",
            items: object({
                category: { type: "string", enum: categories },
                feature: { type: "string", enum: features },
                importance: { type: "string", enum: ["high", "medium", "low", "standard"] },
                reason,
            }),
        },
        budget: nullable(
            object({
                action: { type: "string", enum: ["set", "increaseBy", "decreaseBy", "remove"] },
                amount: nullable({ type: "number", description: "Euros per month." }),
                reason,
            }),
        ),
        budgetWithoutFigure: nullable({ type: "string" }),
        monthlyKm: nullable(object({ value: { type: "number" }, reason })),
        contractType: nullable(
            object({ value: { type: "string", enum: ["private", "business"] }, reason }),
        ),
        rentalPeriod: nullable(
            object({
                action: { type: "string", enum: ["set", "remove"] },
                from: nullable({ type: "string", description: "First month, YYYY-MM." }),
                to: nullable({ type: "string", description: "Last month, included, YYYY-MM." }),
                reason,
            }),
        ),
        notRepresentable: {
            type: "array",
            items: object({
                said: { type: "string" },
                explanation: { type: "string" },
            }),
        },
    });
}

export function interpretSchema(vocabulary: LensVocabulary) {
    return object({
        summary: { type: "string" },
        change: changeSchema(vocabulary),
    });
}

export function askSchema(vocabulary: LensVocabulary) {
    return object({
        kind: { type: "string", enum: ["answer", "whatIf"] },
        answer: { type: "string" },
        change: nullable(changeSchema(vocabulary)),
    });
}
