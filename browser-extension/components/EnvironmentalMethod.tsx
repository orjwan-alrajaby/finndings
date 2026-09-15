import * as Collapsible from "@radix-ui/react-collapsible";
import {
    Calculator,
    ChevronDown,
    CircleSlash,
    Cloud,
    Factory,
    Fuel,
    Info,
    PlugZap,
    Ruler,
    Tag,
} from "lucide-react";

import { FactTable } from "@/components/FactTable";
import { METHOD_GROUPS, type MethodGroup } from "@/lib/environment-copy";
import type { EnvironmentalMethodNote } from "@/lib/reasoning-engine/environmental";
import type { SurfaceTone } from "@/lib/priority-marks";
import { ROW_TONE } from "@/lib/row-tone";

/**
 * Lucide shapes, one per note and one per half.
 *
 * `Cloud` and `Fuel` are the marks the comparison table puts on the CO₂ and
 * the energy rows, on purpose: a reader meets those two shapes against those
 * two figures on a car's result, and meets them again here against the notes
 * explaining them. One vocabulary across the surfaces rather than a fresh set
 * of symbols on each.
 */
const NOTE_ICON: Record<EnvironmentalMethodNote["icon"], typeof Cloud> = {
    cloud: Cloud,
    fuel: Fuel,
    calculator: Calculator,
    tag: Tag,
    plug: PlugZap,
    factory: Factory,
};

const GROUP_ICON: Record<MethodGroup["icon"], typeof Cloud> = {
    ruler: Ruler,
    "circle-slash": CircleSlash,
};

/**
 * What ranking this priority high will actually do, said in one line.
 *
 * Lives here rather than at each call site because it was written twice and
 * both copies went stale together: they described "four figures, each read
 * against a fixed scale" long after the model had been cut down to one.
 *
 * "Puts out over a kilometre of driving", not "into the air": what is scored
 * is what leaves the car while it is driven, and the last note in the fold
 * says plainly that generating the electricity an electric car charges on
 * carries emissions this doesn't count. A lead sentence that claimed the
 * whole atmosphere was being weighed would be contradicted one click below
 * itself — and it is the sentence most readers stop at.
 *
 * The rest is checked against the engine rather than asserted: rank decides
 * weight in `priorityWeights`; the score is `positionForCo2` and nothing
 * else; an electric car with no published figure is read as 0 g/km, which is
 * the top of the scale; and `environmental` is the only category in
 * `CATEGORIES` with `numericOnly: true`.
 */
export const ENVIRONMENTAL_LEAD =
    "Rank this high and Lens will favour cars that put out less CO₂ over a kilometre of driving — an electric car over a petrol one, a frugal petrol car over a thirsty one. It's the only priority judged on the car's own figures rather than on the equipment it carries.";

/**
 * The whole method, behind one fold.
 *
 * Two things had to be true at once here. A reader who knows nothing about
 * cars must be able to finish the environmental section without meeting the
 * German CO₂ regulation, plug-in hybrid test procedure or the difference
 * between an emissions figure and a consumption figure. And somebody at FINN
 * looking at this as a piece of product work must be able to find all of it,
 * accurate and unhedged, in one click.
 *
 * So: one fold, closed. Inside it the six notes the model publishes, word for
 * word, under the two headings they divide into — what the result is based on,
 * and what it doesn't cover. Not six folds. The failure this replaces was a
 * flat wall of six explanation cards shown to everybody, in which "What a car
 * runs on isn't scored on its own" read as something a reader needed before
 * they were allowed to understand their result.
 *
 * This is the only place the method is drawn. The in-page panel carried a
 * twin of it for a while, under the result: how a priority is worked out is a
 * question about the reader's own setup rather than about the car they are
 * looking at, and it is answered where the priority is set.
 */
function Disclosure({ label, tone }: { label: string; tone?: SurfaceTone }) {
    return (
        <>
            {/*
              * Screen only. A fold photographs as a closed heading, so the
              * export gets the flat copy below instead of this — the same
              * bargain the feature chips and their tables strike. Radix's
              * `forceMount` is not that bargain: it holds the content open
              * for everybody, which is the one thing this fold exists to
              * avoid.
              */}
            <Collapsible.Root className="finn-lens-screen-only">
                {/*
                  * A soft grey bar rather than an outlined box: closed, this
                  * is the least urgent thing on the screen, and an outline
                  * gave it the same weight as the panels around it. What
                  * opens *out* of it is framed, because by then the reader
                  * has asked for it.
                  */}
                <Collapsible.Trigger
                    className={[
                        "group flex w-full items-center gap-2.5 rounded-2xl px-3.5 py-3 text-left transition-colors",
                        tone
                            ? `ring-1 ${tone.ground} ${tone.edge} ${tone.groundHover} ${tone.edgeHover}`
                            : "bg-finn-snow hover:bg-finn-cotton",
                    ].join(" ")}
                >
                    {/*
                      * One mark of colour on the closed bar. Grey from edge
                      * to edge, the fold read as a disabled strip rather than
                      * as the thing that answers "how was this worked out?",
                      * which is the question it is the only answer to.
                      */}
                    <span
                        aria-hidden="true"
                        className={[
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg",
                            tone ? "bg-white shadow-sm" : "bg-finn-pale-blue",
                        ].join(" ")}
                    >
                        <Info
                            className={[
                                "h-3.5 w-3.5",
                                tone ? tone.ink : "text-finn-accent-blue",
                            ].join(" ")}
                        />
                    </span>

                    <span className="min-w-0 flex-1 text-[12px] font-black text-finn-black">
                        {label}
                    </span>

                    <ChevronDown
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 text-finn-iron transition-transform group-data-[state=open]:rotate-180"
                    />
                </Collapsible.Trigger>

                <Collapsible.Content>
                    <Notes className="mt-2.5" />
                </Collapsible.Content>
            </Collapsible.Root>

            <div className="finn-lens-export-only">
                <p className="text-[12px] font-black text-finn-black">
                    {label}
                </p>

                <Notes className="mt-2.5" />
            </div>
        </>
    );
}

/**
 * The method's six notes, under the two headings they divide into.
 *
 * Drawn in `FactTable` — the frame every list of facts in this app is drawn
 * in — one card per half, each opening with a tinted band that says which
 * half it is, and every note carrying the mark of what it is about.
 *
 * What this replaces was six soft grey boxes stacked in a column: the same
 * radius, the same fill and the same width as the bar that opened them, so
 * the fold's contents read as more folds, and two 10px captions were the only
 * thing telling six identical lozenges apart. Worse, the fill was picked by a
 * `tone` prop the compare drawer had set wrong, so on that surface the boxes
 * were white on white and the whole method arrived as one wall of text.
 *
 * The colour is the section's own, not a new one: blue for what Lens does —
 * the blue its priority marks and eyebrows already wear — and amber for where
 * it stops, which is the tone the plug-in caveat above the table is written
 * in. That pairing is what makes the two halves findable without reading
 * them: a reader looking for the catch scrolls to the amber card.
 *
 * No coloured edge on the rows. The edge means what a row *says* about a car
 * — green for what it has, amber for what it hasn't — and these rows judge
 * nothing, so they take the frame without the verdict.
 */
function Notes({ className }: { className: string }) {
    return (
        <div className={`space-y-3 ${className}`}>
            {METHOD_GROUPS.map((group) => (
                <Group key={group.id} group={group} />
            ))}
        </div>
    );
}

function Group({ group }: { group: MethodGroup }) {
    const tone = ROW_TONE[group.tone];
    const GroupIcon = GROUP_ICON[group.icon];

    return (
        <FactTable
            header={
                /*
                 * The band is inside the card rather than a caption floating
                 * above it, so the colour belongs to the notes it heads: a
                 * half is one object you can point at.
                 */
                <div
                    className={`flex items-center gap-2 border-b border-finn-cotton ${tone.ground} px-3.5 py-2`}
                >
                    <GroupIcon
                        aria-hidden="true"
                        className={`h-3.5 w-3.5 shrink-0 ${tone.deep}`}
                    />

                    {/* `deep`, not `ink`: a 10px label on the tone's own
                        tint needs the darker end of the hue to clear 4.5:1. */}
                    <p
                        className={`text-[10px] font-black uppercase tracking-[0.12em] ${tone.deep}`}
                    >
                        {group.title}
                    </p>
                </div>
            }
        >
            {group.notes.map((note) => {
                const Icon = NOTE_ICON[note.icon];

                return (
                    <div key={note.heading} className="px-3.5 py-3">
                        {/*
                          * The mark sits on the heading's own line, the way
                          * the comparison table's does — not in a gutter down
                          * the left, which at panel width would take a fifth
                          * of the column the prose needs.
                          */}
                        <div className="flex items-center gap-2">
                            <span
                                aria-hidden="true"
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${tone.ground}`}
                            >
                                <Icon className={`h-3.5 w-3.5 ${tone.ink}`} />
                            </span>

                            <p className="min-w-0 text-[12px] font-black leading-4 text-finn-black">
                                {note.heading}
                            </p>
                        </div>

                        <p className="mt-1.5 text-[11px] leading-[17px] text-finn-iron">
                            {note.body}
                        </p>
                    </div>
                );
            })}
        </FactTable>
    );
}

/**
 * The fold on its own, for a surface that writes its own lead above it — the
 * settings editor draws the scale between the two.
 */
export function EnvironmentalMethodDetail({ tone }: { tone?: SurfaceTone }) {
    return (
        <Disclosure
            label="The detail: what's measured, and what isn't"
            tone={tone}
        />
    );
}

/**
 * How environmental impact is judged, explained where there is no car yet.
 *
 * Every other priority explains itself through the list of features beneath
 * it: a reader opens Safety, sees fifteen things, and understands what the
 * score is counting. This one has no list, so what it needs to say instead is
 * which figure decides the result and — more usefully — which figures
 * deliberately don't.
 *
 * One line of that, then the fold. Somebody deciding where to put this
 * priority in their order needs the first sentence; the six notes are for
 * somebody checking the reasoning, and they are one click away rather than
 * stacked under the question that was actually asked.
 */
export function EnvironmentalMethod() {
    return (
        <div className="space-y-3">
            <p className="text-xs leading-5 text-finn-iron">
                {ENVIRONMENTAL_LEAD}
            </p>

            {/* Under a heading that already names the priority. */}
            <Disclosure label="The detail: what's measured, and what isn't" />
        </div>
    );
}
