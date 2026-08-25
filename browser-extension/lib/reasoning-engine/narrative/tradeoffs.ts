import type {
  CategoryId,
  ReasoningContext,
  VehicleEvaluation,
} from "../types";
import type {
  CostPosition,
  CostReasoning,
  PriorityReasoning,
  Tradeoff,
} from "./types";

import { formatEUR } from "../format";
import { scoreFor } from "../scoring";
import {
  classifyMonthlyCostGap,
  classifyScoreGap,
  isNoticeable,
} from "./magnitude";
import {
  inSentence,
  joinCapped,
  joinList,
  phraseLabel,
  paragraph,
  sentence,
  shortName,
} from "./phrase";

/**
 * What the reader is giving up.
 *
 * The filter that matters is relevance, not completeness. A weakness is only
 * surfaced when it answers to something the user actually told us: a priority
 * they ranked, or the budget they set. High CO₂ is a fact about every car
 * here; it is only a *tradeoff* for someone who said the environment matters.
 *
 * The other half of the job is restraint — a recommendation followed by nine
 * caveats is not honest, it's unusable. Only the compromises with weight get
 * through.
 */

/** How loudly to say it, from where the user put the priority. */
const severityFor = (rank: number): Tradeoff["severity"] =>
  rank <= 2 ? "high" : "moderate";

/* -------------------------------------------------------------------------- */
/* Essentials the car doesn't have                                            */
/* -------------------------------------------------------------------------- */

/**
 * A missing essential is surfaced, never used to disqualify.
 *
 * The product's position is that the user decides. Lens's job is to make sure
 * they decide knowing this, so the sentence says the gap plainly and then
 * says why the car still placed where it did.
 */
function missingEssentials(
  reasoning: PriorityReasoning,
  rank: number,
  isRecommendation: boolean,
): Tradeoff | null {
  const missing = reasoning.features.essentialMissing;
  if (!missing.length) return null;

  const labels = joinCapped(missing.map((fact) => inSentence(fact.label)));

  const rivalHas = reasoning.rival?.onlyRivalHas.filter((fact) =>
    missing.some((item) => item.key === fact.key),
  );

  const placement = isRecommendation
    ? sentence(
        "It still comes out on top, because it's stronger on the priorities you",
        "ranked above this one — but this is a real compromise, not a rounding error",
      )
    : null;

  return {
    kind: "missingEssential",
    priority: reasoning.priority,
    priorityLabel: reasoning.label,
    rank,
    severity: "high",
    headline: `Missing: ${missing.map((fact) => fact.label).join(", ")}`,
    sentences: paragraph(
      sentence(
        `You marked ${labels} as essential under ${phraseLabel(reasoning.label)},`,
        "and this car",
        missing.length === 1
          ? "doesn't have it"
          : missing.length === 2
            ? "doesn't have either"
            : "doesn't have any of them",
      ),
      rivalHas?.length && reasoning.rival
        ? sentence(
            `${shortName(reasoning.rival.name)} does have`,
            `${joinCapped(rivalHas.map((fact) => inSentence(fact.label)))}, if that's the`,
            "part you're not willing to give up",
          )
        : null,
      placement,
    ),
  };
}

/* -------------------------------------------------------------------------- */
/* Priorities another car does better                                         */
/* -------------------------------------------------------------------------- */

/**
 * Somewhere the user cares about, that another pinned car genuinely wins.
 *
 * Only raised at "clear" or better — a four-point spread is not a compromise
 * and calling it one would be manufacturing drama out of noise.
 */
function priorityDeficit(
  reasoning: PriorityReasoning,
  rank: number,
): Tradeoff | null {
  const behind = reasoning.leader ?? null;

  if (!behind || !isNoticeable(behind.magnitude)) {
    const rival = reasoning.rival;

    if (!rival || rival.subjectAhead || !isNoticeable(rival.magnitude)) {
      return null;
    }

    const measurement = reasoning.measurements.find(
      (fact) => fact.scored && fact.rival && !fact.rival.subjectAhead,
    );

    return {
      kind: measurement ? "measurementDeficit" : "priorityDeficit",
      priority: reasoning.priority,
      priorityLabel: reasoning.label,
      rank,
      severity: severityFor(rank),
      headline: `${shortName(rival.name)} is better on ${reasoning.label}`,
      sentences: paragraph(
        measurement && measurement.rival
          ? sentence(
              `${shortName(rival.name)} has the stronger ${phraseLabel(reasoning.label)}`,
              `result here: ${measurement.rival.display} against this car's`,
              `${measurement.display} for ${inSentence(measurement.label)}`,
            )
          : sentence(
              `${shortName(rival.name)} does ${phraseLabel(reasoning.label)} better than this car`,
            ),
        rival.onlyRivalHas.length
          ? sentence(
              `It has ${joinCapped(
                rival.onlyRivalHas.map((fact) => inSentence(fact.label)),
              )}, which this one doesn't`,
            )
          : null,
        sentence(
          `You ranked ${phraseLabel(reasoning.label)} #${rank}, so this is worth`,
          "weighing before you decide",
        ),
      ),
    };
  }

  return {
    kind: "priorityDeficit",
    priority: reasoning.priority,
    priorityLabel: reasoning.label,
    rank,
    severity: severityFor(rank),
    headline: `${shortName(behind.name)} leads ${reasoning.label}`,
    sentences: paragraph(
      sentence(
        `${shortName(behind.name)} is the strongest car you pinned for`,
        `${phraseLabel(reasoning.label)}`,
        behind.numeric ? `, at ${behind.numeric.display}` : "",
      ),
      sentence(
        `You ranked ${phraseLabel(reasoning.label)} #${rank}, so if that's the part`,
        `you'd feel day to day, ${shortName(behind.name)} is the car to look at`,
      ),
    ),
  };
}

/* -------------------------------------------------------------------------- */
/* Money                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Names what the extra monthly cost is actually buying, in the user's own
 * priorities — or admits that nothing in them explains it.
 */
function whatTheExtraBuys(
  subjectId: number,
  otherId: number,
  context: ReasoningContext,
): string[] {
  const wins = context.weights
    .filter(({ priority }) =>
      isNoticeable(
        classifyScoreGap(
          scoreFor(context.scores, subjectId, priority as CategoryId) -
            scoreFor(context.scores, otherId, priority as CategoryId),
        ),
      ) &&
      scoreFor(context.scores, subjectId, priority as CategoryId) >
        scoreFor(context.scores, otherId, priority as CategoryId),
    )
    .slice(0, 2);

  return wins.map(({ priority }) => priority as string);
}

function costTradeoff(
  cost: CostReasoning,
  context: ReasoningContext,
  priorities: PriorityReasoning[],
): Tradeoff | null {
  const alternative: CostPosition | null = cost.cheapest ?? cost.rival;

  if (!alternative || !cost.subject.complete || !alternative.complete) return null;

  const difference = cost.subject.total - alternative.total;
  if (difference <= 0) return null;

  const magnitude = classifyMonthlyCostGap(difference, alternative.total);
  if (!isNoticeable(magnitude)) return null;

  const buys = whatTheExtraBuys(
    cost.subject.vehicleId,
    alternative.vehicleId,
    context,
  );

  const labels = buys
    .map(
      (id) =>
        priorities.find((item) => item.priority === id)?.label ?? id,
    )
    .map(phraseLabel);

  return {
    kind: "cost",
    priority: null,
    priorityLabel: null,
    rank: null,
    severity: "high",
    headline: `${formatEUR(difference)}/month more than ${shortName(alternative.name)}`,
    sentences: paragraph(
      sentence(
        `At your mileage this is estimated at ${formatEUR(cost.subject.total)}/month,`,
        `about ${formatEUR(difference)} more than ${shortName(alternative.name)} at`,
        `${formatEUR(alternative.total)}`,
      ),
      labels.length
        ? sentence(
            `That extra ${formatEUR(difference)} a month is buying you a stronger`,
            `${joinList(labels)} result — which is what pushed this car above it`,
          )
        : sentence(
            `Nothing in your priorities separates the two by much, so the extra`,
            `${formatEUR(difference)} a month isn't buying you anything you told us you wanted`,
          ),
    ),
  };
}

function budgetTradeoff(cost: CostReasoning): Tradeoff | null {
  if (cost.budget == null) return null;
  if (cost.subject.budgetStatus === "within") return null;

  const over = cost.subject.budgetStatus === "over";

  return {
    kind: "budget",
    priority: null,
    priorityLabel: null,
    rank: null,
    severity: "high",
    headline: over ? "Over your budget" : "We can't confirm it fits your budget",
    sentences: paragraph(
      over
        ? sentence(
            `You set ${formatEUR(cost.budget)}/month. This is estimated at`,
            `${formatEUR(cost.subject.total)}/month, about`,
            `${formatEUR(Math.abs(cost.budgetDifference ?? 0))} over`,
          )
        : sentence(
            `You set ${formatEUR(cost.budget)}/month. Part of this car's cost couldn't be`,
            "estimated, so we can't tell you whether it fits",
          ),
    ),
  };
}

/* -------------------------------------------------------------------------- */
/* Assembly                                                                   */
/* -------------------------------------------------------------------------- */

/** How many compromises a recommendation can carry before it stops helping. */
const MAX_TRADEOFFS = 4;

export function reasonAboutTradeoffs(
  evaluation: VehicleEvaluation,
  priorities: PriorityReasoning[],
  cost: CostReasoning,
  context: ReasoningContext,
): Tradeoff[] {
  const fromPriorities: Tradeoff[] = [];

  for (const reasoning of priorities) {
    if (reasoning.standing === "unsupported") continue;

    const essential = missingEssentials(
      reasoning,
      reasoning.rank,
      evaluation.isRecommendation,
    );

    if (essential) {
      fromPriorities.push(essential);
      continue;
    }

    const deficit = priorityDeficit(reasoning, reasoning.rank);
    if (deficit) fromPriorities.push(deficit);
  }

  const money = [budgetTradeoff(cost), costTradeoff(cost, context, priorities)].filter(
    (item): item is Tradeoff => item != null,
  );

  const ordered = [...money, ...fromPriorities].sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "high" ? -1 : 1;

    return (a.rank ?? 0) - (b.rank ?? 0);
  });

  return ordered.slice(0, MAX_TRADEOFFS);
}
