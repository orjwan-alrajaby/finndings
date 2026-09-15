import { Scale, Sparkles } from "lucide-react";

import { PriorityIcon } from "@/components/PriorityIcon";
import { configurationName } from "@/lib/car-labels";
import { demoCarSummary } from "@/lib/demo-cars";
import { formatEUR } from "@/lib/reasoning-engine";
import { CATEGORIES } from "@/lib/reasoning-engine/constants";
import type { AdviceNarrative } from "@/lib/reasoning-engine/narrative/types";
import type { Recommendation } from "@/lib/reasoning-engine/types";
import type { PinnedFinnCar } from "@/lib/types";

/**
 * The real page's sections, in its order, showing the top of each.
 *
 * The eyebrow on every block is the one the real page uses, word for word.
 * That is what does the work: a reader arriving at their first comparison
 * meets headings they have already read, in the order they already read
 * them, and the page is legible before they have looked at it.
 */
export function MiniAdvice({
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
                            <Sparkles aria-hidden="true" className="h-3 w-3" />
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
                    icon={<Scale aria-hidden="true" className="h-3 w-3" />}
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
        "The full ranking, the totals behind it and how much each priority counted, so you can check the sums yourself",
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
