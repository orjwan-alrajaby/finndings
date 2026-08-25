import type { PinnedFinnCar } from "@/lib/types";
import type { PriorityBreakdown } from "../types";
import type {
  FeatureEvidence,
  FeatureFact,
  MeasurementFact,
  PriorityReasoning,
  PriorityStanding,
  RivalDifference,
  TraitFact,
} from "./types";

import {
  featureEvidence,
  leaderDifference,
  measurementFacts,
  priorityStanding,
  rivalDifference,
  traitFacts,
} from "./facts";

import {
  classifyScoreGap,
  isEffectivelyLevel,
  type Magnitude,
} from "./magnitude";

import {
  coverage,
  inSentence,
  joinCapped,
  joinList,
  phraseLabel,
  paragraph,
  sentence,
  shortName,
  vary,
} from "./phrase";

/**
 * One priority, explained.
 *
 * The shape of the explanation follows the evidence, not a template: a car
 * that leads its category reads differently from one that trails it, and a
 * category with no usable data says so rather than producing a sentence that
 * sounds like an answer.
 *
 * Deliberately absent: the weight-and-rank recital ("Safety is your #1
 * priority at 40% of the result"). The UI already states that beside the
 * heading, and repeating it under every priority is what made the old copy
 * read like a mail merge.
 */

/* -------------------------------------------------------------------------- */
/* Feature evidence                                                           */
/* -------------------------------------------------------------------------- */

const labelsOf = (facts: FeatureFact[]): string[] =>
  facts.map((fact) => inSentence(fact.label));

/**
 * What the user marked essential, and whether they got it.
 *
 * Names the features rather than counting them, because "all 3 essentials"
 * makes the reader go and look up which three.
 */
function describeEssentials(
  features: FeatureEvidence,
  rival: RivalDifference | null,
): string | null {
  const { essentialPresent, essentialMissing } = features;
  const total = essentialPresent.length + essentialMissing.length;

  if (total === 0) return null;

  if (total === 1) {
    const only = (essentialPresent[0] ?? essentialMissing[0]) as FeatureFact;

    return essentialPresent.length
      ? sentence(
          `You marked ${inSentence(only.label)} as essential, and this car has it`,
        )
      : sentence(
          `You marked ${inSentence(only.label)} as essential, and this car doesn't have it`,
        );
  }

  const all = joinCapped([
    ...labelsOf(essentialPresent),
    ...labelsOf(essentialMissing),
  ]);

  const opener = `You marked ${all} as essential.`;

  if (!essentialMissing.length) {
    return sentence(opener, `This car has ${coverage(total, total)}`);
  }

  if (!essentialPresent.length) {
    return sentence(opener, `This car has ${coverage(0, total)}`);
  }

  /*
   * Naming the rival that does have the missing piece is the difference
   * between a gap and a choice the reader can actually weigh.
   */
  const rivalHasIt = rival?.onlyRivalHas.some((fact) =>
    essentialMissing.some((missing) => missing.key === fact.key),
  );

  const gap = joinCapped(labelsOf(essentialMissing));

  return sentence(
    opener,
    `This car has ${coverage(essentialPresent.length, total)} —`,
    `it doesn't have ${gap}`,
    rivalHasIt && rival ? `, which ${shortName(rival.name)} does` : "",
  );
}

/**
 * The features that were nice-to-haves, stated plainly in both directions,
 * with the rival named against the ones it has and this car doesn't.
 *
 * Every feature the rival has and this car lacks is by definition somewhere
 * in the user's own selection for this priority, so it belongs in the
 * sentence that already names the gap — a second "worth knowing" line
 * underneath is the same fact twice.
 */
function describeOptional(
  features: FeatureEvidence,
  rival: RivalDifference | null,
  seed: string,
): string | null {
  const { optionalPresent, optionalMissing } = features;

  if (!optionalPresent.length && !optionalMissing.length) return null;

  const had = optionalPresent.length
    ? `${vary(["It also has", "On top of that, it has", "It adds"], seed)} ${joinCapped(
        labelsOf(optionalPresent),
      )}`
    : "";

  const lacked = optionalMissing.length
    ? `${had ? "but it doesn't have" : "It doesn't have"} ${joinCapped(
        labelsOf(optionalMissing),
      )}`
    : "";

  const rivalHas = rival
    ? rival.onlyRivalHas.filter((fact) =>
        optionalMissing.some((missing) => missing.key === fact.key),
      )
    : [];

  const attribution =
    rivalHas.length && rival
      ? ` — ${shortName(rival.name)} has ${joinCapped(labelsOf(rivalHas))}`
      : "";

  if (had && lacked) return sentence(`${had}, ${lacked}${attribution}`);

  return sentence(`${had || lacked}${attribution}`);
}

/* -------------------------------------------------------------------------- */
/* Measurements                                                               */
/* -------------------------------------------------------------------------- */

const MAGNITUDE_CLAUSE: Record<Magnitude, string> = {
  tie: "identical",
  negligible: "effectively the same",
  slight: "a small difference",
  clear: "a clear difference",
  decisive: "a big difference",
};

/**
 * Reads a supporting measurement as a phrase rather than a label-value pair,
 * so several can be listed in one natural sentence.
 */
function measurementPhrase(fact: MeasurementFact): string {
  switch (fact.label) {
    case "Seats":
      return `${fact.display} seats`;
    case "Doors":
      return `${fact.display} doors`;
    case "Boot space":
      return `${fact.display} of boot space`;
    case "Consumption":
      return `a combined ${fact.display}`;
    default:
      return `${inSentence(fact.label)} of ${fact.display}`;
  }
}

/** The number the engine actually scored, set against the rival's own figure. */
function describeScoredMeasurement(fact: MeasurementFact | null): string | null {
  if (!fact?.scored) return null;

  if (!fact.rival) {
    return sentence(`Its ${inSentence(fact.label)} figure is ${fact.display}`);
  }

  const { rival } = fact;

  if (isEffectivelyLevel(rival.magnitude)) {
    return sentence(
      `On ${inSentence(fact.label)} the two are ${MAGNITUDE_CLAUSE[rival.magnitude]}:`,
      `${fact.display} against ${rival.display}`,
    );
  }

  const direction = rival.subjectAhead
    ? "in its favour"
    : `in ${shortName(rival.name)}'s favour`;

  return sentence(
    `On ${inSentence(fact.label)} it measures ${fact.display} against`,
    `${shortName(rival.name)}'s ${rival.display} —`,
    `${MAGNITUDE_CLAUSE[rival.magnitude]} ${direction}`,
  );
}

/** The figures we report for context but never score. */
function describeSupportingMeasurements(
  facts: MeasurementFact[],
  traits: TraitFact[],
): string | null {
  const supporting = facts.filter((fact) => !fact.scored);

  const parts = [
    ...traits.map((trait) => `a ${inSentence(trait.value)} drivetrain`),
    ...supporting.map(measurementPhrase),
  ];

  if (!parts.length) return null;

  return sentence(`It has ${joinList(parts)}`);
}

/* -------------------------------------------------------------------------- */
/* Standing                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The opening line: where this car sits against everything pinned, said in
 * terms of the cars rather than the score.
 */
function describeStanding(
  standing: PriorityStanding,
  breakdown: PriorityBreakdown,
  measurements: MeasurementFact[],
  isRecommendation: boolean,
  seed: string,
): string | null {
  const leaderName = breakdown.leader ? shortName(breakdown.leader.name) : null;

  switch (standing) {
    case "leads": {
      /*
       * Leading by a hair is still leading, but calling it a decisive reason
       * to buy the car would be manufacturing a difference out of noise.
       */
      const rival = breakdown.versus;

      /*
       * For a category decided by one measurement, the measurement is the
       * honest test of whether the lead is real — three grams of CO₂ apart
       * is a tie however far the normalised scores drift.
       */
      const scoredMeasurement = measurements.find((fact) => fact.scored);

      const level = scoredMeasurement?.rival
        ? isEffectivelyLevel(scoredMeasurement.rival.magnitude)
        : rival != null && isEffectivelyLevel(classifyScoreGap(rival.difference));

      if (rival && level) {
        return sentence(
          `It's the best of your pinned cars here, but only just —`,
          `${shortName(rival.name)} is level with it`,
        );
      }

      return sentence(
        vary(
          [
            isRecommendation
              ? "This is one of the strongest reasons it came out on top."
              : "Nothing else you pinned does better here.",
            "It leads every car you pinned here.",
            "No other pinned car beats it on this.",
          ],
          seed,
        ),
      );
    }

    case "levelWithLeader":
      return leaderName
        ? sentence(`It's level with ${leaderName} at the top here`)
        : null;

    case "closeToLeader":
      return leaderName
        ? sentence(
            vary(
              [
                `${leaderName} edges ahead here, but not by enough to decide anything`,
                `${leaderName} is marginally stronger here; the two are close`,
              ],
              seed,
            ),
          )
        : null;

    case "behindLeader": {
      if (!leaderName) return null;

      /* The leader's own figure belongs here, not in a second sentence. */
      const figure = breakdown.leader?.numeric
        ? `, at ${breakdown.leader.numeric.display}`
        : "";

      return sentence(
        vary(
          [
            `${leaderName} is the stronger car here${figure}`,
            `This is not where it wins — ${leaderName} is clearly better${figure}`,
          ],
          seed,
        ),
      );
    }

    default:
      return null;
  }
}

/**
 * Why a car can trail a category and still be the pick.
 *
 * Only said when it's true and load-bearing: this car is behind, but the
 * priority sits low enough in the user's order that it didn't decide the
 * result.
 */
function describeWhyItStillWins(
  breakdown: PriorityBreakdown,
  standing: PriorityStanding,
  isRecommendation: boolean,
): string | null {
  /*
   * Only worth saying where there is a real gap to account for. Saying it
   * over a category the car is level in invents a concession that isn't
   * there, which is its own kind of dishonesty.
   */
  if (!isRecommendation || standing !== "behindLeader") return null;
  if (breakdown.rank <= 1 || !breakdown.leader) return null;

  return sentence(
    `You put ${phraseLabel(breakdown.label)} at #${breakdown.rank}, so this gap`,
    `counted for less than the priorities above it`,
  );
}

/* -------------------------------------------------------------------------- */
/* Missing data                                                               */
/* -------------------------------------------------------------------------- */

/** Says plainly that we can't answer, and why. */
function describeMissingData(breakdown: PriorityBreakdown): string[] {
  const noFeatures = breakdown.matched.length + breakdown.missing.length === 0;

  return paragraph(
    sentence(
      `We don't have enough data to compare these cars on ${phraseLabel(breakdown.label)}`,
    ),
    noFeatures
      ? sentence(
          "No features are selected for this priority and the pinned cars carry no",
          "measurement we can rank them on, so this priority isn't telling you anything",
        )
      : sentence(
          "FINN hasn't supplied the figures this priority depends on for these cars",
        ),
  );
}

/* -------------------------------------------------------------------------- */
/* Assembly                                                                   */
/* -------------------------------------------------------------------------- */

export function reasonAboutPriority(
  breakdown: PriorityBreakdown,
  vehicle: PinnedFinnCar,
  rivalVehicle: PinnedFinnCar | null,
  isRecommendation: boolean,
): PriorityReasoning {
  const features = featureEvidence(breakdown);
  const measurements = measurementFacts(breakdown, vehicle, rivalVehicle);
  const traits = traitFacts(breakdown, vehicle, rivalVehicle);
  const rival = rivalDifference(breakdown);
  const leader = leaderDifference(breakdown);
  const standing = priorityStanding(breakdown);

  /* Stable per-priority seed, so phrasing varies down the page but not between runs. */
  const seed = `${breakdown.priority}:${vehicle.id}`;

  const sentences =
    standing === "unsupported"
      ? describeMissingData(breakdown)
      : paragraph(
          describeStanding(standing, breakdown, measurements, isRecommendation, seed),
          describeEssentials(features, rival),
          describeOptional(features, rival, seed),
          describeScoredMeasurement(
            measurements.find((fact) => fact.scored) ?? null,
          ),
          describeSupportingMeasurements(measurements, traits),
          rival && isEffectivelyLevel(rival.magnitude) && rival.difference !== 0
            ? sentence(
                `Against ${shortName(rival.name)} this is close to a wash, so it isn't`,
                "a reason to choose one over the other",
              )
            : null,
          describeWhyItStillWins(breakdown, standing, isRecommendation),
        );

  return {
    priority: breakdown.priority,
    label: breakdown.label,
    icon: breakdown.icon,
    rank: breakdown.rank,
    weightPercent: breakdown.weightPercent,
    score: breakdown.score,
    standing,
    hasEvidence: breakdown.hasEvidence,
    features,
    measurements,
    traits,
    rival,
    leader,
    sentences,
  };
}
