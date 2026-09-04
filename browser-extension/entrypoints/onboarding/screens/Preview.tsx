import { useMemo } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
    ArrowLeftIcon,
    ArrowTopRightOnSquareIcon,
    BeakerIcon,
} from "@heroicons/react/24/outline";

import {
    buildAdviceNarrative,
    buildRecommendation,
    formatEUR,
} from "@/lib/reasoning-engine";
import { CATEGORIES } from "@/lib/reasoning-engine/constants";
import type {
    CategoryId,
    FeatureSelection,
    LensPreferences,
} from "@/lib/reasoning-engine/types";
import type { PinnedFinnCar } from "@/lib/types";
import { configurationDetail, configurationName } from "@/lib/car-labels";
import { demoCars, demoCarSummary } from "@/lib/demo-cars";
import { FINN_BASE_URL } from "@/lib/constants";

import { AdviceHero } from "../../compare/steps/StepFourGenerateAdvice/components/AdviceHero";
import { AdviceSidebar } from "../../compare/steps/StepFourGenerateAdvice/components/AdviceSidebar";
import { BehindTheRecommendation } from "../../compare/steps/StepFourGenerateAdvice/components/BehindTheRecommendation";
import { CostAnalysis } from "../../compare/steps/StepFourGenerateAdvice/components/CostAnalysis";
import { Tradeoffs } from "../../compare/steps/StepFourGenerateAdvice/components/Tradeoffs";
import { WhyItWins } from "../../compare/steps/StepFourGenerateAdvice/components/WhyItWins";

/**
 * The last screen, where the reader sees the product rather than a
 * description of it.
 *
 * **This is the advice page, not a picture of it.** It imports the same
 * `AdviceHero`, `WhyItWins`, `Tradeoffs`, `CostAnalysis`,
 * `BehindTheRecommendation` and `AdviceSidebar` the real page renders, in the
 * same order, fed by the same `buildRecommendation` and `buildAdviceNarrative`
 * — over three example cars, against the order the reader set two screens
 * ago. Change a priority and this changes.
 *
 * That reuse is the whole design and it replaced a hand-built summary. The
 * summary showed the same *facts* in a different shape, which is the one
 * thing a preview must not do: a reader who is shown one layout here and
 * meets another on their first real comparison has been taught nothing, and
 * the moment that should feel like recognition feels like a second product.
 * Everything here is a component they will meet again.
 *
 * Short rather than different. The hot seat is the one thing left out — it is
 * an interaction rather than a reading, and it needs cars the reader chose —
 * and the page says so where it would have been.
 *
 * The cars are invented and labelled as such twice: once above the reading,
 * and once on each card in the line-up. That is the one thing here that must
 * not be quiet, because everything around it is real output and the reader
 * has no way to tell which parts are which unless we say so.
 */
export function Preview({
    priorities,
    preferences,
    categoryFeatures,
    saving,
    saveError,
    onBack,
    onEditPriorities,
    onFinish,
    onOpenCompare,
}: {
    priorities: CategoryId[];
    preferences: LensPreferences;
    categoryFeatures: Record<CategoryId, FeatureSelection>;
    /** True while the reader's answers are being written to storage. */
    saving: boolean;
    /** Set when that write failed, so the screen can stop claiming it worked. */
    saveError: boolean;
    onBack: () => void;
    /**
     * Back to the priority screen.
     *
     * The hero's own button says "Change priorities", so it has to go to the
     * priorities — `onBack` is one screen back, which is the driving
     * assumptions, and a button that goes somewhere other than its label is
     * worse than no button.
     */
    onEditPriorities: () => void;
    /** Finishes setup and sends the reader to finn.com to pin real cars. */
    onFinish: () => void;
    onOpenCompare: () => void;
}) {
    const cars = useMemo(() => demoCars(), []);

    /*
     * Rebuilt whenever the answers change rather than once, so a reader who
     * steps back to swap their top priority and returns sees a different
     * result — which is the point being demonstrated.
     */
    const result = useMemo(() => {
        const recommendation = buildRecommendation(
            cars,
            priorities,
            preferences,
            categoryFeatures,
        );

        if (!recommendation) return null;

        return {
            recommendation,
            narrative: buildAdviceNarrative(
                recommendation.evaluation,
                recommendation.context,
                recommendation.alternatives,
            ),
        };
    }, [cars, priorities, preferences, categoryFeatures]);

    const topPriority = priorities[0];

    return (
        <Tooltip.Provider delayDuration={350}>
            <div>
                <div className="text-center">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-finn-accent-blue">
                        You're set up
                    </p>

                    <h1 className="mx-auto mt-3 max-w-2xl text-3xl font-black leading-tight tracking-tight text-finn-black sm:text-4xl">
                        This is your advice page, with example cars
                    </h1>

                    <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-finn-iron">
                        Not a mock-up — the page below is the one you'll get
                        after pinning real cars, drawn by the same code and
                        judged against the order you just set
                        {topPriority
                            ? ` — led by ${CATEGORIES[topPriority]?.label ?? topPriority}`
                            : ""}
                        .
                    </p>
                </div>

                <div className="mt-6 flex items-start gap-2 rounded-[20px] bg-finn-warning/10 px-4 py-3 text-left">
                    <BeakerIcon className="mt-0.5 h-4 w-4 shrink-0 text-finn-warning" />

                    <p className="text-xs leading-5 text-finn-black">
                        <strong className="font-black">
                            Aveline, Norvane and Halden are not real
                            manufacturers.
                        </strong>{" "}
                        These three cars are examples: their prices, emissions
                        and equipment were written to demonstrate the
                        reasoning, and they are not FINN listings or offers.
                        Nothing here is pinned and nothing is saved to your
                        comparisons.
                    </p>
                </div>

                <LineUp cars={cars} winnerId={result?.recommendation.winner.id} />

                {result ? (
                    <>
                        {/*
                          * From here down, every component is imported from the
                          * advice page. Nothing is re-implemented, so nothing
                          * can drift into showing the reader a page that does
                          * not exist.
                          */}
                        <div className="mt-6">
                            <AdviceHero
                                evaluation={result.recommendation.evaluation}
                                narrative={result.narrative}
                                cost={
                                    result.recommendation.context.costs[
                                        result.recommendation.winner.id
                                    ]!
                                }
                                priorities={
                                    result.recommendation.context.priorities
                                }
                                isFallback={result.recommendation.isFallback}
                                onBack={onEditPriorities}
                            />
                        </div>

                        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                            <div className="space-y-6">
                                <WhyItWins
                                    narrative={result.narrative}
                                    subjectName={
                                        result.recommendation.winner.name
                                    }
                                />

                                <Tradeoffs
                                    tradeoffs={result.narrative.tradeoffs}
                                    isRecommendation
                                    subjectName={
                                        result.recommendation.winner.name
                                    }
                                />

                                <HotSeatPlaceholder
                                    alternatives={
                                        result.recommendation.alternatives
                                    }
                                />

                                <CostAnalysis
                                    analysis={
                                        result.recommendation.evaluation.cost
                                    }
                                    reasoning={result.narrative.cost}
                                />

                                <BehindTheRecommendation
                                    context={result.recommendation.context}
                                    recommendedId={
                                        result.recommendation.winner.id
                                    }
                                    selectedId={
                                        result.recommendation.winner.id
                                    }
                                    margin={result.narrative.verdict.margin}
                                    comparison={null}
                                    weights={
                                        result.recommendation.context.weights
                                    }
                                />
                            </div>

                            <AdviceSidebar
                                weights={result.recommendation.context.weights}
                                preferences={preferences}
                                onAdjustSettings={onBack}
                            />
                        </div>
                    </>
                ) : (
                    <p className="mt-4 rounded-[28px] bg-white p-6 text-center text-sm text-finn-iron shadow-sm">
                        Choose at least one priority and Lens can show you a
                        worked example here.
                    </p>
                )}

                {saveError && (
                    <p className="mt-6 rounded-2xl bg-finn-error/10 px-4 py-3 text-center text-xs font-bold text-finn-error">
                        Your answers couldn't be saved to browser storage. Lens
                        will fall back to its defaults — try setting your
                        priorities again from Settings.
                    </p>
                )}

                <div className="mt-8 flex flex-col items-center gap-3">
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <button
                            type="button"
                            onClick={onBack}
                            className="flex h-13 w-13 items-center justify-center rounded-full border-2 border-finn-cotton text-finn-iron transition hover:bg-white hover:text-finn-black"
                            aria-label="Back to your driving assumptions"
                        >
                            <ArrowLeftIcon className="h-5 w-5" />
                        </button>

                        <button
                            type="button"
                            onClick={onFinish}
                            disabled={saving}
                            className="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-finn-accent-blue px-8 text-sm font-black text-white shadow-md transition hover:bg-finn-highlight-navy disabled:cursor-wait disabled:bg-finn-cotton disabled:text-finn-iron"
                        >
                            {saving ? "Saving…" : "Go pin some real cars"}
                            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                        </button>

                        <button
                            type="button"
                            onClick={onOpenCompare}
                            disabled={saving}
                            className="inline-flex h-13 items-center justify-center rounded-full px-5 text-xs font-bold text-finn-iron underline-offset-2 transition hover:text-finn-black hover:underline disabled:cursor-wait"
                        >
                            Open FINN Lens instead
                        </button>
                    </div>

                    <p className="max-w-md text-center text-[11px] leading-4 text-finn-iron">
                        Pin two or more cars on{" "}
                        <span className="font-bold text-finn-black">
                            {FINN_BASE_URL.replace("https://www.", "")}
                        </span>{" "}
                        and you'll get this page about them. It won't ask you
                        any of this again.
                    </p>
                </div>
            </div>
        </Tooltip.Provider>
    );
}

/* -------------------------------------------------------------------------- */
/* The cars being reasoned about                                              */
/* -------------------------------------------------------------------------- */

/**
 * The three cars, before the page starts arguing about them.
 *
 * The reading below names cars constantly — "€282/month more than Lumo", "the
 * Estate has it" — and without having met them, the reader is following an
 * argument about strangers. This is the line-up they would otherwise have
 * built themselves by pinning: what each one is, what it costs, and the one
 * figure that makes it different from the other two.
 */
function LineUp({
    cars,
    winnerId,
}: {
    cars: PinnedFinnCar[];
    /** Marked, so the argument that follows starts from a known place. */
    winnerId?: number;
}) {
    return (
        <div className="mt-4">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-finn-iron">
                The three cars being compared
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
                {cars.map((car) => {
                    const winner = car.id === winnerId;

                    return (
                        <div
                            key={car.id}
                            className={[
                                "rounded-[22px] bg-white p-4",
                                winner
                                    ? "shadow-[0_0_0_2px] shadow-finn-accent-blue"
                                    : "shadow-sm",
                            ].join(" ")}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <p className="min-w-0 text-sm font-black text-finn-black">
                                    {car.name}
                                </p>

                                <span className="shrink-0 rounded-full bg-finn-cotton px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-finn-iron">
                                    Example
                                </span>
                            </div>

                            <p className="mt-0.5 text-[11px] font-bold text-finn-accent-blue">
                                {configurationName(car)}
                            </p>

                            <p className="mt-0.5 text-[11px] leading-4 text-finn-iron">
                                {configurationDetail(car)}
                            </p>

                            <p className="mt-2 text-[11px] leading-4 text-finn-iron">
                                {demoCarSummary(car.id)}
                            </p>

                            <dl className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-finn-cotton pt-2.5">
                                <Spec label="Boot" value={`${car.capacity.trunk} L`} />

                                <Spec
                                    label="CO₂"
                                    value={`${car.co2.value} g/km`}
                                />

                                {car.electric?.range !== undefined &&
                                car.electric?.range !== "Unknown" ? (
                                    <Spec
                                        label="Range"
                                        value={`${car.electric.range} km`}
                                    />
                                ) : (
                                    <Spec
                                        label="Uses"
                                        value={`${car.consumption.combined} ${
                                            car.consumption.unit ===
                                            "kWh/100Km"
                                                ? "kWh"
                                                : "L"
                                        }/100km`}
                                    />
                                )}
                            </dl>

                            <p className="mt-2.5 text-xs font-black text-finn-black">
                                {formatEUR(
                                    car.pricing.customerMonthly.price,
                                )}
                                <span className="font-bold text-finn-iron">
                                    /mo subscription
                                </span>
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function Spec({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0">
            <dt className="text-[9px] font-black uppercase tracking-wide text-finn-iron">
                {label}
            </dt>
            <dd className="text-[11px] font-bold text-finn-black">{value}</dd>
        </div>
    );
}

/**
 * Where the hot seat would be, said rather than drawn.
 *
 * The real page offers the four closest alternatives and will re-argue the
 * whole comparison against whichever the reader picks. Leaving it out
 * silently would make the preview quietly smaller than the thing; drawing a
 * picker that does nothing would be worse. So the section keeps its place in
 * the order and says what belongs there.
 */
function HotSeatPlaceholder({
    alternatives,
}: {
    alternatives: PinnedFinnCar[];
}) {
    if (alternatives.length === 0) return null;

    return (
        <section className="rounded-[28px] border border-dashed border-finn-cotton bg-white/60 p-6 sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-finn-iron">
                Not shown here
            </p>

            <h2 className="mt-2 text-xl font-black text-finn-black">
                Challenge the recommendation
            </h2>

            <p className="mt-2 max-w-xl text-xs leading-5 text-finn-iron">
                On the real page this is where the closest alternatives sit —{" "}
                {alternatives.map((car) => car.name).join(" and ")} here. Put
                one in the hot seat and Lens argues the whole comparison again
                from its side, head to head. It changes what is{" "}
                <em>examined</em>, never what is recommended.
            </p>
        </section>
    );
}
