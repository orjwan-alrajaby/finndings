import type {
  PriorityBreakdown,
  ReasoningContext,
  VehicleEvaluation,
} from "../types";
import type { PriorityReasoning, Verdict } from "./types";

import { formatEUR } from "../format";
import { totalFor } from "../scoring";
import { classifyTotalGap, isEffectivelyLevel } from "./magnitude";
import {
  joinList,
  paragraph,
  phraseLabel,
  sentence,
  shortName,
} from "./phrase";

/**
 * The answer to "why this one?".
 *
 * Written from what the car actually leads and doesn't lead across the user's
 * own priority list. It never claims the car is best at everything, and where
 * the result was close it says so — a reader who can see an 82 next to an 81
 * is owed an explanation of the single point, not a confident sentence that
 * pretends the gap is bigger than it is.
 */

/**
 * Priorities this car genuinely leads.
 *
 * A tie with the car it's being compared against is not a lead, however the
 * leader lookup happened to break it.
 */
function ledPriorities(breakdowns: PriorityBreakdown[]): PriorityBreakdown[] {
  return breakdowns.filter(
    (item) =>
      item.hasEvidence &&
      item.isLeader &&
      !(item.versus && item.versus.difference === 0),
  );
}

/** Priorities where another pinned car is clearly stronger. */
function trailingPriorities(
  breakdowns: PriorityBreakdown[],
): PriorityBreakdown[] {
  return breakdowns.filter(
    (item) =>
      item.hasEvidence &&
      !item.isLeader &&
      item.leader != null &&
      !isEffectivelyLevel(classifyTotalGap(item.gapToLeader)),
  );
}

const labelsOf = (items: PriorityBreakdown[]): string[] =>
  items.map((item) => phraseLabel(item.label));

/* -------------------------------------------------------------------------- */
/* The margin                                                                 */
/* -------------------------------------------------------------------------- */

function marginToNext(
  evaluation: VehicleEvaluation,
  context: ReasoningContext,
): Verdict["margin"] {
  const index = context.ranked.findIndex(
    (item) => item.id === evaluation.vehicle.id,
  );

  const next = context.ranked[index + 1];
  if (!next) return null;

  const difference =
    totalFor(context.scores, evaluation.vehicle.id) -
    totalFor(context.scores, next.id);

  return {
    name: next.name,
    difference,
    magnitude: classifyTotalGap(difference),
  };
}

/**
 * When two cars finish a point or two apart, say so and name what tipped it.
 *
 * Anything else invites the reader to look at the ranking, see 82 against 81,
 * and stop trusting the explanation above it.
 */
function describeMargin(
  margin: Verdict["margin"],
  evaluation: VehicleEvaluation,
): string | null {
  if (!margin) return null;
  if (!isEffectivelyLevel(margin.magnitude)) return null;

  const decider = evaluation.comparison?.decidingAdvantage;

  const gap =
    margin.difference === 0
      ? "level on points"
      : `${Math.abs(margin.difference)} point${
          Math.abs(margin.difference) === 1 ? "" : "s"
        } apart`;

  return sentence(
    `This one is close: ${shortName(evaluation.vehicle.name)} and`,
    `${shortName(margin.name)} finish ${gap}.`,
    decider
      ? `What separates them is ${phraseLabel(decider.label)}, your #${decider.rank} priority`
      : "Treat them as interchangeable on the numbers",
  );
}

/**
 * States when the highest-scoring car wasn't allowed to win.
 *
 * Without this, a budget-driven result looks like the arithmetic is wrong.
 */
function describeBudgetOverride(
  evaluation: VehicleEvaluation,
  context: ReasoningContext,
): string | null {
  if (!evaluation.isRecommendation || evaluation.rank <= 1) return null;

  const topScorer = context.ranked[0];
  if (!topScorer) return null;

  const status = context.costs[topScorer.id]?.budgetStatus;

  return sentence(
    `${shortName(topScorer.name)} scores higher, but`,
    status === "over"
      ? `at about ${formatEUR(
          context.costs[topScorer.id]?.totalMonthly ?? 0,
        )}/month it's over the ${formatEUR(context.budget.budget ?? 0)} budget you set`
      : "part of its cost couldn't be estimated, so we can't confirm it fits your budget",
    `— so it isn't eligible to be recommended, and this one is`,
  );
}

/**
 * "It isn't the best at everything", grouped by the car that beats it.
 *
 * Listing the same rival once per category — "Puma does driver assistance
 * better and Puma does safety better" — is the sound of a loop, not a person.
 */
function describeWhatItDoesntLead(
  trailing: PriorityBreakdown[],
  hasComparablePriorities: boolean,
): string | null {
  if (!trailing.length) {
    return hasComparablePriorities
      ? sentence("It isn't beaten on any priority you ranked")
      : null;
  }

  const byLeader = new Map<string, string[]>();

  for (const item of trailing.slice(0, 3)) {
    const leader = shortName(item.leader?.name ?? "Another car");
    byLeader.set(leader, [...(byLeader.get(leader) ?? []), phraseLabel(item.label)]);
  }

  const clauses = [...byLeader.entries()].map(
    ([leader, labels]) => `${leader} does ${joinList(labels)} better`,
  );

  return sentence("It isn't the best at everything:", joinList(clauses));
}

/**
 * The one line that has to be both true and useful.
 *
 * The order of these cases is the order a reader would ask about them: was
 * it even allowed to win, does it lead the thing I care most about, and if
 * not, what is it actually best at?
 */
function buildHeadline(
  evaluation: VehicleEvaluation,
  context: ReasoningContext,
  name: string,
  led: PriorityBreakdown[],
  topLed: PriorityBreakdown[],
): string {
  const topPriority = evaluation.priorities[0];
  const leadsTopPriority = topPriority ? led.includes(topPriority) : false;

  /*
   * A car that placed below the top scorer only won because the budget
   * excluded the cars above it. Opening with anything else would make the
   * ranking underneath look like a mistake.
   */
  if (evaluation.rank > 1) {
    const topScorer = context.ranked[0];

    return sentence(
      `${name} is the strongest car you pinned that fits your`,
      `${formatEUR(context.budget.budget ?? 0)}/month budget`,
      topScorer ? `— ${shortName(topScorer.name)} scores higher but doesn't fit` : "",
    );
  }

  if (leadsTopPriority && topPriority) {
    return sentence(
      `${name} comes out on top because it's the strongest car you pinned for`,
      `${phraseLabel(topPriority.label)}, the thing you ranked first`,
      topLed.length > 1 ? `, and for ${phraseLabel(topLed[1]!.label)} too` : "",
    );
  }

  const topLeader = topPriority?.leader ? shortName(topPriority.leader.name) : null;

  if (led.length && topPriority) {
    return sentence(
      `${name} doesn't lead ${phraseLabel(topPriority.label)}`,
      topLeader ? `— ${topLeader} does —` : "—",
      `but it's close there and it's the strongest car you pinned for`,
      joinList(labelsOf(topLed)),
    );
  }

  return sentence(
    `${name} doesn't lead any single priority on its own — it wins on the`,
    `combination across ${joinList(labelsOf(evaluation.priorities.slice(0, 2)))}`,
  );
}

/* -------------------------------------------------------------------------- */
/* Assembly                                                                   */
/* -------------------------------------------------------------------------- */

export function reasonAboutVerdict(
  evaluation: VehicleEvaluation,
  priorities: PriorityReasoning[],
  context: ReasoningContext,
): Verdict {
  const name = shortName(evaluation.vehicle.name);
  const led = ledPriorities(evaluation.priorities);
  const trailing = trailingPriorities(evaluation.priorities);
  const margin = marginToNext(evaluation, context);

  const topLed = led.slice(0, 2);
  const usable = priorities.filter((item) => item.standing !== "unsupported");

  if (!evaluation.isRecommendation) {
    const better = evaluation.strengths.filter(
      (item) => (item.versus?.difference ?? 0) > 0,
    );

    return {
      headline: sentence(
        `${name} places #${evaluation.rank} of ${context.ranked.length}`,
        led.length
          ? `, and it's the strongest car you pinned for ${joinList(labelsOf(topLed))}`
          : "",
      ),
      sentences: paragraph(
        better.length
          ? sentence(
              `Against ${shortName(
                evaluation.comparison?.other.name ?? "the recommendation",
              )} it's ahead on ${joinList(labelsOf(better.slice(0, 2)))}`,
            )
          : sentence(
              `It doesn't beat ${shortName(
                evaluation.comparison?.other.name ?? "the recommendation",
              )} on any of the priorities you ranked`,
            ),
        trailing.length
          ? sentence(
              `Other pinned cars do better on ${joinList(
                labelsOf(trailing.slice(0, 3)),
              )}`,
            )
          : null,
      ),
      margin,
    };
  }

  const headline = buildHeadline(evaluation, context, name, led, topLed);

  return {
    headline,
    sentences: paragraph(
      headline,
      describeWhatItDoesntLead(trailing, usable.length > 1),
      describeMargin(margin, evaluation),
      describeBudgetOverride(evaluation, context),
    ),
    margin,
  };
}
