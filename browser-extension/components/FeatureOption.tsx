import { InfoTip } from "@/components/InfoTip";
import {
    FEATURE_IMPORTANCE,
    FEATURES,
    IMPORTANCE_SCALE,
    STANDARD_INFLUENCE,
} from "@/lib/reasoning-engine/constants";
import type {
    FeatureId,
    FeatureImportance,
} from "@/lib/reasoning-engine/types";

/** A priority the user has already given this same feature extra influence in. */
export interface FeatureElsewhere {
    label: string;
    icon: string;
}

interface FeatureOptionProps {
    feature: FeatureId;
    /** The level the reader gave it, or null — which means standard. */
    importance: FeatureImportance | null;
    /** True when the cap is reached and this one isn't in it. */
    disabled: boolean;
    /** Other priorities where this same feature is already picked out. */
    alsoPickedIn?: FeatureElsewhere[];
    /** Raise it to a level, or put it back to standard with null. */
    onSet: (importance: FeatureImportance | null) => void;
}

/**
 * One feature, and how much it counts, as a card.
 *
 * Every feature in the priority gets one, and every one of them shows the
 * same four-step control — standard, somewhat, moderately, highly. That is
 * the point of the shape: a reader can see that all fifteen are on the scale
 * and that ten of them are sitting on *standard*, which is a far better
 * answer to "what happens to the ones I didn't pick" than any sentence
 * underneath a list of checkboxes.
 *
 * One tap does both jobs — picking a feature and saying how much it counts —
 * because "not picked" is just the first segment. Nothing appears, nothing
 * moves, and there is no default to correct afterwards.
 */
export function FeatureOption({
    feature,
    importance,
    disabled,
    alsoPickedIn,
    onSet,
}: FeatureOptionProps) {
    const { label, explanation } = FEATURES[feature];
    const level = importance ? FEATURE_IMPORTANCE[importance] : null;

    return (
        /*
         * A container query, not a breakpoint. On a wide panel the name and
         * the control share a line; in the narrow settings editor the control
         * drops below. A viewport breakpoint can't tell those apart — the
         * settings page is a wide window with a narrow panel in it.
         */
        <div
            className={[
                "@container rounded-xl p-2 transition",
                level
                    ? level.selectedCardClass
                    : disabled
                        ? "bg-white/50"
                        : "bg-white shadow-sm",
            ].join(" ")}
        >
            <div className="flex flex-col items-start gap-1.5 @sm:flex-row @sm:items-center @sm:gap-2">
                <span className="flex min-w-0 flex-1 items-center gap-1.5">
                    <span
                        aria-hidden
                        className={[
                            "h-2.5 w-2.5 shrink-0 rounded-full transition",
                            level ? level.dotClass : STANDARD_INFLUENCE.dotClass,
                        ].join(" ")}
                    />

                    <span className="min-w-0 flex-1 text-xs font-bold leading-4 text-finn-black">
                        {label}

                        {alsoPickedIn && alsoPickedIn.length > 0 && (
                            <span aria-hidden className="ml-1 opacity-70">
                                {alsoPickedIn.map((item) => item.icon).join("")}
                            </span>
                        )}
                    </span>

                    {explanation && (
                        <span className="shrink-0">
                            <InfoTip subject={label}>{explanation}</InfoTip>
                        </span>
                    )}
                </span>

                <div
                    role="radiogroup"
                    aria-label={`How much ${label} should influence your decision`}
                    className="flex shrink-0 gap-0.5 rounded-lg bg-finn-snow p-0.5 @sm:ml-auto"
                >
                    {/*
                      * Standard first, because that is where every feature
                      * starts and where most of them stay. Reading the row
                      * left to right is reading the scale.
                      */}
                    <Segment
                        label={STANDARD_INFLUENCE.label}
                        hint={STANDARD_INFLUENCE.hint}
                        active={importance == null}
                        activeClass={STANDARD_INFLUENCE.activeClass}
                        /* Never blocked: dropping back to standard is how
                           the reader frees a slot at the cap. */
                        disabled={false}
                        onClick={() => onSet(null)}
                    />

                    {IMPORTANCE_SCALE.map((option) => {
                        const meta = FEATURE_IMPORTANCE[option];

                        return (
                            <Segment
                                key={option}
                                label={meta.label}
                                hint={
                                    disabled
                                        ? "You've raised five already — put one back to standard to swap"
                                        : meta.hint
                                }
                                active={importance === option}
                                activeClass={meta.activeClass}
                                disabled={disabled}
                                onClick={() => onSet(option)}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function Segment({
    label,
    hint,
    active,
    activeClass,
    disabled,
    onClick,
}: {
    label: string;
    hint: string;
    active: boolean;
    activeClass: string;
    disabled: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled && !active}
            title={hint}
            onClick={onClick}
            className={[
                "rounded-md px-2 py-1 text-[10px] font-black transition",
                active
                    ? `${activeClass} shadow-sm`
                    : disabled
                        ? "cursor-not-allowed text-finn-iron/40"
                        : "text-finn-iron hover:bg-white hover:text-finn-black",
            ].join(" ")}
        >
            {label}
        </button>
    );
}
