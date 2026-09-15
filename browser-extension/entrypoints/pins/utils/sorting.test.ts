import { describe, expect, it } from "vitest";

import type { FitAnalysis } from "@/lib/reasoning-engine/fit";
import { makeCar } from "@/lib/reasoning-engine/test-fixtures";
import type { PinnedFinnCar } from "@/lib/types";

import { bestMatch, cheapestPrice, sortCars } from "./sorting";

/**
 * Ordering the pinned set, and the two figures printed above it.
 *
 * All three read the same map of analyses the list and the panel are drawn
 * from, and the property worth protecting is that an unscored car is treated
 * as unscored rather than as bad — before the reader has configured Lens
 * every car is in that state, and a list silently ordered by a band nobody
 * has been shown is a list ordered by a secret.
 */

function car(
    id: number,
    over: {
        name?: string;
        price?: number;
        businessPrice?: number;
        pinnedAt?: string;
    } = {},
): PinnedFinnCar {
    return {
        ...makeCar({
            id,
            name: over.name ?? `Car ${id}`,
            customerMonthly: over.price ?? 500,
            businessMonthly: over.businessPrice ?? 420,
        }),
        pinnedAt: over.pinnedAt ?? "",
    };
}

/** Only `overall` is read, so only `overall` is built. */
function analysed(
    entries: [number, FitAnalysis["overall"]["level"]][],
): Map<number, FitAnalysis> {
    return new Map(
        entries.map(([id, level]) => [
            id,
            { overall: { level, label: level } } as FitAnalysis,
        ]),
    );
}

const ids = (cars: PinnedFinnCar[]) => cars.map((one) => one.id);

describe("sortCars", () => {
    const cars = [
        car(1, { name: "Zephyr", price: 700, pinnedAt: "2026-01-01" }),
        car(2, { name: "Aster", price: 500, pinnedAt: "2026-03-01" }),
        car(3, { name: "Meridian", price: 600, pinnedAt: "2026-02-01" }),
    ];

    it("puts the most recently pinned first", () => {
        expect(ids(sortCars(cars, "pinnedAt", new Map()))).toEqual([2, 3, 1]);
    });

    it("puts a car with no pinned date last rather than first", () => {
        const withUnknown = [...cars, car(4, { pinnedAt: "" })];

        expect(ids(sortCars(withUnknown, "pinnedAt", new Map())).at(-1)).toBe(
            4,
        );
    });

    it("sorts by price and by name", () => {
        expect(ids(sortCars(cars, "price", new Map()))).toEqual([2, 3, 1]);
        expect(ids(sortCars(cars, "name", new Map()))).toEqual([2, 3, 1]);
    });

    it("sorts by the price for the reader's own contract", () => {
        /* Private order is 2, 3, 1; business prices run the other way. */
        const mixed = [
            car(1, { price: 700, businessPrice: 300 }),
            car(2, { price: 500, businessPrice: 650 }),
            car(3, { price: 600, businessPrice: 400 }),
        ];

        expect(ids(sortCars(mixed, "price", new Map(), "business"))).toEqual([
            1, 3, 2,
        ]);
    });

    it("puts a car with no published price last when sorting by price", () => {
        const withUnpriced = [car(4, { price: 0 }), ...cars];

        expect(ids(sortCars(withUnpriced, "price", new Map())).at(-1)).toBe(4);
    });

    it("sorts by fit, strongest first", () => {
        const analyses = analysed([
            [1, "partial"],
            [2, "limited"],
            [3, "strong"],
        ]);

        expect(ids(sortCars(cars, "fit", analyses))).toEqual([3, 1, 2]);
    });

    it("leaves an unanalysed set alone rather than ordering it by a secret", () => {
        expect(ids(sortCars(cars, "fit", new Map()))).toEqual([1, 2, 3]);
    });

    it("doesn't reorder the array it was given", () => {
        const before = ids(cars);

        sortCars(cars, "price", new Map());

        expect(ids(cars)).toEqual(before);
    });
});

describe("bestMatch", () => {
    const cars = [car(1), car(2), car(3)];

    it("picks the strongest band", () => {
        const best = bestMatch(
            cars,
            analysed([
                [1, "good"],
                [2, "strong"],
                [3, "partial"],
            ]),
        );

        expect(best?.car.id).toBe(2);
    });

    it("won't call an unscored car the best match", () => {
        expect(bestMatch(cars, analysed([[1, "unknown"]]))).toBeNull();
    });

    it("is null when nothing has been scored", () => {
        expect(bestMatch(cars, new Map())).toBeNull();
    });
});

describe("cheapestPrice", () => {
    it("finds the lowest published price and names the car", () => {
        const cheapest = cheapestPrice([
            car(1, { name: "Zephyr", price: 700 }),
            car(2, { name: "Aster", price: 450 }),
        ]);

        expect(cheapest).toEqual({ id: 2, price: 450, name: "Aster" });
    });

    it("reads the business price for a business reader", () => {
        const cheapest = cheapestPrice(
            [
                car(1, { name: "Zephyr", price: 700, businessPrice: 380 }),
                car(2, { name: "Aster", price: 450, businessPrice: 410 }),
            ],
            "business",
        );

        expect(cheapest).toEqual({ id: 1, price: 380, name: "Zephyr" });
    });

    it("is null when nothing is priced", () => {
        expect(cheapestPrice([car(1, { price: 0 })])).toBeNull();
    });
});
