import type { FitAnalysis } from "@/lib/reasoning-engine/fit";
import type { PinnedFinnCar } from "@/lib/types";

/**
 * How the pinned set can be ordered, and the two figures drawn above it.
 *
 * Kept apart from the page because none of it is about React: given the cars
 * and their analyses, each answer is arithmetic, and arithmetic is the part
 * worth being able to read — and test — without a component around it.
 */

export type SortKey = "pinnedAt" | "fit" | "price" | "name";

export const SORTS: [SortKey, string][] = [
    ["pinnedAt", "Recently pinned"],
    ["fit", "Best fit"],
    ["price", "Cheapest"],
    ["name", "Name"],
];

/** Strongest first. "unknown" is last because it is an absence, not a grade. */
const FIT_ORDER = ["strong", "good", "partial", "limited", "unknown"];

/**
 * Ordering the list.
 *
 * "Best fit" falls back to leaving the order alone when nothing has been
 * analysed, which is what happens before the reader has configured Lens —
 * sorting by a band nobody has been shown would be ordering the list by a
 * secret.
 */
export function sortCars(
    cars: PinnedFinnCar[],
    key: SortKey,
    analyses: Map<number, FitAnalysis>,
): PinnedFinnCar[] {
    const next = [...cars];

    const priceOf = (car: PinnedFinnCar) =>
        car.pricing?.customerMonthly?.price || Number.POSITIVE_INFINITY;

    const rankOf = (car: PinnedFinnCar) => {
        const level = analyses.get(car.id)?.overall.level;

        return level ? FIT_ORDER.indexOf(level) : FIT_ORDER.length;
    };

    switch (key) {
        case "fit":
            return next.sort((a, b) => rankOf(a) - rankOf(b));

        case "price":
            return next.sort((a, b) => priceOf(a) - priceOf(b));

        case "name":
            return next.sort((a, b) => a.name.localeCompare(b.name));

        default:
            /* Newest first, and cars with no timestamp last rather than first. */
            return next.sort((a, b) =>
                (b.pinnedAt ?? "").localeCompare(a.pinnedAt ?? ""),
            );
    }
}

/** The strongest-scoring car, if anything has been scored at all. */
export function bestMatch(
    cars: PinnedFinnCar[],
    analyses: Map<number, FitAnalysis>,
): { car: PinnedFinnCar; band: FitAnalysis["overall"] } | null {
    let best: { car: PinnedFinnCar; band: FitAnalysis["overall"] } | null =
        null;

    for (const car of cars) {
        const band = analyses.get(car.id)?.overall;

        if (!band || band.level === "unknown") continue;

        if (
            !best ||
            FIT_ORDER.indexOf(band.level) < FIT_ORDER.indexOf(best.band.level)
        ) {
            best = { car, band };
        }
    }

    return best;
}

/** The lowest published subscription price in the set. */
export function cheapestPrice(
    cars: PinnedFinnCar[],
): { price: number; name: string } | null {
    let cheapest: { price: number; name: string } | null = null;

    for (const car of cars) {
        const price = car.pricing?.customerMonthly?.price;

        if (!price) continue;
        if (!cheapest || price < cheapest.price) {
            cheapest = { price, name: car.name };
        }
    }

    return cheapest;
}
