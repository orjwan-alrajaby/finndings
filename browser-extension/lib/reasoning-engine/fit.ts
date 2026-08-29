import type { FinnCar, PinnedFinnCar } from "@/lib/types";
import type {
  CategoryId,
  CostAnalysis,
  FeatureSelection,
  LensPreferences,
  PriorityBreakdown,
} from "./types";
import type {
  CostReasoning,
  FeatureFact,
  MeasurementFact,
  PriorityReasoning,
  Tradeoff,
  TraitFact,
} from "./narrative/types";

import { buildReasoningContext, evaluateVehicle } from "./index";
import { reasonAboutCost } from "./narrative/cost";
import { reasonAboutPriority } from "./narrative/priority";
import { reasonAboutTradeoffs } from "./narrative/tradeoffs";
import { summarisePriority } from "./narrative/verdict";
import { phraseLabel, sentence } from "./narrative/phrase";
import { DEFAULT_CATEGORY_FEATURES } from "./constants";

/**
 * One car, judged against one reader — the question asked on finn.com while
 * they are looking at a car, rather than the question the Compare page asks.
 *
 * The two are different questions and this file is careful about which one it
 * is answering. Compare asks "which of these fits me best?", and its answer is
 * relative by construction: boot space, range and CO₂ are scored against the
 * rest of the pinned set. Here there is no set. So:
 *
 * - **What is scored** is the part of the engine that was already absolute —
 *   how much of a priority's equipment catalogue the car carries, with the
 *   features the reader picked out weighted up. `categoryDetail` computes
 *   exactly that and needs no second implementation.
 *
 * - **What is reported but never scored** is every measurement. A relative
 *   score needs a population to be relative to, and inventing one — "cars like
 *   this usually have 450 km" — would be inventing the reader a rival. The
 *   figure is shown as a figure.
 *
 * - **What is never said** is a number out of a hundred. The reader is told
 *   how much of what they asked for this car has, in counts they can check.
 *   The weighted arithmetic underneath decides the ordering and the band, and
 *   stays off the page.
 *
 * Nothing here re-scores anything. It calls the engine with a set of one and
 * arranges the answer.
 */

/* -------------------------------------------------------------------------- */
/* Bands                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * How well a car serves one thing the reader said they cared about.
 *
 * `unknown` is a real answer and the most important one to keep: FINN does not
 * supply an equipment list for every car, and a car we know nothing about must
 * read as unknown rather than as a car that has nothing.
 */
export type FitLevel = "strong" | "good" | "partial" | "limited" | "unknown";

export interface FitBand {
  level: FitLevel;
  /** "Strong match" — a claim about fit, never about the car's quality. */
  label: string;
}

const BAND_LABEL: Record<FitLevel, string> = {
  strong: "Strong match",
  good: "Good match",
  partial: "Partial match",
  limited: "Limited match",
  unknown: "Not enough data",
};

/**
 * Where the bands sit on the engine's own 0–100 category score.
 *
 * The score is a weighted share of a catalogue: every feature the priority
 * covers counts once for being relevant equipment, and one the reader picked
 * out counts two, three or four times depending on how much influence they
 * gave it. So the ceiling is only reachable by a car that has essentially all
 * of a fifteen-item catalogue, and the thresholds have to be read against
 * that rather than against a school grade.
 *
 * Worked through: a fifteen-feature catalogue with five picks at the highest
 * influence has a denominator of 30. A car with every one of those picks and
 * nothing else scores 67; with half the remaining catalogue as well, 83. A car
 * with none of the picks but two-thirds of the catalogue scores 33. The
 * boundaries below put those where a reader would put them.
 *
 * These four numbers are the one genuinely new judgement in this file, and
 * they are a presentation choice rather than a scoring one — the ordering they
 * band is entirely the engine's. They are worth recalibrating against real
 * FINN inventory.
 */
const STRONG_FROM = 65;
const GOOD_FROM = 45;
const PARTIAL_FROM = 25;

/** Bands a score the engine produced. Never produces a score of its own. */
export function classifyFit(score: number, hasEvidence = true): FitBand {
  if (!hasEvidence) return { level: "unknown", label: BAND_LABEL.unknown };

  const level: FitLevel =
    score >= STRONG_FROM
      ? "strong"
      : score >= GOOD_FROM
        ? "good"
        : score >= PARTIAL_FROM
          ? "partial"
          : "limited";

  return { level, label: BAND_LABEL[level] };
}

/* -------------------------------------------------------------------------- */
/* Equipment data                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Whether FINN told us what this car is equipped with.
 *
 * `extractFeatures` reads a German equipment list and turns every entry it
 * can't find into `false`, so a car whose list was never supplied is
 * indistinguishable, field by field, from a car that genuinely has nothing.
 * The difference is visible only in aggregate: no real car on FINN has none of
 * the fifty-odd features in the catalogue, so an all-false record means the
 * list is missing.
 *
 * It is a heuristic and it is here rather than at the call site because
 * everything that reads feature evidence needs the same answer.
 */
export function hasEquipmentData(vehicle: FinnCar): boolean {
  const features = vehicle.features ?? {};

  return Object.values(features).some(Boolean);
}

/* -------------------------------------------------------------------------- */
/* Shapes                                                                     */
/* -------------------------------------------------------------------------- */

/** One feature the reader picked out, and whether this car has it. */
export interface FitFeature extends FeatureFact {
  /** Which priority they picked it under. */
  priority: CategoryId;
  priorityLabel: string;
  /**
   * `unknown` is not "missing". It means FINN supplied no equipment list, so
   * the honest answer is that we don't know.
   */
  state: "present" | "absent" | "unknown";
}

/** One of the reader's priorities, judged against this car. */
export interface FitPriority {
  priority: CategoryId;
  label: string;
  icon: string;
  /** Position in the reader's own order. */
  rank: number;
  /** How much of the result this priority accounts for. */
  weightPercent: number;

  band: FitBand;

  /** How many of the priority's catalogue the car carries, and out of how many. */
  covered: number;
  catalogueSize: number;

  /** The reader's picks under this priority, present ones first. */
  picked: FitFeature[];

  /** Figures relevant to this priority. Reported, never scored. */
  measurements: MeasurementFact[];
  traits: TraitFact[];

  /** The engine's explanation, already written. */
  sentences: string[];

  /** False when neither equipment nor a measurement could speak to it. */
  hasEvidence: boolean;
}

export interface FitAnalysis {
  vehicle: FinnCar;

  /** The headline answer. A statement about fit, not about the car. */
  overall: FitBand;

  /** The reader's priorities, in their own order. */
  priorities: FitPriority[];

  /** Every feature they picked out, across all priorities. */
  picked: {
    present: FitFeature[];
    absent: FitFeature[];
    unknown: FitFeature[];
  };

  /** Why it fits, drawn from the priorities it actually serves. */
  strengths: string[];

  /** What they would be accepting. Never used to rule the car out. */
  tradeoffs: Tradeoff[];

  /** What it costs, on their own driving assumptions. */
  cost: CostAnalysis;
  costReasoning: CostReasoning;

  /** False when FINN supplied no equipment list for this car. */
  equipmentKnown: boolean;

  /** Echoed back so the panel can say what the judgement was made against. */
  preferences: LensPreferences;
}

/* -------------------------------------------------------------------------- */
/* Assembly                                                                   */
/* -------------------------------------------------------------------------- */

/** How many reasons a "why it fits" list can carry before it stops being one. */
const MAX_STRENGTHS = 3;

/**
 * Judges one car against the reader's saved settings.
 *
 * The vehicle is passed to the engine as the whole comparison set, which is
 * what makes every relative measurement drop out of the score on its own —
 * `numericScore` refuses to rank a population of one — leaving the absolute
 * catalogue coverage that is the honest thing to judge a lone car on.
 */
export function buildFitAnalysis(
  vehicle: PinnedFinnCar,
  priorities: CategoryId[],
  preferences: LensPreferences,
  categoryFeatures: Record<
    CategoryId,
    FeatureSelection
  > = DEFAULT_CATEGORY_FEATURES,
): FitAnalysis {
  const context = buildReasoningContext(
    [vehicle],
    priorities,
    preferences,
    categoryFeatures,
  );

  /*
   * Deliberately not marked as the recommendation and given no rival: there is
   * nothing it was recommended over and nothing to compare it with. Both flags
   * are what keep the narrative layer from reaching for a second car.
   */
  const evaluation = evaluateVehicle(vehicle, context);

  const equipmentKnown = hasEquipmentData(vehicle);

  const reasoning = evaluation.priorities.map((breakdown) =>
    reasonAboutPriority(breakdown, vehicle, null),
  );

  const costReasoning = reasonAboutCost(vehicle, null, context, []);

  const fitPriorities = evaluation.priorities.map((breakdown, index) =>
    toFitPriority(breakdown, reasoning[index] as PriorityReasoning, equipmentKnown),
  );

  const overall = classifyFit(
    evaluation.score.total,
    equipmentKnown && fitPriorities.some((item) => item.hasEvidence),
  );

  return {
    vehicle,
    overall,
    priorities: fitPriorities,
    picked: collectPicked(fitPriorities),
    strengths: describeStrengths(fitPriorities, reasoning, equipmentKnown),
    tradeoffs: equipmentKnown
      ? reasonAboutTradeoffs(evaluation, reasoning, costReasoning, context, [])
      : reasonAboutTradeoffs(evaluation, [], costReasoning, context, []),
    cost: evaluation.cost,
    costReasoning,
    equipmentKnown,
    preferences,
  };
}

function toFitPriority(
  breakdown: PriorityBreakdown,
  reasoning: PriorityReasoning,
  equipmentKnown: boolean,
): FitPriority {
  const { picked } = reasoning.features;

  const state = equipmentKnown ? "present" : "unknown";

  const toFeature = (
    fact: FeatureFact,
    featureState: FitFeature["state"],
  ): FitFeature => ({
    ...fact,
    priority: breakdown.priority,
    priorityLabel: breakdown.label,
    state: featureState,
  });

  return {
    priority: breakdown.priority,
    label: breakdown.label,
    icon: breakdown.icon,
    rank: breakdown.rank,
    weightPercent: breakdown.weightPercent,

    /*
     * A car whose equipment list FINN never supplied scores zero on every
     * catalogue, which is not the same statement as "it has none of them".
     */
    band: classifyFit(
      breakdown.score,
      equipmentKnown && breakdown.hasEvidence,
    ),

    covered: breakdown.matched.length,
    catalogueSize: breakdown.matched.length + breakdown.missing.length,

    picked: [
      ...picked.present.map((fact) => toFeature(fact, state)),
      ...picked.missing.map((fact) =>
        toFeature(fact, equipmentKnown ? "absent" : "unknown"),
      ),
    ],

    measurements: reasoning.measurements,
    traits: reasoning.traits,

    /*
     * The engine's own sentences, except where they rest on equipment we
     * don't have. The measurements below them are still true.
     */
    sentences: equipmentKnown ? reasoning.sentences : [],

    hasEvidence: equipmentKnown
      ? breakdown.hasEvidence
      : reasoning.measurements.length > 0,
  };
}

/**
 * Every pick the reader made, gathered out of the priorities they made it
 * under.
 *
 * Deduplicated, because one feature can be picked under several priorities —
 * adaptive cruise control is offered by both safety and long distance, and a
 * reader who wants it under both is not asking for it twice. The first
 * occurrence wins, which is the highest-ranked priority they picked it under.
 */
function collectPicked(priorities: FitPriority[]): FitAnalysis["picked"] {
  const seen = new Set<string>();

  const all = priorities
    .flatMap((item) => item.picked)
    .filter((feature) => {
      if (seen.has(feature.key)) return false;

      seen.add(feature.key);
      return true;
    });

  return {
    present: all.filter((item) => item.state === "present"),
    absent: all.filter((item) => item.state === "absent"),
    unknown: all.filter((item) => item.state === "unknown"),
  };
}

/**
 * Why this car fits, in the reader's own order.
 *
 * Only priorities the car genuinely serves are eligible, and each reason is
 * the engine's own summary of what the car does about that priority — the
 * equipment named, the count quoted. A car that serves nothing the reader
 * ranked gets no reasons rather than a consolation sentence, because the
 * tradeoffs below are then the honest account of it.
 */
function describeStrengths(
  priorities: FitPriority[],
  reasoning: PriorityReasoning[],
  equipmentKnown: boolean,
): string[] {
  if (!equipmentKnown) return [];

  const byPriority = new Map(
    reasoning.map((item) => [item.priority, item] as const),
  );

  const strengths: string[] = [];

  for (const priority of priorities) {
    if (strengths.length === MAX_STRENGTHS) break;
    if (priority.band.level !== "strong" && priority.band.level !== "good") {
      continue;
    }

    const summary = summarisePriority(
      byPriority.get(priority.priority) as PriorityReasoning,
      strengths.length === 0 && priority.rank === 1 ? "first" : "next",
    );

    if (summary) strengths.push(summary);
  }

  return strengths;
}

/* -------------------------------------------------------------------------- */
/* Copy                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * What the headline band is a claim about.
 *
 * Said in full on the page, because "Strong match" on its own is exactly the
 * kind of label a reader can mistake for a verdict on the car. It is a verdict
 * on the fit between this car and the things *this* reader ranked — someone
 * else with different settings would get a different word for the same car.
 */
export function describeFit(analysis: FitAnalysis): string {
  if (analysis.overall.level === "unknown") {
    return sentence(
      "FINN hasn't supplied an equipment list for this car, so there's nothing",
      "to check your priorities against",
    );
  }

  const served = analysis.priorities.filter(
    (item) => item.band.level === "strong" || item.band.level === "good",
  );

  const total = analysis.priorities.length;

  if (!served.length) {
    return sentence(
      `It doesn't strongly serve any of the ${total} priorities you set —`,
      "what it does and doesn't have is below",
    );
  }

  const first = served[0] as FitPriority;

  return sentence(
    `It's a good or strong match on ${served.length} of the ${total}`,
    `${total === 1 ? "priority" : "priorities"} you set,`,
    `led by ${phraseLabel(first.label)}, your #${first.rank}`,
  );
}
