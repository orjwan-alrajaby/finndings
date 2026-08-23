import { TierButton, Toggle } from "@/entrypoints/settings/components/primitives";
import {
    FEATURES,
} from "@/lib/reasoning-engine/constants";
import {
    type FeatureTier,
    type FeatureWeight,
} from "@/lib/reasoning-engine/types";

interface FeatureOptionProps {
    feature: FeatureWeight;
    enabled: boolean;
    disabled: boolean;
    onToggle: () => void;
    onTierChange: (tier: FeatureTier) => void;
}

export function FeatureOption({
    feature,
    enabled,
    disabled,
    onToggle,
    onTierChange,
}: FeatureOptionProps) {
    const { label, explanation } = FEATURES[feature.key];

    return (
        <div
            className={[
                "flex flex-col justify-between gap-4 rounded-2xl p-3 transition-all drop-shadow-sm",
                enabled
                    ? "bg-white"
                    : "bg-white/90",
            ].join(" ")}
        >
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-4">
                    <span
                        className={[
                            "block text-sm font-bold",
                            enabled
                                ? "text-finn-highlight-navy"
                                : "text-finn-iron",
                        ].join(" ")}
                    >
                        {label}
                    </span>

                    <Toggle
                        checked={enabled}
                        disabled={disabled}
                        onChange={onToggle}
                        label={`${enabled ? "Disable" : "Enable"} ${label}`}
                    />
                </div>

                {explanation && (
                    <span
                        className={[
                            "mt-0.5 block text-xs leading-4",
                            enabled
                                ? "text-finn-black"
                                : "text-finn-iron",
                        ].join(" ")}
                    >
                        {explanation}
                    </span>
                )}
            </div>
            <TierButton
                value={feature.tier}
                onChange={onTierChange}
                disabled={!enabled}
            />
        </div>
    );
}