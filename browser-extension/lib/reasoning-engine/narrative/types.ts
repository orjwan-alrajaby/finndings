import type { PinnedFinnCar } from "@/lib/types";
import type {
  BudgetStatus,
  CategoryId,
  FeatureId,
  FeatureTier,
  NumericEvidence,
} from "../types";
import type { Magnitude } from "./magnitude";

/**
 * The structured reasoning behind the Advice.
 *
 * This layer is deliberately facts-first: everything the explanation is
 * allowed to claim is derived and typed here, and only then turned into
 * sentences. Nothing downstream may state something that isn't on one of
 * these records.
 */

/* -------------------------------------------------------------------------- */
/* Features                                                                   */
/* -------------------------------------------------------------------------- */

/** One feature the user asked for, with the plain-English explanation of it. */
export interface FeatureFact {
  key: FeatureId;
  label: string;
  tier: FeatureTier;
  /** Short, jargon-free description, for the UI's information affordance. */
  explanation: string;
}

/** The user's selected features for one priority, split by tier and presence. */
export interface FeatureEvidence {
  essentialPresent: FeatureFact[];
  essentialMissing: FeatureFact[];
  /** "Good to have" and "luxury extra" together — nice, but not required. */
  optionalPresent: FeatureFact[];
  optionalMissing: FeatureFact[];
  /** How many features the user selected for this priority in total. */
  selectedCount: number;
}

/* -------------------------------------------------------------------------- */
/* Measurements                                                               */
/* -------------------------------------------------------------------------- */

/**
 * A measured number about the car, relevant to one priority.
 *
 * `scored` separates the numbers the engine actually weighs from the ones we
 * report purely because they answer "what does practical mean here?".
 */
export interface MeasurementFact {
  label: string;
  display: string;
  value: number;
  unit: string;
  lowerIsBetter: boolean;
  scored: boolean;
  /** The same measurement on the car being compared against, when known. */
  rival: {
    name: string;
    display: string;
    value: number;
    magnitude: Magnitude;
    /** True when the subject's figure is the better of the two. */
    subjectAhead: boolean;
  } | null;
}

/**
 * A categorical fact about the car — drivetrain, number of doors.
 *
 * Not every piece of relevant evidence is a number, and "it's electric" is a
 * more useful answer to an environment question than any score.
 */
export interface TraitFact {
  label: string;
  value: string;
  /** The same fact on the rival, when it differs and the difference matters. */
  rival: { name: string; value: string } | null;
}

/* -------------------------------------------------------------------------- */
/* Comparisons                                                                */
/* -------------------------------------------------------------------------- */

export interface RivalDifference {
  vehicleId: number;
  name: string;
  score: number;
  /** subject − rival. */
  difference: number;
  magnitude: Magnitude;
  subjectAhead: boolean;
  /** Features the subject has and the rival doesn't. */
  onlySubjectHas: FeatureFact[];
  /** Features the rival has and the subject doesn't. */
  onlyRivalHas: FeatureFact[];
}

export interface LeaderDifference {
  vehicleId: number;
  name: string;
  score: number;
  gap: number;
  magnitude: Magnitude;
  numeric: NumericEvidence | null;
}

/* -------------------------------------------------------------------------- */
/* Priority reasoning                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Where this car stands in one priority, relative to everything pinned.
 *
 * `unsupported` is a real answer, not a failure — it means the data does not
 * support a comparison and the Advice should say exactly that.
 */
export type PriorityStanding =
  | "leads"
  | "levelWithLeader"
  | "closeToLeader"
  | "behindLeader"
  | "unsupported";

export interface PriorityReasoning {
  priority: CategoryId;
  label: string;
  icon: string;
  rank: number;
  weightPercent: number;
  score: number;

  standing: PriorityStanding;
  /** False when neither features nor a measurement were available. */
  hasEvidence: boolean;

  features: FeatureEvidence;
  measurements: MeasurementFact[];
  traits: TraitFact[];

  rival: RivalDifference | null;
  /** Only set when the category leader is neither the subject nor the rival. */
  leader: LeaderDifference | null;

  /** The explanation, ready to render. One string per paragraph. */
  sentences: string[];
}

/* -------------------------------------------------------------------------- */
/* Cost reasoning                                                             */
/* -------------------------------------------------------------------------- */

/** One car's monthly cost, broken into the parts a reader can act on. */
export interface CostPosition {
  vehicleId: number;
  name: string;
  /** Estimated total per month. Partial when `complete` is false. */
  total: number;
  /** The advertised subscription price alone. */
  subscription: number | null;
  /** Estimated energy at the user's mileage. */
  energy: number | null;
  /** Estimated charge for kilometres beyond FINN's allowance. */
  excessMileage: number | null;
  complete: boolean;
  budgetStatus: BudgetStatus;
}

export interface CostReasoning {
  subject: CostPosition;
  /** The rival the Advice is weighing the subject against. */
  rival: CostPosition | null;
  /** The cheapest pinned car we can fully cost, when it isn't the subject. */
  cheapest: CostPosition | null;
  budget: number | null;
  /** Estimated total minus budget. Positive means over. */
  budgetDifference: number | null;
  monthlyKm: number;
  /** Cost components we could not estimate, in plain English. */
  unknowns: string[];
  sentences: string[];
}

/* -------------------------------------------------------------------------- */
/* Tradeoffs                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Why a compromise is being shown.
 *
 * Every tradeoff must trace back to something the user told us — a priority
 * they ranked, or the budget they set. A weakness that answers to neither is
 * not surfaced, however real it is.
 */
export type TradeoffKind =
  | "missingEssential"
  | "priorityDeficit"
  | "measurementDeficit"
  | "cost"
  | "budget";

export interface Tradeoff {
  kind: TradeoffKind;
  /** The priority this answers to. Null only for budget, which the user set directly. */
  priority: CategoryId | null;
  priorityLabel: string | null;
  /** The priority's position in the user's order. Drives how loudly we say it. */
  rank: number | null;
  severity: "high" | "moderate";
  /** Short label for the UI. */
  headline: string;
  sentences: string[];
}

/* -------------------------------------------------------------------------- */
/* Verdict                                                                    */
/* -------------------------------------------------------------------------- */

export interface Verdict {
  /** One line, safe to use as a hero headline. */
  headline: string;
  /** The full "why this one" reasoning. */
  sentences: string[];
  /** How far clear of the next car it finished, when there is one. */
  margin: {
    name: string;
    difference: number;
    magnitude: Magnitude;
  } | null;
}

/* -------------------------------------------------------------------------- */
/* The whole thing                                                            */
/* -------------------------------------------------------------------------- */

export interface AdviceNarrative {
  vehicle: PinnedFinnCar;
  rank: number;
  total: number;
  isRecommendation: boolean;

  verdict: Verdict;
  priorities: PriorityReasoning[];
  cost: CostReasoning;
  /** Relevance-filtered compromises, most consequential first. */
  tradeoffs: Tradeoff[];
  /** Priorities where the data could not support a comparison. */
  unsupported: PriorityReasoning[];
}
