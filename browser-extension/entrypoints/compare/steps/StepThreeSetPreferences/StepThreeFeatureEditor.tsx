import type {
    CategoryId,
    FeatureTier,
    FeatureWeight,
} from "@/lib/reasoning-engine/types";
import {
    CATEGORIES,
    MAX_FEATURES_PER_CATEGORY,
    MIN_FEATURES_PER_CATEGORY,
} from "@/lib/reasoning-engine/constants";
import { CalculatedPriorityDetails } from "./CalculatedPriorityDetails";
import { FeatureOption } from "@/components/FeatureOption";

interface StepThreeFeatureEditorProps {
    categoryId: CategoryId;
    /** What's switched on for this run. */
    features: FeatureWeight[];
    /** Everything this priority offers, most relevant first. */
    availableFeatures: FeatureWeight[];
    onToggleFeature: (feature: FeatureWeight) => void;
    onUpdateFeatureTier: (
        featureKey: FeatureWeight["key"],
        tier: FeatureTier,
    ) => void;
}

export function StepThreeFeatureEditor({
    categoryId,
    features,
    availableFeatures,
    onToggleFeature,
    onUpdateFeatureTier,
}: StepThreeFeatureEditorProps) {
    const category = CATEGORIES[categoryId];

    if (category.numericOnly) {
        return (
            <div className="border-t border-white p-4">
                <CalculatedPriorityDetails categoryId={categoryId} />
            </div>
        );
    }

    const enabledKeys = new Set(features.map((feature) => feature.key));

    const atMax = features.length >= MAX_FEATURES_PER_CATEGORY;
    const atMin = features.length <= MIN_FEATURES_PER_CATEGORY;

    return (
        <div className="space-y-4 border-t border-white p-4">
            <div>
                <p className="text-sm font-black text-finn-highlight-navy">
                    {category.question}
                </p>

                <p className="mt-1 text-xs leading-5 text-finn-iron">
                    These {MAX_FEATURES_PER_CATEGORY} are on by default because
                    they're the ones that usually matter most here. Swap in
                    anything else from the list, and tap the ⓘ if a name means
                    nothing to you.
                </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
                {availableFeatures.map((feature) => {
                    const enabled = enabledKeys.has(feature.key);

                    const activeFeature =
                        features.find((item) => item.key === feature.key) ??
                        feature;

                    return (
                        <FeatureOption
                            key={feature.key}
                            feature={activeFeature}
                            enabled={enabled}
                            disabled={enabled ? atMin : atMax}
                            disabledReason={
                                enabled
                                    ? "At least one feature has to stay on"
                                    : `Turn one off first — ${MAX_FEATURES_PER_CATEGORY} is the maximum`
                            }
                            onToggle={() => onToggleFeature(feature)}
                            onTierChange={(tier) =>
                                onUpdateFeatureTier(feature.key, tier)
                            }
                        />
                    );
                })}
            </div>

            <p className="text-center text-[11px] leading-4 text-finn-iron">
                {features.length}/{MAX_FEATURES_PER_CATEGORY} enabled
                {atMax && " — turn one off to swap in another"}
                {atMin &&
                    " — one has to stay on, or this priority can't tell two cars apart"}
            </p>

            {availableFeatures.length === 0 && (
                <p className="text-xs leading-5 text-finn-iron">
                    This priority doesn't offer any configurable features.
                </p>
            )}
        </div>
    );
}
