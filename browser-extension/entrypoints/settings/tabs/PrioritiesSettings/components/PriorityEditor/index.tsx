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
    SUGGESTED_CATEGORY_FEATURES,
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
 * Choosing what a priority pays particular attention to.
 *
 * Five is a ceiling on how many things the user can single out, not a quota
 * to fill. Picking none is a real answer — the category is then judged on its
 * whole catalogue — so nothing here blocks an empty selection.
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

    const importanceOf = new Map(
        draftFeatures.map((preference) => [
            preference.key,
            preference.importance,
        ]),
    );

    const suggested = new Set(
        SUGGESTED_CATEGORY_FEATURES[priority.id] ?? [],
    );

    const atMax = draftFeatures.length >= MAX_FEATURES_PER_CATEGORY;

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
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-sm font-black text-finn-highlight-navy">
                        Pick up to {MAX_FEATURES_PER_CATEGORY} features that
                        matter most to you
                    </p>

                    <p className="mt-1 text-xs leading-5 text-finn-iron">
                        Optional. Pick none and Lens compares cars on the
                        category as a whole. Pick something and you can say how
                        much it matters. Not sure what something is? Tap the ⓘ.
                    </p>
                </div>

                <span
                    className={[
                        "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black",
                        draftFeatures.length
                            ? "bg-finn-pale-blue text-finn-accent-blue"
                            : "bg-finn-cotton text-finn-iron",
                    ].join(" ")}
                >
                    {draftFeatures.length} / {MAX_FEATURES_PER_CATEGORY}{" "}
                    selected
                </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
                {availableFeatures.map((feature) => (
                    <FeatureOption
                        key={feature}
                        feature={feature}
                        importance={importanceOf.get(feature) ?? null}
                        disabled={!importanceOf.has(feature) && atMax}
                        disabledReason={`You've picked ${MAX_FEATURES_PER_CATEGORY} already — unpick one to swap`}
                        suggested={suggested.has(feature)}
                        onToggle={() => toggleFeature(feature)}
                        onImportanceChange={(importance) =>
                            updateImportance(feature, importance)
                        }
                    />
                ))}
            </div>

            {atMax && (
                <p className="text-[11px] leading-4 text-finn-iron">
                    That's {MAX_FEATURES_PER_CATEGORY} — unpick one to choose
                    something else.
                </p>
            )}

            {draftFeatures.length === 0 && (
                <p className="rounded-2xl bg-white px-3.5 py-3 text-[11px] leading-5 text-finn-iron">
                    Nothing picked out, so cars will be compared across all{" "}
                    {availableFeatures.length} systems this priority covers.
                </p>
            )}

            <InlineError>{error}</InlineError>

            <PriorityEditorActions
                disabled={Boolean(error)}
                onCancel={onCancel}
                onSave={() => onSave({ ...priority }, draftFeatures)}
            />
        </div>
    );
}
