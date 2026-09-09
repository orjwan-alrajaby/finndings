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
}: {
    preferences: LensPreferences;
    onChange: (next: LensPreferences) => void;
}) {
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

            <p className="mx-auto mt-6 max-w-md text-center text-[11px] leading-4 text-finn-iron">
                You can change any of this later in Settings, or just for one
                comparison without touching what you've saved.
            </p>

        </div>
    );
}
