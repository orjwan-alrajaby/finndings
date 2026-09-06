import { ChevronDown } from "lucide-react";
import { useState } from "react";

import {
    describeFit,
    FIT_BANDS,
    FIT_SEGMENTS,
    type FitAnalysis,
    type FitFeature,
    type FitLevel,
    type FitPriority,
} from "@/lib/reasoning-engine/fit";
import { EnvironmentalResult } from "@/components/EnvironmentalResult";
import { formatEUR } from "@/lib/reasoning-engine";
import type { CostLine } from "@/lib/reasoning-engine/types";
import type { Tradeoff } from "@/lib/reasoning-engine/narrative/types";
import {
    configurationDetail,
    configurationName,
    describeCoverage,
} from "@/lib/car-labels";
import {
    FeatureChip,
    type FeatureChipTone,
} from "@/components/FeatureChip";

/**
 * One car, judged against the reader's saved settings.
 *
 * This is the in-page panel's analysis, on a page. The panel is built out of
 * hand-rolled DOM because it lives in a shadow root inside finn.com and may
 * not carry React in there; everywhere else in this extension is React, so
 * the same reading had to exist twice. What is *not* duplicated is anything
 * that decides something: every sentence, band, count and figure below comes
 * out of `FitAnalysis`, and the two renderers read the same fields in the
 * same order. If a claim isn't in the analysis it isn't on the screen.
 *
 * The order is the order a reader asks the questions in: how well does it
 * fit, why, how does it do on each thing I said I cared about, did I get the
 * features I asked for, what does it cost, and what am I accepting.
 */
export function FitAnalysisView({ analysis }: { analysis: FitAnalysis }) {
    const { vehicle } = analysis;

    return (
        <article className="overflow-hidden rounded-[28px] bg-white shadow-sm">
            <header className="border-b border-finn-cotton p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="text-lg font-black leading-6 text-finn-black">
                            {vehicle.name}
                        </h2>

                        <p className="mt-0.5 text-[13px] font-bold leading-5 text-finn-accent-blue">
                            {configurationName(vehicle)}
                        </p>

                        <p className="mt-0.5 text-[11px] leading-4 text-finn-iron">
                            {configurationDetail(vehicle)}
                        </p>
                    </div>

                    <BandChip
                        level={analysis.overall.level}
                        label={analysis.overall.label}
                    />
                </div>

                <p className="mt-3 text-[13px] leading-5 text-finn-black">
                    {describeFit(analysis)}
                </p>

                {/*
                  * Requirement, not decoration. The same car opened by
                  * somebody else gets a different word, and a band shown
                  * without saying what it is a match *with* invites being
                  * read as a verdict on the car.
                  */}
                <p className="mt-3 text-[11px] leading-4 text-finn-iron">
                    Measured against your saved Lens settings — your
                    priorities, their order, and the features you picked out.
                    Someone with different settings would see a different
                    answer.
                </p>
            </header>

            {analysis.strengths.length > 0 && (
                <Section title="Why it fits">
                    <ul className="mt-2 flex flex-col gap-2">
                        {analysis.strengths.map((reason) => (
                            <li key={reason} className="flex gap-2">
                                <span
                                    aria-hidden="true"
                                    className="mt-[7px] block h-1.5 w-1.5 shrink-0 rounded-full bg-finn-accent-blue"
                                />

                                <p className="text-[13px] leading-5 text-finn-black">
                                    {reason}
                                </p>
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            {analysis.priorities.map((priority) => (
                <PrioritySection key={priority.priority} priority={priority} />
            ))}

            <CostSection analysis={analysis} />

            {analysis.tradeoffs.length > 0 && (
                <Section title="What you'd be accepting">
                    <div className="mt-2 flex flex-col gap-3">
                        {analysis.tradeoffs.map((tradeoff) => (
                            <TradeoffRow
                                key={tradeoff.headline}
                                tradeoff={tradeoff}
                            />
                        ))}
                    </div>
                </Section>
            )}

            <footer className="border-t border-finn-cotton px-5 py-4">
                <p className="text-[11px] leading-4 text-finn-iron">
                    {analysis.cost.disclaimer}
                </p>
            </footer>
        </article>
    );
}

/* -------------------------------------------------------------------------- */
/* Shared parts                                                               */
/* -------------------------------------------------------------------------- */

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="border-t border-finn-cotton px-5 py-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-finn-iron">
                {title}
            </h3>

            {children}
        </section>
    );
}

/**
 * The band, as four segments.
 *
 * A band summarises a score the reader is deliberately never shown, so the
 * indicator has to read as "how much of this" without reading as a mark out
 * of ten. Coloured per band rather than in one accent, so four of them in a
 * list are told apart before they are read.
 */
export function BandChip({
    level,
    label,
    compact,
}: {
    level: FitLevel;
    label: string;
    /** Drops the meter, for a chip that has to sit inside a list row. */
    compact?: boolean;
}) {
    const band = FIT_BANDS[level];
    const filled = FIT_SEGMENTS[level];

    return (
        <span
            className={[
                "inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5",
                "text-[11px] font-black",
                band.chipClass,
            ].join(" ")}
        >
            {!compact && (
                <span className="flex items-center gap-0.5" aria-hidden="true">
                    {[0, 1, 2, 3].map((segment) => (
                        <span
                            key={segment}
                            className={[
                                "block h-1.5 w-1.5 rounded-full",
                                segment < filled
                                    ? band.barClass
                                    : band.emptyBarClass,
                            ].join(" ")}
                        />
                    ))}
                </span>
            )}

            {label}
        </span>
    );
}

/* -------------------------------------------------------------------------- */
/* One priority                                                               */
/* -------------------------------------------------------------------------- */

/**
 * One priority, open, and closable.
 *
 * Every priority starts open: a reader who has opened this panel has already
 * asked "how does it fit me", and the answer is the evidence — which
 * features, which figures. But five priorities of features is a long scroll,
 * so the header is a button that folds one away once it has been read,
 * leaving the rank, the name and the band still on the page.
 */
function PrioritySection({ priority }: { priority: FitPriority }) {
    const [open, setOpen] = useState(true);

    return (
        <section className="border-t border-finn-cotton">
            <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((was) => !was)}
                className="flex w-full items-start gap-2.5 px-5 py-4 text-left transition-colors hover:bg-finn-snow"
            >
                <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-finn-pale-blue text-sm"
                >
                    {priority.icon}
                </span>

                <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-finn-accent-blue">
                        Your priority #{priority.rank}
                    </span>

                    {/* A button may not contain an h3, so the heading is a role. */}
                    <span
                        role="heading"
                        aria-level={3}
                        className="mt-0.5 block text-[15px] font-black leading-5 text-finn-black"
                    >
                        {priority.label}
                    </span>

                    <span className="mt-0.5 block text-[11px] leading-4 text-finn-iron">
                        {describeCoverage(priority)}
                    </span>
                </span>

                {/*
                  * The band and the chevron travel together, tight, so the
                  * header's text column keeps as much width as it can.
                  */}
                <span className="flex shrink-0 items-start gap-1">
                    <BandChip
                        level={priority.band.level}
                        label={priority.band.label}
                        compact
                    />

                    <ChevronDown
                        aria-hidden="true"
                        className={[
                            "mt-1 h-4 w-4 shrink-0 text-finn-iron transition-transform",
                            open ? "rotate-180" : "",
                        ].join(" ")}
                    />
                </span>
            </button>

            {open && (
                <div className="flex flex-col gap-3 px-5 pb-4">
                    {/*
                      * Environmental impact renders itself, in full. This
                      * panel used to show its one summary sentence and drop
                      * the figures, the caveats and the method on the floor —
                      * the same reading, three surfaces, three different
                      * amounts of it. There is one renderer now.
                      */}
                    {priority.impact ? (
                        <EnvironmentalResult assessment={priority.impact} />
                    ) : (
                        priority.sentences.length > 0 && (
                            <div className="flex flex-col gap-1.5">
                                {priority.sentences.map((line) => (
                                    <p
                                        key={line}
                                        className="text-[12px] leading-[18px] text-finn-iron"
                                    >
                                        {line}
                                    </p>
                                ))}
                            </div>
                        )
                    )}

                    <FeatureGroups priority={priority} />

                    {priority.measurements.length > 0 && !priority.impact && (
                        <dl className="flex flex-wrap gap-x-4 gap-y-1">
                            {priority.measurements.map((fact) => (
                                <div key={fact.label} className="flex gap-1.5">
                                    <dt className="text-[11px] text-finn-iron">
                                        {fact.label}:
                                    </dt>

                                    <dd className="text-[11px] font-bold text-finn-black">
                                        {fact.display}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    )}

                    {!priority.hasEvidence && (
                        <p className="text-[12px] leading-[18px] text-finn-iron">
                            FINN's data doesn't carry anything we can judge
                            this priority on for this car.
                        </p>
                    )}
                </div>
            )}
        </section>
    );
}

/**
 * What the car has and hasn't, in this priority, in four groups.
 *
 * The same four the in-page panel and the Advice page draw, in the same
 * order, because they answer four different questions: what you asked for and
 * got, what you asked for and didn't, what else counted and it has, and what
 * else counted and it hasn't.
 *
 * Each is its own block rather than a heading over a list. Four labels of the
 * same size, a line apart, are read as one long list with words in it — the
 * distinction the grouping exists to make was being lost in the layout that
 * carried it.
 */
function FeatureGroups({ priority }: { priority: FitPriority }) {
    const has = (feature: FitFeature) => feature.state === "present";
    const hasnt = (feature: FitFeature) => feature.state === "absent";
    const unknown = (feature: FitFeature) => feature.state === "unknown";

    const asked = priority.picked;
    const rest = priority.alsoCounted;

    if (asked.length === 0 && rest.length === 0) return null;

    return (
        <div className="flex flex-col gap-2.5">
            <FeatureGroup
                title="You gave extra influence, and it has"
                features={asked.filter(has)}
                mark="present"
                picked
            />

            <FeatureGroup
                title="You gave extra influence, but it doesn't have"
                features={asked.filter(hasnt)}
                mark="absent"
                picked
            />

            <FeatureGroup
                title={
                    asked.length ? "Also counted here, and it has" : "It has"
                }
                features={rest.filter(has)}
                mark="present"
            />

            <FeatureGroup
                title={
                    asked.length
                        ? "Also counted here, but it doesn't have"
                        : "It doesn't have"
                }
                features={rest.filter(hasnt)}
                mark="absent"
            />

            <FeatureGroup
                title="FINN didn't say either way"
                features={[...asked, ...rest].filter(unknown)}
                mark="unknown"
            />
        </div>
    );
}

/** The mark on a group's label, in the colour its answer already uses. */
const GROUP_MARK: Record<FitFeature["state"], string> = {
    present: "bg-finn-influence-emerald",
    absent: "bg-finn-warning",
    unknown: "bg-finn-iron",
};

/**
 * The chip's colour: what the car does about this, and whether the reader
 * asked for it.
 *
 * A pick the car is missing is the loudest thing in the group and gets the
 * warning tint; the same gap in equipment nobody asked about is a fact, not a
 * problem, and stays quiet.
 */
function toneFor(feature: FitFeature, picked: boolean): FeatureChipTone {
    if (feature.state === "present") return picked ? "present" : "quiet";
    if (feature.state === "absent" && picked) return "missing";

    return "quiet";
}

function FeatureGroup({
    title,
    features,
    mark,
    picked = false,
}: {
    title: string;
    features: FitFeature[];
    mark: FitFeature["state"];
    /** Whether these are the reader's own picks, which sets the accent. */
    picked?: boolean;
}) {
    if (!features.length) return null;

    return (
        <div className="rounded-xl bg-finn-snow px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-finn-iron">
                <span
                    aria-hidden="true"
                    className={[
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        GROUP_MARK[mark],
                    ].join(" ")}
                />

                <span>
                    {title} ({features.length})
                </span>
            </p>

            {/*
              * Chips, the way the Advice page draws the same facts. A column
              * of ticks and crosses read as a form; these read as the things
              * themselves, and a dozen fit where six rows did.
              */}
            <div className="mt-2 flex flex-wrap gap-1.5">
                {features.map((feature) => (
                    <FeatureChip
                        key={feature.key}
                        fact={feature}
                        tone={toneFor(feature, picked)}
                        struck={feature.state === "absent"}
                    />
                ))}
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Cost                                                                       */
/* -------------------------------------------------------------------------- */

function CostSection({ analysis }: { analysis: FitAnalysis }) {
    const { cost } = analysis;

    return (
        <Section title="What it costs you">
            <p className="mt-2 text-[13px] font-black leading-5 text-finn-black">
                {cost.headline}
            </p>

            {cost.budgetSentence && (
                <p className="mt-1 text-[12px] leading-[18px] text-finn-iron">
                    {cost.budgetSentence}
                </p>
            )}

            <div className="mt-3 flex flex-col gap-2">
                {cost.lines.map((line) => (
                    <CostRow key={line.id} line={line} />
                ))}
            </div>

            {cost.caveats.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1">
                    {cost.caveats.map((caveat) => (
                        <li
                            key={caveat}
                            className="text-[11px] leading-4 text-finn-iron"
                        >
                            {caveat}
                        </li>
                    ))}
                </ul>
            )}
        </Section>
    );
}

function CostRow({ line }: { line: CostLine }) {
    return (
        <div className="rounded-2xl bg-finn-snow px-3.5 py-2.5">
            <div className="flex items-baseline justify-between gap-3">
                <p className="text-[12px] font-bold text-finn-black">
                    {line.label}
                </p>

                <p
                    className={[
                        "shrink-0 text-[12px] font-black",
                        line.available
                            ? "text-finn-black"
                            : "text-finn-iron",
                    ].join(" ")}
                >
                    {line.available && line.amount != null
                        ? `${formatEUR(line.amount)}/mo`
                        : "Not known"}
                </p>
            </div>

            <p className="mt-0.5 text-[11px] leading-4 text-finn-iron">
                {line.explanation}
            </p>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Tradeoffs                                                                  */
/* -------------------------------------------------------------------------- */

function TradeoffRow({ tradeoff }: { tradeoff: Tradeoff }) {
    return (
        <div className="rounded-2xl bg-finn-snow px-3.5 py-2.5">
            <p className="text-[12px] font-black text-finn-black">
                {tradeoff.headline}
            </p>

            <p className="mt-0.5 text-[11px] leading-4 text-finn-iron">
                {tradeoff.evidence}
            </p>

            {/*
              * Why this reader should care, which is always the priority they
              * ranked or the budget they set — never a generic "worth
              * weighing".
              */}
            <p className="mt-1 text-[11px] leading-4 text-finn-iron">
                {tradeoff.relevance}
            </p>
        </div>
    );
}
