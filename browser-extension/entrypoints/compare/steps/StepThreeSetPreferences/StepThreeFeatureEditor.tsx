import type {
    CategoryId,
    FeatureTier,
    FeatureWeight,
} from "@/lib/reasoning-engine/types";
import { CATEGORIES } from "@/lib/reasoning-engine/constants";
import { CalculatedPriorityDetails } from "./CalculatedPriorityDetails";
import { FeatureOption } from "@/components/FeatureOption";

const MAX_FEATURES = 5;

interface StepThreeFeatureEditorProps {
    categoryId: CategoryId;
    features: FeatureWeight[];
    defaultFeatures: FeatureWeight[];
    onToggleFeature: (feature: FeatureWeight) => void;
    onUpdateFeatureTier: (
        featureKey: FeatureWeight["key"],
        tier: FeatureTier,
    ) => void;
}

export function StepThreeFeatureEditor({
    categoryId,
    features,
    defaultFeatures,
    onToggleFeature,
    onUpdateFeatureTier,
}: StepThreeFeatureEditorProps) {
    const category = CATEGORIES[categoryId];

    if (category.numericOnly) {
        return (
            <div className="border-t border-white p-4">
                <CalculatedPriorityDetails
                    categoryId={categoryId}
                />
            </div>
        );
    }

    const enabledKeys = new Set(
        features.map((feature) => feature.key),
    );

    const atMax = features.length >= MAX_FEATURES;

    return (
        <div className="space-y-4 border-t border-white p-4">
            <div>
                <p className="text-sm font-black text-finn-highlight-navy">
                    Choose what matters
                </p>

                <p className="mt-1 text-xs leading-5 text-finn-iron">
                    Enable the features that matter to you,
                    then set how important each one is.
                </p>
            </div>

            <div className="space-y-2">
                {defaultFeatures.map((feature) => {
                    const enabled = enabledKeys.has(
                        feature.key,
                    );

                    const activeFeature =
                        features.find(
                            (item) =>
                                item.key === feature.key,
                        ) ?? feature;

                    return (
                        <FeatureOption
                            key={feature.key}
                            feature={activeFeature}
                            enabled={enabled}
                            disabled={!enabled && atMax}
                            onToggle={() =>
                                onToggleFeature(feature)
                            }
                            onTierChange={(tier) =>
                                onUpdateFeatureTier(
                                    feature.key,
                                    tier,
                                )
                            }
                        />
                    );
                })}
            </div>

            {atMax && (
                <p className="text-center text-[11px] leading-4 text-finn-iron">
                    You have reached the maximum of{" "}
                    {MAX_FEATURES} enabled features. Turn
                    one off to choose another.
                </p>
            )}

            {defaultFeatures.length === 0 && (
                <p className="text-xs leading-5 text-finn-iron">
                    This priority doesn't have any
                    configurable features.
                </p>
            )}
        </div>
    );
}