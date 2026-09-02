import "@/assets/tailwind.css";
import {
    ArrowLeftIcon,
    ArrowRightIcon,
} from "@heroicons/react/24/outline";
import type { LensPreferences } from "@/lib/reasoning-engine/types";
import { DEFAULT_PREFERENCES } from "@/lib/reasoning-engine/constants";
import { DrivingAssumptions } from "@/components/DrivingAssumptions";
import { useCompareStore } from "../../store";

/**
 * What the reader's driving costs, as its own step.
 *
 * This was the second half of the preferences step, reached through a tab.
 * It is a different question from the one before it — that one is about the
 * cars, this one is about the reader — and it feeds a different part of the
 * answer: the cost estimate and which cars are eligible at all, rather than
 * the ranking.
 *
 * Every field arrives with a working value, so this is a panel to correct
 * rather than a form to fill in, and walking straight past it is a
 * legitimate answer.
 */
export function StepThreeSetAssumptions() {
    const preferences = useCompareStore((state) => state.preferences);
    const savedPreferences = useCompareStore(
        (state) => state.savedPreferences,
    );

    const setPreferences = useCompareStore((state) => state.setPreferences);
    const useSavedPreferences = useCompareStore(
        (state) => state.useSavedPreferences,
    );

    const back = useCompareStore((state) => state.back);
    const next = useCompareStore((state) => state.next);

    return (
        <div className="flex w-full flex-col gap-6">
            <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-finn-accent-blue">
                    Step 3
                </p>

                <h2 className="mt-2 text-3xl font-black tracking-tight text-finn-black sm:text-4xl">
                    How do you drive?
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-finn-iron">
                    These decide what each car costs you to run, and which
                    cars fit your budget. The values below already work —
                    change them only where they're wrong for you.
                </p>
            </div>

            <DrivingAssumptions
                preferences={preferences}
                setPreferences={setPreferences}
                onUseSaved={useSavedPreferences}
                isSaved={sameAssumptions(preferences, savedPreferences)}
            />

            <p className="rounded-2xl border border-finn-cotton bg-white px-4 py-2.5 text-center text-[11px] leading-4 text-finn-iron">
                <strong className="font-black text-finn-black">
                    For this comparison only.
                </strong>{" "}
                Nothing here changes your saved settings — make something
                permanent in Settings.
            </p>

            <div className="flex flex-wrap items-center gap-3 border-t border-finn-cotton pt-5">
                <button
                    type="button"
                    onClick={back}
                    className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full border-2 border-finn-cotton text-finn-iron transition hover:bg-white hover:text-finn-black"
                    aria-label="Back to your preferences"
                >
                    <ArrowLeftIcon className="h-5 w-5" />
                </button>

                <button
                    type="button"
                    onClick={next}
                    className="flex h-13 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-finn-accent-blue text-sm font-black text-white shadow-md transition hover:bg-finn-highlight-navy"
                >
                    Show my recommendation
                    <ArrowRightIcon className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

/** Whether this run's assumptions are still exactly the saved ones. */
function sameAssumptions(a: LensPreferences, b: LensPreferences): boolean {
    return (
        Object.keys(DEFAULT_PREFERENCES) as (keyof LensPreferences)[]
    ).every((key) => a[key] === b[key]);
}
