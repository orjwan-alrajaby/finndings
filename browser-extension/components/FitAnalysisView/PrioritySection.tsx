import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

import { EnvironmentalResult } from "@/components/EnvironmentalResult";
import { FactRow, FactTable } from "@/components/FactTable";
import { FeatureChip } from "@/components/FeatureChip";
import { InfoTip } from "@/components/InfoTip";
import { PriorityIcon } from "@/components/PriorityIcon";
import { describeCoverage } from "@/lib/car-labels";
import {
    featureGroupsOf,
    type FeatureGroup,
    type InfluenceBand,
} from "@/lib/feature-copy";
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

                    <FeatureGroups priority={priority} />

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

/**
 * What the car has and hasn't, in this priority, in the five groups
 * `featureGroupsOf` sorts it into.
 *
 * One table rather than five soft grey boxes. Each group is a row edged in the
 * colour of its answer — blue for a pick the car meets, red for one it
 * misses, green for equipment that counted anyway, grey for the rest — which
 * is the same edge the environmental result and "How much it uses" use, and it
 * carries the distinction the grouping exists to make before a word is read.
 *
 * The panel's twin is `featureGroups` in `lens-panel/sections.ts`; the five
 * titles and their colours are decided in `lib/feature-copy` so the two
 * surfaces can't drift on which question they are answering.
 */
function FeatureGroups({ priority }: { priority: FitPriority }) {
    const groups = featureGroupsOf(priority);

    if (!groups.length) return null;

    return (
        <FactTable>
            {groups.map((group) => (
                <Group key={group.id} group={group} />
            ))}
        </FactTable>
    );
}

function Group({ group }: { group: FeatureGroup }) {
    return (
        /* A row carrying three headings and three clouds of chips needs more
           room than one carrying a label and a line of them. */
        <FactRow
            tone={group.tone}
            data-group={group.id}
            className={`px-3.5 ${group.bands ? "py-4" : "py-3"}`}
        >
            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-finn-iron">
                {group.title} ({group.features.length})
            </p>

            {/*
              * The picks the car hasn't got are sorted under the level the
              * reader gave each one; every other group is one cloud of chips.
              * Chips, the way the Advice page draws the same facts — a column
              * of ticks and crosses read as a form; these read as the things
              * themselves, and a dozen fit where six rows did.
              */}
            {group.bands ? (
                /*
                  * Room to breathe. Three headings, three clouds of chips and
                  * the group's own title at 10px were stacked a few pixels
                  * apart, which read as one block of small type rather than as
                  * four things — and the grouping is the whole point of it.
                  */
                <div className="mt-3.5 flex flex-col gap-4">
                    {group.bands.map((band) => (
                        <Band key={band.level} band={band} struck={group.struck} />
                    ))}
                </div>
            ) : (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {group.features.map((feature) => (
                        <FeatureChip
                            key={feature.key}
                            fact={feature}
                            tone={group.chip}
                            struck={group.struck}
                        />
                    ))}
                </div>
            )}
        </FactRow>
    );
}

/**
 * One level of influence, and the picks the car is missing at that level.
 *
 * The heading says the level in the picker's own words and the "i" beside it
 * says what the level actually does to the result — which is the question a
 * reader has at exactly this moment, having just been told the car misses
 * something they called highly influential. The chips take the level's colour,
 * so the three bands are told apart before they are read.
 */
function Band({ band, struck }: { band: InfluenceBand; struck: boolean }) {
    return (
        <div data-band={band.level}>
            <p
                className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.1em] ${band.accent}`}
            >
                <span>
                    {band.title} ({band.features.length})
                </span>

                <InfoTip subject={band.title}>{band.meaning}</InfoTip>
            </p>

            <div className="mt-2 flex flex-wrap gap-1.5">
                {band.features.map((feature) => (
                    <FeatureChip
                        key={feature.key}
                        fact={feature}
                        tone={band.level}
                        struck={struck}
                        withLevel={false}
                    />
                ))}
            </div>
        </div>
    );
}
