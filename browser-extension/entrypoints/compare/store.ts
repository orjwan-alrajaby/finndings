import { create } from "zustand";

import {
    DEFAULT_CATEGORY_FEATURES,
    DEFAULT_DEFAULT_PROFILE_ID,
    DEFAULT_PREFERENCES,
    DEFAULT_PRIORITIES,
    DEFAULT_PRIORITY_DEFINITIONS,
    DEFAULT_PROFILES,
} from "@/lib/reasoning-engine/constants";

import { loadLensSettings, saveLensSettings } from "@/lib/reasoning-engine";

import type {
    CategoryId,
    FeatureSelection,
    LensPreferences,
    PriorityDefinition,
    Profile,
} from "@/lib/reasoning-engine/types";

/**
 * The answers behind one comparison, and nothing about where the reader is.
 *
 * There used to be a four-step wizard in front of the advice, and this store
 * carried its position, its history and the rules for walking it. All of that
 * is gone: the page opens on the answer, and the questions live in a drawer
 * beside it.
 *
 * Every field below is an input to the recommendation. Nothing that is only
 * about editing lives here — which drawer section is open, which feature card
 * is expanded, and above all the half-finished answer a reader is in the
 * middle of typing. The drawer holds its own draft and hands the whole set
 * over when they save it, and that boundary is what stops the page re-reasoning
 * under their hands on every keystroke.
 */

/** The three answers a reader can change without leaving the compare page. */
export interface Answers {
    priorities: CategoryId[];
    preferences: LensPreferences;
    /**
     * For every category rather than only the chosen priorities — so a
     * priority dropped from the order and picked up again still carries the
     * picks the reader made for it.
     */
    features: Record<CategoryId, FeatureSelection>;
}

interface CompareState extends Answers {
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
    /* What the reader is looking at                                    */
    /* ---------------------------------------------------------------- */

    /** On the page: the car in the hot seat. Null means the winner. */
    challengerId: number | null;

    /* ---------------------------------------------------------------- */
    /* Actions                                                          */
    /* ---------------------------------------------------------------- */

    loadSettings: () => Promise<void>;

    /** Take a drawer's saved draft as this run's answers. */
    applyAnswers: (answers: Answers) => void;

    setChallengerId: (id: number | null) => void;
}

/** A copy deep enough that editing this run can't reach the saved picks. */
export function copyFeatures(
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
     * The whole set at once, because that is what a Save means.
     *
     * The order is persisted here and the rest is not, which is the same
     * split as before: there is one priority order and it belongs to the
     * reader, while what they tried out on today's shortlist belongs to
     * today's shortlist.
     *
     * The challenger is cleared because it names a car by id against the old
     * reasoning, and the new answers may not rank it anywhere near where it
     * was.
     */
    applyAnswers({ priorities, preferences, features }) {
        persistPriorities(priorities);

        set({
            priorities,
            preferences,
            features: copyFeatures(features),
            challengerId: null,
        });
    },

    setChallengerId(challengerId) {
        set({ challengerId });
    },
}));
