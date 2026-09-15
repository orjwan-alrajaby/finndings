import type { Tradeoff } from "./reasoning-engine/narrative/types";
import type { RowTone } from "./row-tone";

import { CATEGORIES } from "./reasoning-engine/constants";
import { TRADEOFF_TONE } from "./row-tone";

/**
 * One compromise, as a row of the table the panel draws it in.
 *
 * The mark is the priority's own — the shield for safety, the leaf for the
 * environment — so a reader scanning the list sees which part of their answer
 * each one costs before reading a word of it. A tradeoff with no priority is
 * the budget, which the reader set directly rather than ranked, and it takes
 * the wallet the bill above it is headed with.
 *
 * Named rather than drawn, like every other mark in these tables: the panel
 * draws from its copied shapes and React from lucide.
 */
export interface TradeoffReading {
  /** The priority's mark, or the wallet for the budget. */
  icon: string;
  /** "#2 Practicality", or "Your budget". */
  pill: string;
  /**
   * The row's edge and its pill. Red where the car doesn't have something the
   * reader gave extra influence, the same red that group has in the feature
   * table above; otherwise how loudly the engine said it.
   */
  tone: RowTone;
}

export function readTradeoff(tradeoff: Tradeoff): TradeoffReading {
  const tone: RowTone =
    tradeoff.kind === "missingSelected" ? "error" : TRADEOFF_TONE[tradeoff.severity];

  if (!tradeoff.priority) return { icon: "wallet", pill: "Your budget", tone };

  const category = CATEGORIES[tradeoff.priority];

  return {
    icon: category?.icon ?? "scale",
    pill: tradeoff.rank
      ? `#${tradeoff.rank} ${tradeoff.priorityLabel ?? category?.label ?? ""}`.trim()
      : (tradeoff.priorityLabel ?? category?.label ?? "Worth weighing"),
    tone,
  };
}
