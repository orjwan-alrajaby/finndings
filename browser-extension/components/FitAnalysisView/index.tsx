import {
    describeFit,
    FIT_BANDS,
    FIT_SEGMENTS,
    type FitAnalysis,
    type FitFeature,
    type FitLevel,
    type FitPriority,
} from "@/lib/reasoning-engine/fit";
import { describeEnvironment } from "@/lib/reasoning-engine/environmental";
import { formatEUR } from "@/lib/reasoning-engine";
import type { CostLine } from "@/lib/reasoning-engine/types";
import type { Tradeoff } from "@/lib/reasoning-engine/narrative/types";
import {
    configurationDetail,
    configurationName,
    describeCoverage,
} from "@/lib/car-labels";
import { InfoTip } from "@/components/InfoTip";

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

function PrioritySection({ priority }: { priority: FitPriority }) {
    const sentences = priority.impact
        ? [describeEnvironment(priority.impact)]
        : priority.sentences;

    return (
        <section className="border-t border-finn-cotton px-5 py-4">
            <div className="flex items-start gap-2.5">
                <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-finn-pale-blue text-sm"
                >
                    {priority.icon}
                </span>

                <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-finn-accent-blue">
                        Your priority #{priority.rank}
                    </p>

                    <h3 className="mt-0.5 text-[15px] font-black leading-5 text-finn-black">
                        {priority.label}
                    </h3>

                    <p className="mt-0.5 text-[11px] leading-4 text-finn-iron">
                        {describeCoverage(priority)}
                    </p>
                </div>

                <BandChip
                    level={priority.band.level}
                    label={priority.band.label}
                    compact
                />
            </div>

            {sentences.map((line) => (
                <p
                    key={line}
                    className="mt-2 text-[12px] leading-[18px] text-finn-iron"
                >
                    {line}
                </p>
            ))}

            <FeatureGroups priority={priority} />

            {priority.measurements.length > 0 && !priority.impact && (
                <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
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
                <p className="mt-2 text-[12px] leading-[18px] text-finn-iron">
                    FINN's data doesn't carry anything we can judge this
                    priority on for this car.
                </p>
            )}
        </section>
    );
}

/**
 * The picks and the rest, kept apart.
 *
 * "You asked for three of these and got two" and "the category covers twelve
 * more, and it has seven of them" are two different sentences, and the whole
 * reason the analysis carries the two lists separately is so both can be
 * said.
 */
function FeatureGroups({ priority }: { priority: FitPriority }) {
    if (priority.picked.length === 0 && priority.alsoCounted.length === 0) {
        return null;
    }

    return (
        <div className="mt-3 flex flex-col gap-3">
            {priority.picked.length > 0 && (
                <FeatureGroup
                    title="What you asked for"
                    features={priority.picked}
                />
            )}

            {priority.alsoCounted.length > 0 && (
                <FeatureGroup
                    title="Also counted"
                    features={priority.alsoCounted}
                />
            )}
        </div>
    );
}

function FeatureGroup({
    title,
    features,
}: {
    title: string;
    features: FitFeature[];
}) {
    return (
        <div>
            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-finn-iron">
                {title}
            </p>

            <div className="mt-1.5 flex flex-col gap-1">
                {features.map((feature) => (
                    <FeatureRow key={feature.key} feature={feature} />
                ))}
            </div>
        </div>
    );
}

const STATE_MARK: Record<FitFeature["state"], string> = {
    present: "✓",
    absent: "✕",
    unknown: "–",
};

const STATE_CLASS: Record<FitFeature["state"], string> = {
    present: "text-finn-influence-emerald",
    absent: "text-finn-iron",
    unknown: "text-finn-iron",
};

const STATE_LABEL: Record<FitFeature["state"], string> = {
    present: "has it",
    absent: "doesn't have it",
    unknown: "not available",
};

function FeatureRow({ feature }: { feature: FitFeature }) {
    return (
        <div className="flex items-start gap-2">
            <span
                aria-hidden="true"
                className={[
                    "w-3 shrink-0 text-[12px] font-black leading-[18px]",
                    STATE_CLASS[feature.state],
                ].join(" ")}
            >
                {STATE_MARK[feature.state]}
            </span>

            <span className="sr-only">{STATE_LABEL[feature.state]}</span>

            <span
                className={[
                    "text-[12px] leading-[18px]",
                    feature.state === "present"
                        ? "text-finn-black"
                        : "text-finn-iron",
                ].join(" ")}
            >
                {feature.label}

                {feature.explanation && (
                    <span className="ml-1 inline-block align-middle">
                        <InfoTip subject={feature.label}>
                            {feature.explanation}
                        </InfoTip>
                    </span>
                )}
            </span>
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
