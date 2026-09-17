import { Gauge, RotateCcw } from "lucide-react";

import { CATEGORIES } from "@/lib/reasoning-engine/constants";
import type {
    CategoryId,
    FeatureImportance,
    FeatureSelection,
    Profile,
    SettingsBasis,
    SignalId,
} from "@/lib/reasoning-engine/types";
import { EmphasisScope } from "@/components/EmphasisScope";
import { FeatureCard } from "@/components/FeatureCard";

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
    basedOn,
    customised,
    profiles,
}: {
    priorities: CategoryId[];
    features: Record<CategoryId, FeatureSelection>;
    savedCategoryFeatures: Record<CategoryId, FeatureSelection>;
    /** The priority whose feature editor is open, if any. */
    expanded: CategoryId | null;
    onExpandedChange: (category: CategoryId | null) => void;
    onToggleFeature: (category: CategoryId, feature: SignalId) => void;
    onImportanceChange: (
        category: CategoryId,
        feature: SignalId,
        importance: FeatureImportance,
    ) => void;
    onClearCategory: (category: CategoryId) => void;
    onRestoreSaved: () => void;
    /** True when the draft's picks differ from the reader's saved ones. */
    changed: boolean;
    basedOn: SettingsBasis;
    customised: boolean;
    profiles: Profile[];
}) {
    const profileLabel = basedOn
        ? (profiles.find((profile) => profile.id === basedOn)?.label ?? null)
        : null;

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
            icon={<Gauge aria-hidden="true" className="h-4.5 w-4.5" />}
            eyebrow="Extra influence"
            title="What counts inside a priority"
            summary={
                raised === 0
                    ? "Nothing raised · each priority judged in full"
                    : `${raised} raised for extra influence`
            }
        >
            <EmphasisScope
                scope="comparison"
                basedOn={basedOn}
                customised={customised}
                profiles={profiles}
            />

            <p className="mb-3 rounded-xl bg-finn-snow px-3 py-2 text-[11px] leading-4 text-finn-iron">
                Optional. Inside a priority, everything it checks counts at
                Standard except a few niche items that count only once
                raised. Raising something never rules a car out — it turns
                up as a tradeoff instead.
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
                            {/*
                              * Guarded so the editor is only built for the
                              * card that is open — the collapsible drops the
                              * closed ones from the tree, but the props are
                              * assembled here either way.
                              */}
                            {open && (
                                <FeatureEditor
                                    categoryId={categoryId}
                                    features={categoryFeatures}
                                    profileLabel={profileLabel}
                                    rank={index + 1}
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
                    <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
                    {savedCount > 0 ? "Use my saved picks" : "Clear my picks"}
                </button>
            )}
        </DrawerSection>
    );
}
