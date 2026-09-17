import type {
    FeatureImportance,
    FeatureSelection,
    PriorityDefinition,
    SignalId,
} from "@/lib/reasoning-engine/types";
import {
    DEFAULT_FEATURE_IMPORTANCE,
    MAX_FEATURES_PER_CATEGORY,
} from "@/lib/reasoning-engine/constants";
import { isNumericOnlyPriority } from "../../../../utils/PriorityValidation";
import { FeatureInfluencePicker } from "@/components/FeatureInfluencePicker";
import { CalculatedPriorityInfo } from "./components/CalculatedPriorityInfo";

interface PriorityEditorProps {
    priority: PriorityDefinition;
    /** What the user has picked out. May legitimately be empty. */
    features: FeatureSelection;
    /** The profile these settings started from, for "Set by" on its raises. */
    profileLabel: string | null;
    /** Every edit, as it happens. There is nothing to commit here. */
    onChange: (features: FeatureSelection) => void;
    onClose: () => void;
    /** What the starting profile raises in this priority, for "reset to defaults". */
    defaults: FeatureSelection;
}

/**
 * Choosing what a priority pays extra attention to.
 *
 * The same two questions the compare drawer asks, drawn by the same
 * component, so the model is explained identically in both places. Five is
 * a ceiling on how
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
 *
 * Every edit made here marks what it touched as the reader's; resetting to
 * defaults hands back the profile's own entries, marked as the profile's.
 */
export function PriorityEditor({
    priority,
    features,
    profileLabel,
    onChange,
    onClose,
    defaults,
}: PriorityEditorProps) {
    if (isNumericOnlyPriority(priority.id)) {
        return <CalculatedPriorityInfo priority={priority} onClose={onClose} />;
    }

    const toggleFeature = (feature: SignalId) => {
        if (features.some((item) => item.key === feature)) {
            onChange(features.filter((item) => item.key !== feature));

            return;
        }

        /* Silently ignored rather than reported: the control is already off. */
        if (features.length >= MAX_FEATURES_PER_CATEGORY) return;

        onChange([
            ...features,
            { key: feature, importance: DEFAULT_FEATURE_IMPORTANCE, source: "user" },
        ]);
    };

    const updateImportance = (
        feature: SignalId,
        importance: FeatureImportance,
    ) => {
        /*
         * Raising a feature from standard arrives as two calls — toggle it in,
         * then set its level — and both are computed from this render's
         * `features`. The second used to map over a list the first feature
         * was never in, and since it lands last it wrote the old list back:
         * pressing "Highly" on a standard feature in Settings did nothing.
         * Adding it here when it is missing makes the second call complete on
         * its own, so whichever order they land in, the answer is right.
         */
        if (!features.some((item) => item.key === feature)) {
            if (features.length >= MAX_FEATURES_PER_CATEGORY) return;

            onChange([...features, { key: feature, importance, source: "user" }]);

            return;
        }

        onChange(
            features.map((item) =>
                item.key === feature
                    ? { ...item, importance, source: "user" }
                    : item,
            ),
        );
    };

    return (
        <div className="border-t border-finn-cotton p-4">
            <FeatureInfluencePicker
                categoryLabel={priority.label}
                mark={priority.icon}
                category={priority.id}
                features={features}
                profileLabel={profileLabel}
                onToggleFeature={toggleFeature}
                onImportanceChange={updateImportance}
                onResetAll={() => onChange([])}
                onResetToDefaults={() =>
                    onChange(defaults.map((pick) => ({ ...pick })))
                }
            />
        </div>
    );
}
