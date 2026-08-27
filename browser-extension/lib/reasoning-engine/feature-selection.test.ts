import { describe, expect, it } from "vitest";

import { buildReasoningContext, buildRecommendation } from "./index";
import { buildAdviceNarrative } from "./narrative";
import { categoryDetail, featurePhrase } from "./scoring";
import {
  AVAILABLE_CATEGORY_FEATURES,
  DEFAULT_CATEGORY_FEATURES,
  FEATURES,
  MAX_FEATURES_PER_CATEGORY,
} from "./constants";
import { makeCar, prefs } from "./test-fixtures";
import type { CategoryId, FeatureSelection } from "./types";

/**
 * The feature-selection model.
 *
 * The user says how much a category matters by where they rank it, and which
 * things inside it they care about by picking them out. Those are two
 * different questions, asked once each. Everything here guards that split.
 */

const preferences = prefs({ monthlyBudget: 0, monthlyKm: 500 });

const features = (
  overrides: Partial<Record<CategoryId, FeatureSelection>> = {},
): Record<CategoryId, FeatureSelection> => ({
  ...DEFAULT_CATEGORY_FEATURES,
  ...overrides,
});

const detailFor = (
  vehicleFeatures: string[],
  selection: FeatureSelection,
  category: CategoryId = "safetyAssistance",
) => {
  const car = makeCar({ id: 1, features: vehicleFeatures as never });
  const other = makeCar({ id: 2 });

  return categoryDetail(
    category,
    car,
    [car, other],
    preferences,
    features({ [category]: selection }),
  );
};

/* -------------------------------------------------------------------------- */
/* No grading                                                                 */
/* -------------------------------------------------------------------------- */

describe("a picked feature is a picked feature", () => {
  /*
   * The old model weighted features 5 / 3 / 1 by a tier the user assigned.
   * Nothing may reintroduce that: within a category every pick counts the
   * same, because the reader was only ever asked whether it matters.
   */
  it("counts every pick equally", () => {
    const selection: FeatureSelection = [
      "hasEmergencyBrakingAssist",
      "hasBlindSpotAssist",
      "hasLaneKeepingAssist",
      "hasEmergencyCallSystem",
    ];

    /* Which two the car has must not change the score. */
    const first = detailFor(
      ["hasEmergencyBrakingAssist", "hasBlindSpotAssist"],
      selection,
    );

    const second = detailFor(
      ["hasLaneKeepingAssist", "hasEmergencyCallSystem"],
      selection,
    );

    expect(first.featureScore).toBe(50);
    expect(second.featureScore).toBe(50);
  });

  it("scores the share of what was picked out", () => {
    const selection: FeatureSelection = [
      "hasEmergencyBrakingAssist",
      "hasBlindSpotAssist",
      "hasLaneKeepingAssist",
      "hasEmergencyCallSystem",
    ];

    expect(detailFor([], selection).featureScore).toBe(0);
    expect(
      detailFor(["hasEmergencyBrakingAssist"], selection).featureScore,
    ).toBe(25);
    expect(detailFor(selection, selection).featureScore).toBe(100);
  });

  it("stores no importance alongside a pick", () => {
    for (const id of Object.keys(DEFAULT_CATEGORY_FEATURES) as CategoryId[]) {
      for (const entry of DEFAULT_CATEGORY_FEATURES[id]) {
        expect(typeof entry).toBe("string");
      }
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Picking nothing                                                            */
/* -------------------------------------------------------------------------- */

describe("picking nothing is an answer, not an empty form", () => {
  const empty: FeatureSelection = [];

  it("falls back to the category's own catalogue", () => {
    const detail = detailFor(
      ["hasEmergencyBrakingAssist", "hasBlindSpotAssist"],
      empty,
    );

    expect(detail.basis).toBe("category");
    expect(detail.hasEvidence).toBe(true);

    const catalogue = AVAILABLE_CATEGORY_FEATURES.safetyAssistance.length;

    expect(detail.featureScore).toBe(Math.round((2 / catalogue) * 100));
  });

  /* The whole point: it must still tell two cars apart. */
  it("still separates a well-equipped car from a bare one", () => {
    const loaded = detailFor(
      [
        "hasEmergencyBrakingAssist",
        "hasBlindSpotAssist",
        "hasLaneKeepingAssist",
        "hasEmergencyCallSystem",
      ],
      empty,
    );

    const bare = detailFor([], empty);

    expect(loaded.featureScore).toBeGreaterThan(bare.featureScore ?? 0);
  });

  it("never reports it as a shortfall against the user", () => {
    const cars = [
      makeCar({ id: 1, name: "Alpha One", features: ["hasIsofix"] }),
      makeCar({ id: 2, name: "Beta Two" }),
    ];

    const result = buildRecommendation(
      cars,
      ["safetyAssistance", "practicality"],
      preferences,
      features({ safetyAssistance: [], practicality: [] }),
    )!;

    const narrative = buildAdviceNarrative(
      result.evaluation,
      result.context,
      result.alternatives,
    );

    for (const tradeoff of narrative.tradeoffs) {
      expect(tradeoff.kind).not.toBe("missingSelected");
    }
  });

  /* A category with no catalogue at all is a different thing entirely. */
  it("leaves a purely numeric category measured from vehicle data", () => {
    const detail = detailFor([], [], "environmental");

    expect(detail.basis).toBe("none");
    expect(detail.featureScore).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* Priorities outrank picks                                                   */
/* -------------------------------------------------------------------------- */

describe("the priority order decides importance, not the picks", () => {
  /*
   * Two cars, each strong in one category. Which one wins must follow the
   * order the user put the categories in — if a pick could outweigh that,
   * the same preference would be expressed twice and fight itself.
   */
  const safeCar = makeCar({
    id: 1,
    name: "Safe One",
    trunk: 300,
    features: [
      "hasEmergencyBrakingAssist",
      "hasBlindSpotAssist",
      "hasLaneKeepingAssist",
      "hasEmergencyCallSystem",
    ],
  });

  const roomyCar = makeCar({
    id: 2,
    name: "Roomy Two",
    trunk: 1600,
    features: [
      "hasSplitFoldingRearSeats",
      "hasElectricTailgate",
      "hasRoofRails",
      "hasTowbar",
    ],
  });

  const cars = [safeCar, roomyCar];

  it("follows the order when both are picked over equally", () => {
    const safetyFirst = buildRecommendation(
      cars,
      ["safetyAssistance", "practicality"],
      preferences,
      features(),
    )!;

    const practicalityFirst = buildRecommendation(
      cars,
      ["practicality", "safetyAssistance"],
      preferences,
      features(),
    )!;

    expect(safetyFirst.winner.id).toBe(safeCar.id);
    expect(practicalityFirst.winner.id).toBe(roomyCar.id);
  });

  /* Picking more things in a low-ranked category must not promote it. */
  it("doesn't let a fuller selection outrank a higher priority", () => {
    const result = buildRecommendation(
      cars,
      ["safetyAssistance", "practicality"],
      preferences,
      features({
        safetyAssistance: ["hasEmergencyBrakingAssist"],
        practicality: AVAILABLE_CATEGORY_FEATURES.practicality.slice(0, 5),
      }),
    )!;

    expect(result.winner.id).toBe(safeCar.id);
  });

  it("keeps the weighting a function of position alone", () => {
    const sparse = buildReasoningContext(
      cars,
      ["safetyAssistance", "practicality"],
      preferences,
      features({ safetyAssistance: ["hasEmergencyBrakingAssist"] }),
    );

    const full = buildReasoningContext(
      cars,
      ["safetyAssistance", "practicality"],
      preferences,
      features(),
    );

    expect(sparse.weights).toEqual(full.weights);
  });
});

/* -------------------------------------------------------------------------- */
/* Picks are not requirements                                                 */
/* -------------------------------------------------------------------------- */

describe("a pick is an interest, never a requirement", () => {
  it("lets a car win while missing something the user picked out", () => {
    const missingButBetter = makeCar({
      id: 1,
      name: "Alpha One",
      trunk: 1600,
      features: ["hasEmergencyBrakingAssist", "hasBlindSpotAssist"],
    });

    const hasItButWorse = makeCar({
      id: 2,
      name: "Beta Two",
      trunk: 250,
      features: ["hasAdaptiveCruiseControl"],
    });

    const result = buildRecommendation(
      [missingButBetter, hasItButWorse],
      ["safetyAssistance", "practicality"],
      preferences,
      features({
        safetyAssistance: [
          "hasEmergencyBrakingAssist",
          "hasBlindSpotAssist",
          "hasAdaptiveCruiseControl",
        ],
      }),
    )!;

    expect(result.winner.id).toBe(missingButBetter.id);
    expect(result.ranked).toHaveLength(2);
  });

  it("surfaces the gap as a tradeoff, in the user's own words", () => {
    const car = makeCar({
      id: 1,
      name: "Alpha One",
      features: ["hasEmergencyBrakingAssist"],
    });

    const other = makeCar({
      id: 2,
      name: "Beta Two",
      features: ["hasEmergencyBrakingAssist", "hasAdaptiveCruiseControl"],
    });

    const result = buildRecommendation(
      [car, other],
      ["safetyAssistance"],
      preferences,
      features({
        safetyAssistance: [
          "hasEmergencyBrakingAssist",
          "hasAdaptiveCruiseControl",
        ],
      }),
    )!;

    const narrative = buildAdviceNarrative(
      result.evaluation,
      result.context,
      result.alternatives,
    );

    const gap = narrative.tradeoffs.find(
      (item) => item.kind === "missingSelected",
    );

    if (gap) {
      expect(gap.sentences.join(" ")).toMatch(/picked/i);
      expect(gap.sentences.join(" ")).toMatch(/not a reason the car is ruled out/i);
      expect(gap.sentences.join(" ")).not.toMatch(
        /essential|luxury|good to have|disqualif|requirement/i,
      );
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Prose                                                                      */
/* -------------------------------------------------------------------------- */

describe("feature names read as English inside a sentence", () => {
  it("gives countable singulars an article", () => {
    expect(featurePhrase("hasTowbar")).toBe("a towbar");
    expect(featurePhrase("hasAuxiliaryHeater")).toBe("an auxiliary heater");
    expect(featurePhrase("hasElectricTailgate")).toBe("an electric tailgate");
  });

  it("leaves plurals and mass nouns alone", () => {
    expect(featurePhrase("hasHeatedSeats")).toBe("heated seats");
    expect(featurePhrase("hasAirConditioning")).toBe("air conditioning");
    expect(featurePhrase("hasAdaptiveCruiseControl")).toBe(
      "adaptive cruise control",
    );
  });

  it("keeps acronyms and symbols as written", () => {
    expect(featurePhrase("hasIsofix")).toBe("ISOFIX child seat anchors");
    expect(featurePhrase("hasThreeSixtyDegreesCamera")).toBe("a 360° camera");
  });

  /* A heading is not a clause: "No towbar" is right, "No a towbar" is not. */
  it("keeps the bare label available for headings", () => {
    expect(FEATURES.hasTowbar.label).toBe("Towbar");
  });
});

/* -------------------------------------------------------------------------- */
/* The cap                                                                    */
/* -------------------------------------------------------------------------- */

describe("the cap is a ceiling on picks, not a quota", () => {
  it("offers more than five wherever it caps at five", () => {
    for (const id of Object.keys(DEFAULT_CATEGORY_FEATURES) as CategoryId[]) {
      if (DEFAULT_CATEGORY_FEATURES[id].length < MAX_FEATURES_PER_CATEGORY) {
        continue;
      }

      expect(
        AVAILABLE_CATEGORY_FEATURES[id].length,
      ).toBeGreaterThan(MAX_FEATURES_PER_CATEGORY);
    }
  });

  it("scores a partial selection on its own size", () => {
    const selection: FeatureSelection = [
      "hasEmergencyBrakingAssist",
      "hasBlindSpotAssist",
    ];

    /* Two of two picked, both present — a full match, not 2/5. */
    expect(detailFor(selection, selection).featureScore).toBe(100);
  });
});
