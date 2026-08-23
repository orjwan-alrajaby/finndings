import { ArrowTopRightOnSquareIcon, SparklesIcon } from "@heroicons/react/24/outline";
import type { PinnedFinnCar } from "@/lib/types";
import type { CategoryId, LensPreferences, VehicleScore } from "@/lib/reasoning-engine/types";
import { CATEGORIES } from "@/lib/reasoning-engine/constants";
import { calculateCost } from "@/lib/reasoning-engine";

interface AdviceHeroProps {
    winner: PinnedFinnCar;
    score: VehicleScore;
    priorities: CategoryId[];
    preferences: LensPreferences;
    onBack: () => void;
}

function money(value: number) {
    return `€${Math.round(value).toLocaleString("de-DE")}`;
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

export function AdviceHero({
    winner,
    score,
    priorities,
    preferences,
    onBack,
}: AdviceHeroProps) {
    const winnerCost = calculateCost(winner, preferences);

    return (
        <section className="overflow-hidden rounded-[30px] bg-finn-highlight-navy text-white shadow-xl">
            <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,.9fr)]">
                <div className="p-6 sm:p-8 lg:p-10">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold ring-1 ring-white/10">
                        <SparklesIcon className="h-4 w-4 text-finn-accent-blue" />
                        Strongest match
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
                        According to your priorities, {winner.name} is your
                        strongest match.
                    </p>

                    <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
                        It wins because the things you put at the top of the
                        list carry the most weight. It is not pretending to be
                        the best at everything.
                    </p>

                    <div className="mt-6 flex flex-wrap gap-2">
                        {priorities.slice(0, 3).map((priority, index) => (
                            <span
                                key={priority}
                                className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold ring-1 ring-white/10"
                            >
                                #{index + 1} {CATEGORIES[priority].label}
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
                                    Estimated monthly
                                </p>

                                <p className="mt-1 text-2xl font-black">
                                    {money(winnerCost.totalMonthly)}
                                </p>
                            </div>

                            <div className="text-right">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                                    Match
                                </p>

                                <p className="mt-1 text-2xl font-black">
                                    {score.total}/100
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}