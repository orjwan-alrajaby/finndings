import { ArrowLeft, ArrowRight } from "lucide-react";

import { DrivingAssumptions } from "@/components/DrivingAssumptions";
import type { LensPreferences } from "@/lib/reasoning-engine/types";

/**
 * The second and last thing asked for, and the one that may be ignored.
 *
 * Every field ships with a working value, so the honest framing is a panel
 * to correct rather than a form to fill in — and the button says "looks
 * right" rather than "save", because accepting what is already there is the
 * expected answer and should not feel like skipping.
 *
 * No "use my saved values" affordance: there is nothing saved yet. That is
 * the only difference from the same panel in the compare flow.
 */
export function Driving({
    preferences,
    onChange,
    onBack,
    onNext,
}: {
    preferences: LensPreferences;
    onChange: (next: LensPreferences) => void;
    onBack: () => void;
    onNext: () => void;
}) {
    const untouched = preferences.monthlyBudget === 0;

    return (
        <div>
            <div className="text-center">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-finn-accent-blue">
                    Step 2 of 2
                </p>

                <h1 className="mx-auto mt-3 max-w-2xl text-3xl font-black leading-tight tracking-tight text-finn-black sm:text-4xl">
                    How do you drive?
                </h1>

                <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-finn-iron">
                    FINN advertises a monthly price. What a car actually costs
                    you also depends on how far you drive and what energy costs
                    where you live, and Lens works that out — but only from
                    figures you give it. These already work; change the ones
                    that are wrong for you and leave the rest.
                </p>
            </div>

            <div className="mt-8">
                <DrivingAssumptions
                    preferences={preferences}
                    setPreferences={onChange}
                />
            </div>

            <div className="mt-8 flex flex-col items-center gap-3">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onBack}
                        className="flex h-13 w-13 items-center justify-center rounded-full border-2 border-finn-cotton text-finn-iron transition hover:bg-white hover:text-finn-black"
                        aria-label="Back to your priorities"
                    >
                        <ArrowLeft aria-hidden="true" className="h-5 w-5" />
                    </button>

                    <button
                        type="button"
                        onClick={onNext}
                        className="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-finn-accent-blue px-8 text-sm font-black text-white shadow-md transition hover:bg-finn-highlight-navy"
                    >
                        {untouched
                            ? "These look right — show me Lens working"
                            : "Show me Lens working"}
                        <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </button>
                </div>

                <p className="max-w-md text-center text-[11px] leading-4 text-finn-iron">
                    You can change any of this later in Settings, or just for
                    one comparison without touching what you've saved.
                </p>
            </div>
        </div>
    );
}
