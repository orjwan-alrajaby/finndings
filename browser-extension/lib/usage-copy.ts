import type { FinnCar } from "./types";
import type { EfficiencyAssessment } from "./reasoning-engine/environmental";

import { assessEnvironment } from "./reasoning-engine/environmental";

/**
 * How much energy a car uses, decided once for every surface that says it.
 *
 * Three surfaces ask this question — the in-page panel, the pinned car's
 * analysis card, and the advice page — and they lay it out very differently:
 * a 26rem strip inside finn.com, a card in a list, and a full-width section on
 * a page of its own. What they must not differ on is *which* of the three
 * answers a given car gets, or the words it gets them in.
 *
 * The three are genuinely different answers rather than one answer with
 * missing parts:
 *
 * - **graded** — a figure, and a cohort to read it against.
 * - **ungradable** — a plug-in hybrid. One blended figure over an assumed
 *   pattern of charging belongs to no cohort, so grading it would be inventing
 *   a comparison rather than reporting one.
 * - **unpublished** — FINN supplied no consumption at all. Said out loud,
 *   because a section that quietly disappears reads as a section that failed
 *   to load.
 *
 * Sits beside `cost-copy` and `car-labels`, for the same reason: anything that
 * decides what a reader is told belongs outside the thing that draws it.
 */
export type UsageReading =
  | {
      kind: "graded";
      /** What it runs on — the fact that decides the cohort below. */
      fuel: string | null;
      efficiency: EfficiencyAssessment;
    }
  | {
      kind: "ungradable" | "unpublished";
      fuel: string | null;
      /** The chip, standing in for a verdict there is no honest way to give. */
      verdict: string;
      body: string;
    };

const UNGRADABLE =
  "FINN publishes one combined figure for plug-in hybrids, covering both the " +
  "petrol it burns and the electricity it charges on, over an assumed pattern " +
  "of charging. There is no petrol car or electric car it can fairly be " +
  "measured against, so we would rather say that than invent a comparison. " +
  "What it actually costs you comes down to how often you plug it in.";

const UNPUBLISHED =
  "FINN doesn't publish a consumption figure for this car, so there is " +
  "nothing to measure it against and we won't guess. Everything else here " +
  "still stands — this is the one thing we can't tell you.";

export function readUsage(vehicle: FinnCar): UsageReading {
  const environment = assessEnvironment(vehicle);
  const fuel = vehicle.fuelType ?? null;
  const efficiency = environment?.efficiency;

  if (efficiency) return { kind: "graded", fuel, efficiency };

  if (environment?.powertrain === "Plug-in Hybrid") {
    return {
      kind: "ungradable",
      fuel,
      verdict: "Can't be graded fairly",
      body: UNGRADABLE,
    };
  }

  return {
    kind: "unpublished",
    fuel,
    verdict: "Not published",
    body: UNPUBLISHED,
  };
}

/** How a level colours its chip. Efficiency is good news, not a warning. */
export const EFFICIENCY_TONE = {
  high: "bg-finn-influence-emerald-pale text-finn-influence-emerald",
  moderate: "bg-finn-pale-blue text-finn-accent-blue",
  low: "bg-finn-warning-lift text-finn-warning-deep",
} as const;
