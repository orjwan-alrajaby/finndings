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
 */
export function BudgetNotice({
    winner,
    context,
    reason,
    onAdjustSettings,
}: {
    winner: PinnedFinnCar;
    context: ReasoningContext;
    reason: "allOverBudget" | "costUnconfirmed";
    onAdjustSettings: () => void;
}) {
    const budget = context.budget.budget;
    const cost = context.costs[winner.id];

    if (budget == null || !cost) return null;

    const difference = cost.budgetDifference ?? 0;

    return (
        <section className="mb-6 rounded-[28px] bg-finn-warning/10 p-6 sm:p-7">
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-finn-warning/20 text-finn-warning">
                    <ExclamationTriangleIcon className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                    <h2 className="text-xl font-black text-finn-black">
                        {reason === "allOverBudget"
                            ? `None of these cars fit your ${formatEUR(budget)}/month budget.`
                            : `We can't confirm any of these cars fit your ${formatEUR(budget)}/month budget.`}
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-finn-iron">
                        {reason === "costUnconfirmed" && (
                            <>
                                Part of every car's cost couldn't be estimated
                                from the data FINN supplied, and we won't call a
                                car affordable on the strength of numbers we
                                don't have.{" "}
                            </>
                        )}
                        Based on your priorities, {winner.name} is still the
                        strongest overall match, but its estimated monthly cost
                        is {formatEUR(cost.totalMonthly)}
                        {cost.complete ? "" : " so far"}
                        {difference > 0 && (
                            <> — {formatEUR(difference)} above your budget</>
                        )}
                        . We're showing it as the best match, not as something
                        that fits what you want to spend.
                    </p>

                    <ul className="mt-4 space-y-2">
                        {context.ranked.map((car) => {
                            const carCost = context.costs[car.id];
                            if (!carCost) return null;

                            return (
                                <li
                                    key={car.id}
                                    className="flex items-center justify-between gap-3 rounded-2xl bg-white/70 px-4 py-2.5"
                                >
                                    <span className="truncate text-xs font-bold text-finn-black">
                                        {car.name}
                                    </span>

                                    <span
                                        className={[
                                            "shrink-0 text-xs font-black",
                                            carCost.budgetStatus === "over"
                                                ? "text-finn-warning"
                                                : "text-finn-iron",
                                        ].join(" ")}
                                    >
                                        {formatEUR(carCost.totalMonthly)}/month
                                        <span className="ml-1 font-bold text-finn-iron">
                                            {carCost.budgetStatus === "over" &&
                                            carCost.budgetDifference != null
                                                ? `(${formatEUR(carCost.budgetDifference)} over)`
                                                : "(incomplete estimate)"}
                                        </span>
                                    </span>
                                </li>
                            );
                        })}
                    </ul>

                    <button
                        type="button"
                        onClick={onAdjustSettings}
                        className="mt-5 rounded-full bg-finn-accent-blue px-5 py-3 text-xs font-black text-white shadow-md transition hover:bg-finn-highlight-navy"
                    >
                        Adjust my settings
                    </button>
                </div>
            </div>
        </section>
    );
}
