import { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import type {
    HeadToHead,
    PriorityWeight,
    ReasoningContext,
} from "@/lib/reasoning-engine/types";
import type { Verdict } from "@/lib/reasoning-engine/narrative";
import { getCategory } from "@/lib/reasoning-engine";
import { RecommendationRanking } from "./RecommendationRanking";

/**
 * The evidence, for a reader who wants to check the result rather than take
 * it on trust.
 *
 * This is where the arithmetic lives — the weighting, the category scores,
 * the full ranking including cars that were never in contention. It is
 * collapsed by default and kept out of the reasoning above on purpose: the
 * numbers are what produced the recommendation, but they are not the
 * explanation of it.
 */
export function BehindTheRecommendation({
    context,
    recommendedId,
    selectedId,
    margin,
    comparison,
    weights,
}: {
    context: ReasoningContext;
    recommendedId: number;
    selectedId: number;
    margin: Verdict["margin"];
    /** Present only while a car is in the hot seat. */
    comparison: HeadToHead | null;
    weights: PriorityWeight[];
}) {
    const [open, setOpen] = useState(false);

    return (
        <section className="rounded-[28px] bg-white p-6 shadow-sm sm:p-8">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="flex w-full items-center justify-between gap-4 text-left"
            >
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-finn-iron">
                        Behind the recommendation
                    </p>

                    <h2 className="mt-2 text-2xl font-black">
                        The numbers, if you want to check them.
                    </h2>

                    <p className="mt-1 text-sm text-finn-iron">
                        How each priority was weighted, what every pinned car
                        scored, and where the gaps came from.
                    </p>
                </div>

                {open ? (
                    <ChevronUpIcon className="h-6 w-6 shrink-0 text-finn-iron" />
                ) : (
                    <ChevronDownIcon className="h-6 w-6 shrink-0 text-finn-iron" />
                )}
            </button>

            {open && (
                <div className="mt-6 space-y-8">
                    <Weighting weights={weights} />

                    {comparison && <ContributionTable comparison={comparison} />}

                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-finn-iron">
                            Every pinned car, by overall match
                        </p>

                        <RecommendationRanking
                            context={context}
                            recommendedId={recommendedId}
                            selectedId={selectedId}
                            margin={margin}
                        />
                    </div>
                </div>
            )}
        </section>
    );
}

/**
 * How the priority order became weights.
 *
 * Stated once, here, rather than repeated as a percentage beside every
 * priority heading — which is what turned the reasoning above into a score
 * report.
 */
function Weighting({ weights }: { weights: PriorityWeight[] }) {
    return (
        <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-finn-iron">
                How your order was weighted
            </p>

            <p className="mt-1.5 text-sm leading-6 text-finn-iron">
                Each priority's share of a car's overall match is decided by
                where you put it. Your budget is not in here — it decides which
                cars are eligible to win and never changes a score.
            </p>

            <p className="mt-1.5 text-sm leading-6 text-finn-iron">
                A category score is the share of the equipment we check for
                that priority which the car actually has, blended with any
                measurement it has. It ranks these cars against each other —
                it isn't a mark out of a hundred, and a low one usually means
                the category covers a lot of equipment few cars carry.
            </p>

            <div className="mt-3 space-y-1.5">
                {weights.map((weight) => (
                    <div
                        key={weight.priority}
                        className="flex items-center gap-3"
                    >
                        <span className="w-6 shrink-0 text-center text-xs font-black text-finn-iron">
                            #{weight.rank}
                        </span>

                        <span className="min-w-0 flex-1 truncate text-xs font-bold text-finn-black">
                            {getCategory(weight.priority)?.label ??
                                weight.priority}
                        </span>

                        <div className="h-1.5 w-32 shrink-0 overflow-hidden rounded-full bg-finn-cotton">
                            <div
                                className="h-full rounded-full bg-finn-accent-blue"
                                style={{
                                    width: `${Math.min(100, weight.weightPercent * 2.5)}%`,
                                }}
                            />
                        </div>

                        <span className="w-10 shrink-0 text-right font-mono text-xs font-black text-finn-black">
                            {weight.weightPercent}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/** The full weighted arithmetic behind the head-to-head in the hot seat. */
function ContributionTable({ comparison }: { comparison: HeadToHead }) {
    return (
        <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-finn-iron">
                {comparison.subject.name} vs {comparison.other.name}, priority
                by priority
            </p>

            <p className="mt-1.5 text-sm leading-6 text-finn-iron">
                {comparison.summary}
            </p>

            <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-xs">
                    <thead>
                        <tr className="text-finn-iron">
                            <th className="pb-2 font-black">Priority</th>
                            <th className="pb-2 text-right font-black">
                                Weight
                            </th>
                            <th className="pb-2 text-right font-black">
                                {comparison.subject.name.split(" ")[0]}
                            </th>
                            <th className="pb-2 text-right font-black">
                                {comparison.other.name.split(" ")[0]}
                            </th>
                            <th className="pb-2 text-right font-black">Swing</th>
                        </tr>
                    </thead>

                    <tbody>
                        {comparison.categories.map((item) => {
                            const swing = item.versus?.weightedDifference ?? 0;

                            return (
                                <tr
                                    key={item.priority}
                                    className="border-t border-finn-cotton"
                                >
                                    <td className="py-2 font-bold text-finn-black">
                                        #{item.rank} {item.label}
                                    </td>
                                    <td className="py-2 text-right text-finn-iron">
                                        {item.weightPercent}%
                                    </td>
                                    <td className="py-2 text-right font-mono font-bold text-finn-black">
                                        {item.score}
                                    </td>
                                    <td className="py-2 text-right font-mono text-finn-iron">
                                        {item.versus?.score ?? "—"}
                                    </td>
                                    <td
                                        className={[
                                            "py-2 text-right font-mono font-black",
                                            swing > 0
                                                ? "text-finn-accent-blue"
                                                : swing < 0
                                                  ? "text-finn-warning"
                                                  : "text-finn-iron",
                                        ].join(" ")}
                                    >
                                        {swing > 0 ? "+" : ""}
                                        {swing.toFixed(1)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>

                    <tfoot>
                        <tr className="border-t-2 border-finn-cotton">
                            <td
                                className="py-2 font-black text-finn-black"
                                colSpan={2}
                            >
                                Overall
                            </td>
                            <td className="py-2 text-right font-mono font-black text-finn-black">
                                {comparison.subject.total}
                            </td>
                            <td className="py-2 text-right font-mono font-black text-finn-iron">
                                {comparison.other.total}
                            </td>
                            <td className="py-2 text-right font-mono font-black text-finn-black">
                                {comparison.totalDifference > 0 ? "+" : ""}
                                {comparison.totalDifference}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
