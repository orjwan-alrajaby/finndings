import { beforeEach, describe, expect, it, vi } from "vitest";

import { isPersonalised } from "./personalisation";
import {
    buildFitAnalysis,
    type FitAnalysis,
} from "./reasoning-engine/fit";
import {
    DEFAULT_CATEGORY_FEATURES,
    DEFAULT_PREFERENCES,
    DEFAULT_PRIORITIES,
} from "./reasoning-engine/constants";
import { makeCar } from "./reasoning-engine/test-fixtures";
import { AVAILABLE_CATEGORY_FEATURES } from "./reasoning-engine/constants";

/**
 * The line between Lens's opinion and the reader's.
 *
 * Shipping defaults bought the product the ability to answer on the first
 * page load. What it costs, if nobody guards it, is the difference between
 * "this car suits you" and "this car suits the assumptions we made for you" —
 * and the second sentence, said as though it were the first, is the whole of
 * what this product must not do.
 *
 * `isPersonalised` is the one test the entire UI reads to tell them apart, so
 * what these protect is that it keeps answering the question it is asked, and
 * that the defaults it distinguishes are actually good enough to reason from.
 */

let storage: Record<string, unknown>;

beforeEach(() => {
    storage = {};

    Object.assign(globalThis, {
        browser: {
            storage: {
                local: {
                    get: async (keys: string | string[]) =>
                        Object.fromEntries(
                            (Array.isArray(keys) ? keys : [keys])
                                .filter((key) => key in storage)
                                .map((key) => [key, storage[key]]),
                        ),
                },
            },
        },
    });
});

describe("isPersonalised", () => {
    it("is false on a fresh install, defaults or no defaults", async () => {
        expect(await isPersonalised()).toBe(false);
    });

    it("is true once the reader has saved a priority order", async () => {
        storage.finnLensPriorities = ["comfort", "practicality", "safetyAssistance"];

        expect(await isPersonalised()).toBe(true);
    });

    it("is true once the reader has saved driving assumptions", async () => {
        storage.finnLensPreferences = { monthlyBudget: 600 };

        expect(await isPersonalised()).toBe(true);
    });

    /*
     * The safe direction. Calling the reader's own answers "our defaults"
     * is a small insult; calling our defaults their answers is the lie.
     */
    it("errs towards claiming nothing when storage can't be read", async () => {
        Object.assign(globalThis, {
            browser: {
                storage: {
                    local: {
                        get: async () => {
                            throw new Error("storage is gone");
                        },
                    },
                },
            },
        });

        const error = vi
            .spyOn(console, "error")
            .mockImplementation(() => undefined);

        expect(await isPersonalised()).toBe(false);

        error.mockRestore();
    });
});

describe("the shipped defaults, as something to reason from", () => {
    const analyse = (features: string[]): FitAnalysis =>
        buildFitAnalysis(
            makeCar({ id: 1, features: features as never }),
            DEFAULT_PRIORITIES,
            DEFAULT_PREFERENCES,
            DEFAULT_CATEGORY_FEATURES,
        );

    /*
     * The point of shipping them. A reader who has answered nothing opens a
     * car and gets a real reading rather than a form — so the defaults have
     * to produce one.
     */
    it("produce a real verdict for a car, with nothing saved", () => {
        const analysis = analyse(
            AVAILABLE_CATEGORY_FEATURES.safetyAssistance.slice(0, 9),
        );

        expect(analysis.overall.level).not.toBe("unknown");
        expect(analysis.priorities.length).toBe(DEFAULT_PRIORITIES.length);
    });

    it("tell a well-equipped car from a bare one", () => {
        const rich = analyse([
            ...AVAILABLE_CATEGORY_FEATURES.safetyAssistance,
            ...AVAILABLE_CATEGORY_FEATURES.practicality,
            ...AVAILABLE_CATEGORY_FEATURES.comfort,
        ]);

        const bare = analyse(["hasSpareWheel"]);

        expect(rich.overall.level).not.toBe(bare.overall.level);
    });

    /*
     * A default that raised the wrong things would be worse than none: the
     * reader would be told a car misses something Lens claims they wanted.
     * So the picks have to be reported as picks, and the reasons have to
     * mention them.
     */
    it("are reported as things the reader was assumed to want", () => {
        const analysis = analyse(["hasEmergencyBrakingAssist", "hasBlindSpotAssist"]);

        const safety = analysis.priorities.find(
            (priority) => priority.priority === "safetyAssistance",
        );

        expect(safety?.picked.length).toBe(
            DEFAULT_CATEGORY_FEATURES.safetyAssistance.length,
        );
        expect(safety?.picked.length).toBeGreaterThan(0);

        /* Marked as the starting profile's, never as the reader's own. */
        for (const pick of safety?.picked ?? []) {
            expect(pick.source).toBe("profile");
        }
    });

    it("say nothing about a car FINN listed no equipment for", () => {
        const analysis = buildFitAnalysis(
            { ...makeCar({ id: 1, features: [] }), features: {} },
            DEFAULT_PRIORITIES,
            DEFAULT_PREFERENCES,
            DEFAULT_CATEGORY_FEATURES,
        );

        expect(analysis.equipmentKnown).toBe(false);
        expect(analysis.overall.level).toBe("unknown");
    });
});
