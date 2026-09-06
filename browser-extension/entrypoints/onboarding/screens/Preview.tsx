import { useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    ArrowLeft01Icon,
    ExternalLinkIcon,
    FlaskConicalIcon,
    ScaleIcon,
    SparklesIcon,
} from "@hugeicons/core-free-icons";

import { PriorityIcon } from "@/components/PriorityIcon";

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
import type { PinnedFinnCar } from "@/lib/types";
import { configurationDetail, configurationName } from "@/lib/car-labels";
import { demoCars, demoCarSummary } from "@/lib/demo-cars";
import { FinnLink } from "@/components/FinnLink";

/**
 * The last screen: the advice page in miniature.
 *
 * Three attempts got this wrong in two opposite directions, and both
 * failures are worth naming because the fix is the line between them.
 *
 * First it was a summary in a shape of its own — the same facts, differently
 * arranged. A reader shown one layout here and another on their first real
 * comparison has been taught nothing, and the moment that should feel like
 * recognition feels like meeting a second product.
 *
 * Then it imported the advice page's own components wholesale, which made it
 * the advice page rather than a preview of one: a full hero with a photo
 * panel, every priority expanded with its equipment chips, a sidebar of
 * assumptions. Correct, recognisable, and far too much to meet before you
 * have pinned anything.
 *
 * Then it was cut too hard the other way — two bullet reasons and one
 * tradeoff — which is recognisable and says nothing. The panel it lost was
 * the priority-by-priority walk, and that is the one the whole product turns
 * on: a reader who cannot see Lens take their order apart, item by item, has
 * been shown a ranking with a caption.
 *
 * Where it landed: the real page's sections, in the real page's order, under
 * the real page's own eyebrows — "Why it wins", "The other side of it",
 * "Priority by priority" and "Cost analysis" — laid out two across, each
 * carrying enough of its content to argue rather than label. Recognition comes from the shape and the wording; the restraint is
 * in the depth of each panel, not in which of them survive. What is genuinely
 * not here — the equipment chips under each priority, the hot seat, the
 * weight table — is named at the end, so the preview reads as a subset and
 * the real page still has somewhere to go.
 *
 * Every sentence is `AdviceNarrative`. Nothing here is written for the demo.
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
    /** The hero's own "Change priorities" has to go to the priorities. */
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
        <div>
            <div className="text-center">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-finn-accent-blue">
                    You're set up
                </p>

                <h1 className="mx-auto mt-3 max-w-2xl text-3xl font-black leading-tight tracking-tight text-finn-black sm:text-4xl">
                    A preview of the advice you'll get
                </h1>

                <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-finn-iron">
                    The real engine, run over three example cars, judged
                    against the order you just set
                    {topPriority
                        ? ` — led by ${CATEGORIES[topPriority]?.label ?? topPriority}`
                        : ""}
                    . This is the shape of the page you'll get — the real one
                    goes deeper on every part of it.
                </p>
            </div>

            <div className="mt-6 flex items-start gap-2 rounded-[20px] bg-finn-warning/10 px-4 py-3 text-left">
                <HugeiconsIcon icon={FlaskConicalIcon} className="mt-0.5 h-4 w-4 shrink-0 text-finn-warning" />

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

            <LineUp cars={cars} winnerId={result?.recommendation.winner.id} />

            {result ? (
                <MiniAdvice
                    recommendation={result.recommendation}
                    narrative={result.narrative}
                    onEditPriorities={onEditPriorities}
                />
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
                        <HugeiconsIcon icon={ArrowLeft01Icon} className="h-5 w-5" />
                    </button>

                    <button
                        type="button"
                        onClick={onFinish}
                        disabled={saving}
                        className="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-finn-accent-blue px-8 text-sm font-black text-white shadow-md transition hover:bg-finn-highlight-navy disabled:cursor-wait disabled:bg-finn-cotton disabled:text-finn-iron"
                    >
                        {saving ? "Saving…" : "Go pin some real cars"}
                        <HugeiconsIcon icon={ExternalLinkIcon} className="h-4 w-4" />
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
                    Pin two or more cars on <FinnLink /> and you'll get this
                    page about them. It won't ask you any of this again.
                </p>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* The advice, abbreviated                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The real page's sections, in its order, showing the top of each.
 *
 * The eyebrow on every block is the one the real page uses, word for word.
 * That is what does the work: a reader arriving at their first comparison
 * meets headings they have already read, in the order they already read
 * them, and the page is legible before they have looked at it.
 */
function MiniAdvice({
    recommendation,
    narrative,
    onEditPriorities,
}: {
    recommendation: Recommendation;
    narrative: AdviceNarrative;
    onEditPriorities: () => void;
}) {
    const { winner } = recommendation;
    const cost = recommendation.context.costs[winner.id];

    return (
        <div className="mt-4 space-y-3">
            {/*
              * The hero, without the photo panel, the priority chip row or
              * the two buttons. What survives is what it is for: which car,
              * in one sentence, and what it costs a month.
              */}
            <section className="overflow-hidden rounded-3xl bg-finn-highlight-navy text-white">
                <div className="flex flex-wrap items-end justify-between gap-4 p-5 sm:p-6">
                    <div className="min-w-0">
                        <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/80">
                            <HugeiconsIcon icon={SparklesIcon} className="h-3 w-3" />
                            Your recommendation
                        </p>

                        <h2 className="mt-2.5 text-2xl font-black leading-tight">
                            {winner.name}
                        </h2>

                        <p className="text-[11px] font-bold text-white/60">
                            {configurationName(winner)}
                        </p>

                        <p className="mt-2.5 max-w-lg text-[13px] font-bold leading-5 text-white/90">
                            {narrative.verdict.headline}
                        </p>

                        <p className="mt-1.5 max-w-lg text-[11px] leading-4 text-white/55">
                            {demoCarSummary(winner.id)}
                        </p>

                        {/*
                          * The order it was judged on, said on the answer
                          * rather than only above it — the real hero does the
                          * same, and it is what stops "strongest match"
                          * reading as an opinion about the car.
                          */}
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {recommendation.context.priorities.map(
                                (id, index) => (
                                    <span
                                        key={id}
                                        className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white/80"
                                    >
                                        #{index + 1}{" "}
                                        {CATEGORIES[id]?.label ?? id}
                                    </span>
                                ),
                            )}
                        </div>
                    </div>

                    <div className="shrink-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/50">
                            Estimated total per month
                        </p>

                        <p className="text-3xl font-black leading-tight">
                            {formatEUR(cost?.totalMonthly ?? 0)}
                        </p>
                    </div>
                </div>
            </section>

            <div className="grid gap-3 md:grid-cols-2">
                <Block eyebrow="Why it wins" tone="accent">
                    <ul className="space-y-2.5">
                        {narrative.verdict.reasons.slice(0, 3).map((reason) => (
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

                        {narrative.verdict.reasons.length === 0 && (
                            <li className="text-xs leading-5 text-finn-iron">
                                On this order the three are close enough that
                                nothing separates them worth stating — which
                                Lens says rather than inventing a reason.
                            </li>
                        )}
                    </ul>
                </Block>

                <Block
                    eyebrow="The other side of it"
                    tone="warning"
                    icon={<HugeiconsIcon icon={ScaleIcon} className="h-3 w-3" />}
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
                </Block>

                {/*
                  * The panel the product turns on. Everything else here could
                  * be a ranking with a caption; this is Lens taking the
                  * reader's own order apart and answering it item by item,
                  * and a preview without it is previewing a sort.
                  */}
                <Block eyebrow="Priority by priority" tone="accent">
                    <ol className="space-y-2.5">
                        {narrative.priorities.slice(0, 5).map((priority) => (
                            <li
                                key={priority.priority}
                                className="flex items-start gap-2.5"
                            >
                                <span
                                    aria-hidden="true"
                                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-finn-pale-blue text-finn-accent-blue"
                                >
                                    <PriorityIcon
                                        name={priority.icon}
                                        className="h-3.5 w-3.5"
                                    />
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
                </Block>

                <Block eyebrow="Cost analysis" tone="accent">
                    <p className="mb-3 text-xs font-black leading-5 text-finn-black">
                        {narrative.cost.sentences[0]}
                    </p>

                    <div className="space-y-1.5">
                        <CostLine
                            label="FINN subscription"
                            amount={narrative.cost.subject.subscription}
                        />
                        <CostLine
                            label="Estimated energy"
                            amount={narrative.cost.subject.energy}
                        />
                        <CostLine
                            label="Estimated extra mileage"
                            amount={narrative.cost.subject.excessMileage}
                        />

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
                </Block>
            </div>

            <MoreOnTheRealPage
                alternatives={recommendation.alternatives}
                onEditPriorities={onEditPriorities}
            />
        </div>
    );
}

const TONE = {
    accent: "text-finn-accent-blue",
    warning: "text-finn-warning",
    muted: "text-finn-iron",
} as const;

function Block({
    eyebrow,
    tone,
    icon,
    children,
}: {
    eyebrow: string;
    tone: keyof typeof TONE;
    icon?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-3xl bg-white p-5 shadow-sm">
            <p
                className={[
                    "mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em]",
                    TONE[tone],
                ].join(" ")}
            >
                {icon}
                {eyebrow}
            </p>

            {children}
        </section>
    );
}

function CostLine({
    label,
    amount,
}: {
    label: string;
    amount: number | null;
}) {
    return (
        <div className="flex items-baseline justify-between gap-3">
            <span className="text-[11px] text-finn-iron">{label}</span>

            <span className="shrink-0 text-[11px] font-bold text-finn-black">
                {amount == null ? "not known" : formatEUR(Math.round(amount))}
            </span>
        </div>
    );
}

/**
 * What this preview left out, named rather than silently missing.
 *
 * A preview that quietly shows less than the thing teaches the reader the
 * thing is this small. Saying what is bigger is what makes the real page
 * something to arrive at rather than something that merely differs.
 */
function MoreOnTheRealPage({
    alternatives,
    onEditPriorities,
}: {
    alternatives: PinnedFinnCar[];
    onEditPriorities: () => void;
}) {
    const items = [
        /*
         * Not "every priority" — those are all here. What the real page adds
         * under each is the equipment itself, chip by chip, with what the
         * reader raised marked and what the car is missing marked against it.
         */
        "The equipment behind every verdict, named feature by feature, with your raised picks marked",
        alternatives.length > 0
            ? `A hot seat — put ${alternatives[0]!.name} up against the winner and Lens argues it again from that side`
            : "A hot seat for the closest alternatives",
        "The full ranking with raw totals, and the weight table, so you can check the arithmetic yourself",
        "Your driving assumptions, beside the answer they produced, and a way to change them",
    ];

    return (
        <section className="rounded-3xl border border-dashed border-finn-cotton bg-white/60 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-finn-iron">
                On the real page, as well
            </p>

            <ul className="mt-2.5 space-y-1.5">
                {items.map((item) => (
                    <li
                        key={item}
                        className="flex gap-2 text-[11px] leading-4 text-finn-iron"
                    >
                        <span aria-hidden="true">+</span>
                        {item}
                    </li>
                ))}
            </ul>

            <button
                type="button"
                onClick={onEditPriorities}
                className="mt-3 text-[11px] font-bold text-finn-accent-blue underline-offset-2 transition hover:underline"
            >
                Change your priorities and watch this change
            </button>
        </section>
    );
}

/* -------------------------------------------------------------------------- */
/* The cars being reasoned about                                              */
/* -------------------------------------------------------------------------- */

/**
 * The three cars, before the page starts arguing about them.
 *
 * The reading below names cars constantly — "€282/month more than Lumo" —
 * and without having met them the reader is following an argument about
 * strangers. This is the line-up they would otherwise have built by pinning.
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
                                <Spec
                                    label="Boot"
                                    value={`${car.capacity.trunk} L`}
                                />

                                <Spec
                                    label="CO₂"
                                    value={`${car.co2.value} g/km`}
                                />

                                {car.electric?.range != null &&
                                car.electric.range !== "Unknown" ? (
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
                                {formatEUR(car.pricing.customerMonthly.price)}
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
