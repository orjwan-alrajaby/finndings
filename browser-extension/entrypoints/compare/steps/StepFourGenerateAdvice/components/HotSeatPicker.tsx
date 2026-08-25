import { SparklesIcon } from "@heroicons/react/24/outline";
import type { BudgetStatus, HotSeatOption } from "@/lib/reasoning-engine/types";
import { formatEUR } from "@/lib/reasoning-engine";

/**
 * Lets the user put another car in the hot seat.
 *
 * Choosing a car here only changes what is being *examined*. The
 * recommendation itself is fixed, and the badge on the recommended car stays
 * put wherever it lands in this list.
 */

const BUDGET_LABEL: Record<BudgetStatus, string> = {
    within: "In budget",
    over: "Over budget",
    unknown: "Budget unclear",
};

const BUDGET_CLASS: Record<BudgetStatus, string> = {
    within: "text-finn-black",
    over: "text-finn-warning",
    unknown: "text-finn-iron",
};

export function HotSeatPicker({
    options,
    onSelect,
}: {
    options: HotSeatOption[];
    onSelect: (vehicleId: number) => void;
}) {
    if (options.length < 2) return null;

    return (
        <section className="mt-6 rounded-[28px] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-finn-accent-blue">
                        Hot seat
                    </p>

                    <h2 className="mt-1 text-lg font-black">
                        Examine a different car
                    </h2>
                </div>

                <p className="max-w-md text-xs leading-5 text-finn-iron">
                    Judged against exactly the same priorities, order,
                    features, mileage, prices, budget and contract type.
                    Picking one here doesn't change the recommendation.
                </p>
            </div>

            <div className="mt-4 flex snap-x gap-3 overflow-x-auto pb-2">
                {options.map((option) => (
                    <button
                        key={option.vehicle.id}
                        type="button"
                        aria-pressed={option.isSelected}
                        onClick={() => onSelect(option.vehicle.id)}
                        className={[
                            "w-52 shrink-0 snap-start rounded-[20px] border-2 p-3 text-left transition",
                            option.isSelected
                                ? "border-finn-accent-blue bg-finn-pale-blue"
                                : "border-finn-cotton bg-finn-snow hover:border-finn-iron/30",
                        ].join(" ")}
                    >
                        <div className="relative">
                            <img
                                src={option.vehicle.images.thumbnail}
                                alt=""
                                className="h-20 w-full rounded-xl object-cover"
                            />

                            {option.isRecommendation && (
                                <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-finn-highlight-navy px-2 py-0.5 text-[9px] font-black text-white">
                                    <SparklesIcon className="h-3 w-3" />
                                    Recommended
                                </span>
                            )}
                        </div>

                        <p className="mt-2 truncate text-xs font-black text-finn-black">
                            {option.vehicle.name}
                        </p>

                        <p className="mt-0.5 text-[10px] font-bold text-finn-iron">
                            #{option.rank} overall · {option.total}/100
                        </p>

                        <p
                            className={[
                                "mt-0.5 text-[10px] font-bold",
                                BUDGET_CLASS[option.budgetStatus],
                            ].join(" ")}
                        >
                            {formatEUR(option.totalMonthly)}/month ·{" "}
                            {BUDGET_LABEL[option.budgetStatus]}
                        </p>
                    </button>
                ))}
            </div>
        </section>
    );
}
