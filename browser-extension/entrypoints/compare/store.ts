import { create } from "zustand";

import {
    DEFAULT_CATEGORY_FEATURES,
    DEFAULT_DEFAULT_PROFILE_ID,
    DEFAULT_FEATURE_IMPORTANCE,
    DEFAULT_PREFERENCES,
    DEFAULT_PRIORITIES,
    DEFAULT_PRIORITY_DEFINITIONS,
    DEFAULT_PROFILES,
    MAX_FEATURES_PER_CATEGORY,
    MAX_PRIORITIES,
    MIN_PRIORITIES,
} from "@/lib/reasoning-engine/constants";

import { loadLensSettings, saveLensSettings } from "@/lib/reasoning-engine";

import type {
    CategoryId,
    FeatureId,
    FeatureImportance,
    FeatureSelection,
    LensPreferences,
    PriorityDefinition,
    Profile,
} from "@/lib/reasoning-engine/types";

/* Where the compare flow's own callers already look for them. */
export { MAX_PRIORITIES, MIN_PRIORITIES };

/**
 * The answers behind one comparison, and nothing about where the reader is.
 *
 * There used to be a four-step wizard in front of the advice, and this store
 * carried its position, its history and the rules for walking it. All of that
 * is gone: the page opens on the answer, and the questions live in a drawer
 * beside it. Every field below is an input to the recommendation, so anything
 * that changes one changes the page under the reader's hands — which is the
 * whole point of moving them there.
 */
interface CompareState {
    /* ---------------------------------------------------------------- */
    /* The saved settings                                               */
    /* ---------------------------------------------------------------- */

    settingsLoaded: boolean;

    /** What the reader has saved, which is what "my saved values" restores. */
    savedPreferences: LensPreferences;

    /** The saved feature picks, and the starting point for a run. */
    savedCategoryFeatures: Record<CategoryId, FeatureSelection>;

    /**
     * The label, icon and on/off state of every priority, as Settings has
     * them. The drawer draws its list from these, so a priority switched
     * off there is not offered here.
     */
    priorityDefinitions: PriorityDefinition[];

    profiles: Profile[];

    /** Which profile is selected automatically when nothing else is. */
    defaultProfileId: string;

    /* ---------------------------------------------------------------- */
    /* This run's answers                                               */
    /* ---------------------------------------------------------------- */

    priorities: CategoryId[];

    /*
     * This run's copy of the saved values. The advice reads these and never
     * the saved ones. What a reader does on the way to one recommendation
     * is a question about these cars today — "what if I only
     * had 800 a month", "what if I stopped caring about the boot" — and
     * answering it must not quietly rewrite what they'll be asked next time.
     * Making any of it permanent is a deliberate act, and it lives in
     * Settings.
     */
    preferences: LensPreferences;

    /**
     * This run's feature picks, for every category rather than only the
     * chosen priorities — so a priority dropped from the order and picked
     * up again still carries the picks the reader made for it.
     */
    features: Record<CategoryId, FeatureSelection>;

    /* ---------------------------------------------------------------- */
    /* What the reader is looking at                                    */
    /* ---------------------------------------------------------------- */

    /** In the drawer: the priority whose feature editor is open. */
    expandedPriority: CategoryId | null;

    /** On the page: the car in the hot seat. Null means the winner. */
    challengerId: number | null;

    /* ---------------------------------------------------------------- */
    /* Actions                                                          */
    /* ---------------------------------------------------------------- */

    loadSettings: () => Promise<void>;

    setPriorities: (priorities: CategoryId[]) => void;

    setPreferences: (preferences: LensPreferences) => void;
    useSavedPreferences: () => void;

    toggleFeature: (category: CategoryId, feature: FeatureId) => void;
    setFeatureImportance: (
        category: CategoryId,
        feature: FeatureId,
        importance: FeatureImportance,
    ) => void;
    resetFeaturesToSaved: () => void;

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
 *
 * Written on every change now that the order is edited in a drawer rather
 * than committed by leaving a step. There is no longer a moment that means
 * "done with this question", and a storage write per drag is cheaper than an
 * order the reader can watch working and then lose.
 */
function persistPriorities(priorities: CategoryId[]) {
    void saveLensSettings({ priorities }).catch((error: unknown) => {
        console.error("FINN Lens: could not save priority order", error);
    });
}

export const useCompareStore = create<CompareState>((set, get) => ({
    settingsLoaded: false,
    savedPreferences: DEFAULT_PREFERENCES,
    savedCategoryFeatures: DEFAULT_CATEGORY_FEATURES,
    priorityDefinitions: DEFAULT_PRIORITY_DEFINITIONS,
    profiles: DEFAULT_PROFILES,
    defaultProfileId: DEFAULT_DEFAULT_PROFILE_ID,

    priorities: DEFAULT_PRIORITIES,
    preferences: DEFAULT_PREFERENCES,
    features: copyFeatures(DEFAULT_CATEGORY_FEATURES),

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
            priorityDefinitions: settings.priorityDefinitions,
            profiles: settings.profiles,
            defaultProfileId: settings.defaultProfileId,
            priorities: settings.priorities,
            preferences: settings.preferences,
            features: copyFeatures(settings.categoryFeatures),
        });
    },

    /**
     * The whole order at once — adding, removing and reordering all arrive
     * here, because the list hands back the array it wants rather than
     * describing the edit it made.
     */
    setPriorities(priorities) {
        const { expandedPriority } = get();

        persistPriorities(priorities);

        set({
            priorities,
            challengerId: null,

            /*
             * The feature editor opens on a priority the reader still has.
             * Keeping a card open for a category they just dropped would
             * leave that part of the drawer showing nothing at all.
             */
            expandedPriority:
                expandedPriority && priorities.includes(expandedPriority)
                    ? expandedPriority
                    : (priorities[0] ?? null),
        });
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
