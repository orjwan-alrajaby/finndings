import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    dismissChecklist,
    loadOnboardingState,
    markAdviceSeen,
    markOnboardingComplete,
    markOnboardingSkipped,
    needsOnboarding,
    ONBOARDING_STORAGE_KEY,
} from "./onboarding";

/**
 * What the product remembers about having explained itself.
 *
 * The rule everything here serves: never ask twice. A reader who finished
 * the setup, one who deliberately skipped it, and one who configured Lens
 * before the flow existed are all past it, and the install hook has to agree
 * with all three.
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
                },
            },
        },
    });
});

describe("loadOnboardingState", () => {
    it("reads as untouched when nothing is stored", async () => {
        expect(await loadOnboardingState()).toEqual({
            completedAt: null,
            skippedAt: null,
            seenAdvice: false,
            checklistDismissed: false,
        });
    });

    /* Storage is shared with other extension state and versions of this one. */
    it("survives a malformed record rather than throwing", async () => {
        storage[ONBOARDING_STORAGE_KEY] = "not an object";

        expect((await loadOnboardingState()).completedAt).toBeNull();
    });

    it("ignores fields of the wrong type", async () => {
        storage[ONBOARDING_STORAGE_KEY] = {
            completedAt: 12345,
            seenAdvice: "yes",
        };

        const state = await loadOnboardingState();

        expect(state.completedAt).toBeNull();
        expect(state.seenAdvice).toBe(false);
    });

    it("treats an unreadable storage as untouched", async () => {
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

        expect((await loadOnboardingState()).completedAt).toBeNull();

        error.mockRestore();
    });
});

describe("recording progress", () => {
    it("keeps the marks separate", async () => {
        await markAdviceSeen();
        await dismissChecklist();

        const state = await loadOnboardingState();

        expect(state.seenAdvice).toBe(true);
        expect(state.checklistDismissed).toBe(true);
        expect(state.completedAt).toBeNull();
    });

    /*
     * Finishing and skipping are recorded apart on purpose: one reader has
     * answers of their own and the other is running on the defaults, and
     * only the second is worth offering the flow to again.
     */
    it("distinguishes finishing from skipping", async () => {
        await markOnboardingComplete();

        const completed = await loadOnboardingState();

        expect(completed.completedAt).not.toBeNull();
        expect(completed.skippedAt).toBeNull();
    });

    it("does not lose earlier marks when a later one is written", async () => {
        await markAdviceSeen();
        await markOnboardingComplete();

        expect((await loadOnboardingState()).seenAdvice).toBe(true);
    });
});

describe("needsOnboarding", () => {
    it("is true for a reader who has done nothing at all", async () => {
        expect(await needsOnboarding()).toBe(true);
    });

    it("is false once the flow has been finished", async () => {
        await markOnboardingComplete();

        expect(await needsOnboarding()).toBe(false);
    });

    it("is false once it has been skipped", async () => {
        await markOnboardingSkipped();

        expect(await needsOnboarding()).toBe(false);
    });

    /*
     * The case that matters most: everyone who used Lens before this flow
     * existed. Their settings are the answers it would ask for, so opening
     * it at them would be the product forgetting a conversation.
     */
    it("is false for a reader who configured Lens without it", async () => {
        storage.finnLensPriorities = [
            "safetyAssistance",
            "practicality",
            "comfort",
        ];

        expect(await needsOnboarding()).toBe(false);
    });

    it("is not fooled by an empty saved order", async () => {
        storage.finnLensPriorities = [];

        expect(await needsOnboarding()).toBe(true);
    });
});
