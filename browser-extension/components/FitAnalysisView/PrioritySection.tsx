import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

import { EnvironmentalResult } from "@/components/EnvironmentalResult";
import {
    FeatureChip,
    type FeatureChipTone,
} from "@/components/FeatureChip";
import { PriorityIcon } from "@/components/PriorityIcon";
import { describeCoverage } from "@/lib/car-labels";
import type { FitFeature, FitPriority } from "@/lib/reasoning-engine/fit";

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

                    {/*
                      * Only where the prose above is absent. The engine writes
                      * the same facts into a sentence — "It has 5 seats and
                      * 400 L of boot space" — and this list was repeating it
                      * verbatim a few lines below. Where there is no sentence
                      * (a car FINN sent no equipment list for) this is the
                      * only place the figures appear, so it stays.
                      */}
                    {priority.measurements.length > 0 &&
                        !priority.impact &&
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

                    {!priority.hasEvidence && (
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
