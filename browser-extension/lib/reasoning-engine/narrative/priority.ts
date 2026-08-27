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
 * - **Never grade a feature.** The user said which ones they care about and
 *   nothing more; "essential" and "luxury extra" were words Lens put in their
 *   mouth, and no sentence here may reintroduce them under another name.
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
  facts.map((fact) => fact.phrase);

/** A selection is at most five, so it is always named in full. */
const joinSelection = (facts: FeatureFact[]): string =>
  joinCapped(labelsOf(facts), 5);

/**
 * What the user singled out, and whether they got it.
 *
 * Names the features rather than counting them, because "two of the three"
 * sends the reader off to work out which two. Nothing here grades them: the
 * user said these matter, and the only question left is whether the car has
 * them.
 */
function describeSelection(
  features: FeatureEvidence,
  rival: RivalDifference | null,
): string | null {
  if (features.basis !== "selected") return null;

  const { present, missing } = features;
  const total = present.length + missing.length;

  if (total === 0) return null;

  if (total === 1) {
    const only = (present[0] ?? missing[0]) as FeatureFact;

    return present.length
      ? sentence(`You picked out ${only.phrase} here, and this car has it`)
      : sentence(
          `You picked out ${only.phrase} here, and this car doesn't have it`,
        );
  }

  const opener = `You picked out ${joinSelection([...present, ...missing])}.`;

  if (!missing.length) {
    return sentence(opener, `This car has ${coverage(total, total)}`);
  }

  if (!present.length) {
    return sentence(opener, `This car has ${coverage(0, total)}`);
  }

  /* Naming the car that does have it turns a gap into a choice. */
  const rivalHasIt = rival?.onlyRivalHas.some((fact) =>
    missing.some((item) => item.key === fact.key),
  );

  return sentence(
    opener,
    `This car has ${coverage(present.length, total)} —`,
    `it doesn't have ${joinSelection(missing)}`,
    rivalHasIt && rival ? `, which ${shortName(rival.name)} does` : "",
  );
}

/**
 * How the car does on the category as a whole, when the user singled nothing
 * out.
 *
 * This is not a gap in their setup and must not read like one. "I want the
 * safest car, I just don't have opinions about which systems it has" is a
 * complete answer, and the honest reply is to say what was measured instead.
 */
function describeCategoryBasis(
  features: FeatureEvidence,
  label: string,
): string[] {
  if (features.basis !== "category") return [];

  const total = features.present.length + features.missing.length;

  if (total === 0) return [];

  return paragraph(
    sentence(
      `You didn't single out particular ${phraseLabel(label)} features, so this`,
      `car is judged on the equipment as a whole: it has`,
      `${features.present.length} of the ${total} systems we look at here`,
    ),
    features.present.length
      ? sentence(`It has ${joinCapped(labelsOf(features.present))}`)
      : null,
  );
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

/**
 * Says plainly that we can't answer, and why.
 *
 * Reached only when the data genuinely can't support a comparison — never
 * because the user singled out no features, which is answered by measuring
 * the category's whole catalogue instead.
 */
function describeMissingData(breakdown: PriorityBreakdown): string[] {
  const noFeatures = breakdown.matched.length + breakdown.missing.length === 0;

  return paragraph(
    sentence(
      `FINN's data doesn't tell us enough to compare these cars on`,
      phraseLabel(breakdown.label),
    ),
    noFeatures
      ? sentence(
          "This priority has no feature list to check and the pinned cars carry no",
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
          describeSelection(features, rival),
          ...describeCategoryBasis(features, breakdown.label),
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
