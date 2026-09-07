import { DEFAULT_PREFERENCES } from "@/lib/reasoning-engine/constants";
import type { LensPreferences } from "@/lib/reasoning-engine/types";
import { DrivingAssumptions } from "@/components/DrivingAssumptions";

import { DrawerSection } from "./DrawerSection";

/** What the reader's driving costs, which decides the money on the page. */
export function AssumptionsSection({
    preferences,
    savedPreferences,
    onChange,
    onUseSaved,
}: {
    preferences: LensPreferences;
    savedPreferences: LensPreferences;
    onChange: (preferences: LensPreferences) => void;
    onUseSaved: () => void;
}) {
    return (
        <DrawerSection
            value="driving"
            title="How you drive"
            summary={
                preferences.monthlyBudget > 0
                    ? `€${preferences.monthlyBudget}/month budget · ${preferences.monthlyKm} km`
                    : `No budget set · ${preferences.monthlyKm} km a month`
            }
        >
            <DrivingAssumptions
                preferences={preferences}
                setPreferences={onChange}
                onUseSaved={onUseSaved}
                isSaved={sameAssumptions(preferences, savedPreferences)}
            />
        </DrawerSection>
    );
}

/** Whether this draft's assumptions are still exactly the saved ones. */
function sameAssumptions(a: LensPreferences, b: LensPreferences): boolean {
    return (
        Object.keys(DEFAULT_PREFERENCES) as (keyof LensPreferences)[]
    ).every((key) => a[key] === b[key]);
}
