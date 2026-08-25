import type {
  HeadToHead,
  PriorityBreakdown,
  VehicleEvaluation,
} from "./types";

import { formatEUR } from "./format";
import { featureLabel } from "./scoring";
import {
  classifyTotalGap,
  isEffectivelyLevel,
} from "./narrative/magnitude";
import {
  inSentence,
  joinCapped,
  phraseLabel,
  sentence,
  shortName,
} from "./narrative/phrase";

/**
 * The head-to-head summary and the placement line.
 *
 * Per-priority prose lives in `narrative/` — this file covers only the two
 * statements that are about the pair as a whole.
 *
 * The rule both obey: name the thing. A gap is explained by the equipment or
 * the measurement behind it, not by reciting the points it was worth. The
 * weighted arithmetic is still available to the reader, in the contribution
 * table, where a number is what they came for.
 */

/* -------------------------------------------------------------------------- */
/* What separates two cars in one priority                                    */
/* -------------------------------------------------------------------------- */

/**
 * The concrete difference behind a category gap: the equipment one has and
 * the other doesn't, or the measurement that separates them.
 *
 * Returns null when the data supports nothing more specific than the score,
 * so the caller can leave the claim unmade rather than dress it up.
 */
function whatSeparates(
  breakdown: PriorityBreakdown,
  fromSubject: boolean,
  behindName: string,
): string | null {
  const versus = breakdown.versus;
  if (!versus) return null;

  const theirs = fromSubject ? versus.onlySubjectHas : versus.onlyOtherHas;

  if (theirs.length) {
    return `it has ${joinCapped(
      theirs.map((item) => inSentence(featureLabel(item.key))),
    )}, which ${behindName} doesn't`;
  }

  const mine = breakdown.numeric;
  const other = versus.numeric;

  if (mine && other && mine.value !== other.value) {
    const ahead = mine.lowerIsBetter
      ? mine.value < other.value
      : mine.value > other.value;

    /* Only offered as the separator when it points the right way. */
    if (ahead === fromSubject) {
      const [better, worse] = ahead ? [mine, other] : [other, mine];

      return `${inSentence(mine.label)} is ${better?.display} against ${worse?.display}`;
    }
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* Head to head                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The one-paragraph answer to "why did this come out on top?".
 *
 * Every claim traces to a feature list, a measurement or the budget. Where
 * the two cars are a point or two apart, that is stated rather than papered
 * over — a reader looking at 82 next to 81 will notice either way.
 */
export function explainHeadToHead(head: Omit<HeadToHead, "summary">): string {
  const { subject, other, totalDifference, decidingAdvantage, biggestConcession } =
    head;

  const budget = describeBudgetOutcome(head);

  if (totalDifference === 0) {
    return sentence(
      `${shortName(subject.name)} and ${shortName(other.name)} finish level`,
      "under your current priority order",
      budget ? `. ${budget}` : "",
    );
  }

  const ahead = totalDifference > 0;
  const leadName = shortName(ahead ? subject.name : other.name);
  const trailName = shortName(ahead ? other.name : subject.name);

  const magnitude = classifyTotalGap(totalDifference);
  const sentences: string[] = [];

  /* The advantage that did the most work, named by what it actually is. */
  const driver = ahead ? decidingAdvantage : biggestConcession;
  const driverEvidence = driver ? whatSeparates(driver, ahead, trailName) : null;

  sentences.push(
    isEffectivelyLevel(magnitude)
      ? sentence(
          `${leadName} and ${trailName} are close to level —`,
          `${Math.abs(totalDifference)} point${
            Math.abs(totalDifference) === 1 ? "" : "s"
          } apart`,
          driver
            ? `— and ${phraseLabel(driver.label)}, your #${driver.rank} priority, is what tips it`
            : "",
        )
      : sentence(
          `${leadName} finishes ahead of ${trailName}, mainly on`,
          driver ? phraseLabel(driver.label) : "your ranked priorities",
          driver ? `, your #${driver.rank} priority` : "",
        ),
  );

  if (driver && driverEvidence) {
    sentences.push(sentence(`There, ${driverEvidence}`));
  }

  /* Where the trailing car is genuinely better, and why it wasn't enough. */
  const counter = ahead ? biggestConcession : decidingAdvantage;
  const counterEvidence = counter ? whatSeparates(counter, !ahead, leadName) : null;

  if (counter?.versus && counter.versus.difference !== 0) {
    /*
     * The deciding advantage is the one that moved the total most, which is
     * not always the higher-ranked priority. Saying "below X" when it sits
     * above X is the kind of error that costs a reader their trust in
     * everything else on the page.
     */
    const rankedLower = driver != null && counter.rank > driver.rank;

    sentences.push(
      sentence(
        `${trailName} does beat ${leadName} on ${phraseLabel(counter.label)}`,
        counterEvidence ? `— ${counterEvidence}` : "",
        rankedLower && driver
          ? `— but you ranked it #${counter.rank}, below ${phraseLabel(
              driver.label,
            )}, so that isn't enough to close the gap`
          : "— but the gap there is narrower, so that isn't enough to close the gap",
      ),
    );
  }

  /*
   * A car can score highest and still not be the recommendation, because the
   * budget is a hard constraint. Saying so is the difference between a result
   * the user can check and one they have to take on faith.
   */
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
/* Placement                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The status line for a car in the hot seat — states plainly whether it is
 * the recommendation and where it actually placed.
 *
 * Kept deliberately short and factual. The reasoning that follows it is the
 * narrative layer's job; this is the one sentence that has to be unambiguous
 * before any of it is read.
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

  const placement = rank === 2 ? "second overall" : `#${rank} overall`;

  const budgetClause =
    status === "over"
      ? " It's also over your budget."
      : status === "unknown"
        ? " We also can't confirm it fits your budget, because part of its cost couldn't be estimated."
        : "";

  return `${vehicle.name} is not your recommendation. It scores ${score.total}/100 and places ${placement}.${budgetClause}`;
}
