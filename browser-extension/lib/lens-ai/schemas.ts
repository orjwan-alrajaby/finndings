import type {
    ConversationScope,
    LensVocabulary,
} from "./contract";

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
        removePriorities: {
            type: "array",
            description: "Only priorities the reader explicitly said don't matter to them.",
            items: object({
                category: { type: "string", enum: categories },
                reason,
            }),
        },
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

/** A scope field only where scope can change, limited to the scopes on offer. */
function scopeField(scope: ConversationScope | undefined): Record<string, object> {
    const kinds = scope?.available.filter((item) => item.count > 0).map((item) => item.kind) ?? [];

    return kinds.length ? { scope: nullable({ type: "string", enum: kinds }) } : {};
}

export function interpretSchema(vocabulary: LensVocabulary, scope?: ConversationScope) {
    return object({
        summary: { type: "string" },
        change: changeSchema(vocabulary),
        ...scopeField(scope),
    });
}

export function askSchema(vocabulary: LensVocabulary, scope?: ConversationScope) {
    return object({
        kind: { type: "string", enum: ["answer", "whatIf"] },
        answer: { type: "string" },
        change: nullable(changeSchema(vocabulary)),
        ...scopeField(scope),
    });
}

/**
 * The conversational turn. Evidence ids and priorities are enums of what
 * Lens actually has, so a need can only point at things Lens can check.
 */
export function converseSchema(
    vocabulary: LensVocabulary,
    evidenceIds: string[],
    scope?: ConversationScope,
) {
    const categories = vocabulary.categories.map((category) => category.id);
    const evidence = { type: "string", enum: evidenceIds };
    const said = { type: "string" };

    const understanding = object({
        tension: {
            type: "string",
            description: "Where the choice between these cars will really be made, in one short sentence without numbers; empty if nothing pulls against anything.",
        },
        budget: nullable(
            object({
                kind: { type: "string", enum: ["hardMax", "target"] },
                monthly: { type: "number" },
                said,
            }),
        ),
        rental: nullable(
            object({
                from: { type: "string", description: "YYYY-MM" },
                to: { type: "string", description: "YYYY-MM, included" },
                startDay: nullable({ type: "number" }),
                said,
            }),
        ),
        monthlyKm: nullable(object({ value: { type: "number" }, said })),
        needs: {
            type: "array",
            items: object({
                id: { type: "string" },
                label: { type: "string" },
                importance: { type: "string", enum: ["essential", "important", "niceToHave"] },
                said,
                priorities: { type: "array", items: { type: "string", enum: categories } },
                evidence: {
                    type: "array",
                    items: object({
                        id: evidence,
                        use: { type: "string" },
                        unwanted: {
                            type: "boolean",
                            description:
                                "True when the reader wants this absent — an SUV body for someone who rejects big cars, a sixth seat for someone who refuses a seven-seater. On an essential need, Lens rules those cars out.",
                        },
                    }),
                },
                notInData: nullable({ type: "string" }),
                status: { type: "string", enum: ["active", "dropped"] },
            }),
        },
        context: { type: "array", items: object({ label: { type: "string" }, said }) },
        capabilities: {
            type: "array",
            items: object({ label: { type: "string" }, said, lessRelevant: { type: "array", items: evidence } }),
        },
        droppedPriorities: { type: "array", items: { type: "string", enum: categories } },
        notModelled: {
            type: "array",
            items: object({
                said,
                stance: { type: "string", enum: ["wants", "doesntCare"] },
                explanation: { type: "string" },
            }),
        },
        cleared: { type: "array", items: { type: "string", enum: ["budget", "rental", "monthlyKm"] } },
    });

    return object({
        kind: { type: "string", enum: ["understanding", "answer", "whatIf"] },
        /*
         * Reply first, and described as required.
         *
         * Understanding used to come first, so the model worked the situation
         * out before speaking. It also came back with an empty reply on
         * answer turns — where `understanding` is null and there was nothing
         * to work out first — which left the reader with nothing said.
         */
        reply: {
            type: "string",
            description:
                "What Lens says to the reader, in its own voice. Never empty: on an answer turn this is the whole answer, including saying that FINN's data can't settle it.",
        },
        understanding: nullable(understanding),
        question: nullable(
            object({
                ask: { type: "string" },
                why: { type: "string" },
                options: { type: "array", items: { type: "string" } },
                blocking: { type: "boolean" },
                affects: { type: "array", items: evidence },
            }),
        ),
        ...scopeField(scope),
    });
}
