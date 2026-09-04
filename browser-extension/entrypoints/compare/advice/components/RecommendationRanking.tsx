import type { BudgetStatus, ReasoningContext } from "@/lib/reasoning-engine/types";
import type { Verdict } from "@/lib/reasoning-engine/narrative";
import { classifyTotalGap, isEffectivelyLevel } from "@/lib/reasoning-engine/narrative";
import { formatEUR } from "@/lib/reasoning-engine";

interface RecommendationRankingProps {
    context: ReasoningContext;
    recommendedId: number;
    selectedId: number;
    /** How far the car being explained finished clear of the next one. */
    margin: Verdict["margin"];
}

const BUDGET_LABEL: Record<BudgetStatus, string> = {
    within: "in budget",
    over: "over budget",
    unknown: "budget unclear",
};

const BUDGET_CLASS: Record<BudgetStatus, string> = {
    within: "text-finn-iron",
    over: "text-finn-warning",
    unknown: "text-finn-iron",
};

/**
 * Every pinned car in score order, over-budget ones included.
 *
 * Cars that exceed the budget are marked, never hidden — the user can always
 * see what was excluded from winning and why.
 */
export function RecommendationRanking({
    context,
    recommendedId,
    selectedId,
    margin,
}: RecommendationRankingProps) {
    return (
        <div className="mt-4 space-y-2">
            {margin && isEffectivelyLevel(margin.magnitude) && (
                <p className="rounded-2xl bg-finn-pale-blue px-4 py-3 text-xs leading-5 text-finn-highlight-navy">
                    These are closer than the ranking makes them look —{" "}
                    {margin.difference === 0
                        ? "the top two finish level on points"
                        : `only ${Math.abs(margin.difference)} point${
                              Math.abs(margin.difference) === 1 ? "" : "s"
                          } separate the top two`}
                    . The reasoning above explains what tipped it.
                </p>
            )}

            {context.ranked.map((car, index) => {
                const score = context.scores.find(
                    (item) => item.vehicleId === car.id,
                );

                const cost = context.costs[car.id];

                if (!score || !cost) return null;

                /* How far this car finished behind the one above it. */
                const above = context.ranked[index - 1];

                const gapAbove = above
                    ? (context.scores.find(
                          (item) => item.vehicleId === above.id,
                      )?.total ?? 0) - score.total
                    : null;

                return (
                    <div
                        key={car.id}
                        className={[
                            "flex items-center gap-3 rounded-2xl p-3",
                            car.id === selectedId
                                ? "bg-finn-pale-blue"
                                : "bg-finn-snow",
                        ].join(" ")}
                    >
                        <span className="w-6 text-center text-xs font-black text-finn-iron">
                            #{index + 1}
                        </span>

                        <img
                            src={car.images.thumbnail}
                            alt=""
                            className="h-9 w-12 rounded-lg object-cover"
                        />

                        <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold">
                                {car.name}
                                {car.id === recommendedId && (
                                    <span className="ml-1.5 rounded-full bg-finn-highlight-navy px-1.5 py-0.5 text-[9px] font-black text-white">
                                        Recommended
                                    </span>
                                )}
                            </p>

                            <p
                                className={[
                                    "text-[10px]",
                                    BUDGET_CLASS[cost.budgetStatus],
                                ].join(" ")}
                            >
                                {formatEUR(cost.totalMonthly)}/month estimated
                                {cost.complete ? "" : " so far"} ·{" "}
                                {BUDGET_LABEL[cost.budgetStatus]}
                            </p>
                        </div>

                        <span className="text-right">
                            <span className="block font-mono text-xs font-black">
                                {score.total}
                            </span>

                            {gapAbove != null && (
                                <span
                                    className={[
                                        "block text-[9px] font-bold",
                                        isEffectivelyLevel(
                                            classifyTotalGap(gapAbove),
                                        )
                                            ? "text-finn-accent-blue"
                                            : "text-finn-iron",
                                    ].join(" ")}
                                >
                                    −{gapAbove}
                                </span>
                            )}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
