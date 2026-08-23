import { ArrowLeftIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import type { PinnedFinnCar } from "@/lib/types";
import type { LensPreferences } from "@/lib/reasoning-engine/types";
import { calculateCost } from "@/lib/reasoning-engine";

function money(value: number) {
    return `€${Math.round(value).toLocaleString("de-DE")}`;
}

export function NothingFitsBudget({
    overBudget,
    preferences,
    onBack,
}: {
    overBudget: PinnedFinnCar[];
    preferences: LensPreferences;
    onBack: () => void;
}) {
    return (
        <main className="min-h-screen bg-finn-snow px-4 py-12 text-center text-finn-black">
            <div className="mx-auto max-w-xl rounded-[28px] bg-white p-8 shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-finn-warning/15 text-finn-warning">
                    <ExclamationTriangleIcon className="h-7 w-7" />
                </div>

                <h1 className="mt-5 text-2xl font-black">
                    Nothing fits your budget
                </h1>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-finn-iron">
                    Every pinned car is estimated above your{" "}
                    {money(preferences.monthlyBudget)}/month budget, so FINN
                    Lens can't recommend one without breaking that limit.
                    Raise your budget in the previous step, or pin a
                    cheaper car.
                </p>

                {overBudget.length > 0 && (
                    <ul className="mt-5 space-y-2 text-left">
                        {overBudget.map((car) => (
                            <li
                                key={car.id}
                                className="flex items-center justify-between gap-3 rounded-2xl bg-finn-snow px-4 py-2.5"
                            >
                                <span className="truncate text-xs font-bold">
                                    {car.name}
                                </span>

                                <span className="shrink-0 text-xs font-black text-finn-warning">
                                    {money(
                                        calculateCost(car, preferences)
                                            .totalMonthly,
                                    )}
                                    /month
                                </span>
                            </li>
                        ))}
                    </ul>
                )}

                <button
                    type="button"
                    onClick={onBack}
                    className="mx-auto mt-6 flex items-center gap-2 rounded-full bg-finn-accent-blue px-5 py-3 text-xs font-black text-white shadow-md transition hover:bg-finn-highlight-navy"
                >
                    <ArrowLeftIcon className="h-4 w-4" />
                    Change preferences
                </button>
            </div>
        </main>
    );
}
