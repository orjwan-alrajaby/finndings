import "@/assets/tailwind.css";
import { useEffect, useState } from "react";
import type {
    CategoryId,
    FeatureId,
    FeatureImportance,
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
import { buildPickedElsewhere } from "@/components/FeatureInfluencePicker";
import {
    AVAILABLE_CATEGORY_FEATURES,
    CATEGORIES,
    DEFAULT_FEATURE_IMPORTANCE,
    DEFAULT_PREFERENCES,
    MAX_FEATURES_PER_CATEGORY,
} from "@/lib/reasoning-engine/constants";

/**
 * The two questions this step asks, asked one at a time.
 *
 * They are genuinely separate: what matters to you about a car, and what your
 * driving actually costs. Shown side by side they compete — a column of
 * priority cards next to a column of number fields is two forms open at once,
 * and the reader has to decide which one they are filling in. In sequence
 * each gets the whole width and one job.
 *
 * Both halves are skippable, and skipping is a real answer rather than an
 * unfinished form: preferences fall back to what the reader has saved, and
 * the assumptions have working values from the moment the extension is
 * installed.
 */
type Phase = "preferences" | "driving";

export function StepThreeSetPreferences({
    priorities,
    preferences,
    setPreferences,
    savedPreferences,
    categoryFeatures,
    sessionFeatures,
    onBack,
    onAdvice,
}: {
    priorities: CategoryId[];
    /** This run's values. Editing them never touches what is stored. */
    preferences: LensPreferences;
    setPreferences: (value: LensPreferences) => void;
    /** What the reader has saved, which is what "my saved values" restores. */
    savedPreferences: LensPreferences;
    /** The saved picks, and the starting point for a run that has none. */
    categoryFeatures: Record<CategoryId, FeatureSelection>;
    /** Picks already made in this run, if the reader has been here before. */
    sessionFeatures?: Partial<Record<CategoryId, FeatureSelection>>;
    onBack: () => void;
    onAdvice: (
        categoryFeatures: Partial<Record<CategoryId, FeatureSelection>>,
    ) => void;
}) {
    const [phase, setPhase] = useState<Phase>("preferences");

    const [localFeatures, setLocalFeatures] = useState<
        Partial<Record<CategoryId, FeatureSelection>>
    >({});

    const [expandedPriority, setExpandedPriority] =
        useState<CategoryId | null>(
            priorities[0] ?? null,
        );

    /* A new half of the step starts at the top of it, not halfway down. */
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [phase]);

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
                    sessionFeatures?.[categoryId] ??
                    [...(categoryFeatures[categoryId] ?? [])];
            }

            return next;
        });
    }, [priorities, categoryFeatures, sessionFeatures]);

    /**
     * Pick a feature out, or put it back.
     *
     * Unpicking the last one is allowed: an empty selection means "compare
     * these cars on the category as a whole", which is a preference rather
     * than a hole in the form.
     */
    const toggleFeature = (categoryId: CategoryId, feature: FeatureId) => {
        setLocalFeatures((current) => {
            const currentFeatures = current[categoryId] ?? [];

            if (currentFeatures.some((item) => item.key === feature)) {
                return {
                    ...current,
                    [categoryId]: currentFeatures.filter(
                        (item) => item.key !== feature,
                    ),
                };
            }

            if (currentFeatures.length >= MAX_FEATURES_PER_CATEGORY) {
                return current;
            }

            return {
                ...current,
                [categoryId]: [
                    ...currentFeatures,
                    { key: feature, importance: DEFAULT_FEATURE_IMPORTANCE },
                ],
            };
        });
    };

    const updateImportance = (
        categoryId: CategoryId,
        feature: FeatureId,
        importance: FeatureImportance,
    ) => {
        setLocalFeatures((current) => ({
            ...current,
            [categoryId]: (current[categoryId] ?? []).map((item) =>
                item.key === feature ? { ...item, importance } : item,
            ),
        }));
    };

    const pickedCount = priorities.reduce(
        (total, categoryId) =>
            total + (localFeatures[categoryId]?.length ?? 0),
        0,
    );

    const savedCount = priorities.reduce(
        (total, categoryId) =>
            total + (categoryFeatures[categoryId]?.length ?? 0),
        0,
    );

    /* Whether this run has been edited away from what the reader has saved. */
    const featuresChanged = priorities.some((categoryId) => {
        const local = localFeatures[categoryId] ?? [];
        const saved = categoryFeatures[categoryId] ?? [];

        return (
            local.length !== saved.length ||
            local.some(
                (item, index) =>
                    saved[index]?.key !== item.key ||
                    saved[index]?.importance !== item.importance,
            )
        );
    });

    /*
     * Put this run's picks back to the saved ones — the same offer the
     * driving half makes, and for the same reason: a reader who has fiddled
     * their way somewhere they don't like needs one move back to a known
     * state, not an undo history.
     *
     * It reverts in place rather than advancing. Watching the picks change is
     * the point; a button that both discarded their edits and moved the page
     * would be two surprises at once.
     */
    const resetToSaved = () => {
        setLocalFeatures(
            Object.fromEntries(
                priorities.map((categoryId) => [
                    categoryId,
                    [...(categoryFeatures[categoryId] ?? [])],
                ]),
            ),
        );
    };

    return (
        <div className="flex w-full flex-col gap-6">
            <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-finn-accent-blue">
                    Step 3 — {phase === "preferences" ? "1" : "2"} of 2
                </p>

                <h2 className="mt-2 text-3xl font-black tracking-tight text-finn-black sm:text-4xl">
                    {phase === "preferences"
                        ? "What should influence your decision?"
                        : "How do you drive?"}
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-finn-iron">
                    {phase === "preferences"
                        ? "Optional. Open a priority to name features that should count for more — skip it and cars are judged on each category as a whole."
                        : "These decide what each car costs you to run, and which cars fit your budget. The values below already work — change them only where they're wrong for you."}
                </p>
            </div>

            <PhaseTabs
                phase={phase}
                pickedCount={pickedCount}
                onGoTo={setPhase}
            />

            {phase === "preferences" ? (
                <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
                    {/*
                      * One line, because every priority below explains itself
                      * once opened. What a reader looking at five closed
                      * cards can't see is only this: a pick is never a rule.
                      */}
                    <p className="flex items-start gap-2 rounded-[20px] bg-finn-snow px-4 py-3 text-xs leading-5 text-finn-iron">
                        <InformationCircleIcon className="h-4 w-4 shrink-0 text-finn-accent-blue" />
                        Nothing you pick becomes a requirement — a car missing
                        one isn't ruled out, it shows up as a tradeoff in your
                        advice.
                    </p>

                    {priorities.map((categoryId, index) => {
                        const features =
                            localFeatures[categoryId] ??
                            categoryFeatures[categoryId] ??
                            [];

                        const category = CATEGORIES[categoryId];
                        const open = expandedPriority === categoryId;

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
                                        pickedElsewhere={buildPickedElsewhere(
                                            categoryId,
                                            localFeatures,
                                            CATEGORIES,
                                        )}
                                        onToggleFeature={(feature) =>
                                            toggleFeature(categoryId, feature)
                                        }
                                        onImportanceChange={(
                                            feature,
                                            importance,
                                        ) =>
                                            updateImportance(
                                                categoryId,
                                                feature,
                                                importance,
                                            )
                                        }
                                    />
                                )}
                            </FeatureCard>
                        );
                    })}
                </div>
            ) : (
                <DrivingAssumptions
                    preferences={preferences}
                    setPreferences={setPreferences}
                    onUseSaved={() => setPreferences({ ...savedPreferences })}
                    isSaved={sameAssumptions(preferences, savedPreferences)}
                />
            )}

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
                    onClick={() =>
                        phase === "preferences"
                            ? onBack()
                            : setPhase("preferences")
                    }
                    className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full border-2 border-finn-cotton text-finn-iron transition hover:bg-white hover:text-finn-black"
                    aria-label={
                        phase === "preferences"
                            ? "Back to priority order"
                            : "Back to your preferences"
                    }
                >
                    <ArrowLeftIcon className="h-5 w-5" />
                </button>

                {phase === "preferences" ? (
                    <>
                        <button
                            type="button"
                            onClick={() => setPhase("driving")}
                            className="flex h-13 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-finn-accent-blue text-sm font-black text-white shadow-md transition hover:bg-finn-highlight-navy"
                        >
                            Next: how you drive
                            <ArrowRightIcon className="h-4 w-4" />
                        </button>

                        {featuresChanged && (
                            <button
                                type="button"
                                onClick={resetToSaved}
                                className="h-13 rounded-full px-4 text-xs font-bold text-finn-iron underline-offset-2 transition hover:text-finn-black hover:underline"
                            >
                                {savedCount > 0
                                    ? "Use my saved picks"
                                    : "Clear my picks"}
                            </button>
                        )}
                    </>
                ) : (
                    <button
                        type="button"
                        onClick={() => onAdvice(localFeatures)}
                        className="flex h-13 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-finn-accent-blue text-sm font-black text-white shadow-md transition hover:bg-finn-highlight-navy"
                    >
                        Show my recommendation
                        <ArrowRightIcon className="h-4 w-4" />
                    </button>
                )}
            </div>
        </div>
    );
}

/**
 * Where the reader is inside the step, and how to get back.
 *
 * Both halves stay reachable in both directions: neither is a gate, and a
 * reader who thinks of another feature while looking at fuel prices should
 * not have to leave the step to add it.
 */
function PhaseTabs({
    phase,
    pickedCount,
    onGoTo,
}: {
    phase: Phase;
    pickedCount: number;
    onGoTo: (phase: Phase) => void;
}) {
    const tabs: [Phase, string, string][] = [
        [
            "preferences",
            "Your preferences",
            pickedCount > 0
                ? `${pickedCount} ${
                      pickedCount === 1 ? "feature" : "features"
                  } getting extra influence`
                : "Judged on each category as a whole",
        ],
        [
            "driving",
            "Driving assumptions",
            "Budget, distance and fuel prices",
        ],
    ];

    return (
        <div className="grid gap-2 sm:grid-cols-2">
            {tabs.map(([id, label, detail], index) => {
                const active = phase === id;

                return (
                    <button
                        key={id}
                        type="button"
                        onClick={() => onGoTo(id)}
                        aria-current={active ? "step" : undefined}
                        className={[
                            "flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition",
                            active
                                ? "bg-finn-accent-blue text-white shadow-sm"
                                : "bg-white text-finn-black shadow-sm hover:bg-finn-pale-blue",
                        ].join(" ")}
                    >
                        <span
                            className={[
                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black",
                                active
                                    ? "bg-white/20 text-white"
                                    : "bg-finn-pale-blue text-finn-accent-blue",
                            ].join(" ")}
                        >
                            {index + 1}
                        </span>

                        <span className="min-w-0">
                            <span className="block text-sm font-black">
                                {label}
                            </span>

                            <span
                                className={[
                                    "block text-[11px] leading-4",
                                    active ? "text-white/80" : "text-finn-iron",
                                ].join(" ")}
                            >
                                {detail}
                            </span>
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

/** Whether this run's assumptions are still exactly the saved ones. */
function sameAssumptions(
    a: LensPreferences,
    b: LensPreferences,
): boolean {
    return (Object.keys(DEFAULT_PREFERENCES) as (keyof LensPreferences)[]).every(
        (key) => a[key] === b[key],
    );
}
