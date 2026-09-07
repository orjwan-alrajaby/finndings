import { useMemo } from "react";
import { Gauge, RotateCw } from "lucide-react";

import {
    AVAILABLE_CATEGORY_FEATURES,
    CATEGORIES,
} from "@/lib/reasoning-engine/constants";
import type {
    CategoryId,
    FeatureId,
    FeatureImportance,
    FeatureSelection,
} from "@/lib/reasoning-engine/types";
import { FeatureCard } from "@/components/FeatureCard";
import { buildPickedElsewhere } from "@/components/FeatureInfluencePicker";

import { DrawerSection, SECTION_TONE } from "./DrawerSection";
import { FeatureEditor } from "./FeatureEditor";

/** What counts extra inside each priority. */
export function FeatureSection({
    priorities,
    features,
    savedCategoryFeatures,
    expanded,
    onExpandedChange,
    onToggleFeature,
    onImportanceChange,
    onClearCategory,
    onRestoreSaved,
    changed,
}: {
    priorities: CategoryId[];
    features: Record<CategoryId, FeatureSelection>;
    savedCategoryFeatures: Record<CategoryId, FeatureSelection>;
    /** The priority whose feature editor is open, if any. */
    expanded: CategoryId | null;
    onExpandedChange: (category: CategoryId | null) => void;
    onToggleFeature: (category: CategoryId, feature: FeatureId) => void;
    onImportanceChange: (
        category: CategoryId,
        feature: FeatureId,
        importance: FeatureImportance,
    ) => void;
    onClearCategory: (category: CategoryId) => void;
    onRestoreSaved: () => void;
    /** True when the draft's picks differ from the reader's saved ones. */
    changed: boolean;
}) {
    /*
     * "Picked elsewhere" means picked in another priority the reader is
     * actually being asked about — picks kept for a category they since
     * dropped are not somewhere they can see or reach.
     */
    const pickedInPriorities = useMemo(
        () =>
            Object.fromEntries(
                priorities.map((categoryId) => [
                    categoryId,
                    features[categoryId] ?? [],
                ]),
            ) as Partial<Record<CategoryId, FeatureSelection>>,
        [priorities, features],
    );

    const raised = priorities.reduce(
        (total, categoryId) => total + (features[categoryId]?.length ?? 0),
        0,
    );

    const savedCount = priorities.reduce(
        (total, categoryId) =>
            total + (savedCategoryFeatures[categoryId]?.length ?? 0),
        0,
    );

    return (
        <DrawerSection
            value="features"
            tone={SECTION_TONE.influence}
            icon={<Gauge className="h-4.5 w-4.5" />}
            eyebrow="Extra influence"
            title="What counts inside a priority"
            summary={
                raised === 0
                    ? "Nothing raised · each category judged as a whole"
                    : `${raised} raised for extra influence`
            }
        >
            <p className="mb-3 rounded-xl bg-finn-snow px-3 py-2 text-[11px] leading-4 text-finn-iron">
                Optional. Every feature in a category counts the same until
                you raise one — and raising one never rules a car out, it
                turns up as a tradeoff instead.
            </p>

            <div className="flex flex-col gap-2">
                {priorities.map((categoryId, index) => {
                    const categoryFeatures = features[categoryId] ?? [];
                    const category = CATEGORIES[categoryId];
                    const open = expanded === categoryId;

                    return (
                        <FeatureCard
                            key={categoryId}
                            icon={category.icon}
                            label={category.label}
                            featureCount={categoryFeatures.length}
                            open={open}
                            onToggle={() =>
                                onExpandedChange(open ? null : categoryId)
                            }
                        >
                            {open && (
                                <FeatureEditor
                                    categoryId={categoryId}
                                    features={categoryFeatures}
                                    availableFeatures={
                                        AVAILABLE_CATEGORY_FEATURES[
                                            categoryId
                                        ] ?? []
                                    }
                                    rank={index + 1}
                                    pickedElsewhere={buildPickedElsewhere(
                                        categoryId,
                                        pickedInPriorities,
                                        CATEGORIES,
                                    )}
                                    onToggleFeature={(feature) =>
                                        onToggleFeature(categoryId, feature)
                                    }
                                    onImportanceChange={(
                                        feature,
                                        importance,
                                    ) =>
                                        onImportanceChange(
                                            categoryId,
                                            feature,
                                            importance,
                                        )
                                    }
                                    onResetAll={() =>
                                        onClearCategory(categoryId)
                                    }
                                />
                            )}
                        </FeatureCard>
                    );
                })}
            </div>

            {changed && (
                <button
                    type="button"
                    onClick={onRestoreSaved}
                    className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-finn-iron underline-offset-2 transition hover:text-finn-black hover:underline"
                >
                    <RotateCw aria-hidden="true" className="h-3.5 w-3.5" />
                    {savedCount > 0 ? "Use my saved picks" : "Clear my picks"}
                </button>
            )}
        </DrawerSection>
    );
}
