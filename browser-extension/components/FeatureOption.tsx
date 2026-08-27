import { CheckIcon } from "@heroicons/react/24/solid";
import { InfoTip } from "@/components/InfoTip";
import { FEATURES } from "@/lib/reasoning-engine/constants";
import type { FeatureId } from "@/lib/reasoning-engine/types";

interface FeatureOptionProps {
    feature: FeatureId;
    selected: boolean;
    /** True when this one can't be turned on right now — the cap is reached. */
    disabled: boolean;
    disabledReason?: string;
    onToggle: () => void;
}

/**
 * One feature, picked out or not.
 *
 * A single binary choice, deliberately. This used to ask the reader to grade
 * every feature Essential / Good to have / Luxury extra, which asked them to
 * express the same preference twice: how much a category matters is already
 * the priority order's job, and no one has a reliable opinion about whether a
 * reversing camera is "good to have" or "a luxury" in the abstract.
 *
 * All that is left is the question worth asking — does this one matter to you?
 */
export function FeatureOption({
    feature,
    selected,
    disabled,
    disabledReason,
    onToggle,
}: FeatureOptionProps) {
    const { label, explanation } = FEATURES[feature];

    return (
        <div
            className={[
                "flex items-start gap-2.5 rounded-2xl p-3 transition",
                selected
                    ? "bg-finn-pale-blue ring-2 ring-finn-accent-blue"
                    : disabled
                      ? "bg-white/50"
                      : "bg-white ring-1 ring-finn-iron/10 hover:ring-finn-iron/30",
            ].join(" ")}
        >
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

                <span
                    className={[
                        "min-w-0 text-sm font-bold leading-5",
                        selected
                            ? "text-finn-highlight-navy"
                            : disabled
                              ? "text-finn-iron/60"
                              : "text-finn-black",
                    ].join(" ")}
                >
                    {label}
                </span>
            </button>

            {explanation && (
                <span className="mt-0.5 shrink-0">
                    <InfoTip subject={label}>{explanation}</InfoTip>
                </span>
            )}
        </div>
    );
}
