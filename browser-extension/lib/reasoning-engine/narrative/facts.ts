import type { PinnedFinnCar } from "@/lib/types";
import type { FeatureId, PriorityBreakdown } from "../types";
import type {
  FeatureEvidence,
  FeatureFact,
  LeaderDifference,
  MeasurementFact,
  PriorityStanding,
  RivalDifference,
  TraitFact,
} from "./types";

import { FEATURES } from "../constants";
import { featureLabel, featurePhrase } from "../scoring";
import { formatNumber } from "../format";
import {
  classifyMeasurementGap,
  classifyScoreGap,
  isEffectivelyLevel,
} from "./magnitude";

/**
 * Turning the engine's output into the facts an explanation is allowed to use.
 *
 * Nothing here writes a sentence. It decides *what is true* — which features
 * the user asked for and got, which measurements are worth quoting, how big
 * each gap is — so the composition layer can stay a thin translation of
 * established fact into English.
 */

/* -------------------------------------------------------------------------- */
/* Features                                                                   */
/* -------------------------------------------------------------------------- */

export function featureFact(key: FeatureId): FeatureFact {
  const meta = FEATURES[key];

  return {
    key,
    label: featureLabel(key),
    phrase: featurePhrase(key),
    explanation: meta?.explanation ?? "",
  };
}

/**
 * What the car has and hasn't, on both questions the reader cares about.
 *
 * Nothing is graded, because the reader grades nothing. The split that
 * matters is between what the score counted (the category's catalogue) and
 * what the reader asked for (their picks) — two different questions that an
 * explanation has to be able to answer separately.
 */
export function featureEvidence(breakdown: PriorityBreakdown): FeatureEvidence {
  const { matched, missing, basis, pickedMatched, pickedMissing } = breakdown;

  return {
    basis,
    coverage: {
      present: matched.map(featureFact),
      missing: missing.map(featureFact),
    },
    picked: {
      present: pickedMatched.map(featureFact),
      missing: pickedMissing.map(featureFact),
    },
    selectedCount: pickedMatched.length + pickedMissing.length,
  };
}

/* -------------------------------------------------------------------------- */
/* Measurements                                                               */
/* -------------------------------------------------------------------------- */

const finite = (value: unknown): number | null => {
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Vehicle measurements worth quoting for a priority *beyond* the one the
 * engine scores.
 *
 * These never touch the score. They exist because "practicality" is a word,
 * and the reader deserves the seat count and the boot figure behind it.
 */
function supportingMeasurements(
  priority: string,
  vehicle: PinnedFinnCar,
): { label: string; value: number; unit: string; lowerIsBetter: boolean }[] {
  const seats = finite(vehicle.capacity?.seats);
  const trunk = finite(vehicle.capacity?.trunk);
  const doors = finite(vehicle.doors);
  const consumption = finite(vehicle.consumption?.combined);

  const consumptionUnit =
    vehicle.fuelType === "Electric" ? "kWh/100km" : "L/100km";

  switch (priority) {
    case "practicality":
      return seats == null
        ? []
        : [{ label: "Seats", value: seats, unit: "", lowerIsBetter: false }];

    case "familyFriendly":
      return [
        ...(seats == null
          ? []
          : [{ label: "Seats", value: seats, unit: "", lowerIsBetter: false }]),
        ...(trunk == null
          ? []
          : [{ label: "Boot space", value: trunk, unit: "L", lowerIsBetter: false }]),
        ...(doors == null
          ? []
          : [{ label: "Doors", value: doors, unit: "", lowerIsBetter: false }]),
      ];

    case "environmental":
      return consumption == null
        ? []
        : [
            {
              label: "Consumption",
              value: consumption,
              unit: consumptionUnit,
              lowerIsBetter: true,
            },
          ];

    default:
      return [];
  }
}

/**
 * The measured evidence for one priority: the number the engine scored, plus
 * any supporting figures, each set beside the rival's own value.
 */
export function measurementFacts(
  breakdown: PriorityBreakdown,
  vehicle: PinnedFinnCar,
  rival: PinnedFinnCar | null,
): MeasurementFact[] {
  const facts: MeasurementFact[] = [];

  const scored = breakdown.numeric;

  if (scored) {
    const rivalNumeric = breakdown.versus?.numeric ?? null;

    facts.push({
      label: scored.label,
      display: scored.display,
      value: scored.value,
      unit: scored.unit,
      lowerIsBetter: scored.lowerIsBetter,
      scored: true,
      rival:
        rivalNumeric && breakdown.versus
          ? {
              name: breakdown.versus.name,
              display: rivalNumeric.display,
              value: rivalNumeric.value,
              magnitude: classifyMeasurementGap(scored.value, rivalNumeric.value),
              subjectAhead: scored.lowerIsBetter
                ? scored.value < rivalNumeric.value
                : scored.value > rivalNumeric.value,
            }
          : null,
    });
  }

  for (const supporting of supportingMeasurements(breakdown.priority, vehicle)) {
    /* Never report the same figure twice under two labels. */
    if (scored && scored.label === supporting.label) continue;

    const rivalValue = rival
      ? supportingMeasurements(breakdown.priority, rival).find(
          (item) => item.label === supporting.label,
        )?.value ?? null
      : null;

    const display = supporting.unit
      ? `${formatNumber(supporting.value)} ${supporting.unit}`
      : formatNumber(supporting.value);

    facts.push({
      label: supporting.label,
      display,
      value: supporting.value,
      unit: supporting.unit,
      lowerIsBetter: supporting.lowerIsBetter,
      scored: false,
      rival:
        rivalValue != null && rival
          ? {
              name: rival.name,
              display: supporting.unit
                ? `${formatNumber(rivalValue)} ${supporting.unit}`
                : formatNumber(rivalValue),
              value: rivalValue,
              magnitude: classifyMeasurementGap(supporting.value, rivalValue),
              subjectAhead: supporting.lowerIsBetter
                ? supporting.value < rivalValue
                : supporting.value > rivalValue,
            }
          : null,
    });
  }

  return facts;
}

/* -------------------------------------------------------------------------- */
/* Traits                                                                     */
/* -------------------------------------------------------------------------- */

/** Categorical facts that answer a priority's question better than a score. */
export function traitFacts(
  breakdown: PriorityBreakdown,
  vehicle: PinnedFinnCar,
  rival: PinnedFinnCar | null,
): TraitFact[] {
  const wantsDrivetrain =
    breakdown.priority === "environmental" ||
    breakdown.priority === "longDistance";

  if (!wantsDrivetrain || !vehicle.fuelType) return [];

  const differs = Boolean(rival?.fuelType && rival.fuelType !== vehicle.fuelType);

  return [
    {
      label: "Drivetrain",
      value: vehicle.fuelType,
      rival:
        differs && rival
          ? { name: rival.name, value: rival.fuelType }
          : null,
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* Comparisons                                                                */
/* -------------------------------------------------------------------------- */

export function rivalDifference(
  breakdown: PriorityBreakdown,
): RivalDifference | null {
  const versus = breakdown.versus;
  if (!versus) return null;

  return {
    vehicleId: versus.vehicleId,
    name: versus.name,
    score: versus.score,
    difference: versus.difference,
    magnitude: classifyScoreGap(versus.difference),
    subjectAhead: versus.difference > 0,
    onlySubjectHas: versus.onlySubjectHas.map(featureFact),
    onlyRivalHas: versus.onlyOtherHas.map(featureFact),
  };
}

/**
 * The category leader, but only when naming it adds something.
 *
 * If the subject leads, or the leader is already the rival being discussed,
 * there is no third car to introduce and doing so would just add noise.
 */
export function leaderDifference(
  breakdown: PriorityBreakdown,
): LeaderDifference | null {
  const { leader, versus, isLeader } = breakdown;

  if (!leader || isLeader) return null;
  if (versus && leader.vehicleId === versus.vehicleId) return null;

  const gap = leader.score - breakdown.score;
  if (gap <= 0) return null;

  return {
    vehicleId: leader.vehicleId,
    name: leader.name,
    score: leader.score,
    gap,
    magnitude: classifyScoreGap(gap),
    numeric: leader.numeric,
  };
}

/* -------------------------------------------------------------------------- */
/* Standing                                                                   */
/* -------------------------------------------------------------------------- */

/** Where the car sits in this priority across the whole pinned set. */
export function priorityStanding(
  breakdown: PriorityBreakdown,
): PriorityStanding {
  if (!breakdown.hasEvidence) return "unsupported";
  if (breakdown.isLeader) return "leads";

  const magnitude = classifyScoreGap(breakdown.gapToLeader);

  if (magnitude === "tie") return "levelWithLeader";
  if (isEffectivelyLevel(magnitude)) return "closeToLeader";
  if (magnitude === "slight") return "closeToLeader";

  return "behindLeader";
}
