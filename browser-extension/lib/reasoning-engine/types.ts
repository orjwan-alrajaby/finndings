import type { PinnedFinnCar } from "@/lib/types";
import type { CATEGORIES, FEATURES, PROFILES } from "./constants";
import type { EnvironmentalAssessment } from "./environmental";

/* -------------------------------------------------------------------------- */
/* Configuration-derived types                                                */
/* -------------------------------------------------------------------------- */

export type CategoryId = keyof typeof CATEGORIES;
export type FeatureId = keyof typeof FEATURES;
export type ProfileId = keyof typeof PROFILES;

/* -------------------------------------------------------------------------- */
/* Preferences                                                                */
/* -------------------------------------------------------------------------- */

export type PreferenceSource = "defaults" | "custom";

/**
 * Which FINN contract Lens is evaluating a vehicle under.
 *
 * This only selects which advertised monthly price to use. It deliberately
 * does not branch scoring, profiles, or recommendations.
 */
export type ContractType = "private" | "business";

export interface LensPreferences {
  /**
   * Maximum the user wants to spend per month on the car in total, including
   * estimated running costs. A hard eligibility constraint, never a score.
   */
  monthlyBudget: number;
  /** Roughly how far the user drives in a typical month. An estimate is fine. */
  monthlyKm: number;
  petrolPrice: number;
  dieselPrice: number;
  electricityPrice: number;
  contractType: ContractType;
}

/**
 * Shape of settings persisted by older builds, kept only so
 * `loadLensSettings` can migrate them forward.
 */
export interface LegacyLensPreferences {
  annualKm?: number;
  monthlyKm?: number;
  monthlyBudget?: number;
  petrolPrice?: number;
  dieselPrice?: number;
  electricityPrice?: number;
  contractType?: ContractType;
}

/* -------------------------------------------------------------------------- */
/* Features                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * How much extra influence one picked-out feature should have.
 *
 * The keys are internal and never shown; what the user reads is the answer
 * to "how much should this influence your decision?" — somewhat, moderately,
 * highly. See FEATURE_IMPORTANCE.
 *
 * Deliberately not "essential". A feature nobody would buy the car without is
 * a hard requirement, and Lens has none — a car missing even a pick the
 * reader said should count highly stays in the running, and the gap is
 * reported as a tradeoff. These words describe strength of preference, nothing more.
 */
export type FeatureImportance = "high" | "medium" | "low";

/** One feature the user picked out, and how much it should influence. */
export interface FeaturePreference {
  key: FeatureId;
  importance: FeatureImportance;
}

/**
 * What the user picked out within one priority, at most five entries.
 *
 * This is not the old tier system returning. That asked the reader to grade
 * every feature in a catalogue of up to fifteen, most of which they had no
 * opinion about, and called the top grade "essential" — which read as a hard
 * requirement it never was. Here they grade only the handful they chose to
 * name, and the grade adjusts weight rather than gating anything.
 *
 * An empty list is a valid, meaningful answer: the category is then judged on
 * its catalogue alone. See `CategoryDetail`.
 */
export type FeatureSelection = FeaturePreference[];

/* -------------------------------------------------------------------------- */
/* Profiles                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * A predefined recommendation strategy.
 *
 * Profiles are product configuration, not user documents: the label, icon,
 * copy and priority order are fixed. `enabled` is the only field the user
 * owns, and whether a profile is *selected by default* is a separate setting
 * (`LensSettings.defaultProfileId`) rather than a flag here.
 */
export interface Profile {
  id: ProfileId;
  label: string;
  icon: string;
  forWhom: string;
  assumes: string;
  /** Exactly five, in rank order. Fixed for the life of the profile. */
  priorities: CategoryId[];
  enabled: boolean;
}

/* -------------------------------------------------------------------------- */
/* Categories                                                                 */
/* -------------------------------------------------------------------------- */

export interface CategoryDef {
  label: string;
  icon: string;
  color: string;
  question: string;
  description: string;
  recommendedFor: string[];
  numericOnly?: boolean;
  /**
   * The catalogue of features this category *offers*, most relevant first.
   *
   * Not the user's selection — see `DEFAULT_CATEGORY_FEATURES` for the opening
   * five and `LensSettings.categoryFeatures` for what they actually picked.
   * It is also the fallback yardstick when they pick nothing.
   */
  features: FeatureId[];
}

/* -------------------------------------------------------------------------- */
/* User-editable priority metadata                                            */
/* -------------------------------------------------------------------------- */

export interface PriorityDefinition {
  id: CategoryId;
  label: string;
  icon: string;
  description: string;
  isCustom: boolean;
  enabled: boolean;
}

/* -------------------------------------------------------------------------- */
/* Scoring                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * A measured number behind a category score — boot litres, electric range,
 * CO₂ — so the UI can cite the actual figure rather than only the score.
 */
export interface NumericEvidence {
  label: string;
  value: number;
  unit: string;
  display: string;
  /** True when a smaller number is the better outcome (CO₂, consumption). */
  lowerIsBetter: boolean;
}

/**
 * What a category's feature score was measured against.
 *
 * - `category` — the category's whole catalogue, which is always the answer
 *   when it has one.
 * - `none` — the category has no feature catalogue and is measured from
 *   vehicle data instead (see `numericOnly`).
 *
 * There is deliberately no "selected" case. A category score always measures
 * the category; what the user picked out decides what gets *said* about it,
 * not what gets counted. See `categoryDetail`.
 */
export type FeatureBasis = "category" | "none";

export interface CategoryDetail {
  score: number;
  /** Catalogue features the car has. */
  matched: FeatureId[];
  /** Catalogue features it doesn't. */
  missing: FeatureId[];
  /** What the feature score was measured against. */
  basis: FeatureBasis;
  /**
   * The features the user picked out, split by whether the car has them, each
   * carrying the importance they gave it.
   *
   * Reported separately from the catalogue lists because they answer a
   * different question — "does it have the things I asked for?" rather than
   * "how well equipped is it here?" — and the Advice says both.
   */
  pickedMatched: FeaturePreference[];
  pickedMissing: FeaturePreference[];
  /**
   * Plain share of the category's catalogue the car carries, ignoring what
   * the user picked. The figure behind "12 of the 15 systems we check".
   */
  coverageScore: number | null;
  /**
   * The share that actually feeds the ranking: the same catalogue, with the
   * features the user picked out counting for more.
   *
   * Equal to `coverageScore` when nothing was picked. Because the whole
   * catalogue remains the denominator, no single feature can drive this to 0
   * or 100 — which is exactly what went wrong when the picks *were* the
   * denominator.
   */
  featureScore: number | null;
  /** Score derived from vehicle data alone, when the category has a numeric signal. */
  numericScore: number | null;
  numeric: NumericEvidence | null;
  /**
   * False when neither a feature list nor a measurement was available and the
   * score is the neutral placeholder rather than a measured result.
   *
   * Scoring is unchanged by this flag. It exists so an explanation can say
   * "we don't have enough data here" instead of dressing up a default as
   * evidence.
   */
  /**
   * The working behind a category scored on figures rather than equipment.
   * Only environmental impact has one — see `environmentalImpact`.
   */
  environmental?: EnvironmentalAssessment | null;

  hasEvidence: boolean;
}

export interface VehicleScore {
  vehicleId: number;
  total: number;
  byCategory: Record<CategoryId, number>;
  details: Partial<Record<CategoryId, CategoryDetail>>;
}

/** How much a single priority contributes, given its position in the order. */
export interface PriorityWeight {
  priority: CategoryId;
  /** 1-based position in the user's ordering. */
  rank: number;
  /** Fraction of the overall score this priority accounts for (0–1). */
  weight: number;
  weightPercent: number;
}

/* -------------------------------------------------------------------------- */
/* Costs                                                                      */
/* -------------------------------------------------------------------------- */

/** Why a cost component could not be calculated. Never silently treated as €0. */
export type CostUnavailableReason =
  | "missingSubscriptionPrice"
  | "missingConsumption"
  | "missingEnergyPrice"
  | "missingExtraKmPrice";

export interface CostComponent {
  /** Estimated euros per month, or null when it cannot be calculated. */
  amount: number | null;
  available: boolean;
  reason: CostUnavailableReason | null;
}

export interface SubscriptionCost extends CostComponent {
  contractType: ContractType;
  /**
   * Whether VAT is known to be included in the advertised price.
   * `null` means the supplied data does not say — we don't guess.
   */
  vatIncluded: boolean | null;
}

export interface EnergyCost extends CostComponent {
  /** Litres or kWh per 100 km, as supplied by FINN. */
  consumption: number | null;
  consumptionUnit: "L/100km" | "kWh/100km";
  /** The user-supplied price per litre or per kWh that was applied. */
  energyPrice: number | null;
  energyLabel: "fuel" | "electricity";
  costPer100Km: number | null;
  /**
   * Set for powertrains the supplied data cannot fully model — currently
   * plug-in hybrids, where FINN reports one combined litres figure and no
   * electric/petrol split.
   */
  caveat: string | null;
}

export interface ExcessMileageCost extends CostComponent {
  includedMonthlyKm: number;
  monthlyKm: number;
  /** Kilometres beyond the included allowance. Never negative. */
  excessKm: number;
  extraKmPrice: number | null;
}

/**
 * Budget eligibility is three-state on purpose.
 *
 * A vehicle whose cost could not be fully calculated is never reported as
 * fitting the budget just because the missing pieces would have been €0.
 */
export type BudgetStatus = "within" | "over" | "unknown";

export interface CostBreakdown {
  vehicleId: number;
  currency: "€";
  contractType: ContractType;
  monthlyKm: number;
  includedMonthlyKm: number;

  subscription: SubscriptionCost;
  energy: EnergyCost;
  excessMileage: ExcessMileageCost;

  /** Sum of the components that could actually be calculated. */
  totalMonthly: number;
  /** True only when every component was calculable. */
  complete: boolean;
  missing: CostUnavailableReason[];

  /** null when the user has not set a usable budget. */
  budget: number | null;
  /** totalMonthly − budget. Positive means over. null without a budget. */
  budgetDifference: number | null;
  budgetStatus: BudgetStatus;
}

/**
 * A cost line ready to render, tagged with where the number came from so the
 * UI can keep FINN's facts, the user's assumptions and Lens's estimates
 * visually distinct.
 */
export type CostFactSource = "finn" | "user" | "estimate";

export interface CostLine {
  id: "subscription" | "energy" | "excessMileage";
  label: string;
  amount: number | null;
  available: boolean;
  source: CostFactSource;
  /** Plain-English explanation of this line, built from the numbers above. */
  explanation: string;
  /** The inputs behind the line, each tagged by origin. */
  facts: CostFact[];
}

export interface CostFact {
  label: string;
  value: string;
  source: CostFactSource;
}

export interface CostAnalysis {
  vehicleId: number;
  vehicleName: string;
  breakdown: CostBreakdown;
  lines: CostLine[];
  /** "We estimate this car will cost you around €742/month." */
  headline: string;
  /** The budget sentence, or null when no budget is configured. */
  budgetSentence: string | null;
  /** What VAT treatment the supplied data actually supports. */
  vatNote: string;
  /** Warnings about components that could not be estimated. Empty when complete. */
  caveats: string[];
  disclaimer: string;
}

/* -------------------------------------------------------------------------- */
/* Comparative reasoning                                                      */
/* -------------------------------------------------------------------------- */

export interface ScoreRef {
  vehicleId: number;
  name: string;
  score: number;
  /** The measurement behind that score, when the category has one. */
  numeric: NumericEvidence | null;
}

/**
 * Everything known about one vehicle's performance in one priority, including
 * how it compares with a specific rival and with the category leader.
 */
export interface PriorityBreakdown {
  priority: CategoryId;
  label: string;
  icon: string;
  rank: number;
  weight: number;
  weightPercent: number;

  score: number;
  /** score × weight — this priority's actual contribution to the total. */
  weightedContribution: number;

  matched: FeatureId[];
  missing: FeatureId[];
  /** See `CategoryDetail.basis`. */
  basis: FeatureBasis;
  /** See `CategoryDetail.pickedMatched`. */
  pickedMatched: FeaturePreference[];
  pickedMissing: FeaturePreference[];
  /** See `CategoryDetail.coverageScore`. */
  coverageScore: number | null;
  matchedLabels: string[];
  missingLabels: string[];
  numeric: NumericEvidence | null;
  /** See `CategoryDetail.hasEvidence`. */
  /** See `CategoryDetail.environmental`. */
  environmental: EnvironmentalAssessment | null;

  hasEvidence: boolean;

  /**
   * The strongest car in this category **within the comparison set** — the
   * recommendation and its closest alternatives — not across everything
   * pinned.
   *
   * Scoping it matters: a car that finished thirty points back overall is not
   * a reason to doubt the recommendation just because it happens to top one
   * low-ranked category, and naming it as though it were is what turns an
   * explanation into a leaderboard.
   */
  leader: ScoreRef | null;
  isLeader: boolean;
  /** Points behind the category leader. 0 when this vehicle leads. */
  gapToLeader: number;
  /**
   * The best of the comparison set *other than* this vehicle.
   *
   * Carried so that a lead can be described honestly: leading by three grams
   * of CO₂ is still leading, and calling it a reason to buy the car would be
   * manufacturing a difference out of noise.
   */
  runnerUp: ScoreRef | null;

  /** Head-to-head against the vehicle this one is being compared with. */
  versus: PriorityComparison | null;
}

export interface PriorityComparison {
  vehicleId: number;
  name: string;
  score: number;
  /** subject − other. Positive means the subject is ahead here. */
  difference: number;
  /** difference × weight — how much this gap moved the overall result. */
  weightedDifference: number;
  numeric: NumericEvidence | null;
  /** Features the subject has that the other vehicle does not. */
  onlySubjectHas: FeatureId[];
  /** Features the other vehicle has that the subject does not. */
  onlyOtherHas: FeatureId[];
}

/** One car's overall standing, as a comparison refers to it. */
export interface ScoreSummary {
  vehicleId: number;
  name: string;
  /** The overall match, 0–100. */
  total: number;
}

export interface HeadToHead {
  subject: ScoreSummary;
  other: ScoreSummary;
  /** subject.total − other.total. */
  totalDifference: number;
  /** Every priority, ordered by how much it moved the result. */
  categories: PriorityBreakdown[];
  /** The subject's largest weighted advantage, if it has one. */
  decidingAdvantage: PriorityBreakdown | null;
  /** The subject's largest weighted deficit, if it has one. */
  biggestConcession: PriorityBreakdown | null;
  /**
   * Where each car stands against the budget.
   *
   * Carried here so the explanation can say when the higher-scoring car was
   * not eligible to win — otherwise a budget-driven result looks arbitrary.
   */
  budget: BudgetComparison;
  /** Data-derived prose explaining the overall outcome. */
  summary: string;
}

export interface BudgetComparison {
  /** null when the user has not set a usable budget. */
  budget: number | null;
  subject: BudgetStatus;
  other: BudgetStatus;
  /** Estimated cost minus budget. Positive means over. */
  subjectDifference: number | null;
  otherDifference: number | null;
}

/**
 * A complete verdict on one vehicle under the user's current settings.
 *
 * Produced identically for the recommended car and for any car the user puts
 * in the hot seat — only `isRecommendation` differs.
 */
export interface VehicleEvaluation {
  vehicle: PinnedFinnCar;
  score: VehicleScore;
  /** 1-based position in the overall ranking of every pinned car. */
  rank: number;
  isRecommendation: boolean;
  cost: CostAnalysis;
  priorities: PriorityBreakdown[];
  /** Priorities where this car beats its comparison, biggest weighted gap first. */
  strengths: PriorityBreakdown[];
  /** Priorities where its comparison beats it, biggest weighted gap first. */
  weaknesses: PriorityBreakdown[];
  comparison: HeadToHead | null;
}

/* -------------------------------------------------------------------------- */
/* Recommendations                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Immutable frame of reference for a single comparison run.
 *
 * Scores and costs are computed once over every pinned car so that the
 * recommendation and any hot-seat inspection are judged against exactly the
 * same numbers.
 */
export interface ReasoningContext {
  vehicles: PinnedFinnCar[];
  priorities: CategoryId[];
  preferences: LensPreferences;
  categoryFeatures: Record<CategoryId, FeatureSelection>;
  scores: VehicleScore[];
  costs: Record<number, CostBreakdown>;
  weights: PriorityWeight[];
  /** Every vehicle, best overall match first. Budget plays no part in this order. */
  ranked: PinnedFinnCar[];
  budget: BudgetPartition;
}

export interface BudgetPartition {
  budget: number | null;
  within: PinnedFinnCar[];
  over: PinnedFinnCar[];
  /** Cost could not be fully calculated, so "fits" cannot be confirmed. */
  unknown: PinnedFinnCar[];
  /** True when at least one vehicle is confirmed to fit the budget. */
  anyFits: boolean;
}

export interface Recommendation {
  winner: PinnedFinnCar;
  score: VehicleScore;
  ranked: PinnedFinnCar[];
  scores: VehicleScore[];
  /**
   * True when nothing was confirmed to fit the budget and the winner is the
   * strongest priority match rather than an affordable one.
   */
  isFallback: boolean;
  /**
   * Why the winner is a fallback, so the UI can say "none of these fit" only
   * when that is actually what happened.
   *
   * - `allOverBudget`   — every car's calculable cost already exceeds the budget.
   * - `costUnconfirmed` — no car is confirmed to fit because cost data is missing.
   */
  fallbackReason: "allOverBudget" | "costUnconfirmed" | null;
  budget: BudgetPartition;
  /**
   * The car that scored highest, whoever it is.
   *
   * Kept beside `winner` because they differ whenever the budget excluded the
   * top scorer, and the difference is something the user is owed rather than
   * something to paper over.
   */
  topScorer: PinnedFinnCar;
  /** True when `topScorer` is not `winner`. */
  budgetChangedTheAnswer: boolean;
  /**
   * The realistic alternatives — the four cars closest to the winner overall.
   *
   * This is the entire set the user may challenge the recommendation with.
   * Everything else pinned stays visible in the ranking but never competes
   * head-to-head.
   */
  alternatives: PinnedFinnCar[];
  /** The winner's own evaluation, explained on its own merits. */
  evaluation: VehicleEvaluation;
  context: ReasoningContext;
}

/* -------------------------------------------------------------------------- */
/* Alternatives and the hot seat                                              */
/* -------------------------------------------------------------------------- */

/**
 * One of the small, fixed set of cars the recommendation may be challenged
 * with.
 *
 * Chosen by overall closeness to the winner, never by "beats it at one
 * thing" — a car that wins a single low-ranked category while finishing
 * thirty points behind is not a realistic alternative, and putting it in
 * front of the reader implies otherwise.
 */
export interface AlternativeOption {
  vehicle: PinnedFinnCar;
  /** Position in the overall ranking of every pinned car. */
  rank: number;
  total: number;
  /** Overall points between this car and the winner. Negative means behind. */
  differenceToWinner: number;
  isSelected: boolean;
  budgetStatus: BudgetStatus;
  totalMonthly: number;
  /** Estimated monthly cost minus the winner's. Positive means dearer. */
  costDifference: number | null;
  /** Estimated cost minus the budget. Positive means over. Null without one. */
  budgetDifference: number | null;
  /**
   * The single most useful reason to look at this car instead, stated as a
   * fact. Null when nothing separates it from the winner worth a sentence.
   */
  hook: string | null;
}

/* -------------------------------------------------------------------------- */
/* Settings                                                                   */
/* -------------------------------------------------------------------------- */

export interface LensSettings {
  preferences: LensPreferences;
  priorities: CategoryId[];
  priorityDefinitions: PriorityDefinition[];
  profiles: Profile[];
  categoryFeatures: Record<CategoryId, FeatureSelection>;
  defaultProfileId: ProfileId;
}
