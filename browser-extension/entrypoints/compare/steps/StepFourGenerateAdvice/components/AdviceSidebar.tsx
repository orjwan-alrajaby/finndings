import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import type {
    LensPreferences,
    PriorityWeight,
} from "@/lib/reasoning-engine/types";
import { formatEUR, formatKm, getCategory } from "@/lib/reasoning-engine";
import { FINN_INCLUDED_MONTHLY_KM } from "@/lib/reasoning-engine/constants";

interface AdviceSidebarProps {
    weights: PriorityWeight[];
    preferences: LensPreferences;
    onAdjustSettings: () => void;
}

/**
 * A read-back of everything the user told us, so the reasoning on the page can
 * be checked against its inputs — and changed if any of them look wrong.
 *
 * Deliberately the inputs only. The weighting those inputs produce is stated
 * once, under "Behind the recommendation"; repeating it here is how a page
 * ends up saying the same thing in three places.
 */
export function AdviceSidebar({
    weights,
    preferences,
    onAdjustSettings,
}: AdviceSidebarProps) {
    const assumptions: [string, string][] = [
        ["Monthly budget", `${formatEUR(preferences.monthlyBudget)}/month`],
        ["Your mileage", `${formatKm(preferences.monthlyKm)}/month`],
        ["Included by FINN", `${formatKm(FINN_INCLUDED_MONTHLY_KM)}/month`],
        ["Contract", preferences.contractType === "business" ? "Business" : "Private"],
        ["Petrol", `€${preferences.petrolPrice.toFixed(2)}/L`],
        ["Diesel", `€${preferences.dieselPrice.toFixed(2)}/L`],
        ["Electricity", `€${preferences.electricityPrice.toFixed(2)}/kWh`],
    ];

    return (
        <aside className="space-y-4">
            <div className="rounded-[24px] bg-white p-5 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-finn-iron">
                    Your priorities
                </p>

                <div className="mt-4 space-y-2">
                    {weights.map((weight) => (
                        <div
                            key={weight.priority}
                            className="flex items-center gap-2"
                        >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-finn-cotton text-[10px] font-black">
                                {weight.rank}
                            </span>

                            <span className="min-w-0 flex-1 truncate text-xs font-bold">
                                {getCategory(weight.priority)?.label ??
                                    weight.priority}
                            </span>
                        </div>
                    ))}
                </div>

                <p className="mt-3 text-[11px] leading-4 text-finn-iron">
                    The order you set. Higher priorities carry more of the
                    result — the exact weighting is under "Behind the
                    recommendation".
                </p>
            </div>

            <div className="rounded-[24px] bg-white p-5 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-finn-iron">
                    Your assumptions
                </p>

                <dl className="mt-4 space-y-2">
                    {assumptions.map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-2">
                            <dt className="text-xs text-finn-iron">{label}</dt>
                            <dd className="text-xs font-black text-finn-black">
                                {value}
                            </dd>
                        </div>
                    ))}
                </dl>

                <p className="mt-3 text-[11px] leading-4 text-finn-iron">
                    Your budget decides which cars are eligible to win. It
                    isn't ranked with your priorities and never changes a
                    car's score.
                </p>
            </div>

            <div className="rounded-[24px] bg-finn-black p-5 text-white">
                <p className="text-sm font-black">
                    Something doesn't look right?
                </p>

                <p className="mt-2 text-sm leading-6 text-white/75">
                    Your results are based on the driving habits and
                    assumptions you gave us. Change your mileage, energy prices
                    or other driving settings and we'll run the numbers again.
                </p>

                <button
                    type="button"
                    onClick={onAdjustSettings}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-xs font-black text-finn-black transition hover:bg-finn-snow"
                >
                    <Cog6ToothIcon className="h-4 w-4" />
                    Adjust my settings
                </button>
            </div>
        </aside>
    );
}
