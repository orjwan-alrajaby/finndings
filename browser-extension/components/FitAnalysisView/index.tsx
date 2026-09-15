import * as Accordion from "@radix-ui/react-accordion";

import { configurationDetail, configurationName } from "@/lib/car-labels";
import type { FitAnalysis } from "@/lib/reasoning-engine/fit";

import { FactTable } from "@/components/FactTable";

import { CostSection } from "./CostSection";
import { PrioritySection } from "./PrioritySection";
import { BandChip, Section } from "./parts";
import { TradeoffRow } from "./TradeoffRow";
import { UsageSection } from "./UsageSection";

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
 * The order matches the panel's, and for the panel's reason: the two answers
 * only this extension can give — what the car costs at the reader's own
 * mileage, and whether it is a thirsty example of its kind — come before the
 * equipment audit, which is the most thorough thing here and the least urgent.
 * The band chip in the header still gives the verdict first.
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

                        {/*
                          * Without the power, which decides nothing said
                          * below it, and without the fuel type, which has
                          * moved to "How much it uses" — what a car runs on
                          * is what decides the cohort its consumption is
                          * judged against, so it belongs beside that
                          * judgement. The price stays: unlike the panel, this
                          * page is not standing on FINN's listing, so it is
                          * the only place the reader sees it.
                          */}
                        <p className="mt-0.5 text-[11px] leading-4 text-finn-iron">
                            {configurationDetail(vehicle, {
                                withPower: false,
                                withFuel: false,
                            })}
                        </p>
                    </div>

                    <BandChip
                        level={analysis.overall.level}
                        label={analysis.overall.label}
                    />
                </div>

                {/*
                  * The tally that used to sit here — "a good or strong match
                  * on 3 of the 5 priorities you set, led by safety & driver
                  * assistance, your #1" — is gone. The band chip beside the
                  * name already gives the verdict, and every claim the
                  * sentence made (the count, the order, which one led) is made
                  * again with its evidence by the sections below. It was a
                  * summary of the card placed at the top of the card.
                  */}
            </header>

            <CostSection analysis={analysis} />
            <UsageSection analysis={analysis} />

            {analysis.strengths.length > 0 ? (
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

                    <BasisNote />
                </Section>
            ) : (
                /*
                 * A car that serves nothing the reader ranked has no reasons
                 * to list, and a "Why it fits" heading over nothing would be
                 * the card insisting. The note still has to appear, so it
                 * keeps its place without a heading it can't earn.
                 */
                <div className="border-t border-finn-cotton px-5 py-4">
                    <BasisNote />
                </div>
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

            {analysis.tradeoffs.length > 0 && (
                <Section title="What you'd be accepting">
                    <div className="mt-2">
                        <FactTable>
                            {analysis.tradeoffs.map((tradeoff) => (
                                <TradeoffRow
                                    key={tradeoff.headline}
                                    tradeoff={tradeoff}
                                />
                            ))}
                        </FactTable>
                    </div>
                </Section>
            )}
        </article>
    );
}

/**
 * What the verdict was measured against.
 *
 * Requirement, not decoration. The same car opened by somebody else gets a
 * different word, and a band shown without saying what it is a match *with*
 * invites being read as a verdict on the car.
 *
 * It sits under the reasons rather than in the header. At the top it was a
 * disclaimer standing between the reader and the answer, read before there was
 * anything to qualify; under the reasons it is the last word on them, which is
 * where a caveat earns its place.
 */
function BasisNote() {
    return (
        <p className="mt-3 text-[11px] leading-4 text-finn-iron">
            Measured against your saved Lens settings — your priorities, their
            order, and the features you picked out. Someone with different
            settings would see a different answer.
        </p>
    );
}
