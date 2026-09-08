import type { FitAnalysis } from "./reasoning-engine/fit";

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
