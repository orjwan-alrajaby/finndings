import * as RadioGroup from "@radix-ui/react-radio-group";
import { Lock } from "lucide-react";

import { PriorityIcon } from "@/components/PriorityIcon";
import { InfluencePill } from "@/components/InfluencePill";

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
 * point of the shape: a reader can see that all fifteen are on the scale and
 * that ten of them are resting on *standard*, which is a far better answer to
 * "what happens to the ones I didn't pick" than any sentence underneath a
 * list of checkboxes.
 *
 * One tap does both jobs — picking a feature and saying how much it counts —
 * because "not raised" is just the first segment. Nothing appears, nothing
 * moves, and there is no default to correct afterwards.
 *
 * Stacked rather than laid out in a line: the name, then what the thing
 * actually is, then the question, then the answer. A single row had to put
 * the explanation behind an "i" for want of anywhere to say it, which asks a
 * reader to already know what a feature is before they can decide how much
 * it should count. The question is written above the buttons for the same
 * reason it was the first time — it is the whole point of the control, and a
 * row of four words is not self-evidently a scale.
 *
 * Two ways a card can be unavailable, and they are told apart because the
 * reader can act on one and not the other. **At the cap** is this category's
 * own doing and the fix is here: put something back to standard. **Raised
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
    const level = importance ? FEATURE_IMPORTANCE[importance] : null;

    const elsewhere = raisedElsewhere ?? [];
    const locked = elsewhere.length > 0;
    const blocked = locked || atCap;

    /**
     * How loudly a card states its level.
     *
     * The tint carries it, in the hue of the level, because the whole reason
     * to raise a feature is that it should be visible at a glance which ones
     * you did — and five pale cards among fifteen white ones is a glance.
     * The dot and the name repeat it for anyone who cannot use the hue.
     */
    const cardClass = () => {
        if (level) return level.selectedCardClass;

        return locked ? "bg-white/50" : "bg-finn-iron/10 shadow-sm";
    };

    return (
        <div className={["rounded-2xl p-3 transition drop-shadow-sm", cardClass()].join(" ")}>
            <div className="flex items-start gap-2.5">
                {locked ? (
                    <Lock
                        aria-hidden
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-finn-iron/50"
                    />
                ) : (
                    <span
                        aria-hidden
                        className={[
                            "mt-1 h-2.5 w-2.5 shrink-0 rounded-full transition",
                            level ? level.dotClass : STANDARD_INFLUENCE.dotClass,
                        ].join(" ")}
                    />
                )}

                <div className="min-w-0 flex-1 flex flex-col gap-2">
                    <div className="flex justify-between gap-4">
                        <span
                            className={[
                                "block text-sm leading-5",
                                nameClass(level, locked),
                            ].join(" ")}
                        >
                            {label}
                        </span>
                        <InfluencePill importance={importance} />
                    </div>

                    {/*
                      * Said here rather than hidden behind an "i". A reader
                      * deciding how much something should count needs to know
                      * what it is first, and a tooltip makes that a second
                      * action taken on a hunch.
                      */}
                    {explanation && (
                        <p className="mt-1 text-[11px] leading-4 text-finn-black">
                            {explanation}
                        </p>
                    )}
                </div>
            </div>

            {locked ? (
                <div className="mt-2.5">
                    <ElsewhereNote elsewhere={elsewhere} />
                </div>
            ) : (
                <div className="mt-2.5 rounded-xl bg-white p-2">
                    <p className="px-0.5 text-[10px] font-black uppercase tracking-wide text-finn-iron">
                        How much influence does this have?
                    </p>

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
                        className={[
                            "mt-2 flex gap-2 rounded-lg border border-finn-iron/15 p-2",
                            cardClass(),
                        ].join(" ")}
                    >
                        {/*
                          * Standard first, because that is where every feature
                          * starts and where most of them stay. Reading the row
                          * left to right is reading the scale.
                          */}
                        <Segment
                            value={STANDARD}
                            label={STANDARD_INFLUENCE.label}
                            hint={STANDARD_INFLUENCE.hint}
                            active={importance == null}
                            activeClass={STANDARD_INFLUENCE.activeClass}
                            idleClass={STANDARD_INFLUENCE.idleClass}
                            dotClass={STANDARD_INFLUENCE.dotClass}
                            /* Its active pill is a light grey, not a solid
                               hue, so a white dot on it would be no dot. */
                            activeDotClass="bg-finn-iron/60"
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
                                    hint={
                                        blocked
                                            ? `You've raised ${MAX_FEATURES_PER_CATEGORY} already — put one back to standard to swap`
                                            : meta.hint
                                    }
                                    active={importance === option}
                                    activeClass={meta.activeClass}
                                    idleClass={meta.idleClass}
                                    dotClass={meta.dotClass}
                                    disabled={blocked}
                                />
                            );
                        })}
                    </RadioGroup.Root>
                </div>
            )}
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
    const names = elsewhere.map((item) => item.label);

    const joined =
        names.length === 1
            ? names[0]
            : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;

    return (
        <span
            className="flex shrink-0 items-center gap-1 rounded-lg bg-finn-cotton px-2 py-1 @sm:ml-auto"
            title={`Raised under ${joined}. A feature counts extra in one priority only — put it back to standard there to raise it here.`}
        >
            {/*
              * One mark per priority the feature is raised under. These were
              * emoji joined into a single string; drawn icons are elements,
              * so they are laid out rather than concatenated.
              */}
            <span aria-hidden className="flex items-center gap-0.5">
                {elsewhere.map((item) => (
                    <PriorityIcon
                        key={item.label}
                        name={item.icon}
                        className="h-3 w-3 text-finn-iron"
                    />
                ))}
            </span>

            <span className="text-[10px] font-bold text-finn-iron">
                Raised under {joined}
            </span>
        </span>
    );
}

/** A raised feature says so in its own name, not only in its background. */
function nameClass(
    level: (typeof FEATURE_IMPORTANCE)[FeatureImportance] | null,
    locked: boolean,
): string {
    if (level) return `font-black ${level.accentTextClass}`;

    return locked ? "font-bold text-finn-iron" : "font-bold text-finn-black";
}

function segmentClass(
    active: boolean,
    disabled: boolean,
    activeClass: string,
    idleClass: string,
): string {
    if (active) return activeClass;

    if (disabled) return "cursor-not-allowed bg-white/60 text-finn-iron/40";

    /*
     * The hairline is what makes a resting rung look pressable. White on the
     * panel's own near-white left three of the four options reading as
     * coloured text on every card that hadn't been raised — which is most of
     * them, and exactly the reader who needs to see there is a choice here.
     */
    return `bg-white ring-1 ring-finn-iron/15 ${idleClass}`;
}

/**
 * One rung of the scale.
 *
 * Four of these share the width, so the labels sit under the question rather
 * than crammed against the name — which is what let the words shrink to 10px
 * in the first place.
 *
 * The dot carries the colour so the label never has to. Colour is the fast
 * read; the words are the real one, and they stay on every state.
 *
 * A Radix radio item rather than a button with `role="radio"` written on it.
 * The hand-rolled version announced itself correctly and then behaved like
 * four separate buttons: every rung took a tab stop, and the arrow keys — the
 * one interaction a radio group promises — did nothing. Radix gives the group
 * a single tab stop, moves the selection with the arrows, and sets
 * `aria-checked` from the value rather than from a prop that could disagree
 * with it.
 */
function Segment({
    value,
    label,
    hint,
    active,
    activeClass,
    idleClass,
    dotClass,
    activeDotClass = "bg-white",
    disabled,
}: {
    /** The stored importance this rung sets, or `STANDARD` for the first. */
    value: string;
    label: string;
    hint: string;
    active: boolean;
    activeClass: string;
    idleClass: string;
    dotClass: string;
    /** Overridden where the active pill isn't a solid hue. */
    activeDotClass?: string;
    disabled: boolean;
}) {
    return (
        <RadioGroup.Item
            value={value}
            disabled={disabled && !active}
            title={hint}
            className={[
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-1.5 py-1.5",
                "text-[10px] font-black leading-3 transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finn-accent-blue/50",
                segmentClass(active, disabled, activeClass, idleClass),
            ].join(" ")}
        >
            <span
                aria-hidden="true"
                className={[
                    "h-2 w-2 shrink-0 rounded-full",
                    active ? activeDotClass : dotClass,
                ].join(" ")}
            />

            <span className="text-left">{label}</span>
        </RadioGroup.Item>
    );
}
