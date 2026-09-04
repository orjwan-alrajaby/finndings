import { describe, expect, it } from "vitest";

import {
    describeSettingsChanges,
    revertChange,
} from "./settings-changes";
import {
    DEFAULT_CATEGORY_FEATURES,
    DEFAULT_DEFAULT_PROFILE_ID,
    DEFAULT_PREFERENCES,
    DEFAULT_PRIORITIES,
    DEFAULT_PRIORITY_DEFINITIONS,
    DEFAULT_PROFILES,
} from "./reasoning-engine/constants";
import type { LensSettings } from "./reasoning-engine/types";

/**
 * The list that replaced "You have unsaved changes".
 *
 * Two properties carry the whole feature, and both are about trust rather
 * than about diffing.
 *
 * **It must not report a change that isn't one.** The reader is being told
 * what they did, next to a button that undoes it. A list that counts
 * keystrokes rather than differences would offer to undo things nobody
 * changed, and one wrong entry costs the whole list its credibility.
 *
 * **Undo must touch only what it names.** Every entry offers to revert
 * itself, which is only safe because the entries are disjoint slices of the
 * settings. If undoing the boot-space pick could disturb the priority order,
 * the reader would be right never to press it.
 */

const base = (): LensSettings => ({
    preferences: { ...DEFAULT_PREFERENCES },
    priorities: [...DEFAULT_PRIORITIES],
    priorityDefinitions: DEFAULT_PRIORITY_DEFINITIONS.map((d) => ({ ...d })),
    categoryFeatures: Object.fromEntries(
        Object.entries(DEFAULT_CATEGORY_FEATURES).map(([id, picks]) => [
            id,
            picks.map((pick) => ({ ...pick })),
        ]),
    ) as LensSettings["categoryFeatures"],
    profiles: DEFAULT_PROFILES.map((p) => ({ ...p })),
    defaultProfileId: DEFAULT_DEFAULT_PROFILE_ID,
});

const idsOf = (before: LensSettings, after: LensSettings) =>
    describeSettingsChanges(before, after).map((change) => change.id);

describe("describeSettingsChanges", () => {
    it("reports nothing when nothing changed", () => {
        expect(describeSettingsChanges(base(), base())).toEqual([]);
    });

    /*
     * The property that makes the count mean something. A reader who drags a
     * priority and drags it back has changed nothing, and a list that said
     * "1 change" would be describing their hands rather than their settings.
     */
    it("reports nothing when a change is undone by hand", () => {
        const before = base();
        const after = base();

        const [first, second] = after.priorities;

        after.priorities[0] = second!;
        after.priorities[1] = first!;
        after.priorities[0] = first!;
        after.priorities[1] = second!;

        expect(describeSettingsChanges(before, after)).toEqual([]);
    });

    it("names the priority that now leads", () => {
        const before = base();
        const after = base();

        after.priorities = [
            after.priorities[1]!,
            after.priorities[0]!,
            ...after.priorities.slice(2),
        ];

        const [change] = describeSettingsChanges(before, after);

        expect(change?.id).toBe("priorities");
        expect(change?.detail).toContain("now leads");
    });

    it("says what was added and removed from the order", () => {
        const before = base();
        const after = base();

        after.priorities = after.priorities.slice(0, 3);

        const [change] = describeSettingsChanges(before, after);

        expect(change?.detail).toContain("removed");
    });

    it("reports a raised feature under its own category", () => {
        const before = base();
        const after = base();

        after.categoryFeatures.comfort = [
            ...after.categoryFeatures.comfort,
            { key: "hasSunroof", importance: "medium" },
        ];

        const [change] = describeSettingsChanges(before, after);

        expect(change?.id).toBe("features:comfort");
        expect(change?.detail).toContain("Sunroof");
    });

    it("reports a re-graded feature as a change in how much it counts", () => {
        const before = base();
        const after = base();

        after.categoryFeatures.comfort = after.categoryFeatures.comfort.map(
            (pick, index) =>
                index === 0 ? { ...pick, importance: "low" as const } : pick,
        );

        const [change] = describeSettingsChanges(before, after);

        expect(change?.id).toBe("features:comfort");
        expect(change?.detail).toContain("counts");
    });

    it("reports a switched-off profile in the reader's terms", () => {
        const before = base();
        const after = base();

        after.profiles = after.profiles.map((profile, index) =>
            index === 0 ? { ...profile, enabled: false } : profile,
        );

        const [change] = describeSettingsChanges(before, after);

        expect(change?.group).toBe("profiles");
        expect(change?.detail).toContain("switched off");
    });

    it("shows both sides of a driving figure", () => {
        const before = base();
        const after = base();

        after.preferences = { ...after.preferences, monthlyBudget: 700 };

        const [change] = describeSettingsChanges(before, after);

        expect(change?.id).toBe("driving:monthlyBudget");
        expect(change?.detail).toBe("no limit → €700");
    });

    it("counts several edits separately", () => {
        const before = base();
        const after = base();

        after.preferences = { ...after.preferences, monthlyKm: 1500 };
        after.priorities = [...after.priorities].reverse();
        after.categoryFeatures.comfort = [];

        expect(describeSettingsChanges(before, after)).toHaveLength(3);
    });

    /* The order is by consequence: what changes every explanation comes first. */
    it("puts the priority order above the price of diesel", () => {
        const before = base();
        const after = base();

        after.preferences = { ...after.preferences, dieselPrice: 1.9 };
        after.priorities = [...after.priorities].reverse();

        expect(idsOf(before, after)[0]).toBe("priorities");
    });
});

describe("revertChange", () => {
    it("puts the priority order back and leaves everything else", () => {
        const before = base();
        const after = base();

        after.priorities = [...after.priorities].reverse();
        after.preferences = { ...after.preferences, monthlyKm: 1500 };

        const reverted = revertChange(before, after, "priorities");

        expect(reverted.priorities).toEqual(before.priorities);
        expect(reverted.preferences.monthlyKm).toBe(1500);
    });

    it("puts one category's picks back and leaves the others", () => {
        const before = base();
        const after = base();

        after.categoryFeatures.comfort = [];
        after.categoryFeatures.practicality = [];

        const reverted = revertChange(before, after, "features:comfort");

        expect(reverted.categoryFeatures.comfort).toEqual(
            before.categoryFeatures.comfort,
        );
        expect(reverted.categoryFeatures.practicality).toEqual([]);
    });

    it("puts one driving figure back and leaves the others", () => {
        const before = base();
        const after = base();

        after.preferences = {
            ...after.preferences,
            monthlyBudget: 700,
            monthlyKm: 1500,
        };

        const reverted = revertChange(
            before,
            after,
            "driving:monthlyBudget",
        );

        expect(reverted.preferences.monthlyBudget).toBe(
            before.preferences.monthlyBudget,
        );
        expect(reverted.preferences.monthlyKm).toBe(1500);
    });

    it("puts one profile's switch back and leaves the others", () => {
        const before = base();
        const after = base();

        after.profiles = after.profiles.map((profile) => ({
            ...profile,
            enabled: false,
        }));

        const id = after.profiles[0]!.id;

        const reverted = revertChange(before, after, `profiles:${id}`);

        expect(reverted.profiles[0]?.enabled).toBe(
            before.profiles[0]?.enabled,
        );
        expect(reverted.profiles[1]?.enabled).toBe(false);
    });

    /*
     * The round trip that has to hold, or the list is offering something it
     * cannot deliver: undo every entry and you are back where you started.
     */
    it("returns to the baseline when every change is reverted", () => {
        const before = base();
        const after = base();

        after.priorities = [...after.priorities].reverse();
        after.preferences = { ...after.preferences, monthlyBudget: 700 };
        after.categoryFeatures.comfort = [];
        after.profiles = after.profiles.map((profile, index) =>
            index === 0 ? { ...profile, enabled: false } : profile,
        );

        const reverted = describeSettingsChanges(before, after).reduce(
            (settings, change) => revertChange(before, settings, change.id),
            after,
        );

        expect(describeSettingsChanges(before, reverted)).toEqual([]);
    });

    it("leaves the settings alone when the id names nothing", () => {
        const settings = base();

        expect(revertChange(base(), settings, "nonsense:42")).toBe(settings);
    });
});
