import { useEffect, useState } from "react";
import type {
    CategoryId,
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
import {
    FeatureInfluencePicker,
    type PickedElsewhere,
} from "@/components/FeatureInfluencePicker";
import { sameFeatureSelection } from "@/lib/feature-selection-diff";
import { CalculatedPriorityInfo } from "./components/CalculatedPriorityInfo";
import { PriorityEditorActions } from "./components/PriorityEditorActions";

interface PriorityEditorProps {
    priority: PriorityDefinition;
    /** What the user has picked out. May legitimately be empty. */
    features: FeatureSelection;
    /** Everything this priority offers, most relevant first. */
    availableFeatures: FeatureId[];
    /** The same features already picked out under the user's other priorities. */
    pickedElsewhere: PickedElsewhere;
    onSave: (
        priority: PriorityDefinition,
        features: FeatureSelection,
    ) => void;
    onCancel: () => void;
    isOpen: boolean;
    /**
     * Told whenever the editor starts or stops holding work.
     *
     * The page's Save button writes what the *page* holds, and an open
     * editor's draft is not that yet — so the page has to know this editor
     * has something outstanding, or pressing Save would quietly write around
     * it and the reader would lose the edit they were in the middle of.
     */
    onDirtyChange?: (id: CategoryId, dirty: boolean) => void;
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
    pickedElsewhere,
    onSave,
    onCancel,
    onDirtyChange,
}: PriorityEditorProps) {
    const numericOnly = isNumericOnlyPriority(priority.id);

    const [draftFeatures, setDraftFeatures] =
        useState<FeatureSelection>(features);

    const dirty = !sameFeatureSelection(draftFeatures, features);

    /*
     * Reported up rather than asked for, and cleared on the way out — an
     * editor that closed while still claiming to hold work would leave the
     * page permanently unable to save.
     */
    useEffect(() => {
        onDirtyChange?.(priority.id, dirty);

        return () => onDirtyChange?.(priority.id, false);
    }, [priority.id, dirty, onDirtyChange]);

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
                categoryLabel={priority.label}
                features={draftFeatures}
                availableFeatures={availableFeatures}
                pickedElsewhere={pickedElsewhere}
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
