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
  classifyMeasurementGap,
  classifyScoreGap,
  isEffectivelyLevel,
} from "./magnitude";

import {
  coverage,
  inSentence,
  joinCapped,
  joinList,
  paragraph,
  phraseLabel,
  sentence,
  shortName,
} from "./phrase";

/**
 * One priority, explained.
 *
 * The contract for every sentence in this file:
 *
 * - **Name the thing.** "It has a 360° camera", never "a strong equipment
 *   package". If the data doesn't say, the sentence says the data doesn't say.
 * - **Quote the figure.** "1,726 L against 491 L", never "substantially more
 *   practical" on its own and never "practicality: 48/100".
 * - **Don't parade other cars.** The recommendation is explained on its own
 *   merits. Where an alternative is genuinely better belongs in *what you're
 *   giving up*, said once with the evidence and the reason it matters — not
 *   scattered across five headings as five separate comparisons.
 * - **Say nothing when there is nothing to say.** A category where the cars
 *   are level gets the evidence and no commentary; filler is what made the
 *   old copy read like a mail merge.
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
 * sends the reader off to work out which three.
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

  /* Naming the car that does have it turns a gap into a choice. */
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
 * The nice-to-haves, in both directions and by name.
 *
 * Every feature named here is one the user themselves put on the list, so
 * there is no risk of reporting equipment nobody asked about.
 */
function describeOptional(
  features: FeatureEvidence,
  rival: RivalDifference | null,
): string | null {
  const { optionalPresent, optionalMissing } = features;

  if (!optionalPresent.length && !optionalMissing.length) return null;

  const had = optionalPresent.length
    ? `It also has ${joinCapped(labelsOf(optionalPresent))}`
    : "";

  const lacked = optionalMissing.length
    ? `${had ? "but not" : "It doesn't have"} ${joinCapped(labelsOf(optionalMissing))}`
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

/**
 * The figure the engine actually weighed, quoted against the rival's own.
 *
 * When the two are level that is stated in one clause and dropped — a
 * paragraph explaining that two numbers are the same is filler.
 */
function describeScoredMeasurement(fact: MeasurementFact | null): string | null {
  if (!fact?.scored) return null;

  if (!fact.rival) {
    return sentence(`Its ${inSentence(fact.label)} is ${fact.display}`);
  }

  const { rival } = fact;

  if (isEffectivelyLevel(rival.magnitude)) {
    return sentence(
      `${fact.label} is effectively the same on both:`,
      `${fact.display} against ${shortName(rival.name)}'s ${rival.display}`,
    );
  }

  return sentence(
    `Its ${inSentence(fact.label)} is ${fact.display}, against`,
    `${shortName(rival.name)}'s ${rival.display}`,
  );
}

/** The figures we report for context but never score. */
function describeSupportingMeasurements(
  facts: MeasurementFact[],
): string | null {
  const supporting = facts.filter((fact) => !fact.scored);

  if (!supporting.length) return null;

  return sentence(`It has ${joinList(supporting.map(measurementPhrase))}`);
}

/**
 * What the car runs on.
 *
 * A categorical fact, and for an emissions or long-distance question a more
 * useful one than any figure — "it's electric" answers more than a CO₂ score
 * does. Named against the rival only when the two genuinely differ.
 */
function describeDrivetrain(traits: TraitFact[]): string | null {
  const [drivetrain] = traits;
  if (!drivetrain) return null;

  const value = drivetrain.value.toLowerCase();

  return drivetrain.rival
    ? sentence(
        `It's ${article(value)} ${value} car;`,
        `${shortName(drivetrain.rival.name)} is`,
        `${article(drivetrain.rival.value.toLowerCase())} ${drivetrain.rival.value.toLowerCase()}`,
      )
    : sentence(`It's ${article(value)} ${value} car`);
}

const article = (word: string): string =>
  /^[aeiou]/i.test(word) ? "an" : "a";

/* -------------------------------------------------------------------------- */
/* Standing                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Where this car sits against the alternatives — said without naming them.
 *
 * Introducing a different car under every priority heading is what turns an
 * explanation into a leaderboard: "Compass does safety better, Karoq does
 * practicality better, Puma does comfort better" is five comparisons the
 * reader didn't ask for and can't hold in their head. Where an alternative is
 * genuinely better, that belongs in *what you're giving up*, once, with the
 * evidence and the reason it matters.
 *
 * What stays here is the one thing the reader can't get from the evidence
 * above it: whether anything close does better at all.
 */
function describeStanding(
  standing: PriorityStanding,
  breakdown: PriorityBreakdown,
  hasRival: boolean,
  scoredMeasurement: MeasurementFact | null,
): string | null {
  /* In a head-to-head the two cars in front of the reader are the comparison. */
  if (hasRival) return null;

  if (standing !== "leads") return null;

  const runnerUp = breakdown.runnerUp;

  /*
   * Leading by a hair is still leading, but presenting it as a reason to
   * choose the car would be manufacturing a difference out of noise. For a
   * category decided by one measurement, the measurement is the honest test —
   * three grams of CO₂ apart is a tie however far the normalised scores drift.
   */
  const level = runnerUp
    ? scoredMeasurement != null && runnerUp.numeric != null
      ? isEffectivelyLevel(
          classifyMeasurementGap(
            scoredMeasurement.value,
            runnerUp.numeric.value,
          ),
        )
      : isEffectivelyLevel(classifyScoreGap(breakdown.score - runnerUp.score))
    : false;

  /*
   * A hair's-breadth lead is still a lead, and the badge beside the heading
   * says so. Letting that stand unqualified would overstate it, so the
   * caveat is made — without naming the car, which is the tradeoff
   * section's job.
   */
  if (level) {
    return sentence(
      "It's the best of the close alternatives here, but only just",
    );
  }

  return sentence("None of the closest alternatives does better here");
}

/**
 * Why a car can trail a priority and still be the recommendation.
 *
 * Said only where there is a real gap to account for and the priority sits
 * below others in the user's order — that being the actual reason, rather
 * than a reassurance.
 */
function describeWhyItStillWins(
  breakdown: PriorityBreakdown,
  standing: PriorityStanding,
  isRecommendation: boolean,
): string | null {
  if (!isRecommendation || standing !== "behindLeader") return null;
  if (breakdown.rank <= 1 || !breakdown.leader) return null;

  return sentence(
    `You put ${phraseLabel(breakdown.label)} at #${breakdown.rank}, so that gap`,
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
      `FINN's data doesn't tell us enough to compare these cars on`,
      phraseLabel(breakdown.label),
    ),
    noFeatures
      ? sentence(
          "No features are enabled for this priority and the pinned cars carry no",
          "measurement we can rank them on, so it isn't affecting your result",
        )
      : sentence(
          "The figures this priority depends on weren't supplied for these cars",
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
): PriorityReasoning {
  const features = featureEvidence(breakdown);
  const measurements = measurementFacts(breakdown, vehicle, rivalVehicle);
  const traits = traitFacts(breakdown, vehicle, rivalVehicle);
  const rival = rivalDifference(breakdown);
  const leader = leaderDifference(breakdown);
  const standing = priorityStanding(breakdown);

  const sentences =
    standing === "unsupported"
      ? describeMissingData(breakdown)
      : paragraph(
          describeEssentials(features, rival),
          describeOptional(features, rival),
          describeScoredMeasurement(
            measurements.find((fact) => fact.scored) ?? null,
          ),
          describeSupportingMeasurements(measurements),
          describeDrivetrain(traits),
          describeStanding(
            standing,
            breakdown,
            rival != null,
            measurements.find((fact) => fact.scored) ?? null,
          ),
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
