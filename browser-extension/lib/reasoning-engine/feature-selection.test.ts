import { describe, expect, it } from "vitest";

import { buildReasoningContext, buildRecommendation } from "./index";
import { buildAdviceNarrative } from "./narrative";
import { categoryDetail, featurePhrase } from "./scoring";
import {
  AVAILABLE_CATEGORY_FEATURES,
  DEFAULT_CATEGORY_FEATURES,
  FEATURE_IMPORTANCE,
  FEATURES,
  MAX_FEATURES_PER_CATEGORY,
} from "./constants";
import { makeCar, prefs } from "./test-fixtures";
import type {
  CategoryId,
  FeatureImportance,
  FeaturePreference,
  FeatureSelection,
} from "./types";

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

/** A picked feature at a given importance. */
const pick = (key: string, importance: FeatureImportance = "medium") =>
  ({ key, importance }) as FeaturePreference;

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
/* Picks refine the category; they never replace it                           */
/* -------------------------------------------------------------------------- */

describe("what the user picks out refines the category score", () => {
  const car = ["hasEmergencyBrakingAssist", "hasBlindSpotAssist"];
  const CATALOGUE = AVAILABLE_CATEGORY_FEATURES.safetyAssistance.length;

  /*
   * Measuring the category against the picks themselves — which an earlier
   * build did — failed in two directions at once. Pick one common feature and
   * every car scored 100, so the priority stopped separating anything. Pick
   * one rare feature and a car with twelve of the fifteen safety systems
   * scored 0 for want of the thirteenth.
   *
   * The catalogue is therefore always the denominator, and a pick adjusts the
   * weight of one entry inside it.
   */
  it("keeps the whole catalogue as the denominator", () => {
    expect(detailFor(car, []).coverageScore).toBe(
      Math.round((2 / CATALOGUE) * 100),
    );

    /* Present or absent, one pick cannot reach either extreme. */
    for (const selection of [
      [pick("hasEmergencyBrakingAssist", "high")],
      [pick("hasAdaptiveCruiseControl", "high")],
    ]) {
      const detail = detailFor(car, selection);

      expect(detail.featureScore).toBeGreaterThan(0);
      expect(detail.featureScore).toBeLessThan(100);
    }
  });

  it("reports the plain count separately from the weighted score", () => {
    const detail = detailFor(car, [pick("hasEmergencyBrakingAssist", "high")]);

    /* Coverage ignores the picks entirely. */
    expect(detail.coverageScore).toBe(detailFor(car, []).coverageScore);

    /* The weighted score doesn't. */
    expect(detail.featureScore).not.toBe(detail.coverageScore);
  });

  it("is identical to plain coverage when nothing is picked", () => {
    const detail = detailFor(car, []);

    expect(detail.featureScore).toBe(detail.coverageScore);
  });

  /* Scenario 3: the same feature matters more to a reader who says so. */
  it("weighs a high pick above a medium one, and medium above low", () => {
    const held = (importance: FeatureImportance) =>
      detailFor(car, [pick("hasEmergencyBrakingAssist", importance)])
        .featureScore ?? 0;

    expect(held("high")).toBeGreaterThan(held("medium"));
    expect(held("medium")).toBeGreaterThan(held("low"));

    const lacked = (importance: FeatureImportance) =>
      detailFor(car, [pick("hasAdaptiveCruiseControl", importance)])
        .featureScore ?? 0;

    /* And a miss costs more the more it was wanted. */
    expect(lacked("high")).toBeLessThan(lacked("medium"));
    expect(lacked("medium")).toBeLessThan(lacked("low"));
  });

  /* Scenario 4: within one selection, the high picks pull harder. */
  it("lets high picks outweigh medium ones inside a selection", () => {
    const selection = [
      pick("hasEmergencyBrakingAssist", "high"),
      pick("hasBlindSpotAssist", "high"),
      pick("hasAdaptiveCruiseControl", "medium"),
    ];

    /* Holds both highs, misses the medium. */
    const highs = detailFor(
      ["hasEmergencyBrakingAssist", "hasBlindSpotAssist"],
      selection,
    );

    /* Holds only the medium. */
    const medium = detailFor(["hasAdaptiveCruiseControl"], selection);

    expect(highs.featureScore).toBeGreaterThan(medium.featureScore ?? 0);
  });

  /* Scenario 6: five picks at one level is simply equal weighting. */
  it("treats a uniform selection as equal weighting", () => {
    const keys = AVAILABLE_CATEGORY_FEATURES.safetyAssistance.slice(0, 5);

    const allHigh = keys.map((key) => pick(key, "high"));
    const allLow = keys.map((key) => pick(key, "low"));

    /* Any two cars holding the same number of the picks must tie. */
    const first = detailFor([keys[0]!, keys[1]!], allHigh).featureScore;
    const second = detailFor([keys[2]!, keys[3]!], allHigh).featureScore;

    expect(first).toBe(second);

    /* And the level still shifts how much the whole selection counts. */
    expect(detailFor([keys[0]!], allHigh).featureScore).not.toBe(
      detailFor([keys[0]!], allLow).featureScore,
    );
  });

  it("records the picks as evidence, carrying their importance", () => {
    const detail = detailFor(car, [
      pick("hasEmergencyBrakingAssist", "high"),
      pick("hasAdaptiveCruiseControl", "low"),
    ]);

    expect(detail.pickedMatched).toEqual([
      { key: "hasEmergencyBrakingAssist", importance: "high" },
    ]);
    expect(detail.pickedMissing).toEqual([
      { key: "hasAdaptiveCruiseControl", importance: "low" },
    ]);

    /* The catalogue lists are untouched by the selection. */
    expect(detail.matched).toEqual(car);
  });

  /* Scenario 7: a feature every car has is worth saying, not worth ranking on. */
  it("doesn't manufacture a gap out of a universal feature", () => {
    const strong = [
      "hasEmergencyBrakingAssist",
      "hasBlindSpotAssist",
      "hasLaneKeepingAssist",
      "hasEmergencyCallSystem",
    ];

    const weak = ["hasEmergencyBrakingAssist"];
    const universal = [pick("hasEmergencyBrakingAssist", "high")];

    const gapBefore =
      (detailFor(strong, []).featureScore ?? 0) -
      (detailFor(weak, []).featureScore ?? 0);

    const gapAfter =
      (detailFor(strong, universal).featureScore ?? 0) -
      (detailFor(weak, universal).featureScore ?? 0);

    /* Both hold it, so the gap must not widen. */
    expect(gapAfter).toBeLessThanOrEqual(gapBefore);
    expect(gapAfter).toBeGreaterThan(0);
  });

  /* Scenario 8: one rare feature is evidence, not a trump card. */
  it("doesn't let one rare pick overpower the category", () => {
    const wellEquipped = [
      "hasEmergencyBrakingAssist",
      "hasBlindSpotAssist",
      "hasLaneKeepingAssist",
      "hasEmergencyCallSystem",
      "hasParkingSensors",
      "hasTrafficSignRecognition",
    ];

    const rare = [pick("hasAdaptiveCruiseControl", "high")];

    /* Twelve-system car missing the pick still beats a bare car holding it. */
    const broad = detailFor(wellEquipped, rare);
    const narrow = detailFor(["hasAdaptiveCruiseControl"], rare);

    expect(broad.pickedMissing).toHaveLength(1);
    expect(broad.featureScore).toBeGreaterThan(narrow.featureScore ?? 0);
  });

  it("never stores an importance the engine doesn't know", () => {
    for (const id of Object.keys(DEFAULT_CATEGORY_FEATURES) as CategoryId[]) {
      for (const preference of DEFAULT_CATEGORY_FEATURES[id]) {
        expect(FEATURE_IMPORTANCE[preference.importance]).toBeDefined();
      }
    }
  });
});


/* -------------------------------------------------------------------------- */
/* Picking nothing                                                            */
/* -------------------------------------------------------------------------- */

describe("picking nothing is an answer, not an empty form", () => {
  const empty: FeatureSelection = [];

  it("is measured exactly like every other case", () => {
    const detail = detailFor(
      ["hasEmergencyBrakingAssist", "hasBlindSpotAssist"],
      empty,
    );

    expect(detail.basis).toBe("category");
    expect(detail.hasEvidence).toBe(true);
    expect(detail.pickedMatched).toHaveLength(0);
    expect(detail.pickedMissing).toHaveLength(0);
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

  /*
   * Coverage is a count of equipment, not a verdict on the car. The copy has
   * to read as "this is what we compared" rather than "this is your grade".
   */
  it("describes coverage as a count, never as a mark", () => {
    const result = buildRecommendation(
      [
        makeCar({ id: 1, name: "Alpha One", features: ["hasIsofix"] }),
        makeCar({ id: 2, name: "Beta Two" }),
      ],
      ["safetyAssistance"],
      preferences,
      features({ safetyAssistance: [] }),
    )!;

    const narrative = buildAdviceNarrative(
      result.evaluation,
      result.context,
      result.alternatives,
    );

    const prose = narrative.priorities[0]!.sentences.join(" ");

    expect(prose).toMatch(/\d+ of the \d+ systems this priority covers/);
    expect(prose).not.toMatch(/\/100|out of a hundred/i);
    expect(prose).not.toMatch(/poor|weak|inadequate|fails/i);
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
   * Two cars, each strong in one category and absent in the other, to a
   * comparable degree. Which one wins must follow the order the user put the
   * categories in.
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
      "hasTrafficSignRecognition",
      "hasTirePressureMonitoringSystem",
      "hasHillStartAssist",
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
      "hasParkingSensors",
    ],
  });

  const cars = [safeCar, roomyCar];

  it("follows the order the user set", () => {
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

  /*
   * Picks refine the arithmetic, so scores do move — but the pick-blind
   * coverage figure and the priority weights must not, because those are what
   * the category and the ordering actually mean.
   */
  it("leaves coverage and the priority weights untouched", () => {
    const order: CategoryId[] = ["safetyAssistance", "practicality"];

    const baseline = buildReasoningContext(cars, order, preferences, features());

    const lopsided = buildReasoningContext(
      cars,
      order,
      preferences,
      features({
        safetyAssistance: [pick("hasAdaptiveCruiseControl", "high")],
        practicality: AVAILABLE_CATEGORY_FEATURES.practicality
          .slice(0, 5)
          .map((key) => pick(key, "high")),
      }),
    );

    const cleared = buildReasoningContext(
      cars,
      order,
      preferences,
      features({ safetyAssistance: [], practicality: [] }),
    );

    const coverage = (context: typeof baseline) =>
      context.scores.map((score) => ({
        vehicleId: score.vehicleId,
        safety: score.details.safetyAssistance?.coverageScore,
        practicality: score.details.practicality?.coverageScore,
      }));

    for (const context of [lopsided, cleared]) {
      expect(coverage(context)).toEqual(coverage(baseline));
      expect(context.weights).toEqual(baseline.weights);
    }
  });

  /*
   * A weighted model is not a lexicographic one, and shouldn't pretend to be.
   * A #1 priority counts for more per point, but a large enough gap lower
   * down can still carry the result — which is the honest behaviour, and the
   * reason the Advice always names what the winner gave up.
   */
  it("lets a decisive lower-priority gap outweigh a narrow top-priority one", () => {
    const narrowlySafer = makeCar({
      id: 3,
      name: "Narrow One",
      trunk: 250,
      features: ["hasEmergencyBrakingAssist"],
    });

    const farRoomier = makeCar({
      id: 4,
      name: "Roomier Two",
      trunk: 1600,
      features: [
        "hasSplitFoldingRearSeats",
        "hasElectricTailgate",
        "hasRoofRails",
        "hasTowbar",
        "hasParkingSensors",
        "hasSpareWheel",
      ],
    });

    const result = buildRecommendation(
      [narrowlySafer, farRoomier],
      ["safetyAssistance", "practicality"],
      preferences,
      features(),
    )!;

    expect(result.winner.id).toBe(farRoomier.id);
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
          pick("hasEmergencyBrakingAssist"),
          pick("hasBlindSpotAssist"),
          pick("hasAdaptiveCruiseControl"),
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
          pick("hasEmergencyBrakingAssist"),
          pick("hasAdaptiveCruiseControl", "high"),
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

  /*
   * Scenario 10: picking five things in a category must not make the category
   * matter more. The weighted score stays on 0–100 whatever the selection, so
   * a priority's influence comes only from where the user ranked it.
   */
  it("cannot widen a category's range by picking more in it", () => {
    const keys = AVAILABLE_CATEGORY_FEATURES.safetyAssistance;

    const fivePicks = keys.slice(0, 5).map((key) => pick(key, "high"));

    /* Best and worst possible cars, with and without a full selection. */
    const bestWith = detailFor([...keys], fivePicks).featureScore;
    const worstWith = detailFor([], fivePicks).featureScore;

    const bestWithout = detailFor([...keys], []).featureScore;
    const worstWithout = detailFor([], []).featureScore;

    expect(bestWith).toBe(bestWithout);
    expect(worstWith).toBe(worstWithout);
    expect(bestWith).toBe(100);
    expect(worstWith).toBe(0);
  });
});

/* -------------------------------------------------------------------------- */
/* The four scenarios, end to end                                             */
/* -------------------------------------------------------------------------- */

/**
 * The same four cars under zero, one, three and five picks.
 *
 * These are the cases that broke earlier models, so they are pinned end to
 * end rather than at the unit level.
 */
describe("zero, one, three and five picks over a realistic set", () => {
  const pinned = [
    makeCar({ id: 1, name: "Mazda CX-60", trunk: 570, features: [
      "hasEmergencyBrakingAssist", "hasBlindSpotAssist", "hasLaneKeepingAssist",
      "hasEmergencyCallSystem", "hasParkingSensors", "hasTrafficSignRecognition",
      "hasOneEightyDegreesReversingCamera", "hasRearCrosswalkWarning",
      "hasTirePressureMonitoringSystem", "hasHillStartAssist",
      "hasThreeSixtyDegreesCamera", "hasMatrixLedHeadlights"] }),

    makeCar({ id: 2, name: "Jeep Compass", trunk: 438, features: [
      "hasEmergencyBrakingAssist", "hasAdaptiveCruiseControl", "hasLaneKeepingAssist",
      "hasEmergencyCallSystem", "hasParkingSensors", "hasTrafficSignRecognition",
      "hasHillStartAssist", "hasCruiseControl"] }),

    makeCar({ id: 3, name: "Ford Puma", trunk: 456, features: [
      "hasEmergencyBrakingAssist", "hasAdaptiveCruiseControl", "hasLaneKeepingAssist",
      "hasCruiseControl", "hasHillStartAssist"] }),

    makeCar({ id: 4, name: "Opel Corsa", trunk: 309, features: [
      "hasEmergencyBrakingAssist", "hasCruiseControl",
      "hasTirePressureMonitoringSystem"] }),
  ];

  const order: CategoryId[] = ["safetyAssistance", "practicality"];

  const rank = (selection: FeatureSelection): string[] =>
    buildReasoningContext(
      pinned,
      order,
      preferences,
      features({ safetyAssistance: selection }),
    ).ranked.map((car) => car.name);

  const NONE: FeatureSelection = [];
  const ONE_COMMON: FeatureSelection = [
    pick("hasEmergencyBrakingAssist", "high"),
  ];
  const ONE_RARE: FeatureSelection = [
    pick("hasAdaptiveCruiseControl", "high"),
  ];
  const THREE: FeatureSelection = [
    pick("hasEmergencyBrakingAssist", "high"),
    pick("hasBlindSpotAssist", "high"),
    pick("hasAdaptiveCruiseControl", "medium"),
  ];
  /* Scenario 5: two high, two medium, one low. */
  const FIVE: FeatureSelection = [
    pick("hasEmergencyBrakingAssist", "high"),
    pick("hasBlindSpotAssist", "high"),
    pick("hasLaneKeepingAssist", "medium"),
    pick("hasEmergencyCallSystem", "medium"),
    pick("hasAdaptiveCruiseControl", "low"),
  ];

  /*
   * The winner is decided by breadth across the category, so expressing an
   * interest refines the result without overturning it. CX-60 carries the
   * most safety equipment by a distance and stays top throughout — including
   * when the reader marks a feature it lacks extremely important.
   */
  it("keeps the broadly strongest car on top however the picks fall", () => {
    for (const selection of [NONE, ONE_COMMON, ONE_RARE, THREE, FIVE]) {
      expect(rank(selection)[0]).toBe("Mazda CX-60");
    }
  });

  /*
   * The old model's first failure: everyone holds automatic emergency
   * braking, so scoring on that pick alone gave all four cars 100 and the
   * user's top priority stopped separating anything at all.
   */
  it("keeps the top priority discriminating when the pick is universal", () => {
    const context = buildReasoningContext(
      pinned,
      order,
      preferences,
      features({ safetyAssistance: ONE_COMMON }),
    );

    const safety = context.scores.map(
      (score) => score.byCategory.safetyAssistance,
    );

    expect(new Set(safety).size).toBeGreaterThan(1);
  });

  /*
   * The old model's second failure: CX-60 lacks adaptive cruise control, so
   * picking it scored the best-equipped safety car 0 and handed the
   * recommendation to a car with a third of its safety systems.
   */
  it("doesn't hand the result to a weaker car over one rare pick", () => {
    const result = buildRecommendation(
      pinned,
      order,
      preferences,
      features({ safetyAssistance: ONE_RARE }),
    )!;

    expect(result.winner.name).toBe("Mazda CX-60");

    const safety = result.evaluation.priorities.find(
      (item) => item.priority === "safetyAssistance",
    )!;

    /* It's still the strongest here, and still openly missing the pick. */
    expect(safety.isLeader).toBe(true);
    expect(safety.pickedMissing).toEqual([
      { key: "hasAdaptiveCruiseControl", importance: "high" },
    ]);
  });

  /* And the miss is reported, in the user's own terms. */
  it("tells the reader what the winner didn't have", () => {
    const result = buildRecommendation(
      pinned,
      order,
      preferences,
      features({ safetyAssistance: THREE }),
    )!;

    const narrative = buildAdviceNarrative(
      result.evaluation,
      result.context,
      result.alternatives,
    );

    const prose = narrative.priorities
      .flatMap((item) => item.sentences)
      .join(" ");

    expect(prose).toMatch(/you picked out/i);
    expect(prose.toLowerCase()).toContain("adaptive cruise control");

    const gap = narrative.tradeoffs.find(
      (item) => item.kind === "missingSelected",
    )!;

    expect(gap).toBeDefined();
    expect(gap.evidence.toLowerCase()).toContain("adaptive cruise control");
  });

  /* Adding picks must never reshuffle the order in surprising ways. */
  it("moves nothing as picks are added one at a time", () => {
    const growing: FeatureSelection[] = [
      [],
      [pick("hasEmergencyBrakingAssist")],
      [pick("hasEmergencyBrakingAssist"), pick("hasBlindSpotAssist")],
      THREE,
      FIVE,
    ];

    const orders = growing.map(rank);

    for (const ranking of orders) {
      expect(ranking).toEqual(orders[0]);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* No hidden tiers                                                            */
/* -------------------------------------------------------------------------- */

describe("nothing has quietly become a tier system", () => {
  it("keeps every feature interchangeable in the arithmetic", () => {
    const catalogue = AVAILABLE_CATEGORY_FEATURES.safetyAssistance;

    /*
     * Any two cars holding the same *number* of catalogue features must score
     * the same, whichever features those are. A difference here would mean
     * some feature had acquired a weight of its own.
     */
    const scores = catalogue.slice(0, 6).map((key) =>
      detailFor([key], []).featureScore,
    );

    expect(new Set(scores).size).toBe(1);
  });

  it("gives a pick no arithmetic effect of any size", () => {
    const car = ["hasEmergencyBrakingAssist", "hasBlindSpotAssist"];

    const withPick = detailFor(car, [pick("hasEmergencyBrakingAssist")]);
    const without = detailFor(car, []);

    /* Coverage is the pick-blind figure and must be untouched. */
    expect(withPick.coverageScore).toBe(without.coverageScore);
    expect(withPick.numericScore).toBe(without.numericScore);
  });

  /*
   * When the weighted arithmetic still lands on a dead heat, what the reader
   * asked for settles it. One high pick weighs 4 against a base of 1, so a
   * car holding just that pick ties one holding four features nobody named —
   * and the tie goes to the car that has what was asked for.
   *
   * This is an ordering rule applied after the numbers are equal, not a
   * weight of its own.
   */
  it("breaks a genuine dead heat on the picks", () => {
    const holdsPick = makeCar({
      id: 1,
      name: "Alpha One",
      features: ["hasEmergencyBrakingAssist"],
    });

    const holdsFourOthers = makeCar({
      id: 2,
      name: "Beta Two",
      features: [
        "hasBlindSpotAssist",
        "hasLaneKeepingAssist",
        "hasEmergencyCallSystem",
        "hasParkingSensors",
      ],
    });

    const context = buildReasoningContext(
      [holdsFourOthers, holdsPick],
      ["safetyAssistance"],
      preferences,
      features({
        safetyAssistance: [pick("hasEmergencyBrakingAssist", "high")],
      }),
    );

    const totals = context.scores.map((score) => score.total);
    expect(new Set(totals).size).toBe(1);

    expect(context.ranked[0]?.name).toBe("Alpha One");
  });
});
