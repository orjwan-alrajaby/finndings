import type {
    CategoryId,
    FeatureId,
    FeatureImportance,
    FeatureSelection,
} from "@/lib/reasoning-engine/types";
import {
    CATEGORIES,
    MAX_FEATURES_PER_CATEGORY,
    SUGGESTED_CATEGORY_FEATURES,
} from "@/lib/reasoning-engine/constants";
import { CalculatedPriorityDetails } from "./CalculatedPriorityDetails";
import { FeatureOption } from "@/components/FeatureOption";

interface StepThreeFeatureEditorProps {
    categoryId: CategoryId;
    /** What the user has picked out for this run. May legitimately be empty. */
    features: FeatureSelection;
    /** Everything this priority offers, most relevant first. */
    availableFeatures: FeatureId[];
    /** Where this priority sits in the user's order, for the empty-state hint. */
    rank: number;
    onToggleFeature: (feature: FeatureId) => void;
    onImportanceChange: (
        feature: FeatureId,
        importance: FeatureImportance,
    ) => void;
}

/**
 * Picking out what matters within one priority, and how much.
 *
 * Two questions, in order, and the second only ever appears on rows answering
 * yes to the first. Picking nothing is a supported answer rather than an
 * incomplete form.
 */
export function StepThreeFeatureEditor({
    categoryId,
    features,
    availableFeatures,
    rank,
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

    const importanceOf = new Map(
        features.map((preference) => [preference.key, preference.importance]),
    );

    const suggested = new Set(SUGGESTED_CATEGORY_FEATURES[categoryId] ?? []);
    const atMax = features.length >= MAX_FEATURES_PER_CATEGORY;

    return (
        <div className="space-y-4 border-t border-white p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-sm font-black text-finn-highlight-navy">
                        Pick up to {MAX_FEATURES_PER_CATEGORY} features that
                        matter most to you
                    </p>

                    <p className="mt-1 text-xs leading-5 text-finn-iron">
                        Optional — skip it and we'll compare cars on the
                        category as a whole. Pick something and you can say how
                        much it matters. Tap the ⓘ if a name means nothing to
                        you.
                    </p>
                </div>

                <span
                    className={[
                        "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black",
                        features.length
                            ? "bg-finn-pale-blue text-finn-accent-blue"
                            : "bg-finn-cotton text-finn-iron",
                    ].join(" ")}
                >
                    {features.length} / {MAX_FEATURES_PER_CATEGORY} selected
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
                        onToggle={() => onToggleFeature(feature)}
                        onImportanceChange={(importance) =>
                            onImportanceChange(feature, importance)
                        }
                    />
                ))}
            </div>

            {atMax && (
                <p className="text-center text-[11px] leading-4 text-finn-iron">
                    That's {MAX_FEATURES_PER_CATEGORY} — unpick one to choose
                    something else.
                </p>
            )}

            {features.length === 0 && (
                <NothingPickedHint
                    label={category.label}
                    rank={rank}
                    catalogueSize={category.features.length}
                />
            )}
        </div>
    );
}

/**
 * What happens when the user picks nothing.
 *
 * Deliberately not a warning. "I want the safest car, I just don't have
 * opinions about which systems it has" is a complete preference, and the only
 * thing the reader needs to know is what Lens does with it. Said slightly
 * more prominently for a top-ranked priority, where the question is most
 * likely to occur to them.
 */
function NothingPickedHint({
    label,
    rank,
    catalogueSize,
}: {
    label: string;
    rank: number;
    catalogueSize: number;
}) {
    return (
        <p className="rounded-2xl bg-finn-snow px-3.5 py-3 text-[11px] leading-5 text-finn-iron">
            {rank === 1 ? (
                <>
                    <strong className="font-black text-finn-black">
                        {label} is your top priority.
                    </strong>{" "}
                    You haven't picked out any particular features, so we'll
                    compare cars across all {catalogueSize} systems this
                    priority covers.
                </>
            ) : (
                <>
                    Nothing picked out here, so we'll compare cars across all{" "}
                    {catalogueSize} systems this priority covers.
                </>
            )}
        </p>
    );
}
