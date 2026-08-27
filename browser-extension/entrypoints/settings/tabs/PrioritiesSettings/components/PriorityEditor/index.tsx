import { useState } from "react";
import type {
    FeatureTier,
    FeatureWeight,
    PriorityDefinition,
} from "@/lib/reasoning-engine/types";
import {
    MAX_FEATURES_PER_CATEGORY,
    MIN_FEATURES_PER_CATEGORY,
} from "@/lib/reasoning-engine/constants";
import {
    isNumericOnlyPriority,
    validatePriorityDraft,
} from "../../../../utils/PriorityValidation";
import { InlineError } from "../../../../components/primitives";
import { FeatureOption } from "@/components/FeatureOption";
import { CalculatedPriorityInfo } from "./components/CalculatedPriorityInfo";
import { PriorityEditorActions } from "./components/PriorityEditorActions";

interface PriorityEditorProps {
    priority: PriorityDefinition;
    /** What the user currently has switched on. */
    features: FeatureWeight[];
    /** Everything this priority offers, most relevant first. */
    availableFeatures: FeatureWeight[];
    onSave: (
        priority: PriorityDefinition,
        features: FeatureWeight[],
    ) => void;
    onCancel: () => void;
    isOpen: boolean;
}

/**
 * Choosing what a priority actually looks at.
 *
 * Five is a ceiling, not a quota. A priority starts with the five most
 * relevant of its catalogue switched on — or all of them, where it offers
 * fewer than five — and the user is free to swap any of them for something
 * else in the list. One must always stay on: a priority scoring from an empty
 * feature list can't tell two cars apart, and would quietly stop meaning
 * anything while still appearing in their order.
 */
export function PriorityEditor({
    priority,
    features,
    availableFeatures,
    onSave,
    onCancel,
}: PriorityEditorProps) {
    const numericOnly = isNumericOnlyPriority(priority.id);

    const [draftFeatures, setDraftFeatures] =
        useState<FeatureWeight[]>(features);

    const enabledKeys = new Set(draftFeatures.map((feature) => feature.key));

    const atMax = draftFeatures.length >= MAX_FEATURES_PER_CATEGORY;
    const atMin = draftFeatures.length <= MIN_FEATURES_PER_CATEGORY;

    const updateTier = (key: string, tier: FeatureTier) => {
        setDraftFeatures((current) =>
            current.map((feature) =>
                feature.key === key ? { ...feature, tier } : feature,
            ),
        );
    };

    const toggleFeature = (featureKey: string) => {
        setDraftFeatures((current) => {
            const enabled = current.some(
                (feature) => feature.key === featureKey,
            );

            if (enabled) {
                if (current.length <= MIN_FEATURES_PER_CATEGORY) return current;

                return current.filter(
                    (feature) => feature.key !== featureKey,
                );
            }

            if (current.length >= MAX_FEATURES_PER_CATEGORY) return current;

            const fromCatalogue = availableFeatures.find(
                (feature) => feature.key === featureKey,
            );

            if (!fromCatalogue) return current;

            return [...current, { ...fromCatalogue }];
        });
    };

    const error = validatePriorityDraft(draftFeatures, priority.id);

    if (numericOnly) {
        return (
            <CalculatedPriorityInfo priority={priority} onClose={onCancel} />
        );
    }

    return (
        <div className="space-y-4 border-t border-white p-4">
            <div>
                <p className="text-sm font-black text-finn-highlight-navy">
                    Choose what matters
                </p>

                <p className="mt-1 text-xs leading-5 text-finn-iron">
                    Turn on the {MAX_FEATURES_PER_CATEGORY} features you most
                    want Lens to look for here, then say how much each one
                    matters. Not sure what something is? Tap the ⓘ.
                </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                {availableFeatures.map((feature) => {
                    const enabled = enabledKeys.has(feature.key);

                    const activeFeature =
                        draftFeatures.find(
                            (item) => item.key === feature.key,
                        ) ?? feature;

                    return (
                        <FeatureOption
                            key={feature.key}
                            feature={activeFeature}
                            enabled={enabled}
                            disabled={
                                enabled ? atMin : atMax
                            }
                            disabledReason={
                                enabled
                                    ? "At least one feature has to stay on"
                                    : `Turn one off first — ${MAX_FEATURES_PER_CATEGORY} is the maximum`
                            }
                            onToggle={() => toggleFeature(feature.key)}
                            onTierChange={(tier) =>
                                updateTier(feature.key, tier)
                            }
                        />
                    );
                })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-finn-iron">
                    {draftFeatures.length}/{MAX_FEATURES_PER_CATEGORY} enabled
                </span>

                {atMax && (
                    <span className="text-[10px] text-finn-iron">
                        That's the maximum — turn one off to swap in another.
                    </span>
                )}

                {atMin && (
                    <span className="text-[10px] text-finn-iron">
                        One has to stay on, or this priority can't tell two
                        cars apart.
                    </span>
                )}
            </div>

            <InlineError>{error}</InlineError>

            <PriorityEditorActions
                disabled={Boolean(error)}
                onCancel={onCancel}
                onSave={() => onSave({ ...priority }, draftFeatures)}
            />
        </div>
    );
}
