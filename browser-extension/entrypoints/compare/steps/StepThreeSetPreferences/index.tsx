import "@/assets/tailwind.css";
import { useEffect, useState } from "react";
import type {
    CategoryId,
    FeatureId,
    FeatureSelection,
    LensPreferences,
} from "@/lib/reasoning-engine/types";
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { DrivingAssumptions } from "./DrivingAssumptions";
import { FeatureCard } from "@/components/FeatureCard";
import { StepThreeFeatureEditor } from "./StepThreeFeatureEditor";
import {
    AVAILABLE_CATEGORY_FEATURES,
    CATEGORIES,
    MAX_FEATURES_PER_CATEGORY,
} from "@/lib/reasoning-engine/constants";

export function StepThreeSetPreferences({
    priorities,
    preferences,
    setPreferences,
    categoryFeatures,
    onBack,
    onAdvice,
}: {
    priorities: CategoryId[];
    preferences: LensPreferences;
    setPreferences: (value: LensPreferences) => void;
    categoryFeatures: Record<CategoryId, FeatureSelection>;
    onBack: () => void;
    onAdvice: (
        categoryFeatures: Partial<Record<CategoryId, FeatureSelection>>,
    ) => void;
}) {
    const [localFeatures, setLocalFeatures] = useState<
        Partial<Record<CategoryId, FeatureSelection>>
    >({});

    const [expandedPriority, setExpandedPriority] =
        useState<CategoryId | null>(
            priorities[0] ?? null,
        );

    /*
     * categoryFeatures is the saved/default configuration.
     * localFeatures is the temporary configuration for
     * this recommendation.
     */
    useEffect(() => {
        setLocalFeatures((current) => {
            const next: Partial<Record<CategoryId, FeatureSelection>> = {};

            for (const categoryId of priorities) {
                next[categoryId] =
                    current[categoryId] ??
                    [...(categoryFeatures[categoryId] ?? [])];
            }

            return next;
        });
    }, [priorities, categoryFeatures]);

    /**
     * Pick a feature out, or put it back.
     *
     * Unpicking the last one is allowed: an empty selection means "judge this
     * priority on the equipment overall", which is a preference rather than a
     * hole in the form.
     */
    const toggleFeature = (categoryId: CategoryId, feature: FeatureId) => {
        setLocalFeatures((current) => {
            const currentFeatures = current[categoryId] ?? [];

            if (currentFeatures.includes(feature)) {
                return {
                    ...current,
                    [categoryId]: currentFeatures.filter(
                        (item) => item !== feature,
                    ),
                };
            }

            if (currentFeatures.length >= MAX_FEATURES_PER_CATEGORY) {
                return current;
            }

            return {
                ...current,
                [categoryId]: [...currentFeatures, feature],
            };
        });
    };

    const handleAdvice = () => {
        onAdvice(localFeatures);
    };

    return (
        <div className="flex w-full flex-col gap-7">
            {/* Header */}
            <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-finn-accent-blue">
                    Step 2
                </p>

                <h2 className="mt-2 text-3xl font-black tracking-tight text-finn-black sm:text-4xl">
                    What matters most to you?
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-finn-iron">
                    Each priority starts with the features most
                    people single out. Change them to whatever you
                    actually care about — or clear them and let Lens
                    judge the priority as a whole.
                </p>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
                <div className="col-span-1 flex flex-col gap-3 lg:col-span-4 bg-white rounded-2xl p-4 shadow-sm">
                    {/* Explanation */}
                    <div className="flex gap-3 rounded-[20px] bg-finn-snow p-4">
                        <InformationCircleIcon className="h-5 w-5 shrink-0 text-finn-accent-blue" />

                        <p className="text-xs leading-5 text-finn-iron">
                            Your order already tells us how much each priority
                            matters. This is the finer question: within a
                            priority, are there particular features you
                            especially want? Pick up to{" "}
                            {MAX_FEATURES_PER_CATEGORY}, or none at all — a
                            car missing one isn't ruled out, it just shows up
                            as a tradeoff in your advice.
                        </p>
                    </div>
                    {priorities.map((categoryId, index) => {
                        const features =
                            localFeatures[categoryId] ??
                            categoryFeatures[categoryId] ??
                            [];

                        const category =
                            CATEGORIES[categoryId];

                        const open =
                            expandedPriority === categoryId;

                        return (
                            <FeatureCard
                                key={categoryId}
                                icon={category.icon}
                                label={category.label}
                                featureCount={features.length}
                                open={open}
                                onToggle={() =>
                                    setExpandedPriority((current) =>
                                        current === categoryId
                                            ? null
                                            : categoryId,
                                    )
                                }
                            >
                                {open && (
                                    <StepThreeFeatureEditor
                                        categoryId={categoryId}
                                        features={features}
                                        availableFeatures={
                                            AVAILABLE_CATEGORY_FEATURES[
                                                categoryId
                                            ] ?? []
                                        }
                                        rank={index + 1}
                                        onToggleFeature={(feature) =>
                                            toggleFeature(
                                                categoryId,
                                                feature,
                                            )
                                        }
                                    />
                                )}
                            </FeatureCard>
                        );
                    })}
                </div>

                <div className="col-span-1 lg:col-span-3">
                    <DrivingAssumptions
                        preferences={preferences}
                        setPreferences={
                            setPreferences
                        }
                    />
                </div>
            </div>

            <div className="rounded-[20px] border border-finn-cotton bg-white p-4">
                <p className="text-xs font-black text-finn-black">
                    These choices are only for this
                    recommendation.
                </p>

                <p className="mt-1 text-xs leading-5 text-finn-iron">
                    Your saved preferences won't be changed.
                    If you want to make these choices your
                    defaults, you can change them later in
                    Settings.
                </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 border-t border-finn-cotton pt-5">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full border-2 border-finn-cotton text-finn-iron transition hover:bg-white hover:text-finn-black"
                    aria-label="Back"
                >
                    <ArrowLeftIcon className="h-5 w-5" />
                </button>

                <button
                    type="button"
                    onClick={handleAdvice}
                    className="flex h-13 flex-1 items-center justify-center gap-2 rounded-full bg-finn-accent-blue text-sm font-black text-white shadow-md transition hover:bg-finn-highlight-navy"
                >
                    Show my recommendation
                    <ArrowRightIcon className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}