import type {
    CategoryId,
    FeatureId,
    FeatureImportance,
    FeatureSelection,
} from "@/lib/reasoning-engine/types";
import { CATEGORIES } from "@/lib/reasoning-engine/constants";
import { CalculatedPriorityDetails } from "./CalculatedPriorityDetails";
import {
    FeatureInfluencePicker,
    type PickedElsewhere,
} from "@/components/FeatureInfluencePicker";

interface StepThreeFeatureEditorProps {
    categoryId: CategoryId;
    /** What the user has picked out for this run. May legitimately be empty. */
    features: FeatureSelection;
    /** Everything this priority offers, most relevant first. */
    availableFeatures: FeatureId[];
    /** Where this priority sits in the user's order, for the empty-state hint. */
    rank: number;
    /** The same features already picked out under the user's other priorities. */
    pickedElsewhere: PickedElsewhere;
    onToggleFeature: (feature: FeatureId) => void;
    onImportanceChange: (
        feature: FeatureId,
        importance: FeatureImportance,
    ) => void;
}

/**
 * Saying what should influence the recommendation within one priority.
 *
 * The two questions and all the copy around them live in
 * `FeatureInfluencePicker`, shared with the settings editor. This wrapper
 * only decides whether the priority has anything to pick at all: the
 * calculated ones are read from vehicle data and have no catalogue.
 */
export function StepThreeFeatureEditor({
    categoryId,
    features,
    availableFeatures,
    rank,
    pickedElsewhere,
    onToggleFeature,
    onImportanceChange,
}: StepThreeFeatureEditorProps) {
    const category = CATEGORIES[categoryId];

    if (category.numericOnly) {
        return (
            <div className="border-t border-white p-4">
                <CalculatedPriorityDetails categoryId={categoryId} />
            </div>
        );
    }

    return (
        <div className="border-t border-white p-4">
            <FeatureInfluencePicker
                categoryLabel={category.label}
                features={features}
                availableFeatures={availableFeatures}
                rank={rank}
                pickedElsewhere={pickedElsewhere}
                onToggleFeature={onToggleFeature}
                onImportanceChange={onImportanceChange}
            />
        </div>
    );
}
