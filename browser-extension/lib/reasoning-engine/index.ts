import type { PinnedFinnCar } from "@/lib/types";
import type {
  BudgetPartition,
  CategoryId,
  CostBreakdown,
  FeatureWeight,
  HeadToHead,
  HotSeatOption,
  LegacyLensPreferences,
  LensPreferences,
  LensSettings,
  PriorityBreakdown,
  PriorityComparison,
  PriorityDefinition,
  Profile,
  ProfileId,
  ReasoningContext,
  Recommendation,
  ScoreRef,
  VehicleEvaluation,
  VehicleScore,
} from "./types";

import {
  CATEGORIES,
  DEFAULT_CATEGORY_FEATURES,
  DEFAULT_DEFAULT_PROFILE_ID,
  DEFAULT_PREFERENCES,
  DEFAULT_PRIORITIES,
  DEFAULT_PRIORITY_DEFINITIONS,
  DEFAULT_PROFILES,
} from "./constants";

import {
  buildCostAnalysis,
  calculateCost,
  partitionByBudget,
} from "./cost";

import {
  categoryDetail,
  computeAllScores,
  featureLabel,
  getCategory,
  priorityWeights,
  registerCategoryMeta,
  scoreFor,
  totalFor,
  unregisterCategoryMeta,
  winnerForCategory,
} from "./scoring";

import { explainHeadToHead } from "./explain";

/* -------------------------------------------------------------------------- */
/* Re-exports                                                                 */
/* -------------------------------------------------------------------------- */

export {
  buildCostAnalysis,
  calculateCost,
  partitionByBudget,
} from "./cost";

export {
  categoryDetail,
  computeAllScores,
  getCategory,
  priorityWeights,
  registerCategoryMeta,
  scoreFor,
  unregisterCategoryMeta,
  winnerForCategory,
} from "./scoring";

export { explainHeadToHead, explainVerdict } from "./explain";

export { buildAdviceNarrative } from "./narrative";

export {
  formatEUR,
  formatKm,
  formatNumber,
  formatPrice,
  joinList,
} from "./format";

/* -------------------------------------------------------------------------- */
/* Reasoning context                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Builds the shared frame of reference for one comparison run.
 *
 * Costs and scores are calculated once, over **every** pinned car, so that:
 *
 * - the recommendation and any hot-seat inspection use identical numbers;
 * - an over-budget car the user wants to inspect still has a real score;
 * - relative scoring (boot space, range, CO₂) is measured against the same
 *   set no matter which car is being looked at.
 *
 * Budget never touches scoring. It only partitions the set afterwards.
 */
export function buildReasoningContext(
  vehicles: PinnedFinnCar[],
  priorities: CategoryId[],
  preferences: LensPreferences,
  categoryFeatures: Record<
    CategoryId,
    FeatureWeight[]
  > = DEFAULT_CATEGORY_FEATURES,
): ReasoningContext {
  const ordered = priorities.length ? priorities : DEFAULT_PRIORITIES;

  const costs: Record<number, CostBreakdown> = {};

  for (const vehicle of vehicles) {
    costs[vehicle.id] = calculateCost(vehicle, preferences);
  }

  const scores = computeAllScores(
    vehicles,
    ordered,
    preferences,
    categoryFeatures,
  );

  const ranked = [...vehicles].sort(
    (a, b) => totalFor(scores, b.id) - totalFor(scores, a.id),
  );

  return {
    vehicles,
    priorities: ordered,
    preferences,
    categoryFeatures,
    scores,
    costs,
    weights: priorityWeights(ordered),
    ranked,
    budget: partitionByBudget(vehicles, costs, preferences),
  };
}

/* -------------------------------------------------------------------------- */
/* Comparative reasoning                                                      */
/* -------------------------------------------------------------------------- */

function scoreRef(
  vehicle: PinnedFinnCar,
  scores: VehicleScore[],
  category: CategoryId,
): ScoreRef {
  return {
    vehicleId: vehicle.id,
    name: vehicle.name,
    score: scoreFor(scores, vehicle.id, category),
    numeric:
      scores.find((score) => score.vehicleId === vehicle.id)?.details[category]
        ?.numeric ?? null,
  };
}

/**
 * Builds the full evidence record for one vehicle in one priority, including
 * the head-to-head against a specific rival.
 */
function priorityBreakdown(
  category: CategoryId,
  rank: number,
  weight: number,
  subject: PinnedFinnCar,
  other: PinnedFinnCar | null,
  context: ReasoningContext,
): PriorityBreakdown {
  const { scores, vehicles, preferences, categoryFeatures } = context;
  const meta = getCategory(category);

  const detail =
    scores.find((score) => score.vehicleId === subject.id)?.details[category] ??
    categoryDetail(
      category,
      subject,
      vehicles,
      preferences,
      categoryFeatures,
    );

  const score = detail.score;

  const leaderVehicle = winnerForCategory(vehicles, scores, category);
  const leader = leaderVehicle
    ? scoreRef(leaderVehicle, scores, category)
    : null;

  const matchedLabels = detail.matched.map((item) => featureLabel(item.key));
  const missingLabels = detail.missing.map((item) => featureLabel(item.key));

  return {
    priority: category,
    label: meta?.label ?? category,
    icon: meta?.icon ?? "•",
    rank,
    weight,
    weightPercent: Math.round(weight * 100),
    score,
    weightedContribution: score * weight,
    matched: detail.matched,
    missing: detail.missing,
    matchedLabels,
    missingLabels,
    numeric: detail.numeric,
    hasEvidence: detail.hasEvidence,
    leader,
    isLeader: leader?.vehicleId === subject.id,
    gapToLeader: leader ? Math.max(0, leader.score - score) : 0,
    versus: other
      ? comparePriority(category, subject, other, score, weight, context)
      : null,
  };
}

function comparePriority(
  category: CategoryId,
  subject: PinnedFinnCar,
  other: PinnedFinnCar,
  subjectScore: number,
  weight: number,
  context: ReasoningContext,
): PriorityComparison {
  const { scores, vehicles, preferences, categoryFeatures } = context;

  const otherDetail =
    scores.find((score) => score.vehicleId === other.id)?.details[category] ??
    categoryDetail(category, other, vehicles, preferences, categoryFeatures);

  const configured = categoryFeatures[category] ?? getCategory(category)?.features ?? [];

  const onlySubjectHas: FeatureWeight[] = [];
  const onlyOtherHas: FeatureWeight[] = [];

  for (const feature of configured) {
    const subjectHas = Boolean(subject.features?.[feature.key]);
    const otherHas = Boolean(other.features?.[feature.key]);

    if (subjectHas && !otherHas) onlySubjectHas.push(feature);
    if (otherHas && !subjectHas) onlyOtherHas.push(feature);
  }

  const difference = subjectScore - otherDetail.score;

  return {
    vehicleId: other.id,
    name: other.name,
    score: otherDetail.score,
    difference,
    weightedDifference: difference * weight,
    numeric: otherDetail.numeric,
    onlySubjectHas,
    onlyOtherHas,
  };
}

function buildHeadToHead(
  subject: PinnedFinnCar,
  other: PinnedFinnCar,
  breakdowns: PriorityBreakdown[],
  context: ReasoningContext,
): HeadToHead {
  const subjectTotal = totalFor(context.scores, subject.id);
  const otherTotal = totalFor(context.scores, other.id);

  /* Ordered by how much each priority actually moved the result. */
  const categories = [...breakdowns].sort(
    (a, b) =>
      Math.abs(b.versus?.weightedDifference ?? 0) -
      Math.abs(a.versus?.weightedDifference ?? 0),
  );

  const advantages = categories.filter(
    (item) => (item.versus?.difference ?? 0) > 0,
  );

  const concessions = categories.filter(
    (item) => (item.versus?.difference ?? 0) < 0,
  );

  const subjectCost = context.costs[subject.id];
  const otherCost = context.costs[other.id];

  const partial = {
    subject: {
      vehicleId: subject.id,
      name: subject.name,
      total: subjectTotal,
    },
    other: {
      vehicleId: other.id,
      name: other.name,
      total: otherTotal,
    },
    totalDifference: subjectTotal - otherTotal,
    categories,
    decidingAdvantage: advantages[0] ?? null,
    biggestConcession: concessions[0] ?? null,
    budget: {
      budget: context.budget.budget,
      subject: subjectCost?.budgetStatus ?? "unknown",
      other: otherCost?.budgetStatus ?? "unknown",
      subjectDifference: subjectCost?.budgetDifference ?? null,
      otherDifference: otherCost?.budgetDifference ?? null,
    },
  };

  return {
    ...partial,
    summary: explainHeadToHead(partial),
  };
}

/**
 * Produces the complete verdict on one vehicle under the user's settings.
 *
 * Called identically for the recommended car and for any car the user puts in
 * the hot seat. Nothing about the user's configuration changes between the
 * two — the same priorities, ordering, features, mileage, prices, budget and
 * contract type apply, and the recommendation itself is not affected.
 *
 * `compareWith` defaults to the most useful rival: the recommendation for a
 * hot-seated car, or the runner-up when the subject *is* the recommendation.
 */
export function evaluateVehicle(
  vehicle: PinnedFinnCar,
  context: ReasoningContext,
  options: {
    recommendedId?: number;
    compareWith?: PinnedFinnCar | null;
  } = {},
): VehicleEvaluation {
  const { scores, ranked, weights, preferences, costs } = context;

  const score =
    scores.find((item) => item.vehicleId === vehicle.id) ??
    ({
      vehicleId: vehicle.id,
      total: 0,
      byCategory: {} as Record<CategoryId, number>,
      details: {},
    } satisfies VehicleScore);

  const rank = ranked.findIndex((item) => item.id === vehicle.id) + 1;
  const isRecommendation = options.recommendedId === vehicle.id;

  const other =
    options.compareWith !== undefined
      ? options.compareWith
      : defaultComparison(vehicle, context, options.recommendedId);

  const priorities = weights.map(({ priority, rank: priorityRank, weight }) =>
    priorityBreakdown(
      priority,
      priorityRank,
      weight,
      vehicle,
      other,
      context,
    ),
  );

  const byImpact = [...priorities].sort(
    (a, b) =>
      Math.abs(b.versus?.weightedDifference ?? 0) -
      Math.abs(a.versus?.weightedDifference ?? 0),
  );

  return {
    vehicle,
    score,
    rank: rank > 0 ? rank : ranked.length,
    isRecommendation,
    cost: buildCostAnalysis(vehicle, preferences, costs[vehicle.id]),
    priorities,
    strengths: byImpact.filter((item) => (item.versus?.difference ?? 0) > 0),
    weaknesses: byImpact.filter((item) => (item.versus?.difference ?? 0) < 0),
    comparison: other
      ? buildHeadToHead(vehicle, other, priorities, context)
      : null,
  };
}

/**
 * Picks the rival that makes the comparison informative.
 *
 * For a car the user is inspecting, that's the recommendation — "how does
 * this stack up against the one Lens picked?". For the recommendation itself
 * it's the next-best car, which is the choice the user is really weighing.
 */
function defaultComparison(
  vehicle: PinnedFinnCar,
  context: ReasoningContext,
  recommendedId?: number,
): PinnedFinnCar | null {
  const { ranked } = context;

  if (recommendedId != null && recommendedId !== vehicle.id) {
    return ranked.find((item) => item.id === recommendedId) ?? null;
  }

  return ranked.find((item) => item.id !== vehicle.id) ?? null;
}

/* -------------------------------------------------------------------------- */
/* Recommendation                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Picks the recommended vehicle and explains it.
 *
 * The order is deliberate and the two systems never mix:
 *
 *   1. cost is calculated for every vehicle;
 *   2. budget eligibility is resolved from that cost;
 *   3. every vehicle is scored against the user's priorities — budget plays
 *      no part in this;
 *   4. the winner is the highest-scoring vehicle that is *allowed* to win;
 *   5. the winner is explained against its closest rival.
 *
 * Who is allowed to win, in order of preference:
 *
 *   - a vehicle confirmed to fit the budget;
 *   - failing that, a vehicle whose cost couldn't be fully calculated — it
 *     is not confirmed affordable, so it can't jump ahead of one that is;
 *   - failing that, every vehicle, and the result is flagged `isFallback`.
 *
 * A fallback winner is never presented as fitting the budget. Over-budget
 * vehicles are never hidden — they stay in `ranked` and remain inspectable.
 */
export function buildRecommendation(
  vehicles: PinnedFinnCar[],
  priorities: CategoryId[],
  preferences: LensPreferences,
  categoryFeatures: Record<
    CategoryId,
    FeatureWeight[]
  > = DEFAULT_CATEGORY_FEATURES,
): Recommendation | null {
  if (!vehicles.length) return null;

  const context = buildReasoningContext(
    vehicles,
    priorities,
    preferences,
    categoryFeatures,
  );

  return recommendFrom(context);
}

/** The same selection, when a context has already been built. */
export function recommendFrom(
  context: ReasoningContext,
): Recommendation | null {
  const { budget, ranked, scores } = context;

  if (!ranked.length) return null;

  const eligible = pickEligible(budget, ranked);

  const winner = ranked.find((vehicle) =>
    eligible.some((item) => item.id === vehicle.id),
  );

  if (!winner) return null;

  const winnerScore = scores.find(
    (score) => score.vehicleId === winner.id,
  ) as VehicleScore;

  /*
   * Fallback means: the user set a budget, nothing was confirmed to fit it,
   * and we're presenting the strongest priority match anyway — clearly
   * marked, rather than returning nothing.
   */
  const winnerStatus = context.costs[winner.id]?.budgetStatus;

  const isFallback =
    budget.budget != null && !budget.anyFits && winnerStatus !== "within";

  return {
    winner,
    score: winnerScore,
    ranked,
    scores,
    isFallback,
    fallbackReason: !isFallback
      ? null
      : winnerStatus === "over"
        ? "allOverBudget"
        : "costUnconfirmed",
    budget,
    evaluation: evaluateVehicle(winner, context, {
      recommendedId: winner.id,
    }),
    context,
  };
}

/**
 * The pool a winner may be drawn from, preferring certainty about the budget.
 */
function pickEligible(
  budget: BudgetPartition,
  ranked: PinnedFinnCar[],
): PinnedFinnCar[] {
  if (budget.within.length) return budget.within;
  if (budget.unknown.length) return budget.unknown;
  return ranked;
}

/* -------------------------------------------------------------------------- */
/* Hot seat                                                                   */
/* -------------------------------------------------------------------------- */

/** How many cars the hot-seat picker exposes, including the selected one. */
export const HOT_SEAT_WINDOW = 5;

/**
 * The bounded set of cars the user can switch between.
 *
 * The selected car always comes first, followed by its closest-ranked
 * neighbours — the cars it is genuinely competing with — rather than the
 * whole catalogue. Ties in distance break towards the better-ranked car.
 */
export function hotSeatOptions(
  context: ReasoningContext,
  selectedId: number,
  recommendedId: number,
  limit: number = HOT_SEAT_WINDOW,
): HotSeatOption[] {
  const { ranked, scores, costs } = context;

  const selectedIndex = ranked.findIndex(
    (vehicle) => vehicle.id === selectedId,
  );

  if (selectedIndex === -1) return [];

  const neighbours = ranked
    .map((vehicle, index) => ({ vehicle, index }))
    .filter((item) => item.index !== selectedIndex)
    .sort((a, b) => {
      const distance =
        Math.abs(a.index - selectedIndex) - Math.abs(b.index - selectedIndex);

      return distance !== 0 ? distance : a.index - b.index;
    })
    .slice(0, Math.max(0, limit - 1));

  const window = [
    { vehicle: ranked[selectedIndex] as PinnedFinnCar, index: selectedIndex },
    ...neighbours,
  ];

  return window.map(({ vehicle, index }) => ({
    vehicle,
    rank: index + 1,
    total: totalFor(scores, vehicle.id),
    isRecommendation: vehicle.id === recommendedId,
    isSelected: vehicle.id === selectedId,
    budgetStatus: costs[vehicle.id]?.budgetStatus ?? "unknown",
    totalMonthly: costs[vehicle.id]?.totalMonthly ?? 0,
  }));
}

/* -------------------------------------------------------------------------- */
/* Settings persistence                                                       */
/* -------------------------------------------------------------------------- */

const STORAGE_KEYS = [
  "finnLensPreferences",
  "finnLensPriorities",
  "finnLensPriorityDefinitions",
  "finnLensProfiles",
  "finnLensCategoryFeatures",
  "finnLensDefaultProfileId",
] as const;

/**
 * Priority ids that existed in earlier builds and no longer do.
 *
 * `affordability` used to be a ranked priority. It is now a budget constraint
 * instead, so any stored order, profile or feature map still referencing it is
 * cleaned up on load rather than left to produce a broken priority card.
 */
const RETIRED_PRIORITIES: string[] = ["affordability"];

const isLivePriority = (id: string): boolean =>
  !RETIRED_PRIORITIES.includes(id);

/**
 * Brings stored preferences up to the current shape.
 *
 * Migrations, all non-destructive:
 * - `annualKm` → `monthlyKm` (÷ 12), so existing users keep their mileage
 *   without re-entering it;
 * - `contractType` defaults to private;
 * - anything missing or unusable falls back to the product default.
 */
export function migratePreferences(
  stored: LegacyLensPreferences | undefined,
): LensPreferences {
  if (!stored) return { ...DEFAULT_PREFERENCES };

  const number = (value: unknown, fallback: number): number =>
    typeof value === "number" && Number.isFinite(value) && value >= 0
      ? value
      : fallback;

  const monthlyKm =
    stored.monthlyKm != null
      ? number(stored.monthlyKm, DEFAULT_PREFERENCES.monthlyKm)
      : stored.annualKm != null
        ? Math.round(number(stored.annualKm, DEFAULT_PREFERENCES.monthlyKm * 12) / 12)
        : DEFAULT_PREFERENCES.monthlyKm;

  return {
    monthlyKm,
    monthlyBudget: number(
      stored.monthlyBudget,
      DEFAULT_PREFERENCES.monthlyBudget,
    ),
    petrolPrice: number(stored.petrolPrice, DEFAULT_PREFERENCES.petrolPrice),
    dieselPrice: number(stored.dieselPrice, DEFAULT_PREFERENCES.dieselPrice),
    electricityPrice: number(
      stored.electricityPrice,
      DEFAULT_PREFERENCES.electricityPrice,
    ),
    contractType:
      stored.contractType === "business" ? "business" : "private",
  };
}

export async function loadLensSettings(): Promise<LensSettings> {
  const stored = (await browser.storage.local.get([
    ...STORAGE_KEYS,
  ])) as Record<string, unknown> as {
    finnLensPreferences?: LensPreferences & LegacyLensPreferences;
    finnLensPriorities?: CategoryId[];
    finnLensPriorityDefinitions?: PriorityDefinition[];
    finnLensProfiles?: Profile[];
    finnLensCategoryFeatures?: Record<CategoryId, FeatureWeight[]>;
    finnLensDefaultProfileId?: ProfileId;
  };

  const priorityDefinitions: PriorityDefinition[] = (
    stored.finnLensPriorityDefinitions ?? DEFAULT_PRIORITY_DEFINITIONS
  ).filter((definition) => isLivePriority(definition.id));

  /**
   * Restore persisted custom categories into the runtime registry.
   *
   * Built-ins are deliberately ignored because CATEGORIES already owns them.
   */
  for (const definition of priorityDefinitions) {
    if (definition.isCustom && !(definition.id in CATEGORIES)) {
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

  const priorities = (stored.finnLensPriorities ?? DEFAULT_PRIORITIES).filter(
    isLivePriority,
  );

  const profiles = (stored.finnLensProfiles ?? DEFAULT_PROFILES).map(
    (profile) => ({
      ...profile,
      priorities: profile.priorities.filter(isLivePriority),
    }),
  );

  const categoryFeatures = Object.fromEntries(
    Object.entries(
      stored.finnLensCategoryFeatures ?? DEFAULT_CATEGORY_FEATURES,
    ).filter(([id]) => isLivePriority(id)),
  ) as Record<CategoryId, FeatureWeight[]>;

  return {
    preferences: migratePreferences(stored.finnLensPreferences),
    priorities: priorities.length ? priorities : DEFAULT_PRIORITIES,
    priorityDefinitions,
    profiles,
    categoryFeatures,
    defaultProfileId:
      stored.finnLensDefaultProfileId ?? DEFAULT_DEFAULT_PROFILE_ID,
  };
}

export async function saveLensSettings(
  settings: Partial<LensSettings>,
): Promise<void> {
  await browser.storage.local.set({
    ...(settings.preferences
      ? { finnLensPreferences: settings.preferences }
      : {}),

    ...(settings.priorities
      ? { finnLensPriorities: settings.priorities }
      : {}),

    ...(settings.priorityDefinitions
      ? { finnLensPriorityDefinitions: settings.priorityDefinitions }
      : {}),

    ...(settings.profiles ? { finnLensProfiles: settings.profiles } : {}),

    ...(settings.categoryFeatures
      ? { finnLensCategoryFeatures: settings.categoryFeatures }
      : {}),

    ...(settings.defaultProfileId
      ? { finnLensDefaultProfileId: settings.defaultProfileId }
      : {}),
  });
}
