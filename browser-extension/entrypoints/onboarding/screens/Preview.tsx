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
    formatEUR,
} from "@/lib/reasoning-engine";
import { CATEGORIES } from "@/lib/reasoning-engine/constants";
import type {
    CategoryId,
    FeatureSelection,
    LensPreferences,
    Recommendation,
} from "@/lib/reasoning-engine/types";
import type { AdviceNarrative } from "@/lib/reasoning-engine/narrative/types";
import { configurationDetail, configurationName } from "@/lib/car-labels";
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
 * **It shows the working, not just the answer.** It used to show a headline,
 * two reasons and a cost — which is a summary of the thing rather than the
 * thing, and summarises away exactly what makes this product different from
 * a filter with a sort order. The reader now sees the ranking it produced,
 * the priorities it walked in their own order with what the winner does about
 * each, the compromise named against the car that would have avoided it, and
 * the cost taken apart into the three numbers it is made of. Every one of
 * those comes off the same `AdviceNarrative` the real page renders; nothing
 * here is written for the demo.
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
        const recommendation = buildRecommendation(
            demoCars(),
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
                    Everything below was produced by the real engine, against
                    the order you just set
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
                        Aveline, Norvane and Halden are not real manufacturers.
                    </strong>{" "}
                    These three cars are examples: their prices, emissions and
                    equipment were written to demonstrate the reasoning, and
                    they are not FINN listings or offers. Nothing here is
                    pinned and nothing is saved to your comparisons.
                </p>
            </div>

            {result ? (
                <Advice
                    recommendation={result.recommendation}
                    narrative={result.narrative}
                />
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

/* -------------------------------------------------------------------------- */
/* The advice, in miniature                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The same six questions the real advice page answers, in the same order.
 *
 * Which car, why, how it does on each thing you said mattered, what you give
 * up, what it costs, and how the rest placed. Shorter than the real page and
 * not different from it.
 */
function Advice({
    recommendation,
    narrative,
}: {
    recommendation: Recommendation;
    narrative: AdviceNarrative;
}) {
    const { winner } = recommendation;

    return (
        <section className="mt-4 overflow-hidden rounded-[28px] bg-white shadow-sm">
            <header className="bg-finn-black px-6 py-5 text-white">
                <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/60">
                    <CheckBadgeIcon className="h-4 w-4" />
                    The recommendation
                </p>

                <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
                    <div className="min-w-0">
                        <h2 className="text-xl font-black leading-snug sm:text-2xl">
                            {narrative.verdict.headline}
                        </h2>

                        <p className="mt-1.5 text-xs font-bold text-white/70">
                            {winner.name} · {configurationName(winner)}
                        </p>

                        <p className="mt-0.5 text-[11px] text-white/50">
                            {configurationDetail(winner)}
                        </p>

                        <p className="mt-2 text-[11px] leading-4 text-white/60">
                            {demoCarSummary(winner.id)}
                        </p>
                    </div>

                    <div className="shrink-0 text-right">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/50">
                            All in, per month
                        </p>

                        <p className="text-2xl font-black leading-tight">
                            {formatEUR(Math.round(narrative.cost.subject.total))}
                        </p>
                    </div>
                </div>

                {narrative.verdict.marginNote && (
                    <p className="mt-3 border-t border-white/15 pt-3 text-[11px] leading-4 text-white/60">
                        {narrative.verdict.marginNote}
                    </p>
                )}
            </header>

            <div className="grid gap-px bg-finn-cotton md:grid-cols-2">
                <Panel title="Why this one">
                    {narrative.verdict.reasons.length > 0 ? (
                        <ul className="space-y-2.5">
                            {narrative.verdict.reasons
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
                        <p className="text-xs leading-5 text-finn-iron">
                            On this order the three cars are close enough that
                            nothing separates them worth stating — which Lens
                            says rather than inventing a reason.
                        </p>
                    )}
                </Panel>

                <Panel
                    title="What you'd give up"
                    icon={
                        <ExclamationTriangleIcon className="h-3.5 w-3.5" />
                    }
                >
                    {narrative.tradeoffs.length > 0 ? (
                        <div className="space-y-2.5">
                            {narrative.tradeoffs
                                .slice(0, 2)
                                .map((tradeoff) => (
                                    <div
                                        key={tradeoff.headline}
                                        className="rounded-2xl bg-finn-snow px-3.5 py-2.5"
                                    >
                                        <p className="text-xs font-black text-finn-black">
                                            {tradeoff.headline}
                                        </p>

                                        <p className="mt-1 text-[11px] leading-4 text-finn-iron">
                                            {tradeoff.evidence}
                                        </p>

                                        <p className="mt-1 text-[11px] leading-4 text-finn-iron">
                                            {tradeoff.relevance}
                                        </p>
                                    </div>
                                ))}
                        </div>
                    ) : (
                        <p className="text-xs leading-5 text-finn-iron">
                            Nothing worth naming — on this order the winner
                            gives up nothing the others offer.
                        </p>
                    )}
                </Panel>

                <Panel title="Priority by priority, in your order">
                    <ol className="space-y-2">
                        {narrative.priorities.slice(0, 4).map((priority) => (
                            <li
                                key={priority.priority}
                                className="flex items-start gap-2.5"
                            >
                                <span
                                    aria-hidden="true"
                                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-finn-pale-blue text-xs"
                                >
                                    {priority.icon}
                                </span>

                                <span className="min-w-0 flex-1">
                                    <span className="flex flex-wrap items-baseline gap-x-2">
                                        <span className="text-xs font-black text-finn-black">
                                            #{priority.rank} {priority.label}
                                        </span>

                                        <span className="text-[10px] font-bold text-finn-iron">
                                            {priority.weightPercent}% of the
                                            result
                                        </span>
                                    </span>

                                    <span className="mt-0.5 block text-[11px] leading-4 text-finn-iron">
                                        {priority.sentences[0] ??
                                            "FINN's data doesn't say enough about this one to judge it."}
                                    </span>
                                </span>
                            </li>
                        ))}
                    </ol>
                </Panel>

                <Panel title="What it actually costs">
                    <div className="space-y-1.5">
                        {narrative.cost.subject.subscription != null && (
                            <CostLine
                                label="FINN subscription"
                                amount={narrative.cost.subject.subscription}
                            />
                        )}

                        {narrative.cost.subject.energy != null && (
                            <CostLine
                                label="Estimated energy"
                                amount={narrative.cost.subject.energy}
                            />
                        )}

                        {narrative.cost.subject.excessMileage != null && (
                            <CostLine
                                label="Estimated extra mileage"
                                amount={narrative.cost.subject.excessMileage}
                            />
                        )}

                        <div className="flex items-baseline justify-between border-t border-finn-cotton pt-2">
                            <span className="text-xs font-black text-finn-black">
                                Per month
                            </span>

                            <span className="text-xs font-black text-finn-black">
                                {formatEUR(
                                    Math.round(narrative.cost.subject.total),
                                )}
                            </span>
                        </div>
                    </div>

                    <p className="mt-2 text-[11px] leading-4 text-finn-iron">
                        At {narrative.cost.monthlyKm} km a month, on the fuel
                        and electricity prices you gave.
                    </p>
                </Panel>
            </div>

            <Ranking recommendation={recommendation} />

            <p className="border-t border-finn-cotton px-6 py-4 text-center text-[11px] leading-4 text-finn-iron">
                The real advice page says more again — every priority in full,
                the equipment behind each verdict, and four close alternatives
                you can put in a hot seat against the winner.
            </p>
        </section>
    );
}

function Panel({
    title,
    icon,
    children,
}: {
    title: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-white p-5">
            <p className="mb-3 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-finn-iron">
                {icon}
                {title}
            </p>

            {children}
        </div>
    );
}

function CostLine({ label, amount }: { label: string; amount: number }) {
    return (
        <div className="flex items-baseline justify-between gap-3">
            <span className="text-[11px] text-finn-iron">{label}</span>

            <span className="shrink-0 text-[11px] font-bold text-finn-black">
                {formatEUR(Math.round(amount))}
            </span>
        </div>
    );
}

/**
 * Where the other cars came out, and by how much.
 *
 * The thing a headline cannot show: that this was a comparison rather than a
 * pick. Bars are relative to the leader, so the reader sees a close call as
 * close and a rout as a rout — the number alone reads the same either way.
 */
function Ranking({ recommendation }: { recommendation: Recommendation }) {
    const rows = recommendation.ranked.map((car) => {
        const score =
            recommendation.scores.find((item) => item.vehicleId === car.id)
                ?.total ?? 0;

        return {
            car,
            score,
            cost: recommendation.context.costs[car.id]?.totalMonthly ?? null,
        };
    });

    const best = Math.max(...rows.map((row) => row.score), 1);

    return (
        <div className="border-t border-finn-cotton p-5">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.14em] text-finn-iron">
                How all three placed
            </p>

            <ol className="space-y-2.5">
                {rows.map((row, index) => {
                    const winner = row.car.id === recommendation.winner.id;

                    return (
                        <li key={row.car.id} className="flex items-center gap-3">
                            <span
                                className={[
                                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black",
                                    winner
                                        ? "bg-finn-accent-blue text-white"
                                        : "bg-finn-snow text-finn-iron",
                                ].join(" ")}
                            >
                                {index + 1}
                            </span>

                            <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                                    <span className="truncate text-xs font-bold text-finn-black">
                                        {row.car.name}

                                        <span className="ml-1.5 rounded-full bg-finn-cotton px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-finn-iron">
                                            Example
                                        </span>
                                    </span>

                                    <span className="shrink-0 text-[11px] font-bold text-finn-iron">
                                        {row.cost != null
                                            ? `${formatEUR(Math.round(row.cost))}/mo`
                                            : "cost unknown"}
                                    </span>
                                </span>

                                <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-finn-snow">
                                    <span
                                        className={[
                                            "block h-full rounded-full",
                                            winner
                                                ? "bg-finn-accent-blue"
                                                : "bg-finn-iron/30",
                                        ].join(" ")}
                                        style={{
                                            width: `${Math.round((row.score / best) * 100)}%`,
                                        }}
                                    />
                                </span>
                            </span>
                        </li>
                    );
                })}
            </ol>

        </div>
    );
}
