import { hasSavedLensSettings } from "@/lib/reasoning-engine";

/**
 * What Finn Lens remembers about getting you started.
 *
 * Deliberately separate from `LensSettings`. Everything in there is an answer
 * the reader gave that changes what Lens says; nothing in here is. This is
 * only the product's memory of what it has already shown them, and its whole
 * purpose is to stop asking twice.
 */
export interface OnboardingState {
    /** When the reader finished the setup flow. Null means they never have. */
    completedAt: string | null;
    /**
     * When they chose to skip it.
     *
     * Kept apart from `completedAt` because they mean different things to the
     * product: a reader who finished has priorities they chose, and a reader
     * who skipped is running on defaults and may want offering it again.
     * Neither is ever asked twice unprompted.
     */
    skippedAt: string | null;
    /**
     * Whether they have ever reached the advice. This is the moment the
     * product actually happens, so it is the last box on the checklist and
     * the point after which the checklist has nothing left to say.
     */
    seenAdvice: boolean;
    /** Whether they closed the getting-started checklist by hand. */
    checklistDismissed: boolean;
}

export const ONBOARDING_STORAGE_KEY = "finnLensOnboarding";

const EMPTY: OnboardingState = {
    completedAt: null,
    skippedAt: null,
    seenAdvice: false,
    checklistDismissed: false,
};

/**
 * Read the state, treating anything unreadable as "nothing yet".
 *
 * A reader whose storage is broken or empty should meet the welcome, not an
 * error: the flow is safe to show twice and there is nothing here worth
 * failing a page load over.
 */
export async function loadOnboardingState(): Promise<OnboardingState> {
    try {
        const stored = await browser.storage.local.get(
            ONBOARDING_STORAGE_KEY,
        );

        const value = stored[ONBOARDING_STORAGE_KEY];

        if (!value || typeof value !== "object") return { ...EMPTY };

        const record = value as Partial<OnboardingState>;

        return {
            completedAt:
                typeof record.completedAt === "string"
                    ? record.completedAt
                    : null,
            skippedAt:
                typeof record.skippedAt === "string"
                    ? record.skippedAt
                    : null,
            seenAdvice: record.seenAdvice === true,
            checklistDismissed: record.checklistDismissed === true,
        };
    } catch (error) {
        console.error("Finn Lens: could not read onboarding state", error);

        return { ...EMPTY };
    }
}

async function patch(changes: Partial<OnboardingState>): Promise<void> {
    try {
        const current = await loadOnboardingState();

        await browser.storage.local.set({
            [ONBOARDING_STORAGE_KEY]: { ...current, ...changes },
        });
    } catch (error) {
        console.error("Finn Lens: could not save onboarding state", error);
    }
}

export function markOnboardingComplete(): Promise<void> {
    return patch({ completedAt: new Date().toISOString() });
}

export function markOnboardingSkipped(): Promise<void> {
    return patch({ skippedAt: new Date().toISOString() });
}

export function markAdviceSeen(): Promise<void> {
    return patch({ seenAdvice: true });
}

export function dismissChecklist(): Promise<void> {
    return patch({ checklistDismissed: true });
}

/**
 * Whether to put the setup flow in front of this reader unasked.
 *
 * Three ways to be past it, and saved settings is the one that matters most:
 * anyone who configured Lens before this flow existed, or who set their
 * priorities straight from the Settings page, has already answered its
 * questions. Opening a welcome tour at them would be the product forgetting
 * a conversation they remember having.
 */
export async function needsOnboarding(): Promise<boolean> {
    const [state, configured] = await Promise.all([
        loadOnboardingState(),
        hasSavedLensSettings().catch(() => false),
    ]);

    return (
        state.completedAt === null &&
        state.skippedAt === null &&
        !configured
    );
}
