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
import { isNumericOnlyPriority } from "../../../../utils/PriorityValidation";
import {
    FeatureInfluencePicker,
    type PickedElsewhere,
} from "@/components/FeatureInfluencePicker";
import { CalculatedPriorityInfo } from "./components/CalculatedPriorityInfo";

interface PriorityEditorProps {
    priority: PriorityDefinition;
    /** What the user has picked out. May legitimately be empty. */
    features: FeatureSelection;
    /** Everything this priority offers, most relevant first. */
    availableFeatures: FeatureId[];
    /** The same features already picked out under the user's other priorities. */
    pickedElsewhere: PickedElsewhere;
    /** Every edit, as it happens. There is nothing to commit here. */
    onChange: (features: FeatureSelection) => void;
    onClose: () => void;
}

/**
 * Choosing what a priority pays extra attention to.
 *
 * The same two questions step 3 asks, drawn by the same component, so the
 * model is explained identically in both places. Five is a ceiling on how
 * many things the reader can single out, not a quota to fill. Picking none is
 * a real answer — the category is then judged on its whole catalogue — so
 * nothing here blocks an empty selection.
 *
 * **It holds no draft, and that is the point.** This used to keep its own
 * copy of the picks behind its own Save button, which meant the page had two
 * things called Save a few hundred pixels apart, only one of which wrote
 * anything: press the editor's, press the page's, and the edit was written
 * around and lost. Teaching the page to notice an unfinished draft was one
 * fix. Not having a draft at all is the better one — every change goes
 * straight into what the page holds, and the single Save button at the top is
 * the only thing on this page that keeps anything.
 *
 * The cap is enforced here rather than validated after the fact, because a
 * picker that allows a selection it will then refuse is worse than one that
 * never offers it: `FeatureInfluencePicker` already greys out the sixth.
 */
export function PriorityEditor({
    priority,
    features,
    availableFeatures,
    pickedElsewhere,
    onChange,
    onClose,
}: PriorityEditorProps) {
    if (isNumericOnlyPriority(priority.id)) {
        return <CalculatedPriorityInfo priority={priority} onClose={onClose} />;
    }

    const toggleFeature = (feature: FeatureId) => {
        if (features.some((item) => item.key === feature)) {
            onChange(features.filter((item) => item.key !== feature));

            return;
        }

        /* Silently ignored rather than reported: the control is already off. */
        if (features.length >= MAX_FEATURES_PER_CATEGORY) return;

        onChange([
            ...features,
            { key: feature, importance: DEFAULT_FEATURE_IMPORTANCE },
        ]);
    };

    const updateImportance = (
        feature: FeatureId,
        importance: FeatureImportance,
    ) => {
        onChange(
            features.map((item) =>
                item.key === feature ? { ...item, importance } : item,
            ),
        );
    };

    return (
        <div className="border-t border-white p-4">
            <FeatureInfluencePicker
                categoryLabel={priority.label}
                features={features}
                availableFeatures={availableFeatures}
                pickedElsewhere={pickedElsewhere}
                onToggleFeature={toggleFeature}
                onImportanceChange={updateImportance}
            />
        </div>
    );
}
