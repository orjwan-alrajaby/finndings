import { create } from "zustand";

import {
    DEFAULT_CATEGORY_FEATURES,
    DEFAULT_DEFAULT_PROFILE_ID,
    DEFAULT_FEATURE_IMPORTANCE,
    DEFAULT_PREFERENCES,
    DEFAULT_PRIORITIES,
    DEFAULT_PROFILES,
    MAX_FEATURES_PER_CATEGORY,
} from "@/lib/reasoning-engine/constants";

import { loadLensSettings, saveLensSettings } from "@/lib/reasoning-engine";

import type {
    CategoryId,
    FeatureId,
    FeatureImportance,
    FeatureSelection,
    LensPreferences,
    Profile,
} from "@/lib/reasoning-engine/types";

import type { CompareStep } from "./types";
import type { SelectionMode } from "./steps/StepOneChoosePriorities/types";

/** The steps, in the order the stepper walks them. */
export const STEP_ORDER: CompareStep[] = [
    "priorities",
    "order",
    "preferences",
    "advice",
];

/** Which half of step 3 the reader is looking at. */
export type PreferencesPhase = "preferences" | "driving";

/** Fewer than this and there isn't enough to rank cars on. */
export const MIN_PRIORITIES = 3;

/** More than this and no single priority means much. */
export const MAX_PRIORITIES = 5;

interface CompareState {
    /* ---------------------------------------------------------------- */
    /* Where the reader is                                              */
    /* ---------------------------------------------------------------- */

    step: CompareStep;

    /**
     * Every step the reader has opened, so the stepper stays walkable in
     * both directions once they've been somewhere. Going back is not
     * undoing: a reader who returns to step 1 to swap a priority can still
     * jump straight back to their advice.
     */
    visited: CompareStep[];

    /* ---------------------------------------------------------------- */
    /* The saved settings                                               */
    /* ---------------------------------------------------------------- */

    settingsLoaded: boolean;

    /** What the reader has saved, which is what "my saved values" restores. */
    savedPreferences: LensPreferences;

    /** The saved feature picks, and the starting point for a run. */
    savedCategoryFeatures: Record<CategoryId, FeatureSelection>;

    profiles: Profile[];

    /** Which profile is selected automatically when nothing else is. */
    defaultProfileId: string;

    /* ---------------------------------------------------------------- */
    /* This run's answers                                               */
    /* ---------------------------------------------------------------- */

    priorities: CategoryId[];

    /*
     * This run's copy of the saved values. Steps 3 and 4 read these and
     * never the saved ones. What a reader does on the way to one
     * recommendation is a question about these cars today — "what if I only
     * had 800 a month", "what if I stopped caring about the boot" — and
     * answering it must not quietly rewrite what they'll be asked next time.
     * Making any of it permanent is a deliberate act, and it lives in
     * Settings.
     */
    preferences: LensPreferences;

    /**
     * This run's feature picks, for every category rather than only the
     * chosen priorities — so a priority dropped in step 1 and picked up
     * again still carries the picks the reader made for it.
     */
    features: Record<CategoryId, FeatureSelection>;

    /* ---------------------------------------------------------------- */
    /* What each step was left looking at                               */
    /* ---------------------------------------------------------------- */

    /** Step 1: profile or hand-picked. */
    selectionMode: SelectionMode;

    /** Step 1: the category whose features are expanded. */
    expandedCategory: CategoryId | null;

    /** Step 2: the card opened out of the order grid. */
    expandedOrderCategory: CategoryId | null;

    /** Step 3: which of its two halves. */
    phase: PreferencesPhase;

    /** Step 3: the priority whose feature editor is open. */
    expandedPriority: CategoryId | null;

    /** Step 4: the car in the hot seat. Null means the recommendation. */
    challengerId: number | null;

    /* ---------------------------------------------------------------- */
    /* Actions                                                          */
    /* ---------------------------------------------------------------- */

    loadSettings: () => Promise<void>;

    goTo: (step: CompareStep) => void;
    next: () => void;
    back: () => void;

    setPriorities: (priorities: CategoryId[]) => void;
    togglePriority: (category: CategoryId) => void;
    movePriority: (from: CategoryId, to: CategoryId) => void;

    setPreferences: (preferences: LensPreferences) => void;
    useSavedPreferences: () => void;

    toggleFeature: (category: CategoryId, feature: FeatureId) => void;
    setFeatureImportance: (
        category: CategoryId,
        feature: FeatureId,
        importance: FeatureImportance,
    ) => void;
    resetFeaturesToSaved: () => void;

    setSelectionMode: (mode: SelectionMode) => void;
    setExpandedCategory: (category: CategoryId | null) => void;
    setExpandedOrderCategory: (category: CategoryId | null) => void;
    setPhase: (phase: PreferencesPhase) => void;
    setExpandedPriority: (category: CategoryId | null) => void;
    setChallengerId: (id: number | null) => void;
}

/** A copy deep enough that editing this run can't reach the saved picks. */
function copyFeatures(
    source: Record<CategoryId, FeatureSelection>,
): Record<CategoryId, FeatureSelection> {
    return Object.fromEntries(
        Object.entries(source).map(([categoryId, features]) => [
            categoryId,
            [...(features ?? [])],
        ]),
    ) as Record<CategoryId, FeatureSelection>;
}

/**
 * The reader's own priority order is the one thing the compare flow owns,
 * and saving it is what stops a profile reasserting itself over a
 * customised order on the next run. Preferences and feature picks made here
 * are deliberately not written back — those belong to Settings.
 */
function persistPriorities(priorities: CategoryId[]) {
    void saveLensSettings({ priorities }).catch((error: unknown) => {
        console.error("FINN Lens: could not save priority order", error);
    });
}

/**
 * Whether a step has enough to work with. Only the first one always does —
 * the rest need a set of priorities to rank cars on.
 */
export function canEnterStep(
    priorities: CategoryId[],
    step: CompareStep,
): boolean {
    return step === "priorities" || priorities.length >= MIN_PRIORITIES;
}

/**
 * Somewhere the reader has already been, or the step straight after it.
 * The stepper offers exactly these.
 */
export function isStepReachable(
    state: Pick<CompareState, "visited" | "priorities">,
    step: CompareStep,
): boolean {
    if (!canEnterStep(state.priorities, step)) return false;
    if (state.visited.includes(step)) return true;

    const previous = STEP_ORDER[STEP_ORDER.indexOf(step) - 1];

    return previous !== undefined && state.visited.includes(previous);
}

export const useCompareStore = create<CompareState>((set, get) => ({
    step: "priorities",
    visited: ["priorities"],

    settingsLoaded: false,
    savedPreferences: DEFAULT_PREFERENCES,
    savedCategoryFeatures: DEFAULT_CATEGORY_FEATURES,
    profiles: DEFAULT_PROFILES,
    defaultProfileId: DEFAULT_DEFAULT_PROFILE_ID,

    priorities: DEFAULT_PRIORITIES,
    preferences: DEFAULT_PREFERENCES,
    features: copyFeatures(DEFAULT_CATEGORY_FEATURES),

    selectionMode: "profile",
    expandedCategory: null,
    expandedOrderCategory: null,
    phase: "preferences",
    expandedPriority: null,
    challengerId: null,

    /**
     * Read the saved settings in, once. Later calls are ignored on purpose:
     * this run's copies are the reader's answers, and a second read would
     * overwrite them with the stored values.
     */
    async loadSettings() {
        if (get().settingsLoaded) return;

        const settings = await loadLensSettings();

        set({
            settingsLoaded: true,
            savedPreferences: settings.preferences,
            savedCategoryFeatures: settings.categoryFeatures,
            profiles: settings.profiles,
            defaultProfileId: settings.defaultProfileId,
            priorities: settings.priorities,
            preferences: settings.preferences,
            features: copyFeatures(settings.categoryFeatures),
            expandedPriority: settings.priorities[0] ?? null,
        });
    },

    goTo(step) {
        const { step: current, visited, priorities } = get();

        if (step === current || !canEnterStep(priorities, step)) return;

        /* Leaving the two steps that decide the order commits it. */
        if (current === "priorities" || current === "order") {
            persistPriorities(priorities);
        }

        set({
            step,
            visited: visited.includes(step) ? visited : [...visited, step],
        });
    },

    next() {
        const nextStep = STEP_ORDER[STEP_ORDER.indexOf(get().step) + 1];

        if (nextStep) get().goTo(nextStep);
    },

    back() {
        const previousStep = STEP_ORDER[STEP_ORDER.indexOf(get().step) - 1];

        if (previousStep) get().goTo(previousStep);
    },

    setPriorities(priorities) {
        const { expandedPriority } = get();

        set({
            priorities,
            challengerId: null,

            /*
             * Step 3 opens on a priority the reader still has. Keeping a
             * card open for a category they just dropped would leave that
             * step showing nothing at all.
             */
            expandedPriority:
                expandedPriority && priorities.includes(expandedPriority)
                    ? expandedPriority
                    : (priorities[0] ?? null),
        });
    },

    togglePriority(category) {
        const { priorities } = get();

        if (priorities.includes(category)) {
            get().setPriorities(
                priorities.filter((id) => id !== category),
            );
            return;
        }

        if (priorities.length >= MAX_PRIORITIES) return;

        get().setPriorities([...priorities, category]);
    },

    movePriority(from, to) {
        const { priorities } = get();

        if (from === to) return;

        const fromIndex = priorities.indexOf(from);
        const toIndex = priorities.indexOf(to);

        if (fromIndex === -1 || toIndex === -1) return;

        const next = [...priorities];
        const [moved] = next.splice(fromIndex, 1);

        if (!moved) return;

        next.splice(toIndex, 0, moved);

        get().setPriorities(next);
    },

    setPreferences(preferences) {
        set({ preferences, challengerId: null });
    },

    useSavedPreferences() {
        set({
            preferences: { ...get().savedPreferences },
            challengerId: null,
        });
    },

    /**
     * Pick a feature out, or put it back.
     *
     * Unpicking the last one is allowed: an empty selection means "compare
     * these cars on the category as a whole", which is a preference rather
     * than a hole in the form.
     */
    toggleFeature(category, feature) {
        const { features } = get();
        const current = features[category] ?? [];

        if (current.some((item) => item.key === feature)) {
            set({
                features: {
                    ...features,
                    [category]: current.filter(
                        (item) => item.key !== feature,
                    ),
                },
                challengerId: null,
            });
            return;
        }

        if (current.length >= MAX_FEATURES_PER_CATEGORY) return;

        set({
            features: {
                ...features,
                [category]: [
                    ...current,
                    { key: feature, importance: DEFAULT_FEATURE_IMPORTANCE },
                ],
            },
            challengerId: null,
        });
    },

    setFeatureImportance(category, feature, importance) {
        const { features } = get();

        set({
            features: {
                ...features,
                [category]: (features[category] ?? []).map((item) =>
                    item.key === feature ? { ...item, importance } : item,
                ),
            },
            challengerId: null,
        });
    },

    /**
     * Put this run's picks back to the saved ones, for the priorities the
     * reader is actually being asked about — one move back to a known
     * state, rather than an undo history.
     */
    resetFeaturesToSaved() {
        const { features, savedCategoryFeatures, priorities } = get();

        const restored = { ...features };

        for (const categoryId of priorities) {
            restored[categoryId] = [
                ...(savedCategoryFeatures[categoryId] ?? []),
            ];
        }

        set({ features: restored, challengerId: null });
    },

    setSelectionMode(selectionMode) {
        set({ selectionMode });
    },

    setExpandedCategory(expandedCategory) {
        set({ expandedCategory });
    },

    setExpandedOrderCategory(expandedOrderCategory) {
        set({ expandedOrderCategory });
    },

    setPhase(phase) {
        set({ phase });
    },

    setExpandedPriority(expandedPriority) {
        set({ expandedPriority });
    },

    setChallengerId(challengerId) {
        set({ challengerId });
    },
}));

/**
 * Whether this run's picks have been edited away from the saved ones, judged
 * only on the priorities the reader chose.
 */
export function featuresChanged(state: CompareState): boolean {
    return state.priorities.some((categoryId) => {
        const chosen = state.features[categoryId] ?? [];
        const saved = state.savedCategoryFeatures[categoryId] ?? [];

        return (
            chosen.length !== saved.length ||
            chosen.some(
                (item, index) =>
                    saved[index]?.key !== item.key ||
                    saved[index]?.importance !== item.importance,
            )
        );
    });
}
