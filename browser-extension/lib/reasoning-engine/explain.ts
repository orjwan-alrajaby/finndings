import type {
  HeadToHead,
  PriorityBreakdown,
  VehicleEvaluation,
} from "./types";

import { formatEUR, joinList } from "./format";

/**
 * Prose builders.
 *
 * Every sentence in here is assembled from numbers that already exist on the
 * structured result. Nothing states a claim the data can't back — if a
 * comparison, a feature list or a measurement is missing, the sentence that
 * would have used it is simply not produced.
 */

/* -------------------------------------------------------------------------- */
/* Priorities                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Explains how one car performs in one priority, and what separates it from
 * the car it's being compared with.
 *
 * Returns an array of sentences so the UI can lay them out however it likes.
 */
export function explainPriority(
  breakdown: PriorityBreakdown,
  subjectName: string,
): string[] {
  const sentences: string[] = [];
  const { versus } = breakdown;

  /* Score, side by side with the rival when there is one. */
  if (versus) {
    sentences.push(
      `${subjectName} scores ${breakdown.score}/100 for ${breakdown.label} while ` +
        `${versus.name} scores ${versus.score}/100.`,
    );
  } else {
    sentences.push(
      `${subjectName} scores ${breakdown.score}/100 for ${breakdown.label}.`,
    );
  }

  /* The equipment behind those scores. */
  const featureSentence = describeFeatures(breakdown, subjectName);
  if (featureSentence) sentences.push(featureSentence);

  /* The measurement behind those scores. */
  const numericSentence = describeNumeric(breakdown, subjectName);
  if (numericSentence) sentences.push(numericSentence);

  /* What the ordering does with that gap. */
  if (versus && versus.difference !== 0) {
    const ahead = versus.difference > 0;
    const gap = Math.abs(versus.difference);

    sentences.push(
      `${breakdown.label} is your #${breakdown.rank} priority, accounting for about ` +
        `${breakdown.weightPercent}% of the overall result, so this ${gap}-point ` +
        `${ahead ? "lead" : "deficit"} moves the total by roughly ` +
        `${Math.abs(versus.weightedDifference).toFixed(1)} points.`,
    );
  } else if (!versus) {
    sentences.push(
      `${breakdown.label} is your #${breakdown.rank} priority, accounting for about ` +
        `${breakdown.weightPercent}% of the overall result.`,
    );
  }

  /* Where it stands against the whole set, when the rival isn't the leader. */
  if (
    !breakdown.isLeader &&
    breakdown.leader &&
    breakdown.leader.vehicleId !== versus?.vehicleId
  ) {
    sentences.push(
      `${breakdown.leader.name} leads this category outright at ` +
        `${breakdown.leader.score}/100, ${breakdown.gapToLeader} points ahead of ${subjectName}.`,
    );
  }

  return sentences;
}

function describeFeatures(
  breakdown: PriorityBreakdown,
  subjectName: string,
): string | null {
  const { versus } = breakdown;

  if (versus && (versus.onlySubjectHas.length || versus.onlyOtherHas.length)) {
    const parts: string[] = [];

    if (versus.onlySubjectHas.length) {
      parts.push(
        `${subjectName} has ${joinList(versus.onlySubjectHas)}, which ${versus.name} does not`,
      );
    }

    if (versus.onlyOtherHas.length) {
      parts.push(
        `${versus.name} has ${joinList(versus.onlyOtherHas)}, which ${subjectName} does not`,
      );
    }

    return `${parts.join("; ")}.`;
  }

  if (breakdown.matchedLabels.length && breakdown.missingLabels.length) {
    return (
      `It has ${joinList(breakdown.matchedLabels)}, but not ` +
      `${joinList(breakdown.missingLabels)} from the features you selected here.`
    );
  }

  if (breakdown.matchedLabels.length) {
    return `It covers every feature you selected here: ${joinList(breakdown.matchedLabels)}.`;
  }

  if (breakdown.missingLabels.length) {
    return `None of the features you selected here are present: ${joinList(breakdown.missingLabels)}.`;
  }

  return null;
}

function describeNumeric(
  breakdown: PriorityBreakdown,
  subjectName: string,
): string | null {
  const mine = breakdown.numeric;
  if (!mine) return null;

  const theirs = breakdown.versus?.numeric;

  if (theirs && breakdown.versus) {
    if (theirs.value === mine.value) {
      return `Both are at ${mine.display} for ${mine.label.toLowerCase()}.`;
    }

    const better = mine.lowerIsBetter
      ? mine.value < theirs.value
      : mine.value > theirs.value;

    return (
      `${mine.label}: ${subjectName} ${mine.display} versus ${breakdown.versus.name} ` +
      `${theirs.display} — ${better ? "in" : "against"} ${subjectName}'s favour.`
    );
  }

  return `${mine.label}: ${mine.display}.`;
}

/* -------------------------------------------------------------------------- */
/* Head to head                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The one-paragraph answer to "why did this come out on top?", built entirely
 * from the weighted differences that actually decided it.
 */
export function explainHeadToHead(
  head: Omit<HeadToHead, "summary">,
): string {
  const { subject, other, totalDifference, decidingAdvantage, biggestConcession } =
    head;

  if (totalDifference === 0) {
    const level =
      `${subject.name} and ${other.name} finish level at ${subject.total}/100 ` +
      "under your current priority order.";

    const budget = describeBudgetOutcome(head);

    return budget ? `${level} ${budget}` : level;
  }

  const ahead = totalDifference > 0;
  const leadName = ahead ? subject.name : other.name;
  const trailName = ahead ? other.name : subject.name;

  const sentences: string[] = [
    `${leadName} finishes ahead of ${trailName}, ${Math.max(
      subject.total,
      other.total,
    )}/100 against ${Math.min(subject.total, other.total)}/100.`,
  ];

  /* The advantage that did the most work, named with its actual numbers. */
  const driver = ahead ? decidingAdvantage : biggestConcession;

  if (driver?.versus) {
    sentences.push(
      `The largest single factor is ${driver.label} — your #${driver.rank} priority at about ` +
        `${driver.weightPercent}% of the result — where the gap is ` +
        `${Math.abs(driver.versus.difference)} points ` +
        `(${Math.max(driver.score, driver.versus.score)}/100 against ` +
        `${Math.min(driver.score, driver.versus.score)}/100), ` +
        `worth roughly ${Math.abs(driver.versus.weightedDifference).toFixed(1)} points overall.`,
    );
  }

  /* Where the trailing car is genuinely better, and why it wasn't enough. */
  const counter = ahead ? biggestConcession : decidingAdvantage;

  if (counter?.versus && Math.abs(counter.versus.difference) > 0) {
    sentences.push(
      `${trailName} does beat ${leadName} on ${counter.label} ` +
        `(${Math.max(counter.score, counter.versus.score)}/100 against ` +
        `${Math.min(counter.score, counter.versus.score)}/100), but ${counter.label} is your ` +
        `#${counter.rank} priority at about ${counter.weightPercent}% of the result, ` +
        `so that advantage is worth about ` +
        `${Math.abs(counter.versus.weightedDifference).toFixed(1)} points — not enough to close the gap.`,
    );
  }

  /*
   * A car can score highest and still not be the recommendation, because the
   * budget is a hard constraint. Saying so is the difference between a result
   * the user can check and one they have to take on faith.
   */
  const budget = describeBudgetOutcome(head);
  if (budget) sentences.push(budget);

  return sentences.join(" ");
}

/**
 * States when the higher-scoring car of the pair is not budget-eligible.
 *
 * Returns null whenever there is nothing to report — no budget set, or the
 * leader on points is also affordable.
 */
function describeBudgetOutcome(
  head: Omit<HeadToHead, "summary">,
): string | null {
  const { subject, other, totalDifference, budget } = head;

  if (budget.budget == null) return null;

  const scoreLeaderIsSubject = totalDifference > 0;

  const leader = scoreLeaderIsSubject ? subject : other;
  const leaderStatus = scoreLeaderIsSubject ? budget.subject : budget.other;
  const leaderDifference = scoreLeaderIsSubject
    ? budget.subjectDifference
    : budget.otherDifference;

  if (leaderStatus === "within") return null;

  const trailer = scoreLeaderIsSubject ? other : subject;
  const trailerStatus = scoreLeaderIsSubject ? budget.other : budget.subject;

  const problem =
    leaderStatus === "over"
      ? `${leader.name} scores higher, but at ${formatEUR(
          Math.abs(leaderDifference ?? 0),
        )} over your ${formatEUR(budget.budget)}/month budget it isn't eligible to be recommended`
      : `${leader.name} scores higher, but part of its cost couldn't be estimated, so we can't confirm it fits your ${formatEUR(
          budget.budget,
        )}/month budget`;

  return trailerStatus === "within"
    ? `${problem} — ${trailer.name} does fit, which is why it comes out on top.`
    : `${problem}, and neither car is confirmed to fit.`;
}

/* -------------------------------------------------------------------------- */
/* Verdict                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The headline for a car in the hot seat — states plainly whether it is the
 * recommendation or not, and where it actually placed.
 */
export function explainVerdict(evaluation: VehicleEvaluation): string {
  const { vehicle, rank, score, isRecommendation, cost } = evaluation;
  const status = cost.breakdown.budgetStatus;

  if (isRecommendation) {
    if (status === "over") {
      return `${vehicle.name} is your recommendation at ${score.total}/100, but nothing you pinned fits your budget — this one included.`;
    }

    /*
     * Rank is by score alone. A recommendation below rank 1 means a
     * higher-scoring car was ruled out by the budget, and the user is owed
     * that explanation rather than a bare "strongest match".
     */
    if (rank > 1) {
      const higher = evaluation.comparison?.other.name;

      return higher
        ? `${vehicle.name} is your recommendation. It isn't the highest-scoring car — ${higher} scores ${evaluation.comparison?.other.total}/100 against its ${score.total}/100 — but ${higher} doesn't fit your budget and ${vehicle.name} does.`
        : `${vehicle.name} is your recommendation at ${score.total}/100. Higher-scoring cars were ruled out by your budget.`;
    }

    return `${vehicle.name} is your strongest match at ${score.total}/100 and fits your budget.`;
  }

  const placement =
    rank === 2 ? "second overall" : `#${rank} overall`;

  const budgetClause =
    status === "over"
      ? " It's also over your budget."
      : status === "unknown"
        ? " We also can't confirm it fits your budget, because part of its cost couldn't be estimated."
        : "";

  return `${vehicle.name} is not your recommendation. It scores ${score.total}/100 and places ${placement}.${budgetClause}`;
}
