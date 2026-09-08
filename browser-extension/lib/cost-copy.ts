import type { FitAnalysis } from "./reasoning-engine/fit";
import type { CostAnalysis, CostLine } from "./reasoning-engine/types";
import { classifyMonthlyCostGap } from "./reasoning-engine/narrative/magnitude";

import { formatEUR, formatKm } from "./reasoning-engine";

/**
 * The sentences about money that both readings of a car share.
 *
 * The in-page panel builds hand-rolled DOM inside a shadow root on finn.com;
 * the advice page is React. They are two renderers of one analysis, and the
 * rule that keeps them honest is that nothing which *decides* anything lives
 * in either of them. Copy decides something: the moment one surface says
 * "you'd also pay €51 of electricity" and the other says "€651/mo", a reader
 * moving between them is being told two different things about one car.
 *
 * So this sits beside `car-labels`, which is the same idea for the words a
 * configuration is named by.
 */

/**
 * The total, said as a sentence about the reader rather than about the car.
 *
 * The figures were already right and already broken down; what was missing was
 * the sentence that connects them to the person reading. "€612 estimated per
 * month" over a table is a quote. "At the 1,200 km a month you drive, this
 * comes to about €612" is an answer to the question they actually asked, and
 * it does two things a table cannot: it says the number depends on *their*
 * driving rather than being a property of the car, and it shows the assumption
 * it rests on, so a reader whose driving has changed knows immediately why the
 * figure looks wrong and where to fix it.
 *
 * The parts are named in the sentence as well as listed below it, because the
 * split is the actionable part — a total that is mostly excess-mileage charges
 * is a different problem from one that is mostly subscription, and only one of
 * them is solved by picking a different car.
 */
export function costLead(analysis: FitAnalysis): string {
  const { breakdown } = analysis.cost;
  const { energy, excessMileage, subscription } = breakdown;

  const km = formatKm(breakdown.monthlyKm);
  const advertised = subscription.available ? subscription.amount : null;

  /* What the reader does not already know: everything except the sticker. */
  const added: string[] = [];

  if (energy.available && energy.amount != null) {
    added.push(`about ${formatEUR(energy.amount)} of ${energy.energyLabel}`);
  }

  if (excessMileage.available && (excessMileage.amount ?? 0) > 0) {
    const over = breakdown.monthlyKm - breakdown.includedMonthlyKm;

    added.push(
      `${formatEUR(excessMileage.amount ?? 0)} for the ${formatKm(over)} ` +
        `you'd go past the ${formatKm(breakdown.includedMonthlyKm)} included`,
    );
  }

  const total = formatEUR(breakdown.totalMonthly);

  /*
   * No advertised price to build on — rare, and the sentence has to stand on
   * its own rather than contrast with a number that isn't there.
   */
  if (advertised == null) {
    return breakdown.complete
      ? `At the ${km} a month you told us you drive, this comes to about ${total} a month.`
      : `At the ${km} a month you told us you drive, the part we can price comes to about ${total} a month.`;
  }

  const sticker = `FINN's page says ${formatEUR(advertised)} a month.`;

  if (!added.length) {
    return breakdown.complete
      ? `${sticker} At the ${km} a month you told us you drive, that is what it costs you — nothing to add.`
      : `${sticker} We can't price everything this car would cost you, so ${total} is a floor rather than the answer.`;
  }

  const last = added.pop() as string;
  const listed = added.length ? `${added.join(", ")} and ${last}` : last;

  return breakdown.complete
    ? `${sticker} At the ${km} a month you told us you drive, you'd also pay ` +
        `${listed} — so about ${total} all in.`
    : `${sticker} At the ${km} a month you told us you drive, you'd also pay ` +
        `${listed}, which brings the part we can price to about ${total}.`;
}

/**
 * How much more than the advertised price this car costs *this* reader.
 *
 * The one number in a cost section that is genuinely news, and the reason the
 * sticker price is quoted at all. Null where there is nothing to compare
 * against — no advertised price, an incomplete estimate, or a total that does
 * not exceed it — because a chip saying "€0 more" is noise, and one drawn off
 * a partial total would be a claim the arithmetic cannot support.
 */
export function advertisedGap(analysis: FitAnalysis): number | null {
  const { breakdown } = analysis.cost;
  const advertised = breakdown.subscription.available
    ? breakdown.subscription.amount
    : null;

  if (advertised == null || !breakdown.complete) return null;

  const gap = breakdown.totalMonthly - advertised;

  return gap > 0 ? gap : null;
}

/* -------------------------------------------------------------------------- */
/* Cost, against another car                                                  */
/* -------------------------------------------------------------------------- */

/**
 * One line of the bill, next to the same line on the car being compared.
 *
 * `favours` is the reader's side of it rather than the arithmetic's: "subject"
 * means taking this car costs less here, which is a gain. A line neither side
 * can be priced on, or one they land on together, favours nobody and is
 * reported as level rather than quietly dropped — a comparison that shows only
 * the differences invites the reader to assume the rest was checked and equal,
 * which is exactly what an unpriceable line was not.
 */
export interface CostComparisonRow {
  id: CostLine["id"] | "total";
  label: string;
  subject: number | null;
  against: number | null;
  /** subject − against, when both are known. */
  difference: number | null;
  favours: "subject" | "against" | "level" | "unknown";
}

function compare(
  id: CostComparisonRow["id"],
  label: string,
  subject: number | null,
  against: number | null,
): CostComparisonRow {
  if (subject == null || against == null) {
    return { id, label, subject, against, difference: null, favours: "unknown" };
  }

  const difference = subject - against;

  /*
   * "Level" is the engine's own judgement, not a rounding.
   *
   * These are estimates built from a consumption figure and a price per kWh,
   * so a difference has to be large enough to survive them before it is worth
   * calling a difference. `classifyMonthlyCostGap` is where that threshold
   * already lives — it is what decides whether the narrative says two cars
   * "cost about the same" — and borrowing it here is what stops this table
   * reporting "€6 more" a few lines under a sentence saying money is not what
   * separates them. Judged against the line it is being compared to, so a €6
   * gap is noise on a €500 subscription and real on a €48 energy estimate.
   */
  const magnitude = classifyMonthlyCostGap(difference, against);

  const favours =
    magnitude === "tie" || magnitude === "negligible"
      ? "level"
      : difference < 0
        ? "subject"
        : "against";

  return { id, label, subject, against, difference, favours };
}

/**
 * What taking this car instead of another would do to the monthly bill.
 *
 * The advice page puts one car in the hot seat against the recommendation and
 * answers "what would you gain, what would you give up" for everything the
 * reader ranked — and then, until now, dropped that framing entirely for the
 * one thing every reader cares about. The cost section simply swapped to the
 * challenger's figures, so the winner's disappeared and the comparison the
 * whole page is built around had to be done from memory.
 *
 * Line by line rather than on the total alone, because the total hides the
 * shape of the decision: two cars a few euros apart in the end can be a
 * cheaper subscription paying for a thirstier engine, and that is worth
 * knowing — one of those numbers moves if the reader's mileage changes and
 * the other does not.
 */
export function compareCosts(
  subject: CostAnalysis,
  against: CostAnalysis,
): CostComparisonRow[] {
  const amountOf = (analysis: CostAnalysis, id: CostLine["id"]) => {
    const line = analysis.lines.find((item) => item.id === id);

    return line?.available ? (line.amount ?? null) : null;
  };

  const lines = subject.lines.map((line) =>
    compare(
      line.id,
      line.label,
      amountOf(subject, line.id),
      amountOf(against, line.id),
    ),
  );

  /*
   * The total is only comparable when both sides are whole. Two partial totals
   * differ by whatever each happens to be missing, and a chip reading "€80
   * cheaper" off that would be reporting a gap in FINN's data as a saving.
   */
  const totals =
    subject.breakdown.complete && against.breakdown.complete
      ? compare(
          "total",
          "Total a month",
          subject.breakdown.totalMonthly,
          against.breakdown.totalMonthly,
        )
      : compare("total", "Total a month", null, null);

  return [...lines, totals];
}
