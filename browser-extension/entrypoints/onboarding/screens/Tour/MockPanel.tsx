import type { ReactNode } from "react";
import { Wallet, X } from "lucide-react";

import { PriorityIcon } from "@/components/PriorityIcon";
import {
    configurationDetail,
    configurationName,
    describeCoverage,
} from "@/lib/car-labels";
import { advertisedGap } from "@/lib/cost-copy";
import { formatEUR } from "@/lib/reasoning-engine";
import { FIT_BANDS, type FitAnalysis } from "@/lib/reasoning-engine/fit";
import { DEFAULTS_SHORT, DEFAULTS_TITLE } from "@/lib/personalisation";

import { BandChip, BrandDisc, CarSilhouette } from "./parts";

/**
 * The drawer the verdict pill opens, in the frame rather than over a page.
 *
 * Faithful in the two things that make it recognisable a week later: the
 * order of the sections, and the fact that the reader is *told what the
 * verdict was measured against* before they are given it. Both come straight
 * from `lens-panel/sections.ts` — the header bar with the mark and "How this
 * car fits you", the photograph with the band chip on it, then what it costs
 * you, then why it fits, then the priorities in the reader's own order.
 *
 * Shortened in depth, never in shape. The real panel prints every priority
 * with its equipment audit, how much energy the car uses, and what you would
 * be giving up; this prints two priorities and then says so. A preview that
 * quietly drops sections teaches a smaller product than the one that arrives.
 *
 * Every string is the engine's. Nothing on this panel is written for the
 * demonstration — the numbers move when the reader's priorities move, which
 * is the whole argument the next screen is about to make.
 */
export function MockPanel({
    analysis,
    onClose,
}: {
    analysis: FitAnalysis;
    onClose: () => void;
}) {
    const { vehicle, overall, cost } = analysis;
    const gap = advertisedGap(analysis);

    return (
        <aside
            aria-label="Finn Lens, example panel"
            data-state="open"
            className={[
                "absolute inset-y-0 right-0 z-40 flex w-full max-w-[320px]",
                "flex-col overflow-hidden border-l border-finn-cotton bg-white",
                "shadow-[-10px_0_30px_rgba(0,0,0,0.14)]",
                /* The real drawers' slide, and its reduced-motion opt-out
                   with it. Only the animation: this one is drawn inside the
                   browser mock, so it is absolute where they are fixed and
                   cannot take the shared shell. */
                "finn-lens-drawer",
            ].join(" ")}
        >
            <div className="flex shrink-0 items-center gap-2 border-b border-finn-cotton px-4 py-3">
                <BrandDisc size={28} />

                <h3 className="min-w-0 flex-1 text-[13px] font-black text-finn-black">
                    How this car fits you
                </h3>

                <span className="shrink-0 rounded-full px-2 py-1 text-[11px] font-bold text-finn-iron">
                    Settings
                </span>

                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close the example panel"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-finn-iron transition-colors hover:bg-finn-cotton hover:text-finn-black"
                >
                    <X aria-hidden="true" className="h-4 w-4" />
                </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="relative flex h-[76px] items-center justify-center border-b border-finn-cotton bg-finn-pale-blue">
                    <CarSilhouette className="h-auto w-[40%] text-finn-accent-blue/30" />

                    <span className="absolute bottom-2 left-2">
                        <BandChip level={overall.level} label={overall.label} />
                    </span>
                </div>

                <div className="px-4 pt-3 pb-4">
                    <p className="text-base font-black leading-5 text-finn-black">
                        {vehicle.name}
                    </p>

                    <p className="mt-0.5 text-[13px] font-bold leading-5 text-finn-accent-blue">
                        {configurationName(vehicle)}
                    </p>

                    <p className="mt-0.5 text-[11px] leading-4 text-finn-iron">
                        {configurationDetail(vehicle, {
                            withPower: false,
                            withFuel: false,
                        })}
                    </p>
                </div>

                {/*
                  * The defaults notice, at the size it really appears.
                  *
                  * A reader on this screen has told Lens nothing yet, so this
                  * is exactly the state the real panel would be in — and
                  * showing it here does the job it was written for twice
                  * over: it keeps the mock honest, and it makes the case for
                  * the two screens that follow.
                  */}
                <div className="border-b border-finn-cotton bg-finn-pale-blue px-4 py-3">
                    <p className="text-[12px] font-black text-finn-highlight-navy">
                        {DEFAULTS_TITLE}
                    </p>

                    <p className="mt-1 text-[11px] leading-4 text-finn-highlight-navy/80">
                        {DEFAULTS_SHORT}
                    </p>
                </div>

                <Section title="What it costs you">
                    {/* The wallet the real panel leads this section with. */}
                    <div className="mt-2 flex items-center gap-3">
                        <span
                            aria-hidden="true"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-finn-highlight-navy text-white"
                        >
                            <Wallet className="h-5 w-5" />
                        </span>

                        <div className="min-w-0">
                            <p className="text-2xl font-black leading-7 text-finn-black tabular-nums">
                                {formatEUR(cost.breakdown.totalMonthly)}
                            </p>

                            <p className="text-[11px] leading-4 text-finn-iron">
                                {cost.breakdown.complete
                                    ? "estimated per month"
                                    : "per month, and incomplete"}
                            </p>
                        </div>
                    </div>

                    {gap != null && (
                        <p className="mt-2 inline-flex rounded-full bg-finn-warning-lift px-2.5 py-1 text-[11px] font-bold text-finn-warning-deep">
                            {formatEUR(gap)} a month more than the advertised
                            price
                        </p>
                    )}
                </Section>

                {analysis.strengths.length > 0 && (
                    <Section title="Why it fits">
                        <ul className="mt-2 flex flex-col gap-1.5">
                            {analysis.strengths.map((strength) => (
                                <li
                                    key={strength}
                                    className="text-[12px] leading-[18px] text-finn-black"
                                >
                                    {strength}
                                </li>
                            ))}
                        </ul>
                    </Section>
                )}

                {analysis.priorities
                    .slice(0, SHOWN_PRIORITIES)
                    .map((priority) => (
                        <Section
                            key={priority.priority}
                            title={`#${priority.rank} ${priority.label}`}
                        >
                            <div className="mt-2 flex items-center gap-2">
                                <PriorityIcon
                                    name={priority.icon}
                                    className="h-4 w-4 shrink-0"
                                />

                                <span
                                    className={[
                                        "rounded-full px-2 py-0.5 text-[11px] font-bold",
                                        FIT_BANDS[priority.band.level].chipClass,
                                    ].join(" ")}
                                >
                                    {priority.band.label}
                                </span>
                            </div>

                            <p className="mt-1.5 text-[11px] leading-4 text-finn-iron">
                                {describeCoverage(priority)}
                            </p>
                        </Section>
                    ))}

                <Ending
                    remainingPriorities={Math.max(
                        analysis.priorities.length - SHOWN_PRIORITIES,
                        0,
                    )}
                />
            </div>
        </aside>
    );
}

/**
 * How many priorities the copy prints before it stops and says so.
 *
 * Two, which is a judgement rather than an accident — and the number is named
 * here so the section that owns up to it counts from the same place.
 */
const SHOWN_PRIORITIES = 2;

/**
 * The end of the panel, said out loud.
 *
 * This used to be a sentence in grey saying the real panel carries on, and
 * the trouble with it was that a short panel and a broken panel look exactly
 * alike: the reader sees two priorities where the product promised five,
 * nothing about consumption, nothing about tradeoffs, and one line of small
 * print they may or may not read. A preview has to *commit* — it has to be
 * plainly a shortened thing rather than a full thing that failed to load.
 *
 * So it ends the way the setup flow's worked example ends, with the same
 * eyebrow and the same list of what the real page adds, on its own recessed
 * ground. Borrowed on purpose: a reader meets this shape twice in one flow,
 * and both times it means the same thing.
 */
function Ending({ remainingPriorities }: { remainingPriorities: number }) {
    const items = [
        remainingPriorities > 0
            ? `The other ${remainingPriorities} priorities you set, each with the equipment behind its verdict`
            : "The equipment behind every verdict, feature by feature",
        "How much energy this car uses, judged against its own kind",
        "What you'd be giving up by taking it",
        "An explanation of any feature you don't recognise",
    ];

    return (
        <section className="border-t border-finn-cotton bg-finn-snow px-4 py-3">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-finn-iron">
                On the real panel, as well
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

            <p className="mt-3 border-t border-finn-cotton pt-2.5 text-[11px] leading-4 text-finn-iron">
                <strong className="font-black text-finn-black">
                    This copy is deliberately short.
                </strong>{" "}
                It is the shape of the panel and the order it argues in — the
                one on finn.com carries all of the above without you asking.
            </p>
        </section>
    );
}

/** The panel's own section frame — a rule, an eyebrow, then the content. */
function Section({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <section className="border-t border-finn-cotton px-4 py-3">
            <h4 className="text-[11px] font-black uppercase tracking-[0.14em] text-finn-iron">
                {title}
            </h4>

            {children}
        </section>
    );
}
