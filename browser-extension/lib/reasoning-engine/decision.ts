import type { PinnedFinnCar } from "@/lib/types";
import type {
  BudgetPartition,
  DependsOnGap,
  ReasoningContext,
  VehicleScore,
} from "./types";

/**
 * Who may win, who they were checked against, and what could change it.
 *
 * Kept apart from `index.ts` so the explanation layer can ask the same
 * questions the recommendation did without importing the recommendation.
 */

/** The pool a winner may be drawn from, preferring certainty about the budget. */
export function pickEligible(
  budget: BudgetPartition,
  ranked: PinnedFinnCar[],
): PinnedFinnCar[] {
  if (budget.within.length) return budget.within;
  if (budget.unknown.length) return budget.unknown;
  return ranked;
}

const scoreOf = (context: ReasoningContext, vehicle: PinnedFinnCar) =>
  context.scores.find((score) => score.vehicleId === vehicle.id) as VehicleScore;

/** The ranked cars in the winner's budget pool. */
export function budgetPool(context: ReasoningContext): PinnedFinnCar[] {
  const eligible = pickEligible(context.budget, context.ranked);

  return context.ranked.filter((vehicle) =>
    eligible.some((item) => item.id === vehicle.id),
  );
}

/**
 * The winner: the best car in the budget pool that can be judged on the
 * reader's top two priorities, or — when none can — the pool's best estimate.
 */
export function pickWinner(context: ReasoningContext): PinnedFinnCar | null {
  const pool = budgetPool(context);

  return pool.find((vehicle) => scoreOf(context, vehicle).judgeable) ?? pool[0] ?? null;
}

/** The next car in the winner's budget pool that can be judged. */
export function runnerUpFor(
  context: ReasoningContext,
  winnerId: number,
): PinnedFinnCar | null {
  return (
    budgetPool(context).find(
      (vehicle) => vehicle.id !== winnerId && scoreOf(context, vehicle).judgeable,
    ) ?? null
  );
}

/**
 * Missing evidence that could reorder the winner and the runner-up.
 *
 * The winner with every unknown at its worst against the runner-up with every
 * unknown at its best. Only if the runner-up could then come out ahead is any
 * gap worth naming — and then every gap on either car is named, since any of
 * them could be the one that decides it.
 */
export function dependsOnFor(
  context: ReasoningContext,
  winner: PinnedFinnCar,
): DependsOnGap[] {
  const runnerUp = runnerUpFor(context, winner.id);
  if (!runnerUp) return [];

  const winnerScore = scoreOf(context, winner);
  const runnerUpScore = scoreOf(context, runnerUp);

  if (runnerUpScore.bounds.high <= winnerScore.bounds.low) return [];

  return [...gapsOf(winner, winnerScore), ...gapsOf(runnerUp, runnerUpScore)];
}

function gapsOf(vehicle: PinnedFinnCar, score: VehicleScore): DependsOnGap[] {
  const base = { vehicleId: vehicle.id, name: vehicle.name };

  return [
    ...(score.gaps.equipmentKnown
      ? []
      : [{ ...base, kind: "equipmentList" as const }]),
    ...score.gaps.unknownItems.map((gap) => ({
      ...base,
      kind: "item" as const,
      priority: gap.priority,
      key: gap.key,
    })),
    ...score.gaps.unassessed.map((priority) => ({
      ...base,
      kind: "priority" as const,
      priority,
    })),
  ];
}
