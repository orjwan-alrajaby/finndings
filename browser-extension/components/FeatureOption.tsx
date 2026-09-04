import { LockClosedIcon } from "@heroicons/react/24/outline";

import { InfoTip } from "@/components/InfoTip";
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
 * One feature, and how much it counts, as a row.
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
 * Two ways a row can be unavailable, and they are told apart because the
 * reader can act on one and not the other. **At the cap** is this category's
 * own doing and the fix is here: put something back to standard. **Raised
 * elsewhere** is a different category's doing and the fix is there, so the
 * row names the category rather than leaving them to hunt.
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
     * How loudly a row states its level.
     *
     * The tint alone was too quiet: five pale rows in a list of fifteen read
     * as a slightly different shade of nothing, and the whole reason to raise
     * a feature is that it should be visible at a glance which ones you did.
     * The bar down the left edge is what carries it — full-strength colour in
     * a shape nothing else on the row uses — with the tint behind it and the
     * name in the same colour. Three signals of one fact, which is right for
     * a fact this list exists to show.
     */
    const rowClass = () => {
        if (level) {
            return `${level.selectedCardClass} ${level.borderClass} border-l-4`;
        }

        return locked
            ? "bg-white/40 border-l-4 border-l-transparent"
            : "bg-white shadow-sm border-l-4 border-l-finn-cotton";
    };

    return (
        /*
         * A container query, not a breakpoint. On a wide panel the name and
         * the control share a line; in the narrow settings editor the control
         * drops below. A viewport breakpoint can't tell those apart — the
         * settings page is a wide window with a narrow panel in it.
         */
        <div
            className={["@container rounded-xl px-2.5 py-2 transition", rowClass()].join(
                " ",
            )}
        >
            <div className="flex flex-col items-start gap-1.5 @sm:flex-row @sm:items-center @sm:gap-3">
                <span className="flex min-w-0 flex-1 items-center gap-1.5">
                    {locked && (
                        <LockClosedIcon
                            aria-hidden
                            className="h-3 w-3 shrink-0 text-finn-iron/50"
                        />
                    )}

                    <span
                        className={[
                            "min-w-0 truncate text-xs leading-4",
                            nameClass(level, locked),
                        ].join(" ")}
                    >
                        {label}
                    </span>

                    {explanation && (
                        <span className="shrink-0">
                            <InfoTip subject={label}>{explanation}</InfoTip>
                        </span>
                    )}
                </span>

                {locked ? (
                    <ElsewhereNote elsewhere={elsewhere} />
                ) : (
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
                                        blocked
                                            ? `You've raised ${MAX_FEATURES_PER_CATEGORY} already — put one back to standard to swap`
                                            : meta.hint
                                    }
                                    active={importance === option}
                                    activeClass={meta.activeClass}
                                    disabled={blocked}
                                    onClick={() => onSet(option)}
                                />
                            );
                        })}
                    </div>
                )}
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
            <span aria-hidden className="text-[10px]">
                {elsewhere.map((item) => item.icon).join("")}
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
): string {
    if (active) return `${activeClass} shadow-sm`;

    if (disabled) return "cursor-not-allowed text-finn-iron/40";

    return "text-finn-iron hover:bg-white hover:text-finn-black";
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
                segmentClass(active, disabled, activeClass),
            ].join(" ")}
        >
            {label}
        </button>
    );
}
