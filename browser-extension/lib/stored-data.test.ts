import { beforeEach, describe, expect, it } from "vitest";

import { hasSavedLensSettings } from "./reasoning-engine";
import {
    ALL_STORED_DATA_GROUPS,
    clearStoredData,
    loadCachedCars,
    loadPinnedCars,
    STORED_DATA_GROUPS,
    summariseStoredData,
    unpinCars,
} from "./stored-data";
import { needsOnboarding } from "./onboarding";

/**
 * Deleting what Lens has stored.
 *
 * The property that matters most is that a deletion is a real one: the keys
 * have to be *removed*, not blanked. `hasSavedLensSettings` and
 * `needsOnboarding` both read an absent key as "this reader has never
 * answered", so writing `{}` over the settings would leave the product
 * convinced it had been configured by someone whose answers were gone.
 */
let storage: Record<string, unknown>;

beforeEach(() => {
    storage = {};

    Object.assign(globalThis, {
        browser: {
            storage: {
                local: {
                    get: async (keys: string | string[]) => {
                        const list =
                            typeof keys === "string" ? [keys] : keys;

                        return Object.fromEntries(
                            list
                                .filter((key) => key in storage)
                                .map((key) => [key, storage[key]]),
                        );
                    },
                    set: async (values: Record<string, unknown>) => {
                        Object.assign(storage, values);
                    },
                    remove: async (keys: string | string[]) => {
                        const list =
                            typeof keys === "string" ? [keys] : keys;

                        for (const key of list) delete storage[key];
                    },
                },
            },
        },
    });
});

function seedEverything() {
    storage.finnLensPriorities = ["safetyAssistance", "practicality", "comfort"];
    storage.finnLensPreferences = { monthlyBudget: 600 };
    storage.finnLensCategoryFeatures = { comfort: [{ key: "hasHeatedSeats" }] };
    storage.finnLensProfiles = [];
    storage.finnLensPriorityDefinitions = [];
    storage.finnLensDefaultProfileId = "balanced";
    storage.pinnedCars = { 1: { id: 1 }, 2: { id: 2 } };
    storage.loadedCarsFromFinnApi = { cars: { 1: {}, 2: {}, 3: {} }, total: 3 };
    storage.finnLensOnboarding = { completedAt: "2026-01-01T00:00:00.000Z" };
}

describe("the inventory", () => {
    it("covers every key the extension writes", () => {
        /*
         * The list this asserts against is maintained by hand. A key stored
         * anywhere in the extension and missing from STORED_DATA_GROUPS is a
         * key the reader has no way to delete, which is the whole failure
         * this file exists to prevent.
         */
        const covered = STORED_DATA_GROUPS.flatMap((group) => group.keys);

        for (const key of [
            "finnLensPreferences",
            "finnLensPriorities",
            "finnLensPriorityDefinitions",
            "finnLensProfiles",
            "finnLensCategoryFeatures",
            "finnLensDefaultProfileId",
            "finnLensOnboarding",
            "pinnedCars",
            "loadedCarsFromFinnApi",
        ]) {
            expect(covered).toContain(key);
        }
    });

    it("names no key twice", () => {
        const covered = STORED_DATA_GROUPS.flatMap((group) => group.keys);

        expect(new Set(covered).size).toBe(covered.length);
    });

    it("reports an empty browser as holding nothing", async () => {
        const counts = await summariseStoredData();

        expect(counts.every((count) => count.present)).toBe(false);
    });

    it("counts pinned cars and cached cars separately", async () => {
        seedEverything();

        const counts = await summariseStoredData();

        expect(
            counts.find((count) => count.id === "pinnedCars")?.summary,
        ).toBe("2 cars");

        expect(
            counts.find((count) => count.id === "browsingCache")?.summary,
        ).toBe("3 cars cached");
    });

    it("says one car rather than 1 cars", async () => {
        storage.pinnedCars = { 7: { id: 7 } };

        const counts = await summariseStoredData();

        expect(
            counts.find((count) => count.id === "pinnedCars")?.summary,
        ).toBe("1 car");
    });

    it("treats a malformed cache as empty rather than throwing", async () => {
        storage.loadedCarsFromFinnApi = "corrupted";

        const counts = await summariseStoredData();

        expect(
            counts.find((count) => count.id === "browsingCache")?.present,
        ).toBe(false);
    });
});

describe("clearStoredData", () => {
    it("removes only what was asked for", async () => {
        seedEverything();

        await clearStoredData(["pinnedCars"]);

        expect(storage.pinnedCars).toBeUndefined();
        expect(storage.finnLensPriorities).toBeDefined();
        expect(storage.loadedCarsFromFinnApi).toBeDefined();
        expect(storage.finnLensOnboarding).toBeDefined();
    });

    it("takes every settings key, not just the order", async () => {
        seedEverything();

        await clearStoredData(["settings"]);

        expect(storage.finnLensPriorities).toBeUndefined();
        expect(storage.finnLensPreferences).toBeUndefined();
        expect(storage.finnLensCategoryFeatures).toBeUndefined();
        expect(storage.finnLensProfiles).toBeUndefined();
        expect(storage.finnLensPriorityDefinitions).toBeUndefined();
        expect(storage.finnLensDefaultProfileId).toBeUndefined();
    });

    it("empties the browser when everything is chosen", async () => {
        seedEverything();

        await clearStoredData(ALL_STORED_DATA_GROUPS);

        expect(Object.keys(storage)).toHaveLength(0);
    });

    it("does nothing when nothing is chosen", async () => {
        seedEverything();

        await clearStoredData([]);

        expect(Object.keys(storage).length).toBeGreaterThan(0);
    });

    /*
     * The two gates that decide whether Lens treats someone as a stranger.
     * Both read absence, so both have to agree that a cleared reader is one.
     */
    it("leaves the product treating the reader as new again", async () => {
        seedEverything();

        expect(await hasSavedLensSettings()).toBe(true);
        expect(await needsOnboarding()).toBe(false);

        await clearStoredData(ALL_STORED_DATA_GROUPS);

        expect(await hasSavedLensSettings()).toBe(false);
        expect(await needsOnboarding()).toBe(true);
    });

    it("does not make the reader new again when only cars are deleted", async () => {
        seedEverything();

        await clearStoredData(["pinnedCars", "browsingCache"]);

        expect(await hasSavedLensSettings()).toBe(true);
    });
});

describe("managing the pinned set", () => {
    it("reads the pinned cars as a list", async () => {
        storage.pinnedCars = { 1: { id: 1 }, 2: { id: 2 } };

        expect(await loadPinnedCars()).toHaveLength(2);
    });

    it("reads an empty list when nothing is pinned", async () => {
        expect(await loadPinnedCars()).toEqual([]);
    });

    it("unpins the cars named and no others", async () => {
        storage.pinnedCars = { 1: { id: 1 }, 2: { id: 2 }, 3: { id: 3 } };

        await unpinCars([1, 3]);

        expect(Object.keys(storage.pinnedCars as object)).toEqual(["2"]);
    });

    /*
     * The page reads the pinned set when it loads and unpins later. Anything
     * pinned on finn.com in between must survive, so the removal is applied
     * to what is in storage at the moment of the write.
     */
    it("keeps a car pinned elsewhere while the page was open", async () => {
        storage.pinnedCars = { 1: { id: 1 } };

        /* The reader pins 9 on finn.com after this page read the set. */
        storage.pinnedCars = { 1: { id: 1 }, 9: { id: 9 } };

        await unpinCars([1]);

        expect(Object.keys(storage.pinnedCars as object)).toEqual(["9"]);
    });

    it("is a no-op when asked to unpin nothing", async () => {
        storage.pinnedCars = { 1: { id: 1 } };

        await unpinCars([]);

        expect(Object.keys(storage.pinnedCars as object)).toEqual(["1"]);
    });

    it("reads the browsing cache as a list of cars", async () => {
        storage.loadedCarsFromFinnApi = {
            cars: { 1: { id: 1 }, 2: { id: 2 } },
            total: 2,
        };

        expect(await loadCachedCars()).toHaveLength(2);
    });

    it("reads a malformed cache as no cars", async () => {
        storage.loadedCarsFromFinnApi = { cars: "nope" };

        expect(await loadCachedCars()).toEqual([]);
    });
});
