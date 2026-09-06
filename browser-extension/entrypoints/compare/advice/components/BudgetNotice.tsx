import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import type { PinnedFinnCar } from "@/lib/types";
import type { ReasoningContext } from "@/lib/reasoning-engine/types";
import { formatEUR } from "@/lib/reasoning-engine";

/**
 * Shown when nothing the user pinned fits their budget.
 *
 * We still recommend the strongest priority match rather than returning
 * nothing — but it is labelled as over budget, with the exact difference, so
 * "best match" and "fits the budget" never get conflated.
 *
 * It sits in the sidebar, under the budget it is about, rather than as a
 * banner above the recommendation. Two reasons. The verdict itself now
 * carries the warning — the hero is drawn in the warning hue when this is
 * showing — so a second full-width block above it was the same news told
 * twice before the news. And the useful half of this is the arithmetic: what
 * each car costs against the figure the reader set. That belongs beside the
 * figure, in the column that reads back everything they told us.
 */
export function BudgetNotice({
    winner,
    context,
    reason,
    onAdjust,
}: {
    winner: PinnedFinnCar;
    context: ReasoningContext;
    reason: "allOverBudget" | "costUnconfirmed";
    /** Opens the drawer, where the budget itself lives. */
    onAdjust: () => void;
}) {
    const budget = context.budget.budget;
    const cost = context.costs[winner.id];

    if (budget == null || !cost) return null;

    const difference = cost.budgetDifference ?? 0;

    return (
        <section className="rounded-[24px] bg-finn-warning/15 p-5">
            <div className="flex items-start gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-finn-warning-deep">
                    <ExclamationTriangleIcon className="h-4 w-4" />
                </span>

                <h2 className="mt-1 text-sm font-black leading-5 text-finn-black">
                    {reason === "allOverBudget"
                        ? `Nothing fits your ${formatEUR(budget)}/month budget`
                        : `We can't confirm anything fits your ${formatEUR(budget)}/month budget`}
                </h2>
            </div>

            <p className="mt-3 text-[11px] leading-4 text-finn-iron">
                {reason === "costUnconfirmed" && (
                    <>
                        Part of every car's cost couldn't be estimated from the
                        data FINN supplied, and we won't call a car affordable
                        on the strength of numbers we don't have.{" "}
                    </>
                )}
                {winner.name} is still the strongest match for your priorities
                at {formatEUR(cost.totalMonthly)}
                {cost.complete ? "" : " so far"}
                {difference > 0 && <> — {formatEUR(difference)} over</>}. It is
                shown as the best match, not as something that fits what you
                want to spend.
            </p>

            {/* The arithmetic, which is the part a reader can act on. */}
            <ul className="mt-3 space-y-1.5">
                {context.ranked.map((car) => {
                    const carCost = context.costs[car.id];

                    if (!carCost) return null;

                    const over =
                        carCost.budgetStatus === "over" &&
                        carCost.budgetDifference != null;

                    return (
                        <li
                            key={car.id}
                            className="rounded-xl bg-white px-3 py-2"
                        >
                            <p className="truncate text-[11px] font-bold text-finn-black">
                                {car.name}
                            </p>

                            <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 text-[11px]">
                                <span className="font-black text-finn-black">
                                    {formatEUR(carCost.totalMonthly)}/month
                                </span>

                                <span
                                    className={
                                        over
                                            ? "font-bold text-finn-warning-deep"
                                            : "text-finn-iron"
                                    }
                                >
                                    {over
                                        ? `${formatEUR(carCost.budgetDifference ?? 0)} over`
                                        : "incomplete estimate"}
                                </span>
                            </p>
                        </li>
                    );
                })}
            </ul>

            {/*
              * Named for the specific fix rather than repeating the general
              * "adjust my answers" that sits below it. Both open the same
              * drawer; only one of them says what to change.
              */}
            <button
                type="button"
                onClick={onAdjust}
                className="finn-lens-screen-only mt-3 text-[11px] font-black text-finn-black underline underline-offset-2 transition hover:text-finn-warning-deep"
            >
                Change my budget
            </button>
        </section>
    );
}
