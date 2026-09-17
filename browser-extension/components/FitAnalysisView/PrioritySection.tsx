import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

import { EnvironmentalResult } from "@/components/EnvironmentalResult";
import { PriorityIcon } from "@/components/PriorityIcon";
import { describeCoverage } from "@/lib/car-labels";
import { featureTableOf, tableInputOf } from "@/lib/feature-copy";
import { FeatureTable } from "@/components/FeatureTable";
import type { FitPriority } from "@/lib/reasoning-engine/fit";

import { BandChip } from "./parts";

/**
 * One priority, open, and closable.
 *
 * Every priority starts open: a reader who has opened this panel has already
 * asked "how does it fit me", and the answer is the evidence — which
 * features, which figures. But five priorities of features is a long scroll,
 * so the header folds one away once it has been read, leaving the rank, the
 * name and the band still on the page.
 *
 * An accordion item rather than a `useState` and a button. The heading used
 * to be `role="heading"` on a span *inside* the button, because a button may
 * not contain an h3 — which put a heading inside a control and left a screen
 * reader with a heading it could not navigate to. Radix has the shape the
 * markup actually wants: a real heading element wrapping the trigger.
 */
export function PrioritySection({ priority }: { priority: FitPriority }) {
    return (
        <Accordion.Item
            value={priority.priority}
            className="border-t border-finn-cotton"
        >
            <Accordion.Header className="flex">
                <Accordion.Trigger className="group flex w-full items-start gap-2.5 px-5 py-4 text-left transition-colors hover:bg-finn-snow">
                    <span
                        aria-hidden="true"
                        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-finn-pale-blue text-finn-accent-blue"
                    >
                        <PriorityIcon
                            name={priority.icon}
                            className="h-4 w-4"
                        />
                    </span>

                    <span className="min-w-0 flex-1">
                        <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-finn-accent-blue">
                            Your priority #{priority.rank}
                        </span>

                        <span className="mt-0.5 block text-[15px] font-black leading-5 text-finn-black">
                            {priority.label}
                        </span>

                        <span className="mt-0.5 block text-[11px] leading-4 text-finn-iron">
                            {describeCoverage(priority)}
                        </span>
                    </span>

                    {/*
                      * The band and the chevron travel together, tight, so
                      * the header's text column keeps as much width as it
                      * can.
                      */}
                    <span className="flex shrink-0 items-start gap-1">
                        <BandChip
                            level={priority.band.level}
                            label={priority.band.label}
                            compact
                        />

                        <ChevronDown
                            aria-hidden="true"
                            className="mt-1 h-4 w-4 shrink-0 text-finn-iron transition-transform group-data-[state=open]:rotate-180"
                        />
                    </span>
                </Accordion.Trigger>
            </Accordion.Header>

            <Accordion.Content>
                <div className="flex flex-col gap-3 px-5 pb-4">
                    {/*
                      * Environmental impact renders itself, in full. This
                      * panel used to show its one summary sentence and drop
                      * the figures, the caveats and the method on the floor —
                      * the same reading, three surfaces, three different
                      * amounts of it. There is one renderer now.
                      */}
                    {priority.priority === "environmental" ? (
                        <EnvironmentalResult
                            assessment={priority.impact}
                            band={priority.band}
                        />
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

                    <FeatureTable table={featureTableOf(tableInputOf(priority))} />

                    {/*
                      * Only where the prose above is absent. The engine writes
                      * the same facts into a sentence — "It has 5 seats and
                      * 400 L of boot space" — and this list was repeating it
                      * verbatim a few lines below. Where there is no sentence
                      * (a car FINN sent no equipment list for) this is the
                      * only place the figures appear, so it stays.
                      */}
                    {priority.measurements.length > 0 &&
                        priority.priority !== "environmental" &&
                        priority.sentences.length === 0 && (
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

                    {!priority.hasEvidence &&
                        priority.priority !== "environmental" && (
                        <p className="text-[12px] leading-[18px] text-finn-iron">
                            FINN's data doesn't carry anything we can judge
                            this priority on for this car.
                        </p>
                    )}
                </div>
            </Accordion.Content>
        </Accordion.Item>
    );
}

