import { useState } from "react";
import type {
    FeatureTier,
    FeatureWeight,
    PriorityDefinition,
} from "@/lib/reasoning-engine/types";
import {
    isNumericOnlyPriority,
    validatePriorityDraft,
} from "../../../../utils/PriorityValidation";
import { InlineError } from "../../../../components/primitives";
import { FeatureOption } from "../../../../../../components/FeatureOption";
import { CalculatedPriorityInfo } from "./components/CalculatedPriorityInfo";
import { PriorityEditorActions } from "./components/PriorityEditorActions";

const MAX_FEATURES = 5;

interface PriorityEditorProps {
    priority: PriorityDefinition;
    features: FeatureWeight[];
    availableFeatures: FeatureWeight[];
    onSave: (
        priority: PriorityDefinition,
        features: FeatureWeight[],
    ) => void;
    onCancel: () => void;
    isOpen: boolean;
}

export function PriorityEditor({
    priority,
    features,
    availableFeatures,
    onSave,
    onCancel,
}: PriorityEditorProps) {
    const numericOnly =
        isNumericOnlyPriority(priority.id);

    const [draftFeatures, setDraftFeatures] =
        useState<FeatureWeight[]>(features);

    const enabledKeys = new Set(
        draftFeatures.map(
            (feature) => feature.key,
        ),
    );

    const atMax =
        draftFeatures.length >= MAX_FEATURES;

    const updateTier = (
        key: string,
        tier: FeatureTier,
    ) => {
        setDraftFeatures((current) =>
            current.map((feature) =>
                feature.key === key
                    ? { ...feature, tier }
                    : feature,
            ),
        );
    };

    const toggleFeature = (
        featureKey: string,
    ) => {
        setDraftFeatures((current) => {
            const enabled = current.some(
                (feature) =>
                    feature.key === featureKey,
            );

            if (enabled) {
                return current.filter(
                    (feature) =>
                        feature.key !==
                        featureKey,
                );
            }

            if (current.length >= MAX_FEATURES) {
                return current;
            }

            const defaultFeature =
                availableFeatures.find(
                    (feature) =>
                        feature.key ===
                        featureKey,
                );

            if (!defaultFeature) {
                return current;
            }

            return [
                ...current,
                {
                    ...defaultFeature,
                    tier:
                        defaultFeature.tier ??
                        "good",
                },
            ];
        });
    };

    const error = validatePriorityDraft(
        draftFeatures,
        priority.id,
    );

    if (numericOnly) {
        return (
            <CalculatedPriorityInfo
                priority={priority}
                onClose={onCancel}
            />
        );
    }

    return (
        <div className="space-y-4 border-t border-white p-4">
            <div>
                <p className="text-sm font-black text-finn-highlight-navy">
                    Choose what matters
                </p>

                <p className="mt-1 text-xs leading-5 text-finn-iron">
                    Enable the features that matter to
                    you, then set how important each one
                    is.
                </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                {availableFeatures.map(
                    (feature) => {
                        const enabled =
                            enabledKeys.has(
                                feature.key,
                            );

                        const activeFeature =
                            draftFeatures.find(
                                (item) =>
                                    item.key ===
                                    feature.key,
                            ) ?? feature;

                        return (
                            <FeatureOption
                                key={feature.key}
                                feature={
                                    activeFeature
                                }
                                enabled={enabled}
                                disabled={
                                    !enabled &&
                                    atMax
                                }
                                onToggle={() =>
                                    toggleFeature(
                                        feature.key,
                                    )
                                }
                                onTierChange={(
                                    tier,
                                ) =>
                                    updateTier(
                                        feature.key,
                                        tier,
                                    )
                                }
                            />
                        );
                    },
                )}
            </div>

            <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-finn-iron">
                    {draftFeatures.length}/
                    {MAX_FEATURES} enabled
                </span>

                {atMax && (
                    <span className="text-[10px] text-finn-iron">
                        Maximum reached — turn one off
                        to enable another.
                    </span>
                )}
            </div>

            <InlineError>
                {error}
            </InlineError>

            <PriorityEditorActions
                disabled={Boolean(error)}
                onCancel={onCancel}
                onSave={() =>
                    onSave(
                        { ...priority },
                        draftFeatures,
                    )
                }
            />
        </div>
    );
}