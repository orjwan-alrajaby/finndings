import { ArrowTopRightOnSquareIcon, SparklesIcon } from "@heroicons/react/24/outline";
import type {
    CategoryId,
    CostBreakdown,
    VehicleEvaluation,
} from "@/lib/reasoning-engine/types";
import type { AdviceNarrative } from "@/lib/reasoning-engine/narrative";
import { formatEUR, getCategory } from "@/lib/reasoning-engine";

interface AdviceHeroProps {
    evaluation: VehicleEvaluation;
    narrative: AdviceNarrative;
    cost: CostBreakdown;
    priorities: CategoryId[];
    isFallback: boolean;
    onBack: () => void;
}

function determineSubtitle(
    equipmentLine: string | null,
    engine: string,
    trim: string,
) {
    if (!equipmentLine) return `${engine} ${trim}`;
    if (equipmentLine.length <= 10) return `${equipmentLine} ${trim}`;

    return equipmentLine;
}

/**
 * The recommendation itself. Always the recommended car, never the hot-seat
 * selection — the two are separate concepts and the hero owns the first one.
 */
export function AdviceHero({
    evaluation,
    narrative,
    cost,
    priorities,
    isFallback,
    onBack,
}: AdviceHeroProps) {
    const winner = evaluation.vehicle;

    /*
     * The headline is the reason, not the score. The score is still on the
     * card to the right for anyone who wants it — it just isn't the argument.
     */
    const headline = narrative.verdict.headline;

    /* The most consequential thing the reader is accepting in exchange. */
    const tradeoff = narrative.tradeoffs[0];

    return (
        <section className="overflow-hidden rounded-[30px] bg-finn-highlight-navy text-white shadow-xl">
            <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,.9fr)]">
                <div className="p-6 sm:p-8 lg:p-10">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold ring-1 ring-white/10">
                        <SparklesIcon className="h-4 w-4 text-finn-accent-blue" />
                        {isFallback
                            ? "Strongest match — over budget"
                            : "Strongest match"}
                    </div>

                    <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
                        {winner.name}
                    </h2>

                    <p className="mt-1 text-sm text-white/60">
                        {determineSubtitle(
                            winner.equipmentLine,
                            winner.engine,
                            winner.trim ?? "",
                        )}
                    </p>

                    <p className="mt-1 text-sm text-white/60">
                        {winner.vehicleType} · {winner.year}
                    </p>

                    <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-white/90">
                        {headline}
                    </p>

                    {tradeoff && (
                        <div className="mt-3 max-w-2xl rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/60">
                                What you're accepting in exchange
                            </p>

                            <p className="mt-1.5 text-sm leading-6 text-white/85">
                                {tradeoff.sentences[0]}
                            </p>
                        </div>
                    )}

                    <div className="mt-6 flex flex-wrap gap-2">
                        {priorities.slice(0, 3).map((priority, index) => (
                            <span
                                key={priority}
                                className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold ring-1 ring-white/10"
                            >
                                #{index + 1} {getCategory(priority)?.label ?? priority}
                            </span>
                        ))}
                    </div>

                    <div className="mt-7 flex flex-wrap items-center gap-3">
                        <a
                            href={winner.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-xs font-black text-finn-highlight-navy shadow-sm transition hover:bg-finn-snow"
                        >
                            View this car on FINN
                            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                        </a>

                        <button
                            type="button"
                            onClick={onBack}
                            className="rounded-full bg-white/10 px-5 py-3 text-xs font-bold text-white ring-1 ring-white/15 hover:bg-white/15"
                        >
                            Change priorities
                        </button>
                    </div>
                </div>

                <div className="relative min-h-64 bg-finn-accent-blue/40 lg:min-h-full">
                    <img
                        src={winner.images.thumbnail}
                        alt={winner.name}
                        className="absolute inset-0 h-full w-full object-cover"
                    />

                    <div className="absolute inset-0 bg-linear-to-t from-finn-highlight-navy via-finn-highlight-navy/20 to-transparent" />

                    <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-white/10 p-4 backdrop-blur-md ring-1 ring-white/15">
                        <div className="flex items-end justify-between gap-4">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                                    {cost.complete
                                        ? "Estimated monthly"
                                        : "Estimated monthly (partial)"}
                                </p>

                                <p className="mt-1 text-2xl font-black">
                                    {formatEUR(cost.totalMonthly)}
                                </p>

                                {cost.budget != null && (
                                    <p className="mt-0.5 text-[10px] font-bold text-white/60">
                                        budget {formatEUR(cost.budget)}
                                    </p>
                                )}
                            </div>

                            <div className="text-right">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                                    Match
                                </p>

                                <p className="mt-1 text-2xl font-black">
                                    {evaluation.score.total}/100
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
