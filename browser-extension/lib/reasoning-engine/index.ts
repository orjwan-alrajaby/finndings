import type { PinnedFinnCar } from "@/lib/types";
import type {
  CategoryDetail,
  CategoryDef,
  CategoryId,
  CostBreakdown,
  FeatureWeight,
  LensPreferences,
  LensSettings,
  PriorityDefinition,
  PriorityReason,
  Profile,
  ProfileId,
  Recommendation,
  Tradeoff,
  VehicleScore,
} from "./types";

import {
  CATEGORIES,
  FEATURES,
  TIERS,
  DEFAULT_CATEGORY_FEATURES,
  DEFAULT_DEFAULT_PROFILE_ID,
  DEFAULT_PREFERENCES,
  DEFAULT_PRIORITIES,
  DEFAULT_PRIORITY_DEFINITIONS,
  DEFAULT_PROFILES,
} from "./constants";

/* -------------------------------------------------------------------------- */
/* Runtime category registry                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Built-in categories are immutable.
 *
 * Custom categories live here instead of being added directly to CATEGORIES.
 * This keeps CATEGORIES as the single source of truth for built-in product
 * configuration while still allowing user-created priorities at runtime.
 */
const CUSTOM_CATEGORIES: Record<string, CategoryDef> = {};

/**
 * Resolves either a built-in or custom category.
 */
function getCategory(category: CategoryId): CategoryDef | undefined {
  return CATEGORIES[category as keyof typeof CATEGORIES] ?? CUSTOM_CATEGORIES[category];
}

/**
 * Registers or updates metadata for a custom category.
 */
export function registerCategoryMeta(
  id: CategoryId,
  meta: CategoryDef,
): void {
  if (id in CATEGORIES) return;
  CUSTOM_CATEGORIES[id] = meta;
}

/**
 * Removes a custom category.
 *
 * Built-in categories can never be removed from the registry.
 */
export function unregisterCategoryMeta(id: CategoryId): void {
  if (id in CATEGORIES) return;
  delete CUSTOM_CATEGORIES[id];
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const featureLabel = (key: string): string =>
  FEATURES[key as keyof typeof FEATURES]?.label ?? key;

const tierWeight = (tier: FeatureWeight["tier"]): number =>
  TIERS[tier].weight;

const fuelPrice = (
  vehicle: PinnedFinnCar,
  preferences: LensPreferences,
): number =>
  vehicle.fuelType === "Diesel"
    ? preferences.dieselPrice
    : preferences.petrolPrice;

/* -------------------------------------------------------------------------- */
/* Cost                                                                       */
/* -------------------------------------------------------------------------- */
/**
 * Estimates the vehicle's total monthly and annual cost.
 *
 * The calculation combines:
 * - monthly rental cost
 * - estimated fuel/electricity cost based on the user's annual mileage
 *
 * This total monthly cost is used for two different purposes:
 *
 * 1. Affordability scoring
 *    When affordability is one of the user's priorities, vehicles are compared
 *    against one another based on their estimated total monthly cost.
 *
 * 2. Budget eligibility
 *    When the user has configured a monthly budget, this same total is compared
 *    against that budget as a hard constraint.
 *
 * A missing or invalid consumption value does not result in a guessed running
 * cost. In that case, the rental price is still returned, but running cost is
 * marked as unavailable.
 */

export function calculateCost(
  vehicle: PinnedFinnCar,
  preferences: LensPreferences,
): CostBreakdown {
  const rental = vehicle.pricing.customerMonthly.price ?? 0;
  const annualKm = Math.max(1, preferences.annualKm);
  const consumption = Number(vehicle.consumption.combined);

  if (!Number.isFinite(consumption) || consumption <= 0) {
    return {
      rental,
      running: 0,
      totalMonthly: rental,
      annual: rental * 12,
      costPer100Km: null,
      energyLabel: "Running cost unavailable",
    };
  }

  const isElectric = vehicle.fuelType === "Electric";
  const price = isElectric
    ? preferences.electricityPrice
    : fuelPrice(vehicle, preferences);

  const costPer100Km = consumption * price;
  const running = (annualKm / 12 / 100) * costPer100Km;

  return {
    rental,
    running,
    totalMonthly: rental + running,
    annual: (rental + running) * 12,
    costPer100Km,
    energyLabel: isElectric ? "electricity" : "fuel",
  };
}

/**
 * Determines whether a vehicle fits within the user's maximum monthly car budget.
 *
 * The budget represents the user's total monthly car expense, including:
 * - monthly rental cost
 * - estimated fuel/electricity cost based on their expected annual mileage
 *
 * This is a hard financial constraint, not a scoring factor.
 *
 * A vehicle that exceeds the budget is considered ineligible for the normal
 * recommendation and should not participate in the scoring comparison.
 */
function isWithinBudget(
  vehicle: PinnedFinnCar,
  preferences: LensPreferences,
): boolean {
  const budget = preferences.monthlyBudget;

  // No budget configured means there is no budget constraint.
  if (
    !Number.isFinite(budget) ||
    budget <= 0
  ) {
    return true;
  }

  const cost = calculateCost(
    vehicle,
    preferences,
  );

  return cost.totalMonthly <= budget;
}

/**
 * Separates vehicles into those that fit the user's monthly budget and those
 * that exceed it.
 *
 * Budget-eligible vehicles are used for normal scoring and recommendation.
 * Over-budget vehicles are retained separately so the UI can explain when
 * nothing selected fits the user's budget.
 */
export function filterByBudget(
  vehicles: PinnedFinnCar[],
  preferences: LensPreferences,
): {
  eligible: PinnedFinnCar[];
  overBudget: PinnedFinnCar[];
} {
  const eligible: PinnedFinnCar[] = [];
  const overBudget: PinnedFinnCar[] = [];

  vehicles.forEach((vehicle) => {
    if (isWithinBudget(vehicle, preferences)) {
      eligible.push(vehicle);
    } else {
      overBudget.push(vehicle);
    }
  });

  return {
    eligible,
    overBudget,
  };
}

/* -------------------------------------------------------------------------- */
/* Numeric scoring                                                            */
/* -------------------------------------------------------------------------- */

function relativeScore(
  value: number,
  values: number[],
  lowerIsBetter: boolean,
): number {
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (max === min) return 80;

  const ratio = (value - min) / (max - min);

  return Math.round(
    (lowerIsBetter ? 1 - ratio : ratio) * 100,
  );
}

function numericScore(
  category: CategoryId,
  vehicle: PinnedFinnCar,
  vehicles: PinnedFinnCar[],
  preferences: LensPreferences,
): number | null {
  switch (category) {
    case "affordability": {
      const values = vehicles.map(
        (item) => calculateCost(item, preferences).totalMonthly,
      );

      return relativeScore(
        calculateCost(vehicle, preferences).totalMonthly,
        values,
        true,
      );
    }

    case "practicality": {
      const values = vehicles
        .map((item) => Number.parseFloat(item.capacity.trunk))
        .filter(Number.isFinite);

      const trunk = Number.parseFloat(vehicle.capacity.trunk);

      return Number.isFinite(trunk) && values.length > 1
        ? relativeScore(trunk, values, false)
        : null;
    }

    case "longDistance": {
      const ranges = vehicles
        .map((item) =>
          item.electric?.range && item.electric.range !== "Unknown"
            ? Number(item.electric.range)
            : null,
        )
        .filter(
          (value): value is number =>
            value != null && Number.isFinite(value),
        );

      if (
        vehicle.electric?.range &&
        vehicle.electric.range !== "Unknown" &&
        ranges.length > 1
      ) {
        return relativeScore(
          Number(vehicle.electric.range),
          ranges,
          false,
        );
      }

      const consumption = Number(vehicle.consumption.combined);

      const values = vehicles
        .map((item) => Number(item.consumption.combined))
        .filter(Number.isFinite);

      return Number.isFinite(consumption) && values.length > 1
        ? relativeScore(consumption, values, true)
        : null;
    }

    case "environmental": {
      const values = vehicles
        .map((item) => Number(item.co2.value))
        .filter(
          (value) => Number.isFinite(value) && value > 0,
        );

      const co2 = Number(vehicle.co2.value);

      return Number.isFinite(co2) && values.length > 1
        ? relativeScore(co2, values, true)
        : null;
    }

    default:
      return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Category scoring                                                           */
/* -------------------------------------------------------------------------- */

export function categoryDetail(
  category: CategoryId,
  vehicle: PinnedFinnCar,
  vehicles: PinnedFinnCar[],
  preferences: LensPreferences,
  categoryFeatures: Record<CategoryId, FeatureWeight[]> = DEFAULT_CATEGORY_FEATURES,
): CategoryDetail {
  const configured =
    categoryFeatures[category] ??
    getCategory(category)?.features ??
    [];

  const matched: FeatureWeight[] = [];
  const missing: FeatureWeight[] = [];

  const max = configured.reduce(
    (sum, item) => sum + tierWeight(item.tier),
    0,
  );

  const earned = configured.reduce((sum, item) => {
    if (vehicle.features?.[item.key]) {
      matched.push(item);
      return sum + tierWeight(item.tier);
    }

    missing.push(item);
    return sum;
  }, 0);

  const featureScore = max
    ? Math.round((earned / max) * 100)
    : null;

  const numeric = numericScore(
    category,
    vehicle,
    vehicles,
    preferences,
  );

  if (numeric != null && featureScore != null) {
    return {
      score: Math.round((numeric + featureScore) / 2),
      matched,
      missing,
    };
  }

  return {
    score: numeric ?? featureScore ?? 50,
    matched,
    missing,
  };
}

/* -------------------------------------------------------------------------- */
/* Vehicle scoring                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Calculates the complete score for every vehicle across the user's ordered
 * priorities.
 *
 * This function is intentionally unaware of the user's budget.
 * Budget eligibility must be resolved before calling this function.
 *
 * Priority #1 receives the highest weight.
 * Priority #2 receives the next highest weight, and so on.
 *
 * Each vehicle receives:
 * - an overall weighted score
 * - an individual score for every priority
 * - detailed information about the features and numeric data behind each score
 *
 * The scoring comparison is relative to the vehicles passed into this function.
 * Therefore, callers should pass only vehicles that are eligible for the
 * recommendation.
 */
export function computeAllScores(
  vehicles: PinnedFinnCar[],
  priorities: CategoryId[],
  preferences: LensPreferences,
  categoryFeatures: Record<CategoryId, FeatureWeight[]> = DEFAULT_CATEGORY_FEATURES,
): VehicleScore[] {
  const ordered = priorities.length
    ? priorities
    : DEFAULT_PRIORITIES;

  const denominator =
    (ordered.length * (ordered.length + 1)) / 2;

  return vehicles.map((vehicle) => {
    const byCategory = {} as Record<CategoryId, number>;
    const details: Partial<Record<CategoryId, CategoryDetail>> = {};

    let total = 0;

    ordered.forEach((category, index) => {
      const detail = categoryDetail(
        category,
        vehicle,
        vehicles,
        preferences,
        categoryFeatures,
      );

      const weight =
        (ordered.length - index) / denominator;

      byCategory[category] = detail.score;
      details[category] = detail;

      total += detail.score * weight;
    });

    return {
      vehicleId: vehicle.id,
      total: Math.round(total),
      byCategory,
      details,
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Score helpers                                                              */
/* -------------------------------------------------------------------------- */

function scoreFor(
  scores: VehicleScore[],
  vehicleId: number,
  category: CategoryId,
): number {
  return (
    scores.find((score) => score.vehicleId === vehicleId)
      ?.byCategory[category] ?? 0
  );
}

function winnerForCategory(
  vehicles: PinnedFinnCar[],
  scores: VehicleScore[],
  category: CategoryId,
): PinnedFinnCar | undefined {
  return [...vehicles].sort(
    (a, b) =>
      scoreFor(scores, b.id, category) -
      scoreFor(scores, a.id, category),
  )[0];
}

/* -------------------------------------------------------------------------- */
/* Feature explanations                                                       */
/* -------------------------------------------------------------------------- */

function featureSentence(
  detail: CategoryDetail,
  category: CategoryId,
): string {
  const categoryMeta = getCategory(category);

  if (!categoryMeta) {
    return "The available data does not support a detailed explanation for this priority.";
  }

  const label = categoryMeta.label;

  const essential = detail.matched.filter(
    (item) => item.tier === "essential",
  );

  const missingEssential = detail.missing.filter(
    (item) => item.tier === "essential",
  );

  if (essential.length || missingEssential.length) {
    const present = essential.map((item) =>
      featureLabel(item.key),
    );

    const missing = missingEssential.map((item) =>
      featureLabel(item.key),
    );

    if (missing.length === 0) {
      return `For ${label.toLowerCase()}, it covers all ${present.length} features you've marked as essential: ${present.join(", ")}.`;
    }

    if (present.length) {
      return `For ${label.toLowerCase()}, it has ${present.join(", ")}, but is missing ${missing.join(", ")} from your essential list.`;
    }

    return `For ${label.toLowerCase()}, none of the essential features in your current setup are present.`;
  }

  const matched = detail.matched
    .slice(0, 4)
    .map((item) => featureLabel(item.key));

  return matched.length
    ? `For ${label.toLowerCase()}, the useful equipment includes ${matched.join(", ")}.`
    : `For ${label.toLowerCase()}, the available data does not show a standout equipment advantage.`;
}

/* -------------------------------------------------------------------------- */
/* Formatting                                                                 */
/* -------------------------------------------------------------------------- */

function formatEUR(value: number): string {
  return `€${Math.round(value).toLocaleString("de-DE")}`;
}

function costComparison(
  winner: PinnedFinnCar,
  alternative: PinnedFinnCar | undefined,
  preferences: LensPreferences,
): string {
  const winnerCost = calculateCost(
    winner,
    preferences,
  );

  if (!alternative) {
    return `Its estimated monthly cost is ${formatEUR(
      winnerCost.totalMonthly,
    )}, including the rental price and estimated energy cost at your selected mileage.`;
  }

  const alternativeCost = calculateCost(
    alternative,
    preferences,
  );

  const diff =
    alternativeCost.totalMonthly -
    winnerCost.totalMonthly;

  if (Math.abs(diff) < 1) {
    return `Its estimated monthly cost is ${formatEUR(
      winnerCost.totalMonthly,
    )}, including rental and estimated energy at your selected mileage.`;
  }

  return diff > 0
    ? `Its estimated monthly cost is ${formatEUR(
        winnerCost.totalMonthly,
      )}, about ${formatEUR(diff)} less than the next option.`
    : `Its estimated monthly cost is ${formatEUR(
        winnerCost.totalMonthly,
      )}; the next option is ${formatEUR(
        Math.abs(diff),
      )} cheaper, so this win comes from more than price alone.`;
}

/* -------------------------------------------------------------------------- */
/* Priority explanations                                                      */
/* -------------------------------------------------------------------------- */

function buildPriorityReason(
  category: CategoryId,
  winner: PinnedFinnCar,
  vehicles: PinnedFinnCar[],
  scores: VehicleScore[],
  preferences: LensPreferences,
): PriorityReason {
  const categoryMeta = getCategory(category);

  const detail = scores.find(
    (score) => score.vehicleId === winner.id,
  )?.details[category];

  const categoryWinner = winnerForCategory(
    vehicles,
    scores,
    category,
  );

  const runnerUp = [...vehicles]
    .filter((vehicle) => vehicle.id !== winner.id)
    .sort(
      (a, b) =>
        scoreFor(scores, b.id, category) -
        scoreFor(scores, a.id, category),
    )[0];

  if (!categoryMeta || !detail) {
    return {
      priority: category,
      title: categoryMeta?.label ?? category,
      text: "The available data does not support a detailed explanation for this priority.",
      evidence: [],
    };
  }

  if (category === "affordability") {
    const cost = calculateCost(
      winner,
      preferences,
    );

    const runnerCost = runnerUp
      ? calculateCost(runnerUp, preferences)
      : null;

    const evidence = [
      `Rental: ${formatEUR(cost.rental)}/month`,
      cost.costPer100Km != null
        ? `Estimated energy: ${formatEUR(
            cost.costPer100Km,
          )} per 100 km`
        : "Running cost unavailable from the supplied data",
      `Estimated total: ${formatEUR(
        cost.totalMonthly,
      )}/month`,
    ];

    return {
      priority: category,
      title: categoryMeta.label,
      text: `${costComparison(
        winner,
        runnerUp,
        preferences,
      )} ${
        cost.costPer100Km != null
          ? `At ${preferences.annualKm.toLocaleString(
              "de-DE",
            )} km/year, the estimated running portion is ${formatEUR(
              cost.running,
            )}/month.`
          : ""
      }`,
      evidence: runnerCost
        ? [
            ...evidence,
            `Next option: ${formatEUR(
              runnerCost.totalMonthly,
            )}/month`,
          ]
        : evidence,
    };
  }

  const categoryScore = scoreFor(
    scores,
    winner.id,
    category,
  );

  const winnerIsCategoryLeader =
    categoryWinner?.id === winner.id;

  const comparison = runnerUp
    ? scoreFor(scores, runnerUp.id, category)
    : categoryScore;

  const evidence: string[] = [];

  if (detail.matched.length) {
    evidence.push(
      `Present: ${detail.matched
        .slice(0, 6)
        .map((item) => featureLabel(item.key))
        .join(", ")}`,
    );
  }

  if (detail.missing.length) {
    evidence.push(
      `Not present: ${detail.missing
        .slice(0, 4)
        .map((item) => featureLabel(item.key))
        .join(", ")}`,
    );
  }

  if (category === "practicality") {
    const trunk = Number.parseFloat(
      winner.capacity.trunk,
    );

    if (Number.isFinite(trunk)) {
      evidence.unshift(
        `Boot: ${Math.round(trunk).toLocaleString(
          "de-DE",
        )} L`,
      );
    }

    if (winner.capacity.seats) {
      evidence.unshift(
        `${winner.capacity.seats} seats`,
      );
    }
  }

  if (
    category === "longDistance" &&
    winner.electric?.range &&
    winner.electric.range !== "Unknown"
  ) {
    evidence.unshift(
      `Electric range: ${winner.electric.range} km`,
    );
  }

  if (category === "environmental") {
    evidence.unshift(
      winner.fuelType === "Electric"
        ? "Electric powertrain"
        : `${winner.fuelType} · ${
            winner.co2.value || "unknown"
          } g CO₂/km`,
    );
  }

  return {
    priority: category,
    title: categoryMeta.label,
    text: winnerIsCategoryLeader
      ? `${featureSentence(
          detail,
          category,
        )} It leads this comparison on ${categoryMeta.label.toLowerCase()} with a score of ${categoryScore}/100, ahead of the next option at ${comparison}/100.`
      : `${featureSentence(
          detail,
          category,
        )} It scores ${categoryScore}/100 here; another car leads this category, but its stronger performance on your higher-ranked priorities is why it still wins overall.`,
    evidence,
  };
}

/* -------------------------------------------------------------------------- */
/* Tradeoffs                                                                  */
/* -------------------------------------------------------------------------- */

function buildTradeoff(
  category: CategoryId,
  winner: PinnedFinnCar,
  vehicles: PinnedFinnCar[],
  scores: VehicleScore[],
  preferences: LensPreferences,
): Tradeoff | null {
  const winnerScore = scoreFor(
    scores,
    winner.id,
    category,
  );

  const categoryLeader = winnerForCategory(
    vehicles,
    scores,
    category,
  );

  if (!categoryLeader || categoryLeader.id === winner.id) {
    return null;
  }

  if (category === "affordability") {
    const winnerCost = calculateCost(
      winner,
      preferences,
    );

    const bestCostCar = [...vehicles].sort(
      (a, b) =>
        calculateCost(a, preferences).totalMonthly -
        calculateCost(b, preferences).totalMonthly,
    )[0];

    if (!bestCostCar || bestCostCar.id === winner.id) {
      return null;
    }

    const bestCost = calculateCost(
      bestCostCar,
      preferences,
    );

    const diff =
      winnerCost.totalMonthly -
      bestCost.totalMonthly;

    if (diff < 10) {
      return null;
    }

    return {
      priority: category,
      title: "A little more to run",
      text: `Because affordability is one of your top priorities, this is worth knowing: ${winner.name} is about ${formatEUR(
        diff,
      )}/month more expensive to run than ${bestCostCar.name} at your selected mileage. It wins overall because the extra cost is outweighed by its stronger fit elsewhere in your priority order.`,
    };
  }

  if (winnerScore >= 72) {
    return null;
  }

  const leaderScore = scoreFor(
    scores,
    categoryLeader.id,
    category,
  );

  if (leaderScore - winnerScore < 12) {
    return null;
  }

  const detail = scores.find(
    (score) => score.vehicleId === winner.id,
  )?.details[category];

  if (!detail) {
    return null;
  }

  const missing = detail.missing
    .slice(0, 2)
    .map((item) => featureLabel(item.key));

  const present = detail.matched
    .slice(0, 2)
    .map((item) => featureLabel(item.key));

  const categoryMeta = getCategory(category);

  if (!categoryMeta) {
    return null;
  }

  const exchange = present.length
    ? `You do get ${present.join(
        " and ",
      )} in return.`
    : "Its advantage comes from the stronger fit on your higher-ranked priorities.";

  return {
    priority: category,
    title: `One compromise on ${categoryMeta.label.toLowerCase()}`,
    text: `${winner.name} trails ${categoryLeader.name} on ${categoryMeta.label.toLowerCase()} (${winnerScore}/100 vs ${leaderScore}/100). ${
      missing.length
        ? `The clearest gap is ${missing.join(
            " and ",
          )}. `
        : ""
    }${exchange}`,
  };
}

/* -------------------------------------------------------------------------- */
/* Recommendation                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Builds the complete user-facing recommendation.
 *
 * The recommendation process has two distinct stages:
 *
 * 1. Eligibility
 *    Vehicles are first checked against the user's monthly budget.
 *    Vehicles that exceed the budget are excluded from the normal ranking.
 *
 * 2. Recommendation
 *    Only budget-eligible vehicles are scored and ranked according to the
 *    user's ordered priorities.
 *
 * The monthly budget is therefore a hard constraint rather than another
 * scoring factor.
 *
 * If at least one vehicle fits the budget:
 * - the eligible vehicles are scored
 * - the highest-scoring vehicle becomes the winner
 * - reasons and tradeoffs are generated for that winner
 *
 * If no vehicle fits the budget:
 * - no vehicle is recommended
 * - the result can still expose the over-budget vehicles so the UI can explain
 *   that none of the selected cars fit the user's budget
 */
export function buildRecommendation(
  vehicles: PinnedFinnCar[],
  priorities: CategoryId[],
  preferences: LensPreferences,
  categoryFeatures: Record<CategoryId, FeatureWeight[]> = DEFAULT_CATEGORY_FEATURES,
): Recommendation | null {
  if (!vehicles.length) {
    return null;
  }

  const ordered = priorities.length
    ? priorities
    : DEFAULT_PRIORITIES;

  const { eligible } = filterByBudget(
    vehicles,
    preferences,
  );

  /*
   * No vehicle fits the user's budget.
   *
   * We deliberately do not choose the cheapest over-budget vehicle as the
   * winner. Doing so would violate the user's explicit financial constraint.
   *
   * For now, return null. The UI can separately use the overBudget vehicles
   * if it wants to display a "nothing fits your budget" state.
   */
  if (!eligible.length) {
    return null;
  }

  const scores = computeAllScores(
    eligible,
    ordered,
    preferences,
    categoryFeatures,
  );

  const ranked = [...eligible].sort(
    (a, b) =>
      (scores.find(
        (score) => score.vehicleId === b.id,
      )?.total ?? 0) -
      (scores.find(
        (score) => score.vehicleId === a.id,
      )?.total ?? 0),
  );

  const [winner] = ranked;

  if (!winner) {
    return null;
  }

  const winnerScore = scores.find(
    (score) => score.vehicleId === winner.id,
  )!;

  const reasons = ordered.map((category) =>
    buildPriorityReason(
      category,
      winner,
      eligible,
      scores,
      preferences,
    ),
  );

  const tradeoffs = ordered
    .slice(0, 3)
    .map((category) =>
      buildTradeoff(
        category,
        winner,
        eligible,
        scores,
        preferences,
      ),
    )
    .filter(
      (tradeoff): tradeoff is Tradeoff =>
        Boolean(tradeoff),
    );

  return {
    winner,
    score: winnerScore,
    ranked,
    scores,
    reasons,
    tradeoffs,
  };
}
/* -------------------------------------------------------------------------- */
/* Settings persistence                                                       */
/* -------------------------------------------------------------------------- */

export async function loadLensSettings(): Promise<LensSettings> {
  const stored = (await browser.storage.local.get([
    "finnLensPreferences",
    "finnLensPriorities",
    "finnLensPriorityDefinitions",
    "finnLensProfiles",
    "finnLensCategoryFeatures",
    "finnLensDefaultProfileId",
  ])) as Record<string, unknown> as {
    finnLensPreferences?: LensPreferences;
    finnLensPriorities?: CategoryId[];
    finnLensPriorityDefinitions?: PriorityDefinition[];
    finnLensProfiles?: Profile[];
    finnLensCategoryFeatures?: Record<CategoryId, FeatureWeight[]>;
    finnLensDefaultProfileId?: ProfileId;
  };

  const priorityDefinitions: PriorityDefinition[] =
    stored.finnLensPriorityDefinitions ??
    DEFAULT_PRIORITY_DEFINITIONS;

  /**
   * Restore persisted custom categories into the runtime registry.
   *
   * Built-ins are deliberately ignored because CATEGORIES already owns them.
   */
  for (const definition of priorityDefinitions) {
    if (
      definition.isCustom &&
      !(definition.id in CATEGORIES)
    ) {
      registerCategoryMeta(definition.id, {
        label: definition.label,
        icon: definition.icon,
        color: "#5B6472",
        question: definition.description || definition.label,
        description: definition.description,
        recommendedFor: [],
        features: [],
      });
    }
  }

  return {
    preferences:
      stored.finnLensPreferences ??
      DEFAULT_PREFERENCES,

    priorities:
      stored.finnLensPriorities ??
      DEFAULT_PRIORITIES,

    priorityDefinitions,

    profiles:
      stored.finnLensProfiles ??
      DEFAULT_PROFILES,

    categoryFeatures:
      stored.finnLensCategoryFeatures ??
      DEFAULT_CATEGORY_FEATURES,

    defaultProfileId:
      stored.finnLensDefaultProfileId ??
      DEFAULT_DEFAULT_PROFILE_ID,
  };
}

export async function saveLensSettings(
  settings: Partial<LensSettings>,
): Promise<void> {
  await browser.storage.local.set({
    ...(settings.preferences
      ? {
          finnLensPreferences:
            settings.preferences,
        }
      : {}),

    ...(settings.priorities
      ? {
          finnLensPriorities:
            settings.priorities,
        }
      : {}),

    ...(settings.priorityDefinitions
      ? {
          finnLensPriorityDefinitions:
            settings.priorityDefinitions,
        }
      : {}),

    ...(settings.profiles
      ? {
          finnLensProfiles:
            settings.profiles,
        }
      : {}),

    ...(settings.categoryFeatures
      ? {
          finnLensCategoryFeatures:
            settings.categoryFeatures,
        }
      : {}),

    ...(settings.defaultProfileId
      ? {
          finnLensDefaultProfileId:
            settings.defaultProfileId,
        }
      : {}),
  });
}