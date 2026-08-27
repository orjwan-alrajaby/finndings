import { useState } from "react";
import type {
    FeatureId,
    FeatureSelection,
    PriorityDefinition,
} from "@/lib/reasoning-engine/types";
import { MAX_FEATURES_PER_CATEGORY } from "@/lib/reasoning-engine/constants";
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
    availableFeatures: FeatureSelection;
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

    const selected = new Set(draftFeatures);
    const atMax = draftFeatures.length >= MAX_FEATURES_PER_CATEGORY;

    const toggleFeature = (feature: FeatureId) => {
        setDraftFeatures((current) => {
            if (current.includes(feature)) {
                return current.filter((item) => item !== feature);
            }

            if (current.length >= MAX_FEATURES_PER_CATEGORY) return current;

            return [...current, feature];
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
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-sm font-black text-finn-highlight-navy">
                        Pick up to {MAX_FEATURES_PER_CATEGORY} features that
                        matter most to you
                    </p>

                    <p className="mt-1 text-xs leading-5 text-finn-iron">
                        Optional. Pick none and Lens judges this priority on
                        the equipment as a whole. Not sure what something is?
                        Tap the ⓘ.
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
                        selected={selected.has(feature)}
                        disabled={!selected.has(feature) && atMax}
                        disabledReason={`You've picked ${MAX_FEATURES_PER_CATEGORY} already — unpick one to swap`}
                        onToggle={() => toggleFeature(feature)}
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
