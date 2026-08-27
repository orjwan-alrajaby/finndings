import type { PinnedFinnCar } from "@/lib/types";
import type {
  CategoryId,
  ReasoningContext,
  VehicleEvaluation,
} from "../types";
import type {
  CostPosition,
  CostReasoning,
  FeatureFact,
  PriorityReasoning,
  Tradeoff,
} from "./types";

import { formatEUR } from "../format";
import { featureFact } from "./facts";
import { classifyMonthlyCostGap, isNoticeable } from "./magnitude";
import {
  inSentence,
  joinCapped,
  joinList,
  paragraph,
  phraseLabel,
  sentence,
  shortName,
} from "./phrase";

/**
 * What the reader is giving up.
 *
 * This is not a disclaimer and not a footnote. A recommendation presented
 * without its compromises is half an answer, so this reasoning is built to
 * the same standard as the reasoning that produced the recommendation: every
 * item names the thing being given up, quotes the figures behind it, names
 * the car that has it, and says why *this* reader should care.
 *
 * Two filters keep it honest:
 *
 * - **Relevance.** A compromise is only surfaced when it answers to something
 *   the user told us — a priority they ranked, or the budget they set. High
 *   CO₂ is a fact about a car; it is only a tradeoff for someone who said the
 *   environment matters. Manufacturing importance is its own dishonesty.
 *
 * - **Restraint.** Only the alternatives the recommendation is actually
 *   competing with can source a compromise, and only the most consequential
 *   few are shown. A recommendation followed by nine caveats is unusable.
 */

/** How loudly to say it, from where the user put the priority. */
const severityFor = (rank: number): Tradeoff["severity"] =>
  rank <= 2 ? "high" : "moderate";

/**
 * Equipment the alternative has for this priority and the subject doesn't.
 *
 * Restricted to the user's own enabled features, so a compromise can never be
 * built out of equipment nobody asked about.
 */
function featureGap(
  subject: PinnedFinnCar,
  other: PinnedFinnCar,
  priority: CategoryId,
  context: ReasoningContext,
): FeatureFact[] {
  const configured = context.categoryFeatures[priority] ?? [];

  return configured
    .filter(
      (feature) =>
        Boolean(other.features?.[feature.key]) &&
        !subject.features?.[feature.key],
    )
    .map(featureFact);
}

/** Why the reader should care, said in their own ranking. */
const relevanceFor = (label: string, rank: number): string =>
  `You ranked ${phraseLabel(label)} #${rank}.`;

/* -------------------------------------------------------------------------- */
/* Essentials the car doesn't have                                            */
/* -------------------------------------------------------------------------- */

/**
 * A missing essential is surfaced, never used to disqualify.
 *
 * The product's position is that the user decides. Lens's job is to make sure
 * they decide knowing this, so the sentence states the gap plainly and then
 * accounts for why the car still placed where it did.
 */
function missingEssentials(
  reasoning: PriorityReasoning,
  evaluation: VehicleEvaluation,
  priorities: PriorityReasoning[],
  alternatives: PinnedFinnCar[],
  context: ReasoningContext,
): Tradeoff | null {
  const missing = reasoning.features.essentialMissing;
  if (!missing.length) return null;

  const labels = joinCapped(missing.map((fact) => inSentence(fact.label)));

  /* Which alternative would give the reader the missing piece back. */
  const rescuer = alternatives.find((candidate) =>
    missing.some((fact) => candidate.features?.[fact.key]),
  );

  const rescued = rescuer
    ? missing.filter((fact) => rescuer.features?.[fact.key])
    : [];

  const evidence = sentence(
    `This car doesn't have ${labels}`,
    rescuer
      ? `— ${shortName(rescuer.name)} has ${joinCapped(
          rescued.map((fact) => inSentence(fact.label)),
        )}`
      : "",
  );

  const relevance = sentence(
    `You marked ${labels} as essential under`,
    `${phraseLabel(reasoning.label)}, your #${reasoning.rank} priority`,
  );

  const placement = whyItStillWon(reasoning, evaluation, priorities, context);

  return {
    kind: "missingEssential",
    priority: reasoning.priority,
    priorityLabel: reasoning.label,
    rank: reasoning.rank,
    severity: "high",
    headline: `No ${missing.map((fact) => inSentence(fact.label)).join(", no ")}`,
    evidence,
    relevance,
    rival: rescuer ? { vehicleId: rescuer.id, name: rescuer.name } : null,
    sentences: paragraph(evidence, relevance, placement),
  };
}

/**
 * Why the car still won despite a gap the user called essential.
 *
 * Only stated when it is actually true. "It's stronger on the priorities you
 * ranked above this one" is a lie under the #1 priority, where there is
 * nothing above it, and a lie again when the budget is what decided the
 * result — which is precisely the case a reader is most likely to check.
 */
function whyItStillWon(
  reasoning: PriorityReasoning,
  evaluation: VehicleEvaluation,
  priorities: PriorityReasoning[],
  context: ReasoningContext,
): string | null {
  if (!evaluation.isRecommendation) return null;

  /* The budget narrowed the field; that is the honest account. */
  if (evaluation.rank > 1 && context.budget.budget != null) {
    return sentence(
      "It's still the recommendation because it's the strongest car you pinned",
      "that fits your budget — not because this gap doesn't matter",
    );
  }

  const stronger = priorities.filter(
    (item) =>
      item.rank < reasoning.rank &&
      item.standing !== "unsupported" &&
      (item.standing === "leads" || item.standing === "levelWithLeader"),
  );

  if (!stronger.length) return null;

  return sentence(
    `It still comes out on top because nothing close beats it on`,
    `${joinList(stronger.slice(0, 2).map((item) => phraseLabel(item.label)))},`,
    "which you ranked higher — but this is a real compromise, not a rounding error",
  );
}

/* -------------------------------------------------------------------------- */
/* Priorities an alternative does better                                      */
/* -------------------------------------------------------------------------- */

/**
 * Somewhere the user cares about that a realistic alternative genuinely wins.
 *
 * Raised only at "clear" or better. A four-point spread is not a compromise,
 * and dressing one up as a compromise is manufacturing drama out of noise.
 */
function priorityDeficit(
  reasoning: PriorityReasoning,
  evaluation: VehicleEvaluation,
  context: ReasoningContext,
): Tradeoff | null {
  const behind = reasoning.leader;

  if (!behind || !isNoticeable(behind.magnitude)) return null;

  const rival = context.vehicles.find(
    (item) => item.id === behind.vehicleId,
  );

  if (!rival) return null;

  /*
   * The measurement is the better evidence when there is one: "1,726 L
   * against 491 L" tells the reader what they're giving up, where a score
   * only tells them that they're giving something up.
   */
  const measured = reasoning.measurements.find((fact) => fact.scored);

  const gained = featureGap(
    evaluation.vehicle,
    rival,
    reasoning.priority,
    context,
  );

  const evidence =
    measured && behind.numeric
      ? sentence(
          `${shortName(rival.name)} has the better ${inSentence(measured.label)}:`,
          `${behind.numeric.display} against this car's ${measured.display}`,
        )
      : gained.length
        ? sentence(
            `${shortName(rival.name)} has`,
            `${joinCapped(gained.map((fact) => inSentence(fact.label)))}, which this car doesn't`,
          )
        : null;

  /* No concrete difference to point at means no claim worth making. */
  if (!evidence) return null;

  const relevance = sentence(
    relevanceFor(reasoning.label, reasoning.rank).replace(/\.$/, ""),
    reasoning.rank === 1
      ? ", so this is the most significant thing you'd be giving up"
      : `, so this is one of the main compromises in choosing ${shortName(
          evaluation.vehicle.name,
        )}`,
  );

  return {
    kind: measured ? "measurementDeficit" : "priorityDeficit",
    priority: reasoning.priority,
    priorityLabel: reasoning.label,
    rank: reasoning.rank,
    severity: severityFor(reasoning.rank),
    headline:
      measured && behind.numeric
        ? `${measured.label}: ${measured.display} vs ${behind.numeric.display}`
        : `${shortName(rival.name)} has ${inSentence(
            gained[0]?.label ?? reasoning.label,
          )}`,
    evidence,
    relevance,
    rival: { vehicleId: rival.id, name: rival.name },
    sentences: paragraph(evidence, relevance),
  };
}

/* -------------------------------------------------------------------------- */
/* Money                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Names what the extra monthly cost is buying, in the user's own priorities —
 * or admits that nothing in them explains it.
 *
 * "You're paying €152 more than the Dolphin Surf" invites exactly one
 * question, and this is where it gets answered.
 */
function whatTheExtraBuys(
  evaluation: VehicleEvaluation,
  priorities: PriorityReasoning[],
  otherId: number,
  context: ReasoningContext,
): string[] {
  const other = context.vehicles.find((item) => item.id === otherId);
  if (!other) return [];

  const wins: string[] = [];

  for (const reasoning of priorities) {
    if (reasoning.standing === "unsupported") continue;

    const gained = context.categoryFeatures[reasoning.priority]?.filter(
      (feature) =>
        Boolean(evaluation.vehicle.features?.[feature.key]) &&
        !other.features?.[feature.key],
    );

    if (gained?.length) {
      wins.push(
        `${joinCapped(
          gained.map((feature) => inSentence(featureFact(feature).label)),
          2,
        )} under ${phraseLabel(reasoning.label)}`,
      );
    }

    if (wins.length === 2) break;
  }

  return wins;
}

function costTradeoff(
  cost: CostReasoning,
  evaluation: VehicleEvaluation,
  priorities: PriorityReasoning[],
  context: ReasoningContext,
): Tradeoff | null {
  const alternative: CostPosition | null = cost.cheapest ?? cost.rival;

  if (!alternative || !cost.subject.complete || !alternative.complete) return null;

  const difference = cost.subject.total - alternative.total;
  if (difference <= 0) return null;

  if (!isNoticeable(classifyMonthlyCostGap(difference, alternative.total))) {
    return null;
  }

  const buys = whatTheExtraBuys(
    evaluation,
    priorities,
    alternative.vehicleId,
    context,
  );

  const evidence = sentence(
    `At your mileage this is estimated at ${formatEUR(cost.subject.total)}/month,`,
    `about ${formatEUR(difference)} more than ${shortName(alternative.name)} at`,
    formatEUR(alternative.total),
  );

  const relevance = buys.length
    ? sentence(
        `That extra ${formatEUR(difference)} a month is buying you`,
        `${buys.join("; and ")} — which is what put this car ahead of it`,
      )
    : sentence(
        `Nothing you ranked separates the two by much, so that extra`,
        `${formatEUR(difference)} a month isn't buying you anything you told us you wanted`,
      );

  return {
    kind: "cost",
    priority: null,
    priorityLabel: null,
    rank: null,
    severity: "high",
    headline: `${formatEUR(difference)}/month more than ${shortName(alternative.name)}`,
    evidence,
    relevance,
    rival: { vehicleId: alternative.vehicleId, name: alternative.name },
    sentences: paragraph(evidence, relevance),
  };
}

function budgetTradeoff(cost: CostReasoning): Tradeoff | null {
  if (cost.budget == null) return null;
  if (cost.subject.budgetStatus === "within") return null;

  const over = cost.subject.budgetStatus === "over";

  const evidence = over
    ? sentence(
        `You set ${formatEUR(cost.budget)}/month. This is estimated at`,
        `${formatEUR(cost.subject.total)}/month, about`,
        `${formatEUR(Math.abs(cost.budgetDifference ?? 0))} over`,
      )
    : sentence(
        `You set ${formatEUR(cost.budget)}/month, and part of this car's cost`,
        "couldn't be estimated from FINN's data",
      );

  const relevance = over
    ? sentence(
        "Your budget is the one constraint Lens treats as a hard limit rather",
        "than a preference, so nothing else here outweighs it",
      )
    : sentence(
        "We won't call a car affordable on the strength of numbers we don't have,",
        "so it can't be confirmed to fit",
      );

  return {
    kind: "budget",
    priority: null,
    priorityLabel: null,
    rank: null,
    severity: "high",
    headline: over
      ? `${formatEUR(Math.abs(cost.budgetDifference ?? 0))}/month over your budget`
      : "We can't confirm it fits your budget",
    evidence,
    relevance,
    rival: null,
    sentences: paragraph(evidence, relevance),
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
  alternatives: PinnedFinnCar[] = [],
): Tradeoff[] {
  const fromPriorities: Tradeoff[] = [];

  for (const reasoning of priorities) {
    if (reasoning.standing === "unsupported") continue;

    const essential = missingEssentials(
      reasoning,
      evaluation,
      priorities,
      alternatives,
      context,
    );

    if (essential) {
      fromPriorities.push(essential);
      continue;
    }

    const deficit = priorityDeficit(reasoning, evaluation, context);
    if (deficit) fromPriorities.push(deficit);
  }

  const money = [
    budgetTradeoff(cost),
    costTradeoff(cost, evaluation, priorities, context),
  ].filter((item): item is Tradeoff => item != null);

  /*
   * Money first — the budget is a constraint the user set outright — and then
   * strictly in their own priority order. Sorting by an internal severity
   * ahead of that would print a #5 compromise above a #3 one, which reads as
   * the page disagreeing with the ranking it just showed them.
   */
  const ordered = [
    ...money,
    ...[...fromPriorities].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)),
  ];

  return ordered.slice(0, MAX_TRADEOFFS);
}
