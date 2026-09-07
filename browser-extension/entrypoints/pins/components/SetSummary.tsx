import { formatEUR } from "@/lib/reasoning-engine";
import type { FitAnalysis } from "@/lib/reasoning-engine/fit";
import type { PinnedFinnCar } from "@/lib/types";

import { bestMatch, cheapestPrice } from "../utils/sorting";

/**
 * The three things a reader wants from the set as a whole, before they read
 * any single row: how many they have, which one is winning, and what the
 * floor is.
 *
 * Every figure comes from the same analyses the list and the panel are drawn
 * from, so nothing here can disagree with the row underneath it.
 */
export function SetSummary({
    cars,
    analyses,
}: {
    cars: PinnedFinnCar[];
    analyses: Map<number, FitAnalysis>;
}) {
    const best = bestMatch(cars, analyses);
    const cheapest = cheapestPrice(cars);

    return (
        <dl className="mb-5 grid gap-3 sm:grid-cols-3">
            <Stat
                label="Pinned"
                value={`${cars.length} ${cars.length === 1 ? "car" : "cars"}`}
                detail={
                    cars.length < 2
                        ? "Pin one more to get a recommendation"
                        : "Ready to rank"
                }
            />

            <Stat
                label="Best match"
                value={best?.car.name ?? "—"}
                detail={best ? best.band.label : "Nothing scored yet"}
                tone="accent"
            />

            <Stat
                label="Cheapest"
                value={cheapest ? `${formatEUR(cheapest.price)}/mo` : "—"}
                detail={cheapest?.name ?? "No prices published"}
            />
        </dl>
    );
}

function Stat({
    label,
    value,
    detail,
    tone,
}: {
    label: string;
    value: string;
    detail: string;
    /** Marks the one figure that is a verdict rather than a count. */
    tone?: "accent";
}) {
    return (
        <div className="min-w-0 rounded-[20px] bg-white px-4 py-3 shadow-sm">
            <dt className="text-[10px] font-black uppercase tracking-[0.14em] text-finn-iron">
                {label}
            </dt>

            <dd
                className={[
                    "mt-1 truncate text-base font-black",
                    tone === "accent"
                        ? "text-finn-accent-blue"
                        : "text-finn-black",
                ].join(" ")}
            >
                {value}
            </dd>

            <dd className="mt-0.5 truncate text-[11px] leading-4 text-finn-iron">
                {detail}
            </dd>
        </div>
    );
}
