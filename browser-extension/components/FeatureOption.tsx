import { CheckIcon } from "@heroicons/react/24/solid";
import { InfoTip } from "@/components/InfoTip";
import {
    FEATURE_IMPORTANCE,
    FEATURES,
    IMPORTANCE_LEVELS,
} from "@/lib/reasoning-engine/constants";
import type {
    FeatureId,
    FeatureImportance,
} from "@/lib/reasoning-engine/types";

interface FeatureOptionProps {
    feature: FeatureId;
    /** The importance the user gave it, or null when it isn't picked. */
    importance: FeatureImportance | null;
    /** True when this one can't be picked right now — the cap is reached. */
    disabled: boolean;
    disabledReason?: string;
    /** Shown on the leading catalogue entries as a starting point. */
    suggested?: boolean;
    onToggle: () => void;
    onImportanceChange: (importance: FeatureImportance) => void;
}

/**
 * One feature: pick it, then say how much it matters.
 *
 * The importance control only appears once the feature is picked, which is
 * what keeps this from being the old tier matrix. There, every feature in a
 * catalogue of up to fifteen carried three radio buttons whether the reader
 * cared about it or not; here at most five rows ever show one, because you
 * only grade what you chose to name.
 */
export function FeatureOption({
    feature,
    importance,
    disabled,
    disabledReason,
    suggested = false,
    onToggle,
    onImportanceChange,
}: FeatureOptionProps) {
    const { label, explanation } = FEATURES[feature];
    const selected = importance != null;

    return (
        <div
            className={[
                "rounded-2xl p-3 transition",
                selected
                    ? "bg-finn-pale-blue ring-2 ring-finn-accent-blue"
                    : disabled
                      ? "bg-white/50"
                      : "bg-white ring-1 ring-finn-iron/10 hover:ring-finn-iron/30",
            ].join(" ")}
        >
            <div className="flex items-start gap-2.5">
                <button
                    type="button"
                    role="checkbox"
                    aria-checked={selected}
                    aria-label={label}
                    disabled={disabled}
                    title={disabled ? disabledReason : undefined}
                    onClick={onToggle}
                    className={[
                        "flex min-w-0 flex-1 items-start gap-2.5 text-left",
                        disabled ? "cursor-not-allowed" : "cursor-pointer",
                    ].join(" ")}
                >
                    <span
                        className={[
                            "mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition",
                            selected
                                ? "border-finn-accent-blue bg-finn-accent-blue text-white"
                                : "border-finn-iron/30 bg-white",
                        ].join(" ")}
                    >
                        {selected && <CheckIcon className="h-3.5 w-3.5" />}
                    </span>

                    <span className="min-w-0">
                        <span
                            className={[
                                "block text-sm font-bold leading-5",
                                selected
                                    ? "text-finn-highlight-navy"
                                    : disabled
                                      ? "text-finn-iron/60"
                                      : "text-finn-black",
                            ].join(" ")}
                        >
                            {label}
                        </span>

                        {suggested && !selected && (
                            <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wide text-finn-iron">
                                Commonly picked
                            </span>
                        )}
                    </span>
                </button>

                {explanation && (
                    <span className="mt-0.5 shrink-0">
                        <InfoTip subject={label}>{explanation}</InfoTip>
                    </span>
                )}
            </div>

            {selected && (
                <ImportancePicker
                    label={label}
                    value={importance}
                    onChange={onImportanceChange}
                />
            )}
        </div>
    );
}

/**
 * How much this one matters, on the three levels the engine understands.
 *
 * Nothing here is a requirement — a car missing a high-priority feature is
 * still eligible to win, and says so in the Advice. These words describe
 * strength of preference, which is why none of them is "essential".
 */
function ImportancePicker({
    label,
    value,
    onChange,
}: {
    label: string;
    value: FeatureImportance;
    onChange: (importance: FeatureImportance) => void;
}) {
    return (
        <div
            role="radiogroup"
            aria-label={`How much ${label} matters to you`}
            className="mt-2.5 flex gap-1 rounded-lg bg-white/70 p-1"
        >
            {IMPORTANCE_LEVELS.map((level) => {
                const active = value === level;

                return (
                    <button
                        key={level}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        title={FEATURE_IMPORTANCE[level].hint}
                        onClick={() => onChange(level)}
                        className={[
                            "flex-1 rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wide transition",
                            active
                                ? FEATURE_IMPORTANCE[level].activeClass
                                : "text-finn-iron hover:bg-white hover:text-finn-black",
                        ].join(" ")}
                    >
                        {FEATURE_IMPORTANCE[level].label}
                    </button>
                );
            })}
        </div>
    );
}
