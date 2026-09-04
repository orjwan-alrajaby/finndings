import type { AlternativeOption, BudgetStatus } from "@/lib/reasoning-engine/types";
import { formatEUR } from "@/lib/reasoning-engine";

/**
 * The four cars worth challenging the recommendation with.
 *
 * Not a leaderboard, and deliberately not every car the user pinned: these
 * are the closest alternatives overall, so each one is a choice the reader
 * could plausibly have been given instead. A car that merely tops one
 * low-ranked category is not in here, because putting it in front of the
 * reader would imply it were a contender.
 *
 * Every figure on a card is expressed relative to the recommendation, since
 * "instead of" is the only question this section exists to answer.
 */

const BUDGET_CLASS: Record<BudgetStatus, string> = {
    within: "text-finn-iron",
    over: "text-finn-warning",
    unknown: "text-finn-iron",
};

export function ChallengePicker({
    options,
    winnerName,
    selectedId,
    onSelect,
}: {
    options: AlternativeOption[];
    winnerName: string;
    /** The car currently in the hot seat, or null when it's the winner. */
    selectedId: number | null;
    onSelect: (vehicleId: number | null) => void;
}) {
    if (!options.length) return null;

    return (
        <section className="rounded-[28px] bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-finn-accent-blue">
                        Hot seat
                    </p>

                    <h2 className="mt-2 text-2xl font-black">
                        Want to challenge the recommendation?
                    </h2>
                </div>

                {selectedId != null && (
                    <button
                        type="button"
                        onClick={() => onSelect(null)}
                        className="rounded-full border border-finn-cotton px-4 py-2 text-[11px] font-bold text-finn-iron transition hover:text-finn-black"
                    >
                        Back to {winnerName}
                    </button>
                )}
            </div>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-finn-iron">
                {options.length === 1
                    ? `The one other car close enough to ${winnerName} to be worth weighing against it.`
                    : `The ${options.length} cars closest to ${winnerName} overall.`}{" "}
                Pick one and we'll show you exactly what you'd gain and lose by
                taking it instead — judged on the same priorities, mileage,
                prices and budget. Choosing one here doesn't change the
                recommendation.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {options.map((option) => (
                    <button
                        key={option.vehicle.id}
                        type="button"
                        aria-pressed={option.isSelected}
                        onClick={() => onSelect(option.vehicle.id)}
                        className={[
                            "rounded-[20px] border-2 p-3 text-left transition",
                            option.isSelected
                                ? "border-finn-accent-blue bg-finn-pale-blue"
                                : "border-finn-cotton bg-finn-snow hover:border-finn-iron/30",
                        ].join(" ")}
                    >
                        <img
                            src={option.vehicle.images.thumbnail}
                            alt=""
                            className="h-20 w-full rounded-xl object-cover"
                        />

                        <p className="mt-2 truncate text-xs font-black text-finn-black">
                            {option.vehicle.name}
                        </p>

                        {/*
                          * Rank, not "68/100". The score is a comparison
                          * artefact — a share of the equipment we happen to
                          * check — and printing it as a mark out of a hundred
                          * invites the reader to read it as a grade the data
                          * can't support.
                          */}
                        <p className="mt-0.5 text-[10px] font-bold text-finn-iron">
                            #{option.rank} of your pinned cars
                        </p>

                        <p
                            className={[
                                "mt-1 text-[11px] font-bold",
                                BUDGET_CLASS[option.budgetStatus],
                            ].join(" ")}
                        >
                            {formatEUR(option.totalMonthly)}/month
                            {option.budgetStatus === "over" &&
                            option.budgetDifference != null ? (
                                <>
                                    {" · "}
                                    {formatEUR(option.budgetDifference)} over
                                    budget
                                </>
                            ) : option.budgetStatus === "unknown" ? (
                                " · cost incomplete"
                            ) : option.costDifference != null &&
                              Math.abs(option.costDifference) >= 1 ? (
                                <>
                                    {" · "}
                                    {formatEUR(Math.abs(option.costDifference))}{" "}
                                    {option.costDifference > 0
                                        ? "more"
                                        : "less"}{" "}
                                    than {winnerName}
                                </>
                            ) : null}
                        </p>

                        {option.hook && (
                            <p className="mt-1.5 text-[11px] leading-4 text-finn-black">
                                {option.hook}
                            </p>
                        )}
                    </button>
                ))}
            </div>
        </section>
    );
}
