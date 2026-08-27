import type {
  CategoryId,
  PriorityBreakdown,
  ReasoningContext,
  VehicleEvaluation,
} from "../types";

import { featurePhrase } from "../scoring";
import { formatEUR } from "../format";
import { classifyMonthlyCostGap, classifyScoreGap, isNoticeable } from "./magnitude";
import {
  inSentence,
  joinCapped,
  paragraph,
  phraseLabel,
  sentence,
  shortName,
} from "./phrase";

/**
 * Challenging the recommendation.
 *
 * The whole of this file assumes one frame: the reader has a recommendation
 * and is asking "what would I actually gain or lose by taking this other car
 * instead?". Every sentence is therefore alternative-versus-winner, in that
 * direction, and never a general assessment of either car.
 *
 * What separates two cars is always stated as the equipment or the figure
 * behind it. A score gap explains nothing — it is the thing that needs
 * explaining.
 */

export interface ChallengeLine {
  priority: CategoryId;
  label: string;
  rank: number;
  /** The concrete difference: named equipment, or both figures. */
  evidence: string;
  /** Why it matters to this reader, from where they ranked it. */
  relevance: string;
}

export interface ChallengeReasoning {
  challengerName: string;
  winnerName: string;
  /** Where the challenger is genuinely better, most consequential first. */
  gains: ChallengeLine[];
  /** Where the recommendation is genuinely better. */
  losses: ChallengeLine[];
  /** What swapping would do to the monthly cost. Null when we can't say. */
  cost: string | null;
  /** Whether the challenger fits the budget. Null when none is set. */
  budget: string | null;
  /** Why the recommendation still stands — or why this is genuinely close. */
  verdict: string;
}

/* -------------------------------------------------------------------------- */
/* What separates two cars in one priority                                    */
/* -------------------------------------------------------------------------- */

/**
 * The concrete difference behind a category gap.
 *
 * Returns null when the data supports nothing more specific than the score,
 * so the caller leaves the claim unmade rather than dressing it up.
 */
function whatSeparates(
  breakdown: PriorityBreakdown,
  aheadIsSubject: boolean,
  aheadName: string,
  behindName: string,
): string | null {
  const versus = breakdown.versus;
  if (!versus) return null;

  const theirs = aheadIsSubject ? versus.onlySubjectHas : versus.onlyOtherHas;

  if (theirs.length) {
    return sentence(
      `${aheadName} has`,
      `${joinCapped(theirs.map(featurePhrase))},`,
      `which ${behindName} doesn't`,
    );
  }

  const mine = breakdown.numeric;
  const other = versus.numeric;

  if (mine && other && mine.value !== other.value) {
    const subjectAhead = mine.lowerIsBetter
      ? mine.value < other.value
      : mine.value > other.value;

    /* Only offered as the separator when it points the right way. */
    if (subjectAhead === aheadIsSubject) {
      const [better, worse] = subjectAhead ? [mine, other] : [other, mine];

      return sentence(
        `${aheadName} has the better ${inSentence(mine.label)}:`,
        `${better?.display} against ${worse?.display}`,
      );
    }
  }

  return null;
}

/** Why a difference matters, said in the reader's own ranking. */
function relevanceOf(
  breakdown: PriorityBreakdown,
  favoursChallenger: boolean,
  challengerName: string,
  winnerName: string,
): string {
  const opener = `You ranked ${phraseLabel(breakdown.label)} #${breakdown.rank}`;

  if (breakdown.rank === 1) {
    return sentence(
      opener,
      favoursChallenger
        ? `, so this is the strongest argument for ${challengerName}`
        : `, so this is the strongest argument for staying with ${winnerName}`,
    );
  }

  return sentence(
    opener,
    favoursChallenger
      ? ", so it counts — but less than the priorities above it"
      : ", so it counts against the swap without settling it",
  );
}

function lineFor(
  breakdown: PriorityBreakdown,
  favoursChallenger: boolean,
  challengerName: string,
  winnerName: string,
): ChallengeLine | null {
  const evidence = whatSeparates(
    breakdown,
    favoursChallenger,
    favoursChallenger ? challengerName : winnerName,
    favoursChallenger ? winnerName : challengerName,
  );

  if (!evidence) return null;

  return {
    priority: breakdown.priority,
    label: breakdown.label,
    rank: breakdown.rank,
    evidence,
    relevance: relevanceOf(
      breakdown,
      favoursChallenger,
      challengerName,
      winnerName,
    ),
  };
}

/* -------------------------------------------------------------------------- */
/* Money                                                                      */
/* -------------------------------------------------------------------------- */

function describeCost(
  evaluation: VehicleEvaluation,
  winnerId: number,
  context: ReasoningContext,
  challengerName: string,
  winnerName: string,
): string | null {
  const mine = context.costs[evaluation.vehicle.id];
  const theirs = context.costs[winnerId];

  if (!mine?.complete || !theirs?.complete) return null;

  const difference = mine.totalMonthly - theirs.totalMonthly;

  if (!isNoticeable(classifyMonthlyCostGap(difference, theirs.totalMonthly))) {
    return sentence(
      `The two cost about the same:`,
      `${formatEUR(mine.totalMonthly)}/month against`,
      `${formatEUR(theirs.totalMonthly)}, so money isn't what separates them`,
    );
  }

  return difference > 0
    ? sentence(
        `Swapping costs you ${formatEUR(difference)}/month more —`,
        `${formatEUR(mine.totalMonthly)} for ${challengerName} against`,
        `${formatEUR(theirs.totalMonthly)} for ${winnerName}`,
      )
    : sentence(
        `Swapping saves you ${formatEUR(Math.abs(difference))}/month —`,
        `${formatEUR(mine.totalMonthly)} for ${challengerName} against`,
        `${formatEUR(theirs.totalMonthly)} for ${winnerName}`,
      );
}

function describeBudget(
  evaluation: VehicleEvaluation,
  context: ReasoningContext,
  challengerName: string,
): string | null {
  const budget = context.budget.budget;
  if (budget == null) return null;

  const cost = context.costs[evaluation.vehicle.id];
  if (!cost) return null;

  if (cost.budgetStatus === "over") {
    return sentence(
      `${challengerName} is over the ${formatEUR(budget)}/month budget you set,`,
      `by about ${formatEUR(Math.abs(cost.budgetDifference ?? 0))}`,
    );
  }

  if (cost.budgetStatus === "unknown") {
    return sentence(
      `Part of ${challengerName}'s cost couldn't be estimated, so we can't`,
      `confirm it fits your ${formatEUR(budget)}/month budget`,
    );
  }

  return sentence(
    `${challengerName} does fit your ${formatEUR(budget)}/month budget, at about`,
    `${formatEUR(cost.totalMonthly)}`,
  );
}

/**
 * Drops lines that make the same point twice.
 *
 * A feature can legitimately sit in two categories — a heated steering wheel
 * belongs to both comfort and climate suitability — so the same sentence can
 * be generated under each. Printing it twice reads as padding and buries the
 * line underneath it. The higher-ranked priority keeps it.
 */
function dedupe(lines: ChallengeLine[]): ChallengeLine[] {
  const seen = new Set<string>();

  return lines.filter((line) => {
    if (seen.has(line.evidence)) return false;

    seen.add(line.evidence);
    return true;
  });
}

/* -------------------------------------------------------------------------- */
/* Assembly                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The verdict on the swap.
 *
 * Answers the reader's real question — "then why wasn't this one recommended?"
 * — with the actual reason, in the order the reasons apply: the budget ruled
 * it out, or the priorities they ranked highest did.
 */
function describeVerdict(
  evaluation: VehicleEvaluation,
  context: ReasoningContext,
  challengerName: string,
  winnerName: string,
  losses: ChallengeLine[],
  gains: ChallengeLine[],
): string {
  const cost = context.costs[evaluation.vehicle.id];
  const totalDifference = evaluation.comparison?.totalDifference ?? 0;

  if (cost?.budgetStatus === "over" && context.budget.budget != null) {
    return sentence(
      `That's why ${winnerName} is the recommendation and this isn't:`,
      `your budget is a hard limit, and ${challengerName} is over it`,
      totalDifference > 0
        ? `— even though it matches your priorities more closely`
        : "",
    );
  }

  if (cost?.budgetStatus === "unknown") {
    return sentence(
      `${winnerName} is the recommendation because its cost could be confirmed`,
      `to fit your budget and ${challengerName}'s couldn't`,
    );
  }

  const [firstLoss] = losses;

  if (firstLoss) {
    return sentence(
      `${firstLoss.evidence.replace(/\.$/, "")} —`,
      `and ${phraseLabel(firstLoss.label)} sits at #${firstLoss.rank} in your`,
      `order, which is why ${winnerName} came out ahead`,
    );
  }

  if (!gains.length) {
    return sentence(
      `Nothing you ranked separates these two, so ${winnerName} stays the`,
      `recommendation on the strength of the rest of your order`,
    );
  }

  return sentence(
    `On your priorities these two are close;`,
    `${winnerName} came out ahead on the combination rather than on any`,
    `single thing`,
  );
}

/**
 * Builds the whole alternative-versus-winner reading.
 *
 * `evaluation` must be a challenger evaluated against the recommendation —
 * that is, one produced by `evaluateChallenger`.
 */
export function reasonAboutChallenge(
  evaluation: VehicleEvaluation,
  context: ReasoningContext,
): ChallengeReasoning | null {
  const comparison = evaluation.comparison;
  if (!comparison) return null;

  const challengerName = shortName(evaluation.vehicle.name);
  const winnerName = shortName(comparison.other.name);

  const noticeable = (item: PriorityBreakdown): boolean =>
    item.hasEvidence &&
    isNoticeable(classifyScoreGap(item.versus?.difference ?? 0));

  const gains = dedupe(
    evaluation.strengths
      .filter(noticeable)
      .map((item) => lineFor(item, true, challengerName, winnerName))
      .filter((line): line is ChallengeLine => line != null),
  );

  const losses = dedupe(
    evaluation.weaknesses
      .filter(noticeable)
      .map((item) => lineFor(item, false, challengerName, winnerName))
      .filter((line): line is ChallengeLine => line != null),
  );

  return {
    challengerName,
    winnerName,
    gains,
    losses,
    cost: describeCost(
      evaluation,
      comparison.other.vehicleId,
      context,
      challengerName,
      winnerName,
    ),
    budget: describeBudget(evaluation, context, challengerName),
    verdict: describeVerdict(
      evaluation,
      context,
      challengerName,
      winnerName,
      losses,
      gains,
    ),
  };
}

/** Kept so callers can build a compact list without re-deriving it. */
export const challengeSentences = (
  reasoning: ChallengeReasoning,
): string[] =>
  paragraph(reasoning.cost, reasoning.budget, reasoning.verdict);
