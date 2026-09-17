import { describe, expect, it } from "vitest";

import {
    buildAdviceNarrative,
    buildRecommendation,
} from "@/lib/reasoning-engine";
import {
    CATEGORY_IDS,
    DEFAULT_CATEGORY_FEATURES,
    DEFAULT_PREFERENCES,
} from "@/lib/reasoning-engine/constants";
import { GARAGE } from "@/lib/reasoning-engine/test-garage";
import type { CategoryId } from "@/lib/reasoning-engine/types";
import { copyFeatures, type Answers } from "@/entrypoints/compare/store";

import { buildLensFacts } from "./context";
import type { ProposedChange } from "./contract";
import { compareOutcomes } from "./outcome";
import {
    applyChange,
    describeChange,
    isEmptyChange,
    validateChange,
} from "./proposal";
import { buildVocabulary, describeCurrent } from "./vocabulary";

/**
 * The AI layer's guarantees, tested without a model.
 *
 * Everything a model returns is untrusted, so what matters is the code around
 * it: that a proposal can only ever become valid Lens answers, that what the
 * reader is shown is what gets applied, and that "what changed" is read from
 * the engine rather than from anything the model said.
 */

const answers = (overrides: Partial<Answers> = {}): Answers => ({
    priorities: ["safetyAssistance", "practicality", "comfort", "cityParking", "environmental"],
    preferences: { ...DEFAULT_PREFERENCES },
    features: copyFeatures(DEFAULT_CATEGORY_FEATURES),
    basedOn: "balanced",
    ...overrides,
});

const change = (overrides: Partial<ProposedChange>): ProposedChange => ({
    startFromProfile: null,
    priorityOrder: null,
    removePriorities: [],
    raise: [],
    budget: null,
    budgetWithoutFigure: null,
    monthlyKm: null,
    contractType: null,
    rentalPeriod: null,
    notRepresentable: [],
    ...overrides,
});

const cars = () => [
    GARAGE.safeCompact(),
    GARAGE.comfyCruiser(),
    GARAGE.cityHatch(),
    GARAGE.familySuv(),
];

const run = (value: Answers) =>
    buildRecommendation(cars(), value.priorities, value.preferences, value.features)!;

describe("validateChange", () => {
    it("drops priorities Lens doesn't have and says so", () => {
        const result = validateChange(
            change({
                priorityOrder: [
                    { category: "familyFriendly", reason: "two kids" },
                    { category: "safetyAssistance", reason: "not confident" },
                    { category: "climateSuitability", reason: "really hot" },
                    { category: "longDistance", reason: "road trips" },
                ],
            }),
            answers(),
        );

        expect(result.priorities?.map((item) => item.id)).toEqual([
            "safetyAssistance",
            "climateSuitability",
            "longDistance",
            "practicality",
            "comfort",
        ]);
        expect(result.ignored.join(" ")).toMatch(/familyFriendly/);
    });

    it("puts what the reader mentioned first and keeps the rest of their order after it", () => {
        const result = validateChange(
            change({ priorityOrder: [{ category: "longDistance", reason: "road trips" }] }),
            answers(),
        );

        expect(result.priorities).toEqual([
            { id: "longDistance", reason: "road trips", kept: false },
            { id: "safetyAssistance", reason: null, kept: true },
            { id: "practicality", reason: null, kept: true },
            { id: "comfort", reason: null, kept: true },
            { id: "cityParking", reason: null, kept: true },
        ]);
    });

    it("removes only what the reader let go of", () => {
        const before = answers();
        const result = validateChange(
            change({ removePriorities: [{ category: "comfort", reason: "you don't care about comfort" }] }),
            before,
        );

        expect(result.priorities?.map((item) => item.id)).toEqual([
            "safetyAssistance",
            "practicality",
            "cityParking",
            "environmental",
        ]);
        expect(describeChange(before, applyChange(before, result), result).dropped.map((item) => item.id)).toEqual([
            "comfort",
        ]);
    });

    it("won't remove below three priorities, and says so", () => {
        const three = answers({ priorities: ["safetyAssistance", "practicality", "comfort"] });
        const result = validateChange(
            change({ removePriorities: [{ category: "comfort", reason: "" }] }),
            three,
        );

        expect(result.priorities).toBeNull();
        expect(result.ignored.join(" ")).toMatch(/at least 3 priorities/);
    });

    it("never ranks more than five, or a priority switched off", () => {
        const enabled = CATEGORY_IDS.filter((id) => id !== "comfort");

        const result = validateChange(
            change({
                priorityOrder: CATEGORY_IDS.map((category) => ({ category, reason: "" })),
            }),
            answers(),
            enabled,
        );

        expect(result.priorities).toHaveLength(5);
        expect(result.priorities?.map((item) => item.id)).not.toContain("comfort");
    });

    it("moves a raise to the feature's home, and refuses one that can't be raised", () => {
        const result = validateChange(
            change({
                raise: [
                    { category: "comfort", feature: "hasSeatCooling", importance: "high", reason: "hot" },
                    { category: "climateSuitability", feature: "hasAirConditioning", importance: "high", reason: "hot" },
                    { category: "comfort", feature: "hasJetpack", importance: "high", reason: "" },
                ],
            }),
            answers(),
        );

        expect(result.raises).toEqual([
            { category: "climateSuitability", feature: "hasSeatCooling", importance: "high", reason: "hot" },
        ]);
        expect(result.ignored).toHaveLength(2);
    });

    it("holds the five-per-priority cap against what's already raised", () => {
        const base = answers();
        base.features.climateSuitability = [
            { key: "hasHeatedSeats", importance: "low", source: "user" },
            { key: "hasFogLights", importance: "low", source: "user" },
            { key: "hasCorneringLights", importance: "low", source: "user" },
            { key: "hasAuxiliaryHeater", importance: "low", source: "user" },
            { key: "hasHeadlightCleaningSystem", importance: "low", source: "user" },
        ];

        const result = validateChange(
            change({
                raise: [
                    { category: "climateSuitability", feature: "hasSeatCooling", importance: "high", reason: "" },
                    { category: "climateSuitability", feature: "hasHeatedSeats", importance: "high", reason: "" },
                ],
            }),
            base,
        );

        expect(result.raises.map((item) => item.feature)).toEqual(["hasHeatedSeats"]);
        expect(result.ignored.join(" ")).toMatch(/most features/);
    });

    it("won't add to a budget that was never set", () => {
        const result = validateChange(
            change({ budget: { action: "increaseBy", amount: 150, reason: "" } }),
            answers(),
        );

        expect(result.budget).toBeNull();
        expect(result.ignored.join(" ")).toMatch(/haven't set one/);
    });

    it("adds to a budget that was", () => {
        const base = answers({ preferences: { ...DEFAULT_PREFERENCES, monthlyBudget: 600 } });
        const result = validateChange(
            change({ budget: { action: "increaseBy", amount: 150, reason: "more room" } }),
            base,
        );

        expect(applyChange(base, result).preferences.monthlyBudget).toBe(750);
    });

    it("survives a reply that isn't a change at all", () => {
        const result = validateChange("nonsense", answers());

        expect(isEmptyChange(result)).toBe(true);
        expect(result.ignored).toEqual([]);
    });
});

describe("rental periods", () => {
    it("applies a whole period and describes it in months", () => {
        const before = answers();
        const validated = validateChange(
            change({ rentalPeriod: { action: "set", from: "2099-10", to: "2100-05", reason: "you need it from October to May" } }),
            before,
        );
        const after = applyChange(before, validated);

        expect(after.preferences).toMatchObject({ rentalFrom: "2099-10", rentalTo: "2100-05" });
        expect(describeChange(before, after, validated).assumptions).toEqual([
            {
                label: "Rental period",
                from: "Not set",
                to: "October 2099 to May 2100 (8 months)",
                reason: "you need it from October to May",
            },
        ]);
    });

    it("refuses a period that runs backwards, is malformed or is already over", () => {
        for (const [from, to] of [["2100-05", "2099-10"], ["October", "May"], ["2001-01", "2001-06"]] as [string, string][]) {
            const result = validateChange(change({ rentalPeriod: { action: "set", from, to, reason: "" } }), answers());

            expect(result.rentalPeriod).toBeNull();
            expect(result.ignored).toHaveLength(1);
        }
    });
});

describe("applyChange and describeChange", () => {
    it("applies exactly what it describes", () => {
        const before = answers();
        const validated = validateChange(
            change({
                priorityOrder: [
                    { category: "comfort", reason: "long days in the car" },
                    { category: "safetyAssistance", reason: "" },
                    { category: "practicality", reason: "" },
                ],
                removePriorities: [
                    { category: "cityParking", reason: "you don't mind parking" },
                    { category: "environmental", reason: "emissions don't matter to you" },
                ],
                raise: [
                    { category: "comfort", feature: "hasElectricFrontSeatAdjustment", importance: "high", reason: "a bad back" },
                ],
                monthlyKm: { value: 2500, reason: "30,000 km a year" },
            }),
            before,
        );

        const after = applyChange(before, validated);
        const description = describeChange(before, after, validated);

        expect(after.priorities).toEqual(["comfort", "safetyAssistance", "practicality"]);
        expect(after.features.comfort.find((item) => item.key === "hasElectricFrontSeatAdjustment"))
            .toEqual({ key: "hasElectricFrontSeatAdjustment", importance: "high", source: "user" });
        expect(after.preferences.monthlyKm).toBe(2500);

        expect(description.order?.[0]).toMatchObject({ id: "comfort", rank: 1, previousRank: 3 });
        expect(description.dropped.map((item) => item.id)).toEqual(["cityParking", "environmental"]);
        expect(description.assumptions.map((item) => item.label)).toEqual(["Monthly mileage"]);

        /* The original answers are untouched. */
        expect(before.priorities[0]).toBe("safetyAssistance");
        expect(before.features.comfort.some((item) => item.key === "hasElectricFrontSeatAdjustment")).toBe(false);
    });

    it("takes a budget figure the reader typed, when the model had none", () => {
        const before = answers();
        const validated = validateChange(
            change({ budgetWithoutFigure: "you'd like to keep costs reasonable" }),
            before,
        );

        expect(applyChange(before, validated, 650).preferences.monthlyBudget).toBe(650);
    });
});

describe("compareOutcomes", () => {
    it("reads a changed winner, and why, from the engine", () => {
        const before = answers({
            priorities: ["safetyAssistance", "cityParking", "practicality"] as CategoryId[],
        });
        const after = answers({
            priorities: ["comfort", "climateSuitability", "safetyAssistance"] as CategoryId[],
        });

        const beforeRec = run(before);
        const afterRec = run(after);

        expect(beforeRec.winner.id).not.toBe(afterRec.winner.id);

        const outcome = compareOutcomes({
            cars: cars(),
            before: beforeRec,
            after: afterRec,
            beforeAnswers: before,
            afterAnswers: after,
        });

        expect(outcome.winnerChanged).toBe(true);
        expect(outcome.headline).toBe(
            `Your recommendation changed from ${beforeRec.winner.name} to ${afterRec.winner.name}.`,
        );
        expect(outcome.cause).toMatch(/^The biggest difference was /);
        expect(outcome.details.join(" ")).toMatch(/Overall match/);
    });

    it("says when nothing changed", () => {
        const same = answers();
        const rec = run(same);

        const outcome = compareOutcomes({
            cars: cars(),
            before: rec,
            after: run(same),
            beforeAnswers: same,
            afterAnswers: same,
        });

        expect(outcome.winnerChanged).toBe(false);
        expect(outcome.headline).toMatch(/is still your recommendation/);
        expect(outcome.cause).toBeNull();
    });
});

describe("the material sent to the model", () => {
    it("describes the vocabulary Lens actually has, and only raisable features", () => {
        const vocabulary = buildVocabulary();

        expect(vocabulary.categories.map((item) => item.id)).toEqual(CATEGORY_IDS);
        expect(
            vocabulary.categories
                .flatMap((item) => item.features.map((feature) => feature.id))
                .includes("hasAirConditioning"),
        ).toBe(false);
    });

    it("carries the current answers with their real weights", () => {
        const current = describeCurrent(answers());

        expect(current.priorities.map((item) => item.weightPercent)).toEqual([33, 27, 20, 13, 7]);
        expect(current.monthlyBudget).toBeNull();
    });

    it("grounds facts in the recommendation, for every priority of every contender", () => {
        const value = answers();
        const rec = run(value);
        const narrative = buildAdviceNarrative(rec.evaluation, rec.context, rec.alternatives);
        const facts = buildLensFacts(rec, narrative) as {
            recommendation: { car: string };
            ranking: unknown[];
            cars: { priorities: unknown[] }[];
            limitations: string[];
        };

        expect(facts.recommendation.car).toBe(rec.winner.name);
        expect(facts.ranking).toHaveLength(4);
        expect(facts.cars[0]?.priorities).toHaveLength(CATEGORY_IDS.length);
        expect(facts.limitations.length).toBeGreaterThan(0);

        /* It must serialise: this is what goes over the wire. */
        expect(() => JSON.stringify(facts)).not.toThrow();
    });
});
