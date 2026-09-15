import * as RadioGroup from "@radix-ui/react-radio-group";
import { Info, Lock } from "lucide-react";

import { PriorityIcon } from "@/components/PriorityIcon";
import { surfaceTone } from "@/lib/priority-marks";

import {
    FEATURE_IMPORTANCE,
    FEATURES,
    IMPORTANCE_SCALE,
    MAX_FEATURES_PER_CATEGORY,
    STANDARD_INFLUENCE,
} from "@/lib/reasoning-engine/constants";
import type {
    FeatureId,
    FeatureImportance,
} from "@/lib/reasoning-engine/types";

/**
 * What the first rung is worth on the wire.
 *
 * A radio group's value is a string, and "standard" is the absence of a
 * stored importance rather than one of the three. This is the name that
 * absence answers to inside the control, and it is turned back into `null` on
 * the way out.
 */
const STANDARD = "standard";

/** The most any rung weighs, so every rung's meter shares one scale. */
const STRONGEST = Math.max(
    ...IMPORTANCE_SCALE.map((level) => FEATURE_IMPORTANCE[level].weight),
);

/**
 * A raised card's ground and edge, in its level's hue.
 *
 * A wash that fades to white rather than a flat tint: flat pale cards read as
 * a coloured list, and on a list of fifteen that is noise. The wash says which
 * ones are raised at a glance and leaves the text sitting on white.
 */
const RAISED_CARD: Record<FeatureImportance, string> = {
    high: "bg-linear-to-r from-finn-influence-red-pale to-white to-50% ring-finn-influence-red/30",
    medium: "bg-linear-to-r from-finn-influence-orange-pale to-white to-50% ring-finn-influence-orange/30",
    low: "bg-linear-to-r from-finn-influence-emerald-pale to-white to-50% ring-finn-influence-emerald/30",
};

/** A priority the user has already given this same feature extra influence in. */
export interface FeatureElsewhere {
    label: string;
    icon: string;
}

interface FeatureOptionProps {
    feature: FeatureId;
    /** The level the reader gave it, or null — which means standard. */
    importance: FeatureImportance | null;
    /** True when this category's cap is reached and this row isn't in it. */
    atCap: boolean;
    /**
     * The other priorities where this same feature is already raised.
     *
     * Set only when it is raised *elsewhere and not here* — a feature raised
     * in this category is not competing with itself.
     */
    raisedElsewhere?: FeatureElsewhere[];
    /** Raise it to a level, or put it back to standard with null. */
    onSet: (importance: FeatureImportance | null) => void;
}

/**
 * One feature, and how much it counts, as a card.
 *
 * Every feature in the priority gets one, and every one shows the same
 * four-step control — standard, somewhat, moderately, highly. That is the
 * point of the shape: a reader can see that all of them are on the scale and
 * that most are resting on *standard*, which is a far better answer to "what
 * happens to the ones I didn't pick" than any sentence underneath a list of
 * checkboxes.
 *
 * **A column of weights down the left.** Each card opens on a tile holding its
 * multiplier — 1× in grey, 2×, 3× and 4× in their level's colour — so the list
 * can be read top to bottom as "what counts for how much" without looking
 * inside a single control. The control still says the level; the tile is the
 * index to it, the way a row number is to a table.
 *
 * **The control is four choices, not four progress bars.** Stretched across a
 * settings-width card, four full-width meters read as a chart of something
 * rather than as buttons, with their labels lost in the corners. Each rung is
 * now a compact button carrying its name, its multiplier, and a meter of
 * rising bars filled as far as its weight — the same idea, drawn at the size
 * of a choice. Where the card has room it sits beside the words; where it
 * doesn't — a phone, or the compare drawer — it runs under them. That is a
 * container query rather than a breakpoint, because the same card lives in a
 * wide page and a narrow drawer on the same screen.
 *
 * Standard cards are white, not grey. Grey is what a disabled control looks
 * like, and standard is where most features are meant to sit.
 *
 * Two ways a card can be unavailable, and they are told apart because the
 * reader can act on one and not the other. **At the cap** is this category's
 * own doing and the fix is here: put something back to standard — said under
 * the control, not only in a tooltip a touch screen never shows. **Raised
 * elsewhere** is a different category's doing and the fix is there, so the
 * card names the category rather than leaving them to hunt.
 */
export function FeatureOption({
    feature,
    importance,
    atCap,
    raisedElsewhere,
    onSet,
}: FeatureOptionProps) {
    const { label, explanation } = FEATURES[feature];

    const elsewhere = raisedElsewhere ?? [];
    const locked = elsewhere.length > 0;
    const blocked = locked || atCap;

    if (locked) {
        return (
            <LockedOption
                label={label}
                explanation={explanation}
                elsewhere={elsewhere}
            />
        );
    }

    return (
        <div
            className={[
                "@container rounded-2xl p-3 ring-1 transition sm:p-3.5",
                importance
                    ? `shadow-sm ${RAISED_CARD[importance]}`
                    : "bg-white shadow-sm ring-black/5",
            ].join(" ")}
        >
            <div className="flex flex-col gap-3 @2xl:flex-row @2xl:items-center @2xl:gap-5">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                    <WeightTile importance={importance} />

                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-black leading-5 text-finn-black">
                            {label}
                        </p>

                        {/*
                          * Said here rather than hidden behind an "i". A reader
                          * deciding how much something should count needs to know
                          * what it is first.
                          */}
                        {explanation && (
                            <p className="mt-0.5 text-[11px] leading-4 text-finn-iron">
                                {explanation}
                            </p>
                        )}
                    </div>
                </div>

                <div className="shrink-0 @2xl:w-88">
                    <RadioGroup.Root
                        value={importance ?? STANDARD}
                        onValueChange={(next) =>
                            onSet(
                                next === STANDARD
                                    ? null
                                    : (next as FeatureImportance),
                            )
                        }
                        aria-label={`How much influence ${label} has`}
                        className="grid grid-cols-4 gap-0.5 rounded-xl bg-finn-snow p-0.5 ring-1 ring-black/5 @xs:gap-1 @xs:p-1"
                    >
                        {/*
                          * Standard first, because that is where every feature
                          * starts and where most of them stay. Reading the row
                          * left to right is reading the scale.
                          */}
                        <Segment
                            value={STANDARD}
                            label={STANDARD_INFLUENCE.label}
                            weight={STANDARD_INFLUENCE.weight}
                            hint={STANDARD_INFLUENCE.hint}
                            active={importance == null}
                            activeClass="bg-white text-finn-black shadow-sm ring-1 ring-black/10"
                            idleText="text-finn-iron"
                            barClass="bg-finn-iron/50"
                            activeBarClass="bg-finn-iron/70"
                            /* Standard's pressed ground is white, so its unlit
                               bars need a grey, not the white wash the solid
                               rungs use — white on white left one lone bar
                               that read as a dot. */
                            activeEmptyClass="bg-black/10"
                            /* Never blocked: dropping back to standard is how
                               the reader frees a slot at the cap. */
                            disabled={false}
                        />

                        {IMPORTANCE_SCALE.map((option) => {
                            const meta = FEATURE_IMPORTANCE[option];

                            return (
                                <Segment
                                    key={option}
                                    value={option}
                                    label={meta.label}
                                    weight={meta.weight}
                                    hint={meta.hint}
                                    active={importance === option}
                                    activeClass={`${meta.dotClass} text-white shadow-md`}
                                    idleText={meta.accentTextClass}
                                    barClass={meta.dotClass}
                                    activeBarClass="bg-white"
                                    activeEmptyClass="bg-white/35"
                                    disabled={blocked}
                                />
                            );
                        })}
                    </RadioGroup.Root>

                    {atCap && (
                        <p className="mt-1.5 flex items-start gap-1.5 px-1 text-[10px] leading-4 text-finn-iron">
                            <Info
                                aria-hidden="true"
                                className="mt-px h-3 w-3 shrink-0"
                            />
                            You've raised {MAX_FEATURES_PER_CATEGORY} already. Set
                            one back to Standard to raise this instead.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * The multiplier this feature carries, as the card's first thing.
 *
 * Solid in the level's colour once raised, so the raised few stand out of a
 * column of grey; a quiet outlined 1× on standard, because standard is a real
 * weight and not an empty slot.
 */
function WeightTile({ importance }: { importance: FeatureImportance | null }) {
    const meta = importance ? FEATURE_IMPORTANCE[importance] : null;

    return (
        <span
            aria-hidden="true"
            className={[
                "flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl leading-none",
                meta
                    ? `${meta.dotClass} text-white shadow-sm`
                    : "bg-finn-snow text-finn-iron ring-1 ring-black/5",
            ].join(" ")}
        >
            <span className="text-base font-black tabular-nums">
                {meta?.weight ?? STANDARD_INFLUENCE.weight}×
            </span>

            <Meter
                weight={meta?.weight ?? STANDARD_INFLUENCE.weight}
                filled={meta ? "bg-white" : "bg-finn-iron/50"}
                empty={meta ? "bg-white/35" : "bg-black/10"}
                className="mt-1"
            />
        </span>
    );
}

/**
 * Rising bars, filled as far as a weight — a signal meter at 1× to 4×.
 *
 * Four bars for four rungs, so every meter on the screen has the same outline
 * and differs only in how much of it is lit. That is the comparison the reader
 * is making, drawn as the one thing that changes.
 */
function Meter({
    weight,
    filled,
    empty,
    className = "",
}: {
    weight: number;
    filled: string;
    empty: string;
    className?: string;
}) {
    return (
        <span
            aria-hidden="true"
            className={["flex items-end gap-0.5", className].join(" ")}
        >
            {Array.from({ length: STRONGEST }, (_, index) => (
                <span
                    key={index}
                    className={[
                        "w-0.75 rounded-full",
                        index < weight ? filled : empty,
                    ].join(" ")}
                    style={{ height: `${4 + index * 2}px` }}
                />
            ))}
        </span>
    );
}

/**
 * A feature spoken for under another priority.
 *
 * Slimmer than an active card on purpose. Nothing on it can be pressed, and at
 * full height the locked rows — half a priority, in some — pushed the ones a
 * reader can act on apart and repeated the same boxed sentence down the page.
 * It keeps the name, what the feature is, and where it is raised, drawn as
 * that priority's own chip so the reader can see which card to open.
 */
function LockedOption({
    label,
    explanation,
    elsewhere,
}: {
    label: string;
    explanation?: string;
    elsewhere: FeatureElsewhere[];
}) {
    return (
        <div className="@container rounded-2xl bg-finn-snow p-3 ring-1 ring-black/5">
            <div className="flex flex-col gap-2.5 @2xl:flex-row @2xl:items-center @2xl:gap-5">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span
                        aria-hidden="true"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-finn-iron/70 ring-1 ring-black/5"
                    >
                        <Lock className="h-4 w-4" />
                    </span>

                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-black leading-5 text-finn-iron">
                            {label}
                        </p>

                        {explanation && (
                            <p className="mt-0.5 text-[11px] leading-4 text-finn-iron/80">
                                {explanation}
                            </p>
                        )}
                    </div>
                </div>

                <ElsewhereNote elsewhere={elsewhere} />
            </div>
        </div>
    );
}

/**
 * Where this feature is already raised, and therefore why it can't be raised
 * here.
 *
 * Named rather than merely refused. "Not available" tells a reader nothing
 * they can act on; the category tells them exactly where to go and what to
 * undo.
 */
function ElsewhereNote({ elsewhere }: { elsewhere: FeatureElsewhere[] }) {
    return (
        <div className="shrink-0 @2xl:w-88">
            <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-black text-finn-black">
                    Raised under
                </span>

                {/*
                  * One chip per priority the feature is raised under, in that
                  * priority's colour, laid out rather than concatenated.
                  */}
                {elsewhere.map((item) => {
                    const tone = surfaceTone(item.icon);

                    return (
                        <span
                            key={item.label}
                            className={[
                                "inline-flex items-center gap-1 rounded-full py-0.5 pl-1.5 pr-2 text-[10px] font-black ring-1",
                                tone.ground,
                                tone.edge,
                                tone.ink,
                            ].join(" ")}
                        >
                            <PriorityIcon
                                name={item.icon}
                                className="h-3 w-3 shrink-0"
                            />
                            {item.label}
                        </span>
                    );
                })}
            </div>

            <p className="mt-1 text-[10px] leading-4 text-finn-iron">
                Set it back to Standard there to raise it here.
            </p>
        </div>
    );
}

/**
 * One rung of the scale: its name, its multiplier, and a meter lit as far as
 * the multiplier.
 *
 * The meter is what makes four words a scale — the tile at the start of the
 * card draws the same one — and the "×" says exactly what the meter only
 * suggests. Colour is the fast read and the words are the real one; both stay
 * on every state.
 *
 * A Radix radio item rather than a button with `role="radio"` written on it:
 * the group takes a single tab stop, the arrow keys move the selection, and
 * `aria-checked` comes from the value rather than from a prop that could
 * disagree with it.
 */
function Segment({
    value,
    label,
    weight,
    hint,
    active,
    activeClass,
    idleText,
    barClass,
    activeBarClass,
    activeEmptyClass,
    disabled,
}: {
    /** The stored importance this rung sets, or `STANDARD` for the first. */
    value: string;
    label: string;
    weight: number;
    hint: string;
    active: boolean;
    activeClass: string;
    /** The label's colour when this rung isn't pressed. */
    idleText: string;
    /** The meter's fill when this rung isn't pressed. */
    barClass: string;
    /** The meter's fill on the pressed rung, which sits on a solid ground. */
    activeBarClass: string;
    /** The unlit bars on the pressed rung — against whatever its ground is. */
    activeEmptyClass: string;
    disabled: boolean;
}) {
    const inert = disabled && !active;

    return (
        <RadioGroup.Item
            value={value}
            disabled={inert}
            title={hint}
            className={[
                "flex min-w-0 flex-col items-center gap-1 rounded-lg px-0.5 py-1.5 text-center transition @xs:px-1",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finn-accent-blue/50",
                segmentClass(active, inert, idleText),
                active ? activeClass : "",
            ].join(" ")}
        >
            {/* The name gets the whole width, and a hair less tracking on a
                phone: "Moderately" in a phone-wide card has no room to spare,
                and cut to "Moderat…" it stops being a word. */}
            <span className="max-w-full text-[10px] font-black leading-3 tracking-tight @sm:tracking-normal">
                {label}
            </span>

            <span className="flex items-center gap-1.5">
                <Meter
                    weight={weight}
                    filled={active ? activeBarClass : barClass}
                    empty={active ? activeEmptyClass : "bg-black/10"}
                />

                <span
                    className={[
                        "text-[10px] font-bold leading-3 tabular-nums",
                        active ? "opacity-95" : "opacity-75",
                    ].join(" ")}
                >
                    {weight}×
                </span>
            </span>
        </RadioGroup.Item>
    );
}

function segmentClass(active: boolean, inert: boolean, idleText: string): string {
    if (active) return "";

    if (inert) return "cursor-not-allowed opacity-40";

    return `${idleText} hover:bg-white hover:shadow-sm`;
}
