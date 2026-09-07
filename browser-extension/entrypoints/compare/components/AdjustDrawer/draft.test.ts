import { describe, expect, it } from "vitest";

import {
    DEFAULT_PREFERENCES,
    DEFAULT_PRIORITIES,
    MAX_FEATURES_PER_CATEGORY,
} from "@/lib/reasoning-engine/constants";
import type {
    CategoryId,
    FeatureId,
    FeatureSelection,
} from "@/lib/reasoning-engine/types";

import type { Answers } from "../../store";
import {
    clearFeatures,
    featuresChanged,
    restoreSavedFeatures,
    sameAnswers,
    setFeatureImportance,
    toggleFeature,
} from "./draft";

/**
 * The drawer's draft: the rules that used to live in the compare store, now
 * with no side effects at all.
 *
 * What is worth protecting is that an edit is a value rather than an event.
 * Nothing here may reach the store, the recommendation or disk, and every one
 * of these functions has to leave the answers it was given untouched — the
 * drawer keeps the applied answers and the draft side by side, and one of
 * them being quietly mutated is how a Save button starts lying.
 */

const category = "safetyAssistance" as CategoryId;
const feature = "hasBlindSpotAssist" as FeatureId;

function answers(features: FeatureSelection = []): Answers {
    return {
        priorities: [
            category,
            ...DEFAULT_PRIORITIES.filter((id) => id !== category).slice(0, 2),
        ],
        preferences: DEFAULT_PREFERENCES,
        features: { [category]: features } as Record<
            CategoryId,
            FeatureSelection
        >,
    };
}

describe("toggleFeature", () => {
    it("picks a feature out at the middle rung", () => {
        const next = toggleFeature(answers(), category, feature);

        expect(next.features[category]).toEqual([
            { key: feature, importance: "medium" },
        ]);
    });

    it("puts a picked feature back", () => {
        const picked = answers([{ key: feature, importance: "high" }]);

        expect(toggleFeature(picked, category, feature).features[category])
            .toEqual([]);
    });

    it("allows unpicking the last one", () => {
        const picked = answers([{ key: feature, importance: "medium" }]);

        /* An empty selection means "judge the category as a whole". */
        expect(
            toggleFeature(picked, category, feature).features[category],
        ).toHaveLength(0);
    });

    it("won't pick past the cap", () => {
        const full = answers(
            Array.from({ length: MAX_FEATURES_PER_CATEGORY }, (_, index) => ({
                key: `filler-${index}` as FeatureId,
                importance: "medium" as const,
            })),
        );

        expect(toggleFeature(full, category, feature)).toBe(full);
    });

    it("leaves the answers it was given alone", () => {
        const before = answers();
        const snapshot = JSON.stringify(before);

        toggleFeature(before, category, feature);

        expect(JSON.stringify(before)).toBe(snapshot);
    });
});

describe("setFeatureImportance", () => {
    it("re-grades one pick and nothing else", () => {
        const picked = answers([
            { key: feature, importance: "medium" },
            { key: "hasLaneAssist" as FeatureId, importance: "low" },
        ]);

        expect(
            setFeatureImportance(picked, category, feature, "high")
                .features[category],
        ).toEqual([
            { key: feature, importance: "high" },
            { key: "hasLaneAssist", importance: "low" },
        ]);
    });
});

describe("clearFeatures", () => {
    it("empties one category without touching the others", () => {
        const picked: Answers = {
            ...answers([{ key: feature, importance: "high" }]),
        };

        picked.features["comfortConvenience" as CategoryId] = [
            { key: "hasHeatedSeats" as FeatureId, importance: "low" },
        ];

        const next = clearFeatures(picked, category);

        expect(next.features[category]).toEqual([]);
        expect(
            next.features["comfortConvenience" as CategoryId],
        ).toHaveLength(1);
    });
});

describe("restoreSavedFeatures", () => {
    const saved = {
        [category]: [{ key: feature, importance: "low" }],
    } as Record<CategoryId, FeatureSelection>;

    it("puts the chosen priorities back to what is saved", () => {
        const edited = answers([{ key: feature, importance: "high" }]);

        expect(
            restoreSavedFeatures(edited, saved).features[category],
        ).toEqual([{ key: feature, importance: "low" }]);
    });

    it("copies rather than sharing the saved array", () => {
        const edited = answers([{ key: feature, importance: "high" }]);
        const restored = restoreSavedFeatures(edited, saved);

        expect(restored.features[category]).not.toBe(saved[category]);
    });
});

describe("featuresChanged", () => {
    const saved = {
        [category]: [{ key: feature, importance: "low" }],
    } as Record<CategoryId, FeatureSelection>;

    it("is false when the draft still matches what is saved", () => {
        expect(
            featuresChanged(
                answers([{ key: feature, importance: "low" }]),
                saved,
            ),
        ).toBe(false);
    });

    it("notices a re-graded pick", () => {
        expect(
            featuresChanged(
                answers([{ key: feature, importance: "high" }]),
                saved,
            ),
        ).toBe(true);
    });

    it("ignores a category the reader is no longer asked about", () => {
        const draft = answers([{ key: feature, importance: "low" }]);

        draft.features["comfortConvenience" as CategoryId] = [
            { key: "hasHeatedSeats" as FeatureId, importance: "high" },
        ];

        /* Not in `priorities`, so it is not somewhere they can see or reach. */
        expect(featuresChanged(draft, saved)).toBe(false);
    });
});

describe("sameAnswers", () => {
    it("is true for the same answers assembled differently", () => {
        const a = answers([{ key: feature, importance: "low" }]);
        const b: Answers = {
            features: a.features,
            preferences: { ...DEFAULT_PREFERENCES },
            priorities: [...a.priorities],
        };

        expect(sameAnswers(a, b)).toBe(true);
    });

    it("notices a reordered priority list, which is an actual change", () => {
        const a = answers();
        const [first, second, ...rest] = a.priorities;

        expect(
            sameAnswers(a, {
                ...a,
                priorities: [second, first, ...rest] as CategoryId[],
            }),
        ).toBe(false);
    });

    it("notices a changed driving assumption", () => {
        const a = answers();

        expect(
            sameAnswers(a, {
                ...a,
                preferences: { ...DEFAULT_PREFERENCES, monthlyBudget: 900 },
            }),
        ).toBe(false);
    });
});
