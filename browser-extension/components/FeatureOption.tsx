import { TierButton, Toggle } from "@/entrypoints/settings/components/primitives";
import { InfoTip } from "@/components/InfoTip";
import { FEATURES } from "@/lib/reasoning-engine/constants";
import type {
    FeatureTier,
    FeatureWeight,
} from "@/lib/reasoning-engine/types";

interface FeatureOptionProps {
    feature: FeatureWeight;
    enabled: boolean;
    /** True when this feature can't be switched right now, with the reason why. */
    disabled: boolean;
    disabledReason?: string;
    onToggle: () => void;
    onTierChange: (tier: FeatureTier) => void;
}

/**
 * One feature, switchable and rankable.
 *
 * The explanation sits behind an `i` rather than under the label: a category
 * now offers up to fifteen features, and fifteen paragraphs is a wall the
 * reader scrolls past. The answer is one click away for the terms that need
 * it, which is the point — nobody should have to leave Lens to find out what
 * adaptive cruise control is.
 */
export function FeatureOption({
    feature,
    enabled,
    disabled,
    disabledReason,
    onToggle,
    onTierChange,
}: FeatureOptionProps) {
    const { label, explanation } = FEATURES[feature.key];

    return (
        <div
            className={[
                "flex flex-col justify-between gap-3 rounded-2xl p-3 transition-all drop-shadow-sm",
                enabled ? "bg-white" : "bg-white/60",
            ].join(" ")}
        >
            <div className="flex items-start justify-between gap-3">
                <span
                    className={[
                        "flex min-w-0 items-center gap-1.5 text-sm font-bold",
                        enabled ? "text-finn-highlight-navy" : "text-finn-iron",
                    ].join(" ")}
                >
                    <span className="min-w-0">{label}</span>

                    {explanation && (
                        <InfoTip subject={label}>{explanation}</InfoTip>
                    )}
                </span>

                <Toggle
                    checked={enabled}
                    disabled={disabled}
                    onChange={onToggle}
                    label={
                        disabled && disabledReason
                            ? disabledReason
                            : `${enabled ? "Disable" : "Enable"} ${label}`
                    }
                />
            </div>

            {enabled && (
                <TierButton value={feature.tier} onChange={onTierChange} />
            )}
        </div>
    );
}
