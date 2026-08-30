import type { PinnedFinnCar } from "@/lib/types";
import type {
  AlternativeOption,
  FeatureId,
  FeatureImportance,
  FeaturePreference,
  BudgetPartition,
  CategoryId,
  CostBreakdown,
  FeatureSelection,
  HeadToHead,
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
  AVAILABLE_CATEGORY_FEATURES,
  CATEGORIES,
  DEFAULT_FEATURE_IMPORTANCE,
  FEATURE_IMPORTANCE,
  DEFAULT_CATEGORY_FEATURES,
  DEFAULT_DEFAULT_PROFILE_ID,
  DEFAULT_PREFERENCES,
  DEFAULT_PRIORITIES,
  DEFAULT_PRIORITY_DEFINITIONS,
  DEFAULT_PROFILES,
  MAX_FEATURES_PER_CATEGORY,
  PROFILES,
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
  featurePhrase,
  getCategory,
  priorityWeights,
  registerCategoryMeta,
  scoreFor,
  totalFor,
  unregisterCategoryMeta,
  winnerForCategory,
} from "./scoring";

import { explainHeadToHead } from "./explain";
import { classifyMeasurementGap, classifyMonthlyCostGap, isNoticeable } from "./narrative/magnitude";
import { inSentence, shortName } from "./narrative/phrase";
import { formatEUR } from "./format";

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

export { explainHeadToHead } from "./explain";

export { buildAdviceNarrative, reasonAboutChallenge } from "./narrative";

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
    FeatureSelection
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

  const ranked = [...vehicles].sort((a, b) => {
    const difference = totalFor(scores, b.id) - totalFor(scores, a.id);

    return difference !== 0
      ? difference
      : breakTieOnPicks(a, b, ordered, categoryFeatures);
  });

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

/**
 * Separates two cars that finished on exactly the same score.
 *
 * This is the only place the features a user picked out touch the ranking,
 * and it deliberately adds no weight to anything: it applies when — and only
 * when — the arithmetic has said the two cars are identical. At that point
 * the honest way to order them is by what the user actually asked for.
 *
 * Resolved priority by priority, in the user's own order, so a pick under
 * their #1 settles it before their #3 is consulted. Nothing here is a
 * constant, a multiplier or a grade; it is their ordering applied twice.
 */
function breakTieOnPicks(
  a: PinnedFinnCar,
  b: PinnedFinnCar,
  priorities: CategoryId[],
  categoryFeatures: Record<CategoryId, FeatureSelection>,
): number {
  for (const priority of priorities) {
    const selected = categoryFeatures[priority] ?? [];
    if (!selected.length) continue;

    const held = (vehicle: PinnedFinnCar): number =>
      selected.reduce(
        (sum, preference) =>
          vehicle.features?.[preference.key]
            ? sum + FEATURE_IMPORTANCE[preference.importance].weight
            : sum,
        0,
      );

    const difference = held(b) - held(a);
    if (difference !== 0) return difference;
  }

  return 0;
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
 * Builds the full evidence record for one vehicle in one priority.
 *
 * `peers` is the set the category leader is resolved against — the
 * recommendation and its realistic alternatives, not everything pinned. See
 * `PriorityBreakdown.leader`.
 */
function priorityBreakdown(
  category: CategoryId,
  rank: number,
  weight: number,
  subject: PinnedFinnCar,
  other: PinnedFinnCar | null,
  peers: PinnedFinnCar[],
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

  const leaderVehicle = winnerForCategory(peers, scores, category);
  const leader = leaderVehicle
    ? scoreRef(leaderVehicle, scores, category)
    : null;

  const runnerUpVehicle = winnerForCategory(
    peers.filter((item) => item.id !== subject.id),
    scores,
    category,
  );

  const runnerUp = runnerUpVehicle
    ? scoreRef(runnerUpVehicle, scores, category)
    : null;

  const matchedLabels = detail.matched.map(featureLabel);
  const missingLabels = detail.missing.map(featureLabel);

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
    basis: detail.basis,
    pickedMatched: detail.pickedMatched,
    pickedMissing: detail.pickedMissing,
    coverageScore: detail.coverageScore,
    matchedLabels,
    missingLabels,
    numeric: detail.numeric,
    environmental: detail.environmental ?? null,
    hasEvidence: detail.hasEvidence,
    leader,
    isLeader: leader ? leader.score <= score : true,
    gapToLeader: leader ? Math.max(0, leader.score - score) : 0,
    runnerUp,
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

  /*
   * Compared over the category's whole catalogue, which is what the score
   * counted. Narrowing this to the user's picks would let a head-to-head
   * report "nothing separates them" while the scores differ by thirty points
   * on equipment the picks didn't happen to mention.
   *
   * Which of these differences the user actually asked about is a separate
   * question, answered by `pickedMatched` / `pickedMissing`.
   */
  const catalogue =
    AVAILABLE_CATEGORY_FEATURES[category] ??
    getCategory(category)?.features ??
    [];

  const onlySubjectHas: FeatureId[] = [];
  const onlyOtherHas: FeatureId[] = [];

  for (const key of catalogue) {
    const subjectHas = Boolean(subject.features?.[key]);
    const otherHas = Boolean(other.features?.[key]);

    if (subjectHas && !otherHas) onlySubjectHas.push(key);
    if (otherHas && !subjectHas) onlyOtherHas.push(key);
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
 * Two options decide who this car is measured against, and both default to
 * the honest thing rather than the dramatic one:
 *
 * - `compareWith` — the single rival to run head-to-head with. For a car in
 *   the hot seat that is the recommendation, because "how does this compare
 *   with the one you were given?" is the question being asked. For the
 *   recommendation itself it is `null`: the winner is explained on its own
 *   merits, not by parading whichever car beats it at each individual thing.
 *
 * - `peers` — the set a category leader is resolved within. Defaults to
 *   everything pinned; callers pass the winner and its realistic alternatives
 *   so that a distant car topping one category doesn't get quoted as though
 *   it were a contender.
 */
export function evaluateVehicle(
  vehicle: PinnedFinnCar,
  context: ReasoningContext,
  options: {
    recommendedId?: number;
    compareWith?: PinnedFinnCar | null;
    peers?: PinnedFinnCar[];
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

  const peers = options.peers?.length ? options.peers : context.vehicles;

  const priorities = weights.map(({ priority, rank: priorityRank, weight }) =>
    priorityBreakdown(
      priority,
      priorityRank,
      weight,
      vehicle,
      other,
      peers,
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
 * Picks the rival for a car the user is inspecting: the recommendation.
 *
 * The recommendation itself gets none. Explaining the winner by naming the
 * runner-up turns the answer into a two-horse race the user didn't ask about;
 * challengers are offered deliberately, through the alternatives set.
 */
function defaultComparison(
  vehicle: PinnedFinnCar,
  context: ReasoningContext,
  recommendedId?: number,
): PinnedFinnCar | null {
  if (recommendedId == null || recommendedId === vehicle.id) return null;

  return context.ranked.find((item) => item.id === recommendedId) ?? null;
}

/* -------------------------------------------------------------------------- */
/* Alternatives                                                               */
/* -------------------------------------------------------------------------- */

/** How many cars may be put up against the recommendation. */
export const ALTERNATIVE_COUNT = 4;

/**
 * The cars worth challenging the recommendation with.
 *
 * Closeness is measured on the overall result, because that is what "a
 * realistic alternative" means: a car the user could plausibly have been
 * given instead. Winning one isolated category is explicitly *not* a
 * qualification — a car forty points back that happens to top climate
 * suitability is not an alternative, it is a distraction.
 *
 * Ties in distance break towards the better-placed car.
 */
export function selectAlternatives(
  context: ReasoningContext,
  winnerId: number,
  limit: number = ALTERNATIVE_COUNT,
): PinnedFinnCar[] {
  const { ranked, scores } = context;

  const winnerTotal = totalFor(scores, winnerId);

  return ranked
    .map((vehicle, index) => ({ vehicle, index }))
    .filter((item) => item.vehicle.id !== winnerId)
    .sort((a, b) => {
      const distance =
        Math.abs(totalFor(scores, a.vehicle.id) - winnerTotal) -
        Math.abs(totalFor(scores, b.vehicle.id) - winnerTotal);

      return distance !== 0 ? distance : a.index - b.index;
    })
    .slice(0, Math.max(0, limit))
    .map((item) => item.vehicle);
}

/**
 * The one concrete thing that would make a reader look at this car instead.
 *
 * Ordered by how directly it answers "what would I actually gain?": equipment
 * the user picked out beats a measurement, a measurement beats money,
 * and when none of the three separates the two cars it returns null rather
 * than inventing a reason.
 */
function alternativeHook(
  alternative: PinnedFinnCar,
  winner: PinnedFinnCar,
  context: ReasoningContext,
  costDifference: number | null,
): string | null {
  const { weights, categoryFeatures, scores } = context;

  /*
   * Something the user singled out that this car has and the winner doesn't,
   * taken from their highest priority downwards. Only their own selections
   * qualify — equipment nobody asked about is not a reason to look at a car.
   */
  for (const { priority } of weights) {
    const selected = categoryFeatures[priority] ?? [];

    /* Highest importance first: it is the pick they'd most notice missing. */
    const gained = [...selected]
      .sort(
        (a, b) =>
          FEATURE_IMPORTANCE[b.importance].weight -
          FEATURE_IMPORTANCE[a.importance].weight,
      )
      .filter(
        (preference) =>
          Boolean(alternative.features?.[preference.key]) &&
          !winner.features?.[preference.key],
      );

    if (gained.length) {
      return `Adds ${featurePhrase(gained[0]!.key)}`;
    }
  }

  for (const { priority } of weights) {
    const mine = scores.find((item) => item.vehicleId === alternative.id)
      ?.details[priority]?.numeric;

    const theirs = scores.find((item) => item.vehicleId === winner.id)
      ?.details[priority]?.numeric;

    if (!mine || !theirs) continue;

    const ahead = mine.lowerIsBetter
      ? mine.value < theirs.value
      : mine.value > theirs.value;

    if (!ahead) continue;
    if (!isNoticeable(classifyMeasurementGap(mine.value, theirs.value))) continue;

    return `${mine.label}: ${mine.display} vs ${theirs.display}`;
  }

  if (
    costDifference != null &&
    costDifference < 0 &&
    isNoticeable(
      classifyMonthlyCostGap(
        costDifference,
        context.costs[winner.id]?.totalMonthly ?? 0,
      ),
    )
  ) {
    return `${formatEUR(Math.abs(costDifference))}/month cheaper`;
  }

  /*
   * Nothing separates them on anything the user asked about. Saying so is
   * more useful than an empty line — it tells the reader this one isn't worth
   * opening.
   */
  return `Nothing you ranked separates it from ${shortName(winner.name)}`;
}

/**
 * The alternatives, packaged for the picker.
 *
 * Every figure here is expressed relative to the winner, because that is the
 * only comparison the hot seat is for.
 */
export function alternativeOptions(
  context: ReasoningContext,
  alternatives: PinnedFinnCar[],
  winner: PinnedFinnCar,
  selectedId: number,
): AlternativeOption[] {
  const { ranked, scores, costs } = context;

  const winnerCost = costs[winner.id];
  const winnerTotal = totalFor(scores, winner.id);

  return alternatives.map((vehicle) => {
    const cost = costs[vehicle.id];

    const costDifference =
      cost?.complete && winnerCost?.complete
        ? cost.totalMonthly - winnerCost.totalMonthly
        : null;

    return {
      vehicle,
      rank: ranked.findIndex((item) => item.id === vehicle.id) + 1,
      total: totalFor(scores, vehicle.id),
      differenceToWinner: totalFor(scores, vehicle.id) - winnerTotal,
      isSelected: vehicle.id === selectedId,
      budgetStatus: cost?.budgetStatus ?? "unknown",
      totalMonthly: cost?.totalMonthly ?? 0,
      costDifference,
      budgetDifference: cost?.budgetDifference ?? null,
      hook: alternativeHook(vehicle, winner, context, costDifference),
    };
  });
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
 *   5. the four closest cars become the alternatives it can be challenged
 *      with, and the winner is explained on its own merits.
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
    FeatureSelection
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

  const topScorer = ranked[0] as PinnedFinnCar;
  const alternatives = selectAlternatives(context, winner.id);

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
    topScorer,
    budgetChangedTheAnswer: topScorer.id !== winner.id,
    alternatives,
    evaluation: evaluateVehicle(winner, context, {
      recommendedId: winner.id,
      compareWith: null,
      peers: [winner, ...alternatives],
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

/**
 * The evaluation for a car the user has put up against the recommendation.
 *
 * Always framed as alternative-versus-winner, and scored inside the same
 * comparison set, so the two readings can never contradict each other.
 */
export function evaluateChallenger(
  challenger: PinnedFinnCar,
  recommendation: Recommendation,
): VehicleEvaluation {
  const { context, winner, alternatives } = recommendation;

  return evaluateVehicle(challenger, context, {
    recommendedId: winner.id,
    compareWith: winner,
    peers: [winner, ...alternatives],
  });
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

/**
 * Priorities that were merged into another one.
 *
 * `safety` and `driverAssistance` were separate categories asking the user to
 * rank the same systems twice — automatic emergency braking sat in both. They
 * are now one priority, and anything stored under either id is folded into it
 * on load rather than disappearing.
 */
const MERGED_PRIORITIES: Record<string, CategoryId> = {
  safety: "safetyAssistance",
  driverAssistance: "safetyAssistance",
};

const isLivePriority = (id: string): boolean =>
  !RETIRED_PRIORITIES.includes(id);

const currentIdFor = (id: string): CategoryId =>
  (MERGED_PRIORITIES[id] ?? id) as CategoryId;

/**
 * Rewrites a stored priority order onto the current category set.
 *
 * Retired ids are dropped, merged ids are renamed, and the duplicate that a
 * merge creates — a user who ranked safety #1 and driver assistance #3 — is
 * collapsed to the higher of the two positions, which is the one they cared
 * about more.
 */
function migratePriorityOrder(stored: string[]): CategoryId[] {
  const seen = new Set<string>();
  const result: CategoryId[] = [];

  for (const id of stored) {
    if (!isLivePriority(id)) continue;

    const current = currentIdFor(id);

    if (!(current in CATEGORIES)) continue;
    if (seen.has(current)) continue;

    seen.add(current);
    result.push(current);
  }

  return result;
}

/**
 * A stored feature entry, in any shape this product has used.
 *
 * Three so far: the original tier system's `{ key, tier }`, the flat
 * `FeatureId` of the selection-only build, and the current
 * `{ key, importance }`. All three are read so that nobody loses what they
 * told us across an upgrade.
 */
type StoredFeature =
  | FeatureId
  | {
      key?: FeatureId;
      importance?: string;
      /** essential | good | luxury, from the original tier system. */
      tier?: string;
    };

/**
 * Old tiers map onto importance by intent rather than by name.
 *
 * "Essential" becomes high rather than something stronger, on purpose: it was
 * never a hard requirement in the engine, and preserving it as one now would
 * import a meaning the product deliberately doesn't have.
 */
const TIER_TO_IMPORTANCE: Record<string, FeatureImportance> = {
  essential: "high",
  good: "medium",
  luxury: "low",
};

function readStoredFeature(stored: StoredFeature): FeaturePreference | null {
  if (typeof stored === "string") {
    return { key: stored, importance: DEFAULT_FEATURE_IMPORTANCE };
  }

  if (!stored?.key) return null;

  const importance =
    stored.importance && stored.importance in FEATURE_IMPORTANCE
      ? (stored.importance as FeatureImportance)
      : stored.tier
        ? (TIER_TO_IMPORTANCE[stored.tier] ?? DEFAULT_FEATURE_IMPORTANCE)
        : DEFAULT_FEATURE_IMPORTANCE;

  return { key: stored.key, importance };
}

/**
 * Brings a stored feature selection up to the current rules.
 *
 * Ids the catalogue no longer offers are dropped, duplicates created by the
 * safety merge collapse to one keeping the stronger importance, and the
 * result is capped at the maximum.
 *
 * A category that ends up empty stays empty, and so does a fresh install:
 * picking nothing means "judge this category on its catalogue", which is a
 * preference to respect rather than a form to fill in on the user's behalf.
 */
function migrateCategoryFeatures(
  stored: Record<string, StoredFeature[]> | undefined,
): Record<CategoryId, FeatureSelection> {
  const result = { ...DEFAULT_CATEGORY_FEATURES };

  if (!stored) return result;

  const merged: Record<string, StoredFeature[]> = {};

  for (const [id, features] of Object.entries(stored)) {
    if (!isLivePriority(id)) continue;

    const current = currentIdFor(id);
    if (!(current in CATEGORIES)) continue;

    merged[current] = [...(merged[current] ?? []), ...(features ?? [])];
  }

  for (const [id, features] of Object.entries(merged)) {
    const category = id as CategoryId;
    const catalogue = AVAILABLE_CATEGORY_FEATURES[category] ?? [];

    const kept = new Map<FeatureId, FeaturePreference>();

    for (const entry of features) {
      const preference = readStoredFeature(entry);

      if (!preference) continue;
      if (!catalogue.includes(preference.key)) continue;

      const existing = kept.get(preference.key);

      /* The safety merge can bring one feature in twice. Keep the louder. */
      if (
        existing &&
        FEATURE_IMPORTANCE[existing.importance].weight >=
          FEATURE_IMPORTANCE[preference.importance].weight
      ) {
        continue;
      }

      kept.set(preference.key, preference);
    }

    result[category] = [...kept.values()].slice(0, MAX_FEATURES_PER_CATEGORY);
  }

  return result;
}

/**
 * Reconciles stored profiles with the shipped definitions.
 *
 * Profiles are product configuration: their copy and priority order come from
 * `PROFILES` every time, so a build that changes them reaches existing users.
 * Only `enabled` is read back from storage, because it is the only part the
 * user owns — and at least one profile always survives.
 */
function migrateProfiles(stored: Profile[] | undefined): Profile[] {
  const enabledById = new Map(
    (stored ?? []).map((profile) => [profile.id, profile.enabled !== false]),
  );

  const profiles = DEFAULT_PROFILES.map((profile) => ({
    ...profile,
    priorities: [...profile.priorities],
    enabled: enabledById.get(profile.id) ?? true,
  }));

  return profiles.some((profile) => profile.enabled)
    ? profiles
    : profiles.map((profile) =>
        profile.id === DEFAULT_DEFAULT_PROFILE_ID
          ? { ...profile, enabled: true }
          : profile,
      );
}

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

/**
 * Whether the reader has ever configured Lens, as opposed to being carried by
 * its defaults.
 *
 * `loadLensSettings` can't answer this: it is built to always return something
 * usable, falling back to the default profile so that nothing downstream has
 * to handle an unconfigured state. That is right for the Compare flow, which
 * walks the reader through configuring it anyway, and wrong for the in-page
 * analysis, which would otherwise present a stranger's defaults as "how this
 * car fits you".
 *
 * Only the three keys that shape an analysis count. Enabling a profile or
 * choosing a default one changes which questions get asked, not what the
 * answer is measured against.
 */
export async function hasSavedLensSettings(): Promise<boolean> {
  const stored = await browser.storage.local.get([
    "finnLensPreferences",
    "finnLensPriorities",
    "finnLensCategoryFeatures",
  ]);

  const priorities = stored.finnLensPriorities as unknown[] | undefined;

  const features = stored.finnLensCategoryFeatures as
    | Record<string, unknown[]>
    | undefined;

  return Boolean(
    stored.finnLensPreferences ||
      priorities?.length ||
      Object.values(features ?? {}).some((picks) => picks?.length),
  );
}

export async function loadLensSettings(): Promise<LensSettings> {
  const stored = (await browser.storage.local.get([
    ...STORAGE_KEYS,
  ])) as Record<string, unknown> as {
    finnLensPreferences?: LensPreferences & LegacyLensPreferences;
    finnLensPriorities?: string[];
    finnLensPriorityDefinitions?: PriorityDefinition[];
    finnLensProfiles?: Profile[];
    finnLensCategoryFeatures?: Record<string, StoredFeature[]>;
    finnLensDefaultProfileId?: string;
  };

  /*
   * Built-in definitions are rebuilt from CATEGORIES each load so renamed and
   * merged categories reach existing users; only `enabled` is carried over.
   * Custom priorities the user created are kept as they were stored.
   */
  const storedDefinitions = (stored.finnLensPriorityDefinitions ?? []).filter(
    (definition) => isLivePriority(definition.id),
  );

  const enabledById = new Map(
    storedDefinitions.map((definition) => [
      currentIdFor(definition.id),
      definition.enabled !== false,
    ]),
  );

  const priorityDefinitions: PriorityDefinition[] = [
    ...DEFAULT_PRIORITY_DEFINITIONS.map((definition) => ({
      ...definition,
      enabled: enabledById.get(definition.id) ?? true,
    })),
    ...storedDefinitions.filter(
      (definition) => definition.isCustom && !(definition.id in CATEGORIES),
    ),
  ];

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

  const defaultProfileId = (
    stored.finnLensDefaultProfileId &&
    stored.finnLensDefaultProfileId in PROFILES
      ? stored.finnLensDefaultProfileId
      : DEFAULT_DEFAULT_PROFILE_ID
  ) as ProfileId;

  const profiles = migrateProfiles(stored.finnLensProfiles);

  const priorities = migratePriorityOrder(stored.finnLensPriorities ?? []);

  /*
   * With nothing usable stored, the default profile is what the user gets —
   * that being the whole meaning of "default profile".
   */
  const fallbackOrder =
    profiles.find((profile) => profile.id === defaultProfileId && profile.enabled)
      ?.priorities ??
    profiles.find((profile) => profile.enabled)?.priorities ??
    DEFAULT_PRIORITIES;

  return {
    preferences: migratePreferences(stored.finnLensPreferences),
    priorities: priorities.length ? priorities : [...fallbackOrder],
    priorityDefinitions,
    profiles,
    categoryFeatures: migrateCategoryFeatures(stored.finnLensCategoryFeatures),
    defaultProfileId,
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
