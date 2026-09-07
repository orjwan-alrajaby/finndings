import * as Accordion from "@radix-ui/react-accordion";

import { configurationDetail, configurationName } from "@/lib/car-labels";
import { describeFit, type FitAnalysis } from "@/lib/reasoning-engine/fit";

import { CostSection } from "./CostSection";
import { PrioritySection } from "./PrioritySection";
import { BandChip, Section } from "./parts";
import { TradeoffRow } from "./TradeoffRow";

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

            {/*
              * Every priority starts open, and closing one is how a reader
              * folds away what they have already read. `multiple` because
              * these are five independent answers, not five views of one.
              */}
            <Accordion.Root
                type="multiple"
                defaultValue={analysis.priorities.map(
                    (priority) => priority.priority,
                )}
            >
                {analysis.priorities.map((priority) => (
                    <PrioritySection
                        key={priority.priority}
                        priority={priority}
                    />
                ))}
            </Accordion.Root>

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
