import { useMemo } from "react";
import {
    ArrowLeftIcon,
    ArrowTopRightOnSquareIcon,
    BeakerIcon,
    CheckBadgeIcon,
    ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

import {
    buildAdviceNarrative,
    buildRecommendation,
} from "@/lib/reasoning-engine";
import { CATEGORIES } from "@/lib/reasoning-engine/constants";
import type {
    CategoryId,
    FeatureSelection,
    LensPreferences,
} from "@/lib/reasoning-engine/types";
import { demoCars, demoCarSummary } from "@/lib/demo-cars";
import { FINN_BASE_URL } from "@/lib/constants";

/**
 * The last screen, where the reader sees the product rather than a
 * description of it.
 *
 * Everything above this is a claim: Lens will rank your cars and explain the
 * result. This runs the actual engine — the same `buildRecommendation` and
 * the same narrative layer the advice page uses — over three example cars,
 * against the order the reader set two screens ago, and shows what it says.
 * No mock copy, no screenshot: change the priorities and this changes.
 *
 * The cars are invented and labelled as such on the screen. That is the one
 * thing here that must not be quiet, because everything around it is real
 * output and the reader has no way to tell which parts are which unless we
 * say so.
 */
export function Preview({
    priorities,
    preferences,
    categoryFeatures,
    saving,
    saveError,
    onBack,
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
    /** Finishes setup and sends the reader to finn.com to pin real cars. */
    onFinish: () => void;
    onOpenCompare: () => void;
}) {
    /*
     * Rebuilt whenever the answers change rather than once, so a reader who
     * steps back to swap their top priority and returns sees a different
     * result — which is the point being demonstrated.
     */
    const result = useMemo(() => {
        const cars = demoCars();

        const recommendation = buildRecommendation(
            cars,
            priorities,
            preferences,
            categoryFeatures,
        );

        if (!recommendation) return null;

        return buildAdviceNarrative(
            recommendation.evaluation,
            recommendation.context,
            recommendation.alternatives,
        );
    }, [priorities, preferences, categoryFeatures]);

    const topPriority = priorities[0];

    return (
        <div>
            <div className="text-center">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-finn-accent-blue">
                    You're set up
                </p>

                <h1 className="mx-auto mt-3 max-w-2xl text-3xl font-black leading-tight tracking-tight text-finn-black sm:text-4xl">
                    This is what Lens will do with real cars
                </h1>

                <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-finn-iron">
                    Below is a real recommendation, produced by the real
                    engine, against the order you just set
                    {topPriority
                        ? ` — led by ${CATEGORIES[topPriority]?.label ?? topPriority}`
                        : ""}
                    . Only the three cars are made up.
                </p>
            </div>

            <div className="mt-6 flex items-start gap-2 rounded-[20px] bg-finn-warning/10 px-4 py-3 text-left">
                <BeakerIcon className="mt-0.5 h-4 w-4 shrink-0 text-finn-warning" />

                <p className="text-xs leading-5 text-finn-black">
                    <strong className="font-black">
                        These three cars are examples and do not exist.
                    </strong>{" "}
                    Their prices, emissions and equipment were written to
                    demonstrate the reasoning, and they are not FINN listings
                    or offers. Nothing here is pinned and nothing is saved to
                    your comparisons.
                </p>
            </div>

            {result ? (
                <section className="mt-4 overflow-hidden rounded-[28px] bg-white shadow-sm">
                    <div className="bg-finn-black px-6 py-5 text-white">
                        <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/60">
                            <CheckBadgeIcon className="h-4 w-4" />
                            The recommendation
                        </p>

                        <h2 className="mt-2 text-xl font-black leading-snug sm:text-2xl">
                            {result.verdict.headline}
                        </h2>

                        <p className="mt-1.5 text-xs text-white/60">
                            {demoCarSummary(result.vehicle.id)}
                        </p>
                    </div>

                    <div className="grid gap-5 p-6 md:grid-cols-2">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.14em] text-finn-accent-blue">
                                Why this one
                            </p>

                            {result.verdict.reasons.length > 0 ? (
                                <ul className="mt-3 space-y-2.5">
                                    {result.verdict.reasons
                                        .slice(0, 3)
                                        .map((reason) => (
                                            <li
                                                key={reason}
                                                className="flex gap-2 text-xs leading-5 text-finn-black"
                                            >
                                                <span
                                                    aria-hidden="true"
                                                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-finn-accent-blue"
                                                />
                                                {reason}
                                            </li>
                                        ))}
                                </ul>
                            ) : (
                                <p className="mt-3 text-xs leading-5 text-finn-iron">
                                    On this order the three cars are close
                                    enough that nothing separates them worth
                                    stating — which Lens says rather than
                                    inventing a reason.
                                </p>
                            )}
                        </div>

                        <div>
                            <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.14em] text-finn-iron">
                                <ExclamationTriangleIcon className="h-3.5 w-3.5" />
                                What you'd give up
                            </p>

                            {result.tradeoffs.length > 0 ? (
                                <ul className="mt-3 space-y-3">
                                    {result.tradeoffs
                                        .slice(0, 2)
                                        .map((tradeoff) => (
                                            <li
                                                key={tradeoff.headline}
                                                className="rounded-2xl bg-finn-snow px-4 py-3"
                                            >
                                                <p className="text-xs font-black text-finn-black">
                                                    {tradeoff.headline}
                                                </p>

                                                <p className="mt-1 text-[11px] leading-4 text-finn-iron">
                                                    {tradeoff.evidence}
                                                </p>
                                            </li>
                                        ))}
                                </ul>
                            ) : (
                                <p className="mt-3 text-xs leading-5 text-finn-iron">
                                    Nothing worth naming — on this order the
                                    winner gives up nothing the others offer.
                                </p>
                            )}

                            <p className="mt-3 rounded-2xl bg-finn-pale-blue px-4 py-3 text-[11px] leading-4 text-finn-highlight-navy">
                                <strong className="font-black">
                                    Estimated €
                                    {Math.round(result.cost.subject.total)} a
                                    month
                                </strong>{" "}
                                — subscription plus energy plus any mileage
                                over FINN's allowance, at{" "}
                                {result.cost.monthlyKm} km a month.
                            </p>
                        </div>
                    </div>

                    <p className="border-t border-finn-cotton px-6 py-4 text-center text-[11px] leading-4 text-finn-iron">
                        The real advice page says considerably more than this —
                        every priority in turn, the full cost breakdown, the
                        ranking behind it, and four alternatives you can put up
                        against the winner.
                    </p>
                </section>
            ) : (
                <p className="mt-4 rounded-[28px] bg-white p-6 text-center text-sm text-finn-iron shadow-sm">
                    Choose at least one priority and Lens can show you a
                    worked example here.
                </p>
            )}

            {saveError && (
                <p className="mt-4 rounded-2xl bg-finn-error/10 px-4 py-3 text-center text-xs font-bold text-finn-error">
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
                    and Lens will rank them the moment you open it. It won't
                    ask you any of this again.
                </p>
            </div>
        </div>
    );
}
