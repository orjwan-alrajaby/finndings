import {
    DEFAULT_FEATURE_IMPORTANCE,
    MAX_FEATURES_PER_CATEGORY,
} from "@/lib/reasoning-engine/constants";
import { applyProfile } from "@/lib/reasoning-engine";
import { stableStringify } from "@/lib/stable-stringify";
import type {
    CategoryId,
    FeatureImportance,
    FeatureSelection,
    ProfileId,
    SignalId,
} from "@/lib/reasoning-engine/types";

import type { Answers } from "../../store";

/**
 * The edits a reader can make to a draft, as plain functions over it.
 *
 * These used to be actions on the compare store, which meant every keystroke
 * re-reasoned the page behind the drawer. They are the same rules, moved out
 * of the store and given no side effects at all: each one takes the answers
 * and returns the answers, so the drawer can hold a draft, the reader can
 * change their mind twice, and nothing reaches the recommendation until they
 * press Save.
 *
 * Every edit the reader makes marks what it touched as theirs, so the advice
 * can tell "you raised" from "your starting profile emphasises".
 */

/**
 * Start from a profile: its order and its emphasis replace the draft's, and
 * the draft remembers which profile it came from. Preferences are untouched.
 */
export function startFromProfile(answers: Answers, profile: ProfileId): Answers {
    const applied = applyProfile(profile);

    return {
        ...answers,
        priorities: applied.priorities,
        features: applied.categoryFeatures,
        basedOn: applied.basedOn,
    };
}

/**
 * Pick a feature out, or put it back.
 *
 * Unpicking the last one is allowed: an empty selection means "compare these
 * cars on the category as a whole", which is a preference rather than a hole
 * in the form. Picking past the cap is not — the request is ignored, and the
 * card that would have taken the slot says why.
 */
export function toggleFeature(
    answers: Answers,
    category: CategoryId,
    feature: SignalId,
): Answers {
    const current = answers.features[category] ?? [];

    if (current.some((item) => item.key === feature)) {
        return withFeatures(
            answers,
            category,
            current.filter((item) => item.key !== feature),
        );
    }

    if (current.length >= MAX_FEATURES_PER_CATEGORY) return answers;

    return withFeatures(answers, category, [
        ...current,
        { key: feature, importance: DEFAULT_FEATURE_IMPORTANCE, source: "user" },
    ]);
}

export function setFeatureImportance(
    answers: Answers,
    category: CategoryId,
    feature: SignalId,
    importance: FeatureImportance,
): Answers {
    return withFeatures(
        answers,
        category,
        (answers.features[category] ?? []).map((item) =>
            item.key === feature ? { ...item, importance, source: "user" } : item,
        ),
    );
}

/** Put one category back to standard, without touching the others. */
export function clearFeatures(
    answers: Answers,
    category: CategoryId,
): Answers {
    return withFeatures(answers, category, []);
}

/**
 * Put the draft's picks back to the saved ones, for the priorities the reader
 * is actually being asked about — one move back to a known state, rather than
 * an undo history.
 */
export function restoreSavedFeatures(
    answers: Answers,
    saved: Record<CategoryId, FeatureSelection>,
): Answers {
    const features = { ...answers.features };

    for (const categoryId of answers.priorities) {
        features[categoryId] = [...(saved[categoryId] ?? [])];
    }

    return { ...answers, features };
}

/**
 * Whether the draft's picks have been edited away from the saved ones, judged
 * only on the priorities the reader chose.
 */
export function featuresChanged(
    answers: Answers,
    saved: Record<CategoryId, FeatureSelection>,
): boolean {
    /* Who set a pick isn't a change to it: only the key and level count. */
    const levels = (selection: FeatureSelection) =>
        stableStringify(
            selection.map(({ key, importance }) => ({ key, importance })),
        );

    return answers.priorities.some(
        (categoryId) =>
            levels(answers.features[categoryId] ?? []) !==
            levels(saved[categoryId] ?? []),
    );
}

/**
 * Whether the draft still says exactly what the page is already showing.
 *
 * Compared as text, the same way the settings page decides whether it has
 * anything to save — the alternative is a second description of these shapes,
 * kept in step with the first by hand.
 */
export function sameAnswers(a: Answers, b: Answers): boolean {
    return stableStringify(a) === stableStringify(b);
}

/**
 * A priority the reader has dropped keeps its picks, so putting it back
 * restores what they said about it. That is why this writes the whole record
 * rather than only the categories in the order.
 */
function withFeatures(
    answers: Answers,
    category: CategoryId,
    features: FeatureSelection,
): Answers {
    return {
        ...answers,
        features: { ...answers.features, [category]: features },
    };
}
