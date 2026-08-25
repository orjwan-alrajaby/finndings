import { describe, expect, it } from "vitest";

import {
  buildReasoningContext,
  buildRecommendation,
  evaluateVehicle,
  hotSeatOptions,
  migratePreferences,
} from "./index";
import { explainPriority, explainVerdict } from "./explain";
import type { CategoryId, FeatureWeight } from "./types";
import {
  CATEGORY_IDS,
  DEFAULT_CATEGORY_FEATURES,
  DEFAULT_PRIORITIES,
  DEFAULT_PROFILES,
} from "./constants";
import { makeCar, prefs } from "./test-fixtures";

const SAFETY_FIRST: CategoryId[] = ["safety", "practicality"];

const features = (
  overrides: Partial<Record<CategoryId, FeatureWeight[]>> = {},
): Record<CategoryId, FeatureWeight[]> => ({
  ...DEFAULT_CATEGORY_FEATURES,
  ...overrides,
});

describe("affordability is gone from the priority system", () => {
  it("is no longer a category", () => {
    expect(CATEGORY_IDS).not.toContain("affordability");
  });

  it("is not in the default priority order", () => {
    expect(DEFAULT_PRIORITIES).not.toContain("affordability");
  });

  it("is not in any shipped profile", () => {
    for (const profile of DEFAULT_PROFILES) {
      expect(profile.priorities).not.toContain("affordability");
    }
  });

  it("leaves every profile with a usable number of priorities", () => {
    for (const profile of DEFAULT_PROFILES) {
      expect(profile.priorities.length).toBeGreaterThanOrEqual(3);
      expect(profile.priorities.length).toBeLessThanOrEqual(5);
    }
  });

  it("does not let price influence a score in either direction", () => {
    // Two identical cars at wildly different prices must score identically.
    const cheap = makeCar({ id: 1, customerMonthly: 200, trunk: 400 });
    const dear = makeCar({ id: 2, customerMonthly: 2000, trunk: 400 });

    const context = buildReasoningContext(
      [cheap, dear],
      SAFETY_FIRST,
      prefs({ monthlyBudget: 0 }),
    );

    const [first, second] = context.scores;
    expect(first?.total).toBe(second?.total);
  });
});

describe("buildRecommendation", () => {
  const preferences = prefs({
    monthlyKm: 500,
    petrolPrice: 2,
    monthlyBudget: 600,
  });

  /* Scenario 3 — the cheapest car is not automatically the winner. */
  it("lets a pricier in-budget car win on the user's top priority", () => {
    // Both fit the €600 budget; B is dearer but far stronger on safety.
    const cheapWeakSafety = makeCar({
      id: 1,
      name: "Alpha One",
      customerMonthly: 400,
      consumption: 5,
      trunk: 520,
      features: ["hasEmergencyBrakingAssist", "hasLaneKeepingAssist"],
    });

    const dearStrongSafety = makeCar({
      id: 2,
      name: "Beta Two",
      customerMonthly: 540,
      consumption: 5,
      trunk: 390,
      features: [
        "hasEmergencyBrakingAssist",
        "hasLaneKeepingAssist",
        "hasBlindSpotAssist",
        "hasEmergencyCallSystem",
        "hasTirePressureMonitoringSystem",
        "hasTrafficSignRecognition",
      ],
    });

    const result = buildRecommendation(
      [cheapWeakSafety, dearStrongSafety],
      SAFETY_FIRST,
      preferences,
      features(),
    );

    expect(result).not.toBeNull();
    expect(result?.winner.id).toBe(2);
    expect(result?.isFallback).toBe(false);

    // And the win is backed by concrete numbers, not a vague assertion.
    const safety = result?.evaluation.priorities.find(
      (item) => item.priority === "safety",
    );

    expect(safety?.rank).toBe(1);
    expect(safety?.versus?.difference).toBeGreaterThan(0);
    expect(safety?.versus?.onlySubjectHas).toContain("Blind spot warning");
  });

  it("does not let an over-budget car beat an in-budget one", () => {
    // The over-budget car is stronger on every priority, and still loses.
    const affordable = makeCar({
      id: 1,
      customerMonthly: 400,
      consumption: 5,
      features: ["hasEmergencyBrakingAssist"],
    });

    const unaffordable = makeCar({
      id: 2,
      customerMonthly: 900,
      consumption: 5,
      features: [
        "hasEmergencyBrakingAssist",
        "hasBlindSpotAssist",
        "hasLaneKeepingAssist",
        "hasEmergencyCallSystem",
      ],
    });

    const result = buildRecommendation(
      [affordable, unaffordable],
      SAFETY_FIRST,
      preferences,
      features(),
    );

    expect(result?.winner.id).toBe(1);

    // The stronger car scores higher — it simply isn't eligible to win.
    const scores = result?.scores ?? [];
    const strongerTotal = scores.find((s) => s.vehicleId === 2)?.total ?? 0;
    const winnerTotal = scores.find((s) => s.vehicleId === 1)?.total ?? 0;
    expect(strongerTotal).toBeGreaterThan(winnerTotal);
  });

  /* Over-budget cars must stay inspectable, never hidden. */
  it("keeps over-budget cars in the ranking", () => {
    const affordable = makeCar({ id: 1, customerMonthly: 400, consumption: 5 });
    const unaffordable = makeCar({ id: 2, customerMonthly: 900, consumption: 5 });

    const result = buildRecommendation(
      [affordable, unaffordable],
      SAFETY_FIRST,
      preferences,
      features(),
    );

    expect(result?.ranked.map((car) => car.id).sort()).toEqual([1, 2]);
    expect(result?.budget.over.map((car) => car.id)).toEqual([2]);
    expect(result?.context.costs[2]?.budgetStatus).toBe("over");
  });

  /* Scenario 4 — nothing fits the budget. */
  it("falls back to the strongest priority match and marks it over budget", () => {
    const weaker = makeCar({
      id: 1,
      customerMonthly: 800,
      consumption: 5,
      features: ["hasEmergencyBrakingAssist"],
    });

    const stronger = makeCar({
      id: 2,
      customerMonthly: 900,
      consumption: 5,
      features: [
        "hasEmergencyBrakingAssist",
        "hasBlindSpotAssist",
        "hasLaneKeepingAssist",
        "hasEmergencyCallSystem",
      ],
    });

    const result = buildRecommendation(
      [weaker, stronger],
      SAFETY_FIRST,
      preferences,
      features(),
    );

    // A recommendation is still produced, rather than nothing at all.
    expect(result).not.toBeNull();
    expect(result?.winner.id).toBe(2);

    // But it is unambiguously flagged as not fitting the budget.
    expect(result?.isFallback).toBe(true);
    expect(result?.fallbackReason).toBe("allOverBudget");
    expect(result?.budget.anyFits).toBe(false);

    const cost = result?.context.costs[2];
    expect(cost?.budgetStatus).toBe("over");
    expect(cost?.budgetDifference).toBeGreaterThan(0);

    // €900 + €50 energy = €950 against a €600 budget.
    expect(cost?.totalMonthly).toBeCloseTo(950, 6);
    expect(cost?.budgetDifference).toBeCloseTo(350, 6);
  });

  it("distinguishes 'none fit' from 'we can't confirm any fit'", () => {
    const murkyA = makeCar({ id: 1, customerMonthly: 400, consumption: null });
    const murkyB = makeCar({ id: 2, customerMonthly: 420, consumption: null });

    const result = buildRecommendation(
      [murkyA, murkyB],
      SAFETY_FIRST,
      preferences,
      features(),
    );

    expect(result?.isFallback).toBe(true);
    expect(result?.fallbackReason).toBe("costUnconfirmed");
  });

  it("prefers a confirmed-affordable car over one with unknown cost", () => {
    const confirmed = makeCar({
      id: 1,
      customerMonthly: 400,
      consumption: 5,
      features: ["hasEmergencyBrakingAssist"],
    });

    // Stronger on safety, but its running cost can't be estimated at all.
    const murky = makeCar({
      id: 2,
      customerMonthly: 400,
      consumption: null,
      features: [
        "hasEmergencyBrakingAssist",
        "hasBlindSpotAssist",
        "hasLaneKeepingAssist",
        "hasEmergencyCallSystem",
      ],
    });

    const result = buildRecommendation(
      [confirmed, murky],
      SAFETY_FIRST,
      preferences,
      features(),
    );

    expect(result?.winner.id).toBe(1);
    expect(result?.isFallback).toBe(false);
  });

  /*
   * A budget-driven win is the easiest place for the engine to look
   * arbitrary, so the explanation has to name the constraint.
   */
  it("explains when a higher-scoring car was ruled out by the budget", () => {
    const affordable = makeCar({
      id: 1,
      name: "Alpha One",
      customerMonthly: 400,
      consumption: 5,
      features: ["hasEmergencyBrakingAssist"],
    });

    const stronger = makeCar({
      id: 2,
      name: "Beta Two",
      customerMonthly: 900,
      consumption: 5,
      features: [
        "hasEmergencyBrakingAssist",
        "hasBlindSpotAssist",
        "hasLaneKeepingAssist",
        "hasEmergencyCallSystem",
      ],
    });

    const result = buildRecommendation(
      [affordable, stronger],
      SAFETY_FIRST,
      preferences,
      features(),
    )!;

    expect(result.winner.id).toBe(1);

    // The winner is not the top scorer, and the verdict must not pretend it is.
    expect(result.evaluation.rank).toBeGreaterThan(1);

    const verdict = explainVerdict(result.evaluation);
    expect(verdict).toContain("isn't the highest-scoring car");
    expect(verdict).toContain("Beta Two");
    expect(verdict).not.toContain("strongest match");

    // The head-to-head names the budget as the reason, with the amount.
    const summary = result.evaluation.comparison!.summary;
    expect(summary).toContain("over your €600/month budget");
    expect(summary).toContain("isn't eligible to be recommended");
    expect(result.evaluation.comparison!.budget.other).toBe("over");
  });

  it("says 'strongest match' only when the winner really is the top scorer", () => {
    const best = makeCar({
      id: 1,
      customerMonthly: 400,
      consumption: 5,
      features: ["hasEmergencyBrakingAssist", "hasBlindSpotAssist"],
    });

    const worse = makeCar({ id: 2, customerMonthly: 400, consumption: 5 });

    const result = buildRecommendation(
      [best, worse],
      SAFETY_FIRST,
      preferences,
      features(),
    )!;

    expect(result.evaluation.rank).toBe(1);
    expect(explainVerdict(result.evaluation)).toContain("strongest match");
  });

  it("returns null only when there is nothing to compare", () => {
    expect(buildRecommendation([], SAFETY_FIRST, preferences)).toBeNull();
  });
});

describe("hot seat", () => {
  const preferences = prefs({ monthlyBudget: 0, monthlyKm: 500 });

  /*
   * Scenario 11 — five cars ranked C, A, E, B, D with C recommended.
   * Safety feature counts are chosen to force exactly that order.
   */
  const buildFive = () => {
    const safety: Array<[number, string, number]> = [
      [3, "Car C", 4],
      [1, "Car A", 3],
      [5, "Car E", 2],
      [2, "Car B", 1],
      [4, "Car D", 0],
    ];

    const pool = [
      "hasEmergencyBrakingAssist",
      "hasBlindSpotAssist",
      "hasLaneKeepingAssist",
      "hasEmergencyCallSystem",
    ] as const;

    return safety.map(([id, name, count]) =>
      makeCar({
        id,
        name,
        customerMonthly: 400,
        consumption: 5,
        trunk: 400,
        features: [...pool.slice(0, count)],
      }),
    );
  };

  const context = () =>
    buildReasoningContext(buildFive(), ["safety"], preferences, features());

  it("ranks the fixture set C, A, E, B, D", () => {
    expect(context().ranked.map((car) => car.name)).toEqual([
      "Car C",
      "Car A",
      "Car E",
      "Car B",
      "Car D",
    ]);
  });

  it("puts the selected car first, then its closest-ranked neighbours", () => {
    const ctx = context();
    const recommended = ctx.ranked[0]!.id;

    // C selected (rank 1) → C, A, E, B, D
    expect(
      hotSeatOptions(ctx, recommended, recommended).map((o) => o.vehicle.name),
    ).toEqual(["Car C", "Car A", "Car E", "Car B", "Car D"]);

    // A selected (rank 2) → A, C, E, B, D
    const aId = ctx.ranked[1]!.id;
    expect(
      hotSeatOptions(ctx, aId, recommended).map((o) => o.vehicle.name),
    ).toEqual(["Car A", "Car C", "Car E", "Car B", "Car D"]);
  });

  it("bounds the window instead of exposing the whole catalogue", () => {
    const many = Array.from({ length: 12 }, (_, index) =>
      makeCar({
        id: index + 1,
        name: `Car ${index + 1}`,
        customerMonthly: 400,
        consumption: 5,
        trunk: 300 + index * 10,
      }),
    );

    const ctx = buildReasoningContext(
      many,
      ["practicality"],
      preferences,
      features(),
    );

    const middle = ctx.ranked[6]!;
    const options = hotSeatOptions(ctx, middle.id, ctx.ranked[0]!.id);

    expect(options).toHaveLength(5);
    expect(options[0]?.vehicle.id).toBe(middle.id);
    expect(options[0]?.isSelected).toBe(true);
  });

  it("marks the recommendation wherever it lands in the window", () => {
    const ctx = context();
    const recommended = ctx.ranked[0]!.id;
    const options = hotSeatOptions(ctx, ctx.ranked[1]!.id, recommended);

    expect(options.filter((option) => option.isRecommendation)).toHaveLength(1);
    expect(
      options.find((option) => option.isRecommendation)?.vehicle.id,
    ).toBe(recommended);
  });

  /* Scenario 11 — selecting another car must not move the recommendation. */
  it("does not change the recommendation when another car is examined", () => {
    const cars = buildFive();

    const result = buildRecommendation(
      cars,
      ["safety"],
      preferences,
      features(),
    );

    const before = result!.winner.id;
    const other = result!.ranked[1]!;

    const hotSeat = evaluateVehicle(other, result!.context, {
      recommendedId: before,
    });

    expect(hotSeat.vehicle.id).toBe(other.id);
    expect(hotSeat.isRecommendation).toBe(false);
    expect(result!.winner.id).toBe(before);
  });

  /* Scenario 12 — a hot-seated car is explained on its own terms. */
  it("explains the hot-seat car using its own scores, features and cost", () => {
    const cars = buildFive();

    const result = buildRecommendation(
      cars,
      ["safety"],
      preferences,
      features(),
    )!;

    const carA = result.ranked[1]!;

    const evaluation = evaluateVehicle(carA, result.context, {
      recommendedId: result.winner.id,
    });

    expect(evaluation.rank).toBe(2);
    expect(evaluation.cost.vehicleId).toBe(carA.id);

    // It is compared against the recommendation, not against itself.
    expect(evaluation.comparison?.other.vehicleId).toBe(result.winner.id);

    // And the verdict never claims it won.
    const verdict = explainVerdict(evaluation);
    expect(verdict).toContain("not your recommendation");
    expect(verdict).toContain(String(evaluation.score.total));
  });

  it("evaluates an over-budget car the user selects, without hiding the cost", () => {
    const affordable = makeCar({ id: 1, customerMonthly: 400, consumption: 5 });
    const expensive = makeCar({ id: 2, customerMonthly: 900, consumption: 5 });

    const result = buildRecommendation(
      [affordable, expensive],
      SAFETY_FIRST,
      prefs({ monthlyKm: 500, petrolPrice: 2, monthlyBudget: 600 }),
      features(),
    )!;

    const evaluation = evaluateVehicle(expensive, result.context, {
      recommendedId: result.winner.id,
    });

    expect(evaluation.cost.breakdown.budgetStatus).toBe("over");
    expect(evaluation.cost.budgetSentence).toContain("over budget");
    expect(explainVerdict(evaluation)).toContain("over your budget");
  });

  it("judges the hot-seat car against exactly the same settings", () => {
    const cars = buildFive();
    const preferencesUsed = prefs({ monthlyKm: 777, monthlyBudget: 1234 });

    const result = buildRecommendation(
      cars,
      ["safety"],
      preferencesUsed,
      features(),
    )!;

    const evaluation = evaluateVehicle(result.ranked[2]!, result.context, {
      recommendedId: result.winner.id,
    });

    expect(result.context.preferences).toBe(preferencesUsed);
    expect(evaluation.cost.breakdown.monthlyKm).toBe(777);
    expect(evaluation.cost.breakdown.budget).toBe(1234);
    expect(evaluation.priorities.map((item) => item.priority)).toEqual(
      result.evaluation.priorities.map((item) => item.priority),
    );
  });
});

describe("comparative reasoning", () => {
  const preferences = prefs({ monthlyBudget: 0, monthlyKm: 500 });

  const setup = () => {
    const carC = makeCar({
      id: 3,
      name: "Car C",
      trunk: 390,
      features: [
        "hasEmergencyBrakingAssist",
        "hasBlindSpotAssist",
        "hasLaneKeepingAssist",
        "hasEmergencyCallSystem",
        "hasTirePressureMonitoringSystem",
        "hasTrafficSignRecognition",
      ],
    });

    const carA = makeCar({
      id: 1,
      name: "Car A",
      trunk: 520,
      features: [
        "hasEmergencyBrakingAssist",
        "hasLaneKeepingAssist",
        "hasSplitFoldingRearSeats",
        "hasTowbar",
        "hasRoofRails",
        "hasElectricTailgate",
      ],
    });

    return buildRecommendation(
      [carC, carA],
      ["safety", "practicality"],
      preferences,
      features(),
    )!;
  };

  it("exposes explicit weights for the priority ordering", () => {
    const result = setup();

    expect(result.context.weights).toEqual([
      { priority: "safety", rank: 1, weight: 2 / 3, weightPercent: 67 },
      { priority: "practicality", rank: 2, weight: 1 / 3, weightPercent: 33 },
    ]);
  });

  it("names both scores, the features behind them and the weighted swing", () => {
    const result = setup();
    const safety = result.evaluation.priorities.find(
      (item) => item.priority === "safety",
    )!;

    const sentences = explainPriority(safety, result.winner.name).join(" ");

    // Both cars' scores are stated, not just the winner's.
    expect(sentences).toContain(`${safety.score}/100`);
    expect(sentences).toContain(`${safety.versus!.score}/100`);

    // The specific equipment difference is named.
    expect(safety.versus!.onlySubjectHas).toContain("Blind spot warning");
    expect(sentences).toContain("Blind spot warning");

    // The consequence of the ordering is quantified, not hand-waved.
    expect(sentences).toContain("#1 priority");
    expect(sentences).toContain(`${safety.weightPercent}%`);
  });

  it("surfaces where the losing car is actually better, with the numbers", () => {
    const result = setup();
    const concession = result.evaluation.comparison!.biggestConcession!;

    expect(concession.priority).toBe("practicality");
    expect(concession.versus!.difference).toBeLessThan(0);

    // The boot-space measurement behind it is carried through.
    expect(concession.numeric?.label).toBe("Boot space");
    expect(concession.versus?.numeric?.value).toBe(520);
    expect(concession.numeric?.value).toBe(390);

    expect(result.evaluation.comparison!.summary).toContain("Practicality");
    expect(result.evaluation.comparison!.summary).toContain("not enough");
  });

  it("never says a car won because 'your other priorities matter more'", () => {
    const result = setup();

    const prose = [
      result.evaluation.comparison!.summary,
      ...result.evaluation.priorities.flatMap((item) =>
        explainPriority(item, result.winner.name),
      ),
    ].join(" ");

    expect(prose).not.toMatch(/other priorities matter more/i);
    expect(prose).not.toMatch(/overall fit/i);
    expect(prose).not.toMatch(/aligns with your needs/i);
    expect(prose).not.toMatch(/optimal choice/i);
  });

  it("keeps matched and missing features available per category", () => {
    const result = setup();
    const safety = result.evaluation.priorities.find(
      (item) => item.priority === "safety",
    )!;

    expect(safety.matchedLabels.length).toBeGreaterThan(0);
    expect(safety.leader).not.toBeNull();
    expect(safety.isLeader).toBe(true);
    expect(safety.gapToLeader).toBe(0);
  });

  it("weights sum to the overall score", () => {
    const result = setup();

    const recomputed = result.evaluation.priorities.reduce(
      (sum, item) => sum + item.weightedContribution,
      0,
    );

    expect(Math.round(recomputed)).toBe(result.evaluation.score.total);
  });
});

describe("preference migration", () => {
  it("converts a stored annual mileage into a monthly one", () => {
    const migrated = migratePreferences({ annualKm: 12_000 });

    expect(migrated.monthlyKm).toBe(1_000);
    expect(migrated).not.toHaveProperty("annualKm");
  });

  it("keeps an existing monthly mileage in preference to the annual one", () => {
    expect(
      migratePreferences({ annualKm: 12_000, monthlyKm: 800 }).monthlyKm,
    ).toBe(800);
  });

  it("defaults contract type to private", () => {
    expect(migratePreferences({ annualKm: 6_000 }).contractType).toBe("private");
    expect(migratePreferences({ contractType: "business" }).contractType).toBe(
      "business",
    );
  });

  it("preserves the prices and budget an existing user already set", () => {
    const migrated = migratePreferences({
      annualKm: 9_600,
      monthlyBudget: 750,
      petrolPrice: 1.92,
      dieselPrice: 1.81,
      electricityPrice: 0.41,
    });

    expect(migrated).toEqual({
      monthlyKm: 800,
      monthlyBudget: 750,
      petrolPrice: 1.92,
      dieselPrice: 1.81,
      electricityPrice: 0.41,
      contractType: "private",
    });
  });

  it("falls back to defaults for absent or unusable values", () => {
    const migrated = migratePreferences({
      petrolPrice: Number.NaN,
      monthlyBudget: -50,
    });

    expect(migrated.petrolPrice).toBeGreaterThan(0);
    expect(migrated.monthlyBudget).toBe(300);
    expect(migrated.monthlyKm).toBe(1_000);
  });
});
