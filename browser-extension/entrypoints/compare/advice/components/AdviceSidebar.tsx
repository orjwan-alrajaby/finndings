import type { ReactNode } from "react";

import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import type {
    LensPreferences,
    PriorityWeight,
} from "@/lib/reasoning-engine/types";
import { formatEUR, formatKm, getCategory } from "@/lib/reasoning-engine";
import { FINN_INCLUDED_MONTHLY_KM } from "@/lib/reasoning-engine/constants";

interface AdviceSidebarProps {
    weights: PriorityWeight[];
    preferences: LensPreferences;
    /** Opens the drawer holding these same inputs, editable. */
    onAdjust: () => void;
    /**
     * A caveat about one of the inputs above — in practice the budget notice,
     * shown when nothing the reader pinned fits what they said they'd spend.
     * Slotted straight after the assumptions it is about.
     */
    notice?: ReactNode;
}

/**
 * A read-back of everything the user told us, so the reasoning on the page can
 * be checked against its inputs — and changed if any of them look wrong.
 *
 * Deliberately the inputs only, and the order rather than the arithmetic it
 * produces. The reasoning above already argues in the reader's own ranking —
 * "you put safety first, and nothing close beats it there" — so restating
 * that as percentages is the same claim in a worse language.
 */
export function AdviceSidebar({
    weights,
    preferences,
    onAdjust,
    notice,
}: AdviceSidebarProps) {
    const assumptions: [string, string][] = [
        /*
         * No budget is a state, not a €0 budget. Reading it back as "€0/month"
         * would report a limit the reader never set — and one that nothing on
         * this page has actually applied.
         */
        [
            "Monthly budget",
            preferences.monthlyBudget > 0
                ? `${formatEUR(preferences.monthlyBudget)}/month`
                : "No limit set",
        ],
        ["Your mileage", `${formatKm(preferences.monthlyKm)}/month`],
        ["Included by FINN", `${formatKm(FINN_INCLUDED_MONTHLY_KM)}/month`],
        ["Contract", preferences.contractType === "business" ? "Business" : "Private"],
        ["Petrol", `€${preferences.petrolPrice.toFixed(2)}/L`],
        ["Diesel", `€${preferences.dieselPrice.toFixed(2)}/L`],
        ["Electricity", `€${preferences.electricityPrice.toFixed(2)}/kWh`],
    ];

    return (
        <aside className="space-y-4">
            {/*
              * Grey, where the sections beside it are coloured: this column
              * is the reader's own answers read back, not a finding about a
              * car, and it should not compete with the argument for
              * attention.
              */}
            <div className="rounded-[24px] bg-finn-cotton p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-finn-iron">
                    Your priorities
                </p>

                <div className="mt-4 space-y-2">
                    {weights.map((weight) => (
                        <div
                            key={weight.priority}
                            className="flex items-center gap-2"
                        >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-black text-finn-accent-blue">
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
                    The order you set. The higher you put a priority, the more
                    it carries of the result.
                </p>
            </div>

            <div className="rounded-[24px] bg-finn-cotton p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-finn-iron">
                    Your assumptions
                </p>

                <dl className="mt-4 space-y-2">
                    {assumptions.map(([label, value]) => (
                        <div
                            key={label}
                            className="flex justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5"
                        >
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

            {/*
              * Directly under the budget it contradicts. A warning about a
              * figure is easiest to act on next to the figure.
              */}
            {notice}

            {/*
              * The way back into everything above. It opens beside the page
              * rather than replacing it, because "does this order actually
              * give me a better answer" is a question you can only settle by
              * watching the answer change.
              */}
            <div className="finn-lens-screen-only rounded-[24px] bg-finn-black p-5 text-white">
                <p className="text-sm font-black">
                    Something doesn't look right?
                </p>

                <p className="mt-2 text-sm leading-6 text-white/75">
                    Everything on this page comes from the answers listed
                    above. Open them here and the recommendation re-runs as
                    you change them — nothing is submitted, and nothing is
                    lost.
                </p>

                <button
                    type="button"
                    onClick={onAdjust}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-xs font-black text-finn-black transition hover:bg-finn-snow"
                >
                    <AdjustmentsHorizontalIcon className="h-4 w-4" />
                    Adjust my answers
                </button>
            </div>
        </aside>
    );
}
