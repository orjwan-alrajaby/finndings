import { useState } from "react";
import type {
    FeatureId,
    FeatureImportance,
    FeatureSelection,
    PriorityDefinition,
} from "@/lib/reasoning-engine/types";
import {
    DEFAULT_FEATURE_IMPORTANCE,
    MAX_FEATURES_PER_CATEGORY,
} from "@/lib/reasoning-engine/constants";
import {
    isNumericOnlyPriority,
    validatePriorityDraft,
} from "../../../../utils/PriorityValidation";
import { InlineError } from "../../../../components/primitives";
import { FeatureInfluencePicker } from "@/components/FeatureInfluencePicker";
import { CalculatedPriorityInfo } from "./components/CalculatedPriorityInfo";
import { PriorityEditorActions } from "./components/PriorityEditorActions";

interface PriorityEditorProps {
    priority: PriorityDefinition;
    /** What the user has picked out. May legitimately be empty. */
    features: FeatureSelection;
    /** Everything this priority offers, most relevant first. */
    availableFeatures: FeatureId[];
    onSave: (
        priority: PriorityDefinition,
        features: FeatureSelection,
    ) => void;
    onCancel: () => void;
    isOpen: boolean;
}

/**
 * Choosing what a priority pays extra attention to, as a saved default.
 *
 * The same two questions step 3 asks, drawn by the same component, so the
 * model is explained identically in both places. Five is a ceiling on how
 * many things the user can single out, not a quota to fill. Picking none is a
 * real answer — the category is then judged on its whole catalogue — so
 * nothing here blocks an empty selection.
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
        useState<FeatureSelection>(features);

    const toggleFeature = (feature: FeatureId) => {
        setDraftFeatures((current) => {
            if (current.some((item) => item.key === feature)) {
                return current.filter((item) => item.key !== feature);
            }

            if (current.length >= MAX_FEATURES_PER_CATEGORY) return current;

            return [
                ...current,
                { key: feature, importance: DEFAULT_FEATURE_IMPORTANCE },
            ];
        });
    };

    const updateImportance = (
        feature: FeatureId,
        importance: FeatureImportance,
    ) => {
        setDraftFeatures((current) =>
            current.map((item) =>
                item.key === feature ? { ...item, importance } : item,
            ),
        );
    };

    const error = validatePriorityDraft(draftFeatures, priority.id);

    if (numericOnly) {
        return (
            <CalculatedPriorityInfo priority={priority} onClose={onCancel} />
        );
    }

    return (
        <div className="space-y-4 border-t border-white p-4">
            <FeatureInfluencePicker
                categoryId={priority.id}
                categoryLabel={priority.label}
                features={draftFeatures}
                availableFeatures={availableFeatures}
                onToggleFeature={toggleFeature}
                onImportanceChange={updateImportance}
            />

            <InlineError>{error}</InlineError>

            <PriorityEditorActions
                disabled={Boolean(error)}
                onCancel={onCancel}
                onSave={() => onSave({ ...priority }, draftFeatures)}
            />
        </div>
    );
}
