import { CATEGORIES, FEATURE_IMPORTANCE, FEATURES } from "./reasoning-engine/constants";
import type {
    CategoryId,
    FeatureSelection,
    LensPreferences,
    LensSettings,
    PriorityDefinition,
    Profile,
} from "./reasoning-engine/types";

/**
 * What the reader has changed on the settings page, in their own terms.
 *
 * This exists because "you have unsaved changes" was the only thing the page
 * could ever tell them, and it is the least useful true sentence available.
 * It names no change, so it cannot be checked; it distinguishes one careless
 * click from twenty minutes of work; and it gives the reader nothing to do
 * but accept all of it or reload the page and lose all of it.
 *
 * So the page keeps the settings as they were when it opened, and everything
 * since is described against them. A change here is a *field*, not an edit —
 * moving three priorities and then moving them back is no change at all, and
 * a list that claimed otherwise would be reporting the reader's keystrokes
 * rather than their intent.
 *
 * Every change is independently revertible, which is only possible because
 * they are disjoint slices of the settings. See `revertChange`.
 */

export type ChangeGroup =
    | "priorities"
    | "features"
    | "profiles"
    | "driving";

export interface SettingsChange {
    /**
     * Stable across renders and unique across groups, so React can key on it
     * and `revertChange` can find the slice it names.
     */
    id: string;
    group: ChangeGroup;
    /** What was changed: "Priority order", "Comfort", "Monthly budget". */
    label: string;
    /** How it changed, with both sides where both are worth seeing. */
    detail: string;
}

/* -------------------------------------------------------------------------- */
/* Describing                                                                 */
/* -------------------------------------------------------------------------- */

const nameOf = (id: CategoryId, definitions: PriorityDefinition[]): string =>
    definitions.find((definition) => definition.id === id)?.label ??
    CATEGORIES[id]?.label ??
    id;

const sameOrder = (a: CategoryId[], b: CategoryId[]): boolean =>
    a.length === b.length && a.every((id, index) => b[index] === id);

/** "Comfort, Practicality and Safety & Driver Assistance". */
function joinNames(names: string[]): string {
    if (names.length <= 1) return names[0] ?? "";

    return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function describePriorityOrder(
    before: LensSettings,
    after: LensSettings,
): SettingsChange | null {
    if (sameOrder(before.priorities, after.priorities)) return null;

    const label = (id: CategoryId) => nameOf(id, after.priorityDefinitions);

    const added = after.priorities.filter(
        (id) => !before.priorities.includes(id),
    );

    const removed = before.priorities.filter(
        (id) => !after.priorities.includes(id),
    );

    const parts: string[] = [];

    if (added.length) parts.push(`added ${joinNames(added.map(label))}`);
    if (removed.length) parts.push(`removed ${joinNames(removed.map(label))}`);

    /*
     * Reordering is only worth mentioning on its own when nothing came or
     * went — otherwise "added X" already explains why the order looks
     * different, and saying both reads as two changes.
     */
    if (!parts.length) {
        const first = after.priorities[0];
        const wasFirst = before.priorities[0];

        parts.push(
            first && wasFirst && first !== wasFirst
                ? `${label(first)} now leads, was ${label(wasFirst)}`
                : "reordered",
        );
    }

    return {
        id: "priorities",
        group: "priorities",
        label: "Priority order",
        detail: `${parts.join(", ")} — now ${after.priorities
            .map(label)
            .join(" → ")}`,
    };
}

/** How one category's raised features changed. */
function describeFeatures(
    id: CategoryId,
    before: FeatureSelection,
    after: FeatureSelection,
    definitions: PriorityDefinition[],
): SettingsChange | null {
    const key = (item: FeatureSelection[number]) => item.key;

    const beforeKeys = before.map(key);
    const afterKeys = after.map(key);

    const added = after.filter((item) => !beforeKeys.includes(item.key));
    const removed = before.filter((item) => !afterKeys.includes(item.key));

    const regraded = after.filter((item) => {
        const was = before.find((other) => other.key === item.key);

        return was && was.importance !== item.importance;
    });

    if (!added.length && !removed.length && !regraded.length) return null;

    const featureLabel = (item: FeatureSelection[number]) =>
        FEATURES[item.key]?.label ?? item.key;

    const parts: string[] = [];

    if (added.length) {
        parts.push(`raised ${joinNames(added.map(featureLabel))}`);
    }

    if (removed.length) {
        parts.push(`dropped ${joinNames(removed.map(featureLabel))}`);
    }

    for (const item of regraded) {
        parts.push(
            `${featureLabel(item)} now counts ${
                FEATURE_IMPORTANCE[item.importance].inSentence
            }`,
        );
    }

    return {
        id: `features:${id}`,
        group: "features",
        label: nameOf(id, definitions),
        detail: `${parts.join(", ")} — ${
            after.length === 0
                ? "nothing raised, judged on the whole category"
                : `${after.length} raised`
        }`,
    };
}

function describeProfiles(
    before: Profile[],
    after: Profile[],
): SettingsChange[] {
    const changes: SettingsChange[] = [];

    for (const profile of after) {
        const was = before.find((other) => other.id === profile.id);

        if (!was || was.enabled === profile.enabled) continue;

        changes.push({
            id: `profiles:${profile.id}`,
            group: "profiles",
            label: profile.label,
            detail: profile.enabled
                ? "switched on — Lens will offer it as a starting point"
                : "switched off — Lens will stop offering it",
        });
    }

    return changes;
}

/** The fields of `LensPreferences`, as the reader meets them. */
const DRIVING_FIELDS: {
    key: keyof LensPreferences;
    label: string;
    format: (value: LensPreferences[keyof LensPreferences]) => string;
}[] = [
    {
        key: "monthlyBudget",
        label: "Monthly budget",
        format: (value) => (Number(value) > 0 ? `€${value}` : "no limit"),
    },
    {
        key: "monthlyKm",
        label: "Monthly mileage",
        format: (value) => `${value} km`,
    },
    {
        key: "petrolPrice",
        label: "Petrol price",
        format: (value) => `€${value}/L`,
    },
    {
        key: "dieselPrice",
        label: "Diesel price",
        format: (value) => `€${value}/L`,
    },
    {
        key: "electricityPrice",
        label: "Electricity price",
        format: (value) => `€${value}/kWh`,
    },
    {
        key: "contractType",
        label: "Contract type",
        format: (value) => String(value),
    },
];

function describeDriving(
    before: LensPreferences,
    after: LensPreferences,
): SettingsChange[] {
    return DRIVING_FIELDS.filter(
        ({ key }) => before[key] !== after[key],
    ).map(({ key, label, format }) => ({
        id: `driving:${key}`,
        group: "driving" as const,
        label,
        detail: `${format(before[key])} → ${format(after[key])}`,
    }));
}

function describeDefinitions(
    before: PriorityDefinition[],
    after: PriorityDefinition[],
): SettingsChange[] {
    const changes: SettingsChange[] = [];

    for (const definition of after) {
        const was = before.find((other) => other.id === definition.id);

        if (!was) {
            changes.push({
                id: `definition:${definition.id}`,
                group: "priorities",
                label: definition.label,
                detail: "added as a new priority",
            });

            continue;
        }

        if (
            was.label === definition.label &&
            was.description === definition.description &&
            was.enabled === definition.enabled
        ) {
            continue;
        }

        changes.push({
            id: `definition:${definition.id}`,
            group: "priorities",
            label: definition.label,
            detail:
                was.enabled !== definition.enabled
                    ? definition.enabled
                        ? "switched on"
                        : "switched off — Lens will stop offering it"
                    : "renamed or described differently",
        });
    }

    return changes;
}

/**
 * Everything that differs, as a list the reader could read aloud.
 *
 * Ordered by how much of the product each group moves, not by when it was
 * touched: the priority order changes every explanation Lens gives, and the
 * price of diesel changes one line of one estimate.
 */
export function describeSettingsChanges(
    before: LensSettings,
    after: LensSettings,
): SettingsChange[] {
    const order = describePriorityOrder(before, after);

    const features = (Object.keys(after.categoryFeatures) as CategoryId[])
        .map((id) =>
            describeFeatures(
                id,
                before.categoryFeatures[id] ?? [],
                after.categoryFeatures[id] ?? [],
                after.priorityDefinitions,
            ),
        )
        .filter((change): change is SettingsChange => change !== null);

    return [
        ...(order ? [order] : []),
        ...describeDefinitions(before.priorityDefinitions, after.priorityDefinitions),
        ...features,
        ...describeProfiles(before.profiles, after.profiles),
        ...describeDriving(before.preferences, after.preferences),
    ];
}

/* -------------------------------------------------------------------------- */
/* Reverting                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Put one change back, and touch nothing else.
 *
 * Possible only because a change names a disjoint slice of the settings, so
 * "undo this" is a copy from the baseline rather than a replay of history.
 * That is what lets the reader undo the third thing they did without losing
 * the fourth — which is the difference between an undo they will use and one
 * they will be afraid of.
 *
 * An id that names nothing returns the settings unchanged rather than
 * throwing: the list it came from is derived state, and a stale one is a
 * render behind, not a bug worth taking the page down for.
 */
export function revertChange(
    baseline: LensSettings,
    current: LensSettings,
    id: string,
): LensSettings {
    if (id === "priorities") {
        return { ...current, priorities: [...baseline.priorities] };
    }

    if (id.startsWith("features:")) {
        const categoryId = id.slice("features:".length) as CategoryId;

        return {
            ...current,
            categoryFeatures: {
                ...current.categoryFeatures,
                [categoryId]: [
                    ...(baseline.categoryFeatures[categoryId] ?? []),
                ],
            },
        };
    }

    if (id.startsWith("definition:")) {
        const definitionId = id.slice("definition:".length);

        const was = baseline.priorityDefinitions.find(
            (definition) => definition.id === definitionId,
        );

        return {
            ...current,
            priorityDefinitions: was
                ? current.priorityDefinitions.map((definition) =>
                      definition.id === definitionId ? was : definition,
                  )
                : /* It didn't exist before, so putting it back is removing it. */
                  current.priorityDefinitions.filter(
                      (definition) => definition.id !== definitionId,
                  ),
        };
    }

    if (id.startsWith("profiles:")) {
        const profileId = id.slice("profiles:".length);

        const was = baseline.profiles.find(
            (profile) => profile.id === profileId,
        );

        if (!was) return current;

        return {
            ...current,
            profiles: current.profiles.map((profile) =>
                profile.id === profileId
                    ? { ...profile, enabled: was.enabled }
                    : profile,
            ),
        };
    }

    if (id.startsWith("driving:")) {
        const field = id.slice("driving:".length) as keyof LensPreferences;

        return {
            ...current,
            preferences: {
                ...current.preferences,
                [field]: baseline.preferences[field],
            },
        };
    }

    return current;
}
