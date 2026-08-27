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
/* Picks are evidence, not arithmetic                                         */
/* -------------------------------------------------------------------------- */

describe("what the user picks out never moves the score", () => {
  const car = ["hasEmergencyBrakingAssist", "hasBlindSpotAssist"];

  /*
   * The measurement is the category, always. Measuring against the picks
   * instead failed in two directions at once: pick one common feature and
   * every car scores 100, so the priority stops separating anything; pick one
   * rare feature and a car with twelve of the fifteen safety systems scores 0
   * for want of the thirteenth.
   */
  it("scores the category the same whatever was picked out", () => {
    const none = detailFor(car, []);

    const variants = [
      detailFor(car, ["hasAdaptiveCruiseControl"]),
      detailFor(car, [
        "hasEmergencyBrakingAssist",
        "hasBlindSpotAssist",
        "hasAdaptiveCruiseControl",
      ]),
      detailFor(car, [
        "hasEmergencyBrakingAssist",
        "hasBlindSpotAssist",
        "hasLaneKeepingAssist",
        "hasEmergencyCallSystem",
        "hasAdaptiveCruiseControl",
      ]),
    ];

    for (const detail of variants) {
      expect(detail.featureScore).toBe(none.featureScore);
      expect(detail.score).toBe(none.score);
    }
  });

  it("measures the share of the category's own catalogue", () => {
    const catalogue = AVAILABLE_CATEGORY_FEATURES.safetyAssistance;

    expect(detailFor(car, []).featureScore).toBe(
      Math.round((2 / catalogue.length) * 100),
    );

    expect(detailFor([], []).featureScore).toBe(0);
    expect(detailFor([...catalogue], []).featureScore).toBe(100);
  });

  /* One rare pick must not turn a well-equipped car into a zero. */
  it("doesn't let a single pick collapse the category", () => {
    const wellEquipped = [
      "hasEmergencyBrakingAssist",
      "hasBlindSpotAssist",
      "hasLaneKeepingAssist",
      "hasEmergencyCallSystem",
      "hasParkingSensors",
      "hasTrafficSignRecognition",
    ];

    const detail = detailFor(wellEquipped, ["hasAdaptiveCruiseControl"]);

    expect(detail.pickedMatched).toHaveLength(0);
    expect(detail.pickedMissing).toEqual(["hasAdaptiveCruiseControl"]);

    /* Missing the one pick, and still clearly the stronger safety car. */
    expect(detail.featureScore).toBe(
      Math.round(
        (6 / AVAILABLE_CATEGORY_FEATURES.safetyAssistance.length) * 100,
      ),
    );
  });

  /* And one common pick must not flatten the category to a constant. */
  it("doesn't let a common pick erase the priority", () => {
    const pick: FeatureSelection = ["hasEmergencyBrakingAssist"];

    const strong = detailFor(
      [
        "hasEmergencyBrakingAssist",
        "hasBlindSpotAssist",
        "hasLaneKeepingAssist",
        "hasEmergencyCallSystem",
      ],
      pick,
    );

    const weak = detailFor(["hasEmergencyBrakingAssist"], pick);

    /* Both hold the pick; the category still tells them apart. */
    expect(strong.pickedMatched).toEqual(weak.pickedMatched);
    expect(strong.featureScore).toBeGreaterThan(weak.featureScore ?? 0);
  });

  it("records the picks as evidence, separately from the score", () => {
    const detail = detailFor(car, [
      "hasEmergencyBrakingAssist",
      "hasAdaptiveCruiseControl",
    ]);

    expect(detail.pickedMatched).toEqual(["hasEmergencyBrakingAssist"]);
    expect(detail.pickedMissing).toEqual(["hasAdaptiveCruiseControl"]);

    /* The catalogue lists are untouched by the selection. */
    expect(detail.matched).toEqual(car);
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
   * The strong form: picks are not in the arithmetic at all, so no selection
   * anywhere can change a single score. This is what makes a pick safe to
   * make — the reader cannot wreck their ranking by expressing an interest.
   */
  it("produces identical scores however the picks are arranged", () => {
    const order: CategoryId[] = ["safetyAssistance", "practicality"];

    const baseline = buildReasoningContext(cars, order, preferences, features());

    const lopsided = buildReasoningContext(
      cars,
      order,
      preferences,
      features({
        safetyAssistance: ["hasAdaptiveCruiseControl"],
        practicality: AVAILABLE_CATEGORY_FEATURES.practicality.slice(0, 5),
      }),
    );

    const cleared = buildReasoningContext(
      cars,
      order,
      preferences,
      features({ safetyAssistance: [], practicality: [] }),
    );

    /*
     * Totals and category scores must be untouched. The picked lists on each
     * detail do differ — that is the evidence the picks exist to produce.
     */
    const numbers = (context: typeof baseline) =>
      context.scores.map((score) => ({
        vehicleId: score.vehicleId,
        total: score.total,
        byCategory: score.byCategory,
      }));

    for (const context of [lopsided, cleared]) {
      expect(numbers(context)).toEqual(numbers(baseline));
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

  /* Picking fewer things must not be punished, or rewarded. */
  it("treats a partial selection exactly like a full one", () => {
    const car = ["hasEmergencyBrakingAssist", "hasBlindSpotAssist"];

    const two = detailFor(car, [
      "hasEmergencyBrakingAssist",
      "hasBlindSpotAssist",
    ]);

    const five = detailFor(car, [
      "hasEmergencyBrakingAssist",
      "hasBlindSpotAssist",
      "hasLaneKeepingAssist",
      "hasEmergencyCallSystem",
      "hasAdaptiveCruiseControl",
    ]);

    expect(two.featureScore).toBe(five.featureScore);
  });
});

/* -------------------------------------------------------------------------- */
/* The four scenarios, end to end                                             */
/* -------------------------------------------------------------------------- */

/**
 * The same five cars under zero, one, three and five picks.
 *
 * These are the cases that broke the previous model, so they are pinned end
 * to end rather than at the unit level: the ranking must not move when the
 * user expresses an interest, because an interest is not a measurement.
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
  const ONE_COMMON: FeatureSelection = ["hasEmergencyBrakingAssist"];
  const ONE_RARE: FeatureSelection = ["hasAdaptiveCruiseControl"];
  const THREE: FeatureSelection = [
    "hasEmergencyBrakingAssist",
    "hasBlindSpotAssist",
    "hasAdaptiveCruiseControl",
  ];
  const FIVE: FeatureSelection = [
    "hasEmergencyBrakingAssist",
    "hasBlindSpotAssist",
    "hasLaneKeepingAssist",
    "hasEmergencyCallSystem",
    "hasAdaptiveCruiseControl",
  ];

  it("ranks the set on the category, not on the picks", () => {
    const baseline = rank(NONE);

    /* CX-60 carries the most safety equipment, so it leads a safety-first order. */
    expect(baseline[0]).toBe("Mazda CX-60");

    for (const selection of [ONE_COMMON, ONE_RARE, THREE, FIVE]) {
      expect(rank(selection)).toEqual(baseline);
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
    expect(safety.pickedMissing).toEqual(["hasAdaptiveCruiseControl"]);
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
      ["hasEmergencyBrakingAssist"],
      ["hasEmergencyBrakingAssist", "hasBlindSpotAssist"],
      ["hasEmergencyBrakingAssist", "hasBlindSpotAssist", "hasAdaptiveCruiseControl"],
      [
        "hasEmergencyBrakingAssist", "hasBlindSpotAssist",
        "hasAdaptiveCruiseControl", "hasLaneKeepingAssist",
      ],
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

    const withPick = detailFor(car, ["hasEmergencyBrakingAssist"]);
    const without = detailFor(car, []);

    expect(withPick.score).toBe(without.score);
    expect(withPick.featureScore).toBe(without.featureScore);
    expect(withPick.numericScore).toBe(without.numericScore);
  });

  /* The one exception, and it is an ordering rule rather than a weight. */
  it("breaks an exact tie on the picks, and only an exact tie", () => {
    const holdsPick = makeCar({
      id: 1,
      name: "Alpha One",
      features: ["hasEmergencyBrakingAssist"],
    });

    /* Same catalogue count, so identical scores — a genuine dead heat. */
    const lacksPick = makeCar({
      id: 2,
      name: "Beta Two",
      features: ["hasBlindSpotAssist"],
    });

    const context = buildReasoningContext(
      [lacksPick, holdsPick],
      ["safetyAssistance"],
      preferences,
      features({ safetyAssistance: ["hasEmergencyBrakingAssist"] }),
    );

    const totals = context.scores.map((score) => score.total);
    expect(new Set(totals).size).toBe(1);

    expect(context.ranked[0]?.name).toBe("Alpha One");
  });
});
