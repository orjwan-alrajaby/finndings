import "@/assets/tailwind.css";
import { useMemo } from "react";
import type {
    CategoryId,
    FeatureSelection,
} from "@/lib/reasoning-engine/types";
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { FeatureCard } from "@/components/FeatureCard";
import { FeatureEditor } from "./FeatureEditor";
import { buildPickedElsewhere } from "@/components/FeatureInfluencePicker";
import {
    AVAILABLE_CATEGORY_FEATURES,
    CATEGORIES,
} from "@/lib/reasoning-engine/constants";
import {
    featuresChanged as haveFeaturesChanged,
    useCompareStore,
} from "../../store";

/**
 * The finer question, asked on its own.
 *
 * Step 1 said how much each category counts. This asks what counts inside
 * one: every feature in a category is worth the same by default, and a
 * reader can raise a few so they weigh more. It used to share a step with
 * the driving assumptions, behind a pair of tabs, and the two never sat
 * well together — a column of priority cards and a column of number fields
 * are two forms open at once, and the reader had to work out which one they
 * were filling in. They are separate questions and they are now separate
 * steps.
 *
 * Skipping this is a real answer rather than an unfinished form: pick
 * nothing and every category is judged on its catalogue as a whole.
 *
 * Every answer lives in the compare store, so leaving the step in either
 * direction keeps it, down to which priority was expanded.
 */
export function StepTwoSetPreferences() {
    const priorities = useCompareStore((state) => state.priorities);
    const savedCategoryFeatures = useCompareStore(
        (state) => state.savedCategoryFeatures,
    );
    const features = useCompareStore((state) => state.features);

    const toggleFeature = useCompareStore((state) => state.toggleFeature);
    const setFeatureImportance = useCompareStore(
        (state) => state.setFeatureImportance,
    );
    const resetFeaturesToSaved = useCompareStore(
        (state) => state.resetFeaturesToSaved,
    );

    const expandedPriority = useCompareStore(
        (state) => state.expandedPriority,
    );
    const setExpandedPriority = useCompareStore(
        (state) => state.setExpandedPriority,
    );

    const back = useCompareStore((state) => state.back);
    const next = useCompareStore((state) => state.next);

    const featuresChanged = useCompareStore(haveFeaturesChanged);

    /*
     * What "picked elsewhere" means is picked in another priority the reader
     * is being asked about — picks kept for a category they since dropped
     * are not somewhere they can see or reach.
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

    const savedCount = priorities.reduce(
        (total, categoryId) =>
            total + (savedCategoryFeatures[categoryId]?.length ?? 0),
        0,
    );

    return (
        <div className="flex w-full flex-col gap-6">
            <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-finn-accent-blue">
                    Step 2
                </p>

                <h2 className="mt-2 text-3xl font-black tracking-tight text-finn-black sm:text-4xl">
                    What should influence your decision?
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-finn-iron">
                    Optional. Inside a priority every feature counts the same
                    — open one to raise the few that matter most to you, so
                    they count for more.
                </p>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
                {/*
                  * One line, because every priority below explains itself
                  * once opened. What a reader looking at five closed cards
                  * can't see is only this: a pick is never a rule.
                  */}
                <p className="flex items-start gap-2 rounded-[20px] bg-finn-snow px-4 py-3 text-xs leading-5 text-finn-iron">
                    <InformationCircleIcon className="h-4 w-4 shrink-0 text-finn-accent-blue" />
                    Nothing you pick becomes a requirement — a car missing one
                    isn't ruled out, it shows up as a tradeoff in your advice.
                </p>

                {priorities.map((categoryId, index) => {
                    const categoryFeatures = features[categoryId] ?? [];
                    const category = CATEGORIES[categoryId];
                    const open = expandedPriority === categoryId;

                    return (
                        <FeatureCard
                            key={categoryId}
                            icon={category.icon}
                            label={category.label}
                            featureCount={categoryFeatures.length}
                            open={open}
                            onToggle={() =>
                                setExpandedPriority(open ? null : categoryId)
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
                                        toggleFeature(categoryId, feature)
                                    }
                                    onImportanceChange={(
                                        feature,
                                        importance,
                                    ) =>
                                        setFeatureImportance(
                                            categoryId,
                                            feature,
                                            importance,
                                        )
                                    }
                                    onResetAll={() => {
                                        for (const pick of categoryFeatures) {
                                            toggleFeature(
                                                categoryId,
                                                pick.key,
                                            );
                                        }
                                    }}
                                />
                            )}
                        </FeatureCard>
                    );
                })}
            </div>

            <p className="rounded-2xl border border-finn-cotton bg-white px-4 py-2.5 text-center text-[11px] leading-4 text-finn-iron">
                <strong className="font-black text-finn-black">
                    For this comparison only.
                </strong>{" "}
                Nothing here changes your saved settings — make something
                permanent in Settings.
            </p>

            <div className="flex flex-wrap items-center gap-3 border-t border-finn-cotton pt-5">
                <button
                    type="button"
                    onClick={back}
                    className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full border-2 border-finn-cotton text-finn-iron transition hover:bg-white hover:text-finn-black"
                    aria-label="Back to your priorities"
                >
                    <ArrowLeftIcon className="h-5 w-5" />
                </button>

                <button
                    type="button"
                    onClick={next}
                    className="flex h-13 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-finn-accent-blue text-sm font-black text-white shadow-md transition hover:bg-finn-highlight-navy"
                >
                    Next: how you drive
                    <ArrowRightIcon className="h-4 w-4" />
                </button>

                {featuresChanged && (
                    <button
                        type="button"
                        onClick={resetFeaturesToSaved}
                        className="h-13 rounded-full px-4 text-xs font-bold text-finn-iron underline-offset-2 transition hover:text-finn-black hover:underline"
                    >
                        {savedCount > 0
                            ? "Use my saved picks"
                            : "Clear my picks"}
                    </button>
                )}
            </div>
        </div>
    );
}
