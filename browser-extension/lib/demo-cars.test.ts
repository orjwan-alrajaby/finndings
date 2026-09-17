import { describe, expect, it } from "vitest";

import { demoCars, demoCarSummary, isDemoCar } from "./demo-cars";
import { configurationDetail, configurationName } from "./car-labels";
import {
    buildAdviceNarrative,
    buildRecommendation,
} from "./reasoning-engine";
import {
    DEFAULT_CATEGORY_FEATURES,
    DEFAULT_PREFERENCES,
    DEFAULT_PROFILES,
} from "./reasoning-engine/constants";

/**
 * The example cars exist for one screen: the last one in the setup flow,
 * which runs the real engine over them and shows the reader the result.
 *
 * That screen is a promise about the product, so what these tests protect is
 * the promise rather than the cars. Every priority order a reader can arrive
 * at it with has to produce a verdict with something in it — a headline, a
 * reason, a cost. A demonstration that comes out blank, or that names the
 * same winner whatever the reader said mattered, would teach them the
 * opposite of what it is there to teach.
 */

const ORDERS = DEFAULT_PROFILES.map((profile) => ({
    id: profile.id,
    priorities: [...profile.priorities],
}));

function adviseOn(
    priorities: (typeof ORDERS)[number]["priorities"],
    features = DEFAULT_CATEGORY_FEATURES,
) {
    const recommendation = buildRecommendation(
        demoCars(),
        priorities,
        DEFAULT_PREFERENCES,
        features,
    );

    if (!recommendation) return null;

    return {
        recommendation,
        narrative: buildAdviceNarrative(
            recommendation.evaluation,
            recommendation.context,
            recommendation.alternatives,
        ),
    };
}

describe("the example cars", () => {
    it("are three, and are all marked as examples", () => {
        const cars = demoCars();

        expect(cars).toHaveLength(3);
        expect(cars.every(isDemoCar)).toBe(true);
    });

    /*
     * Negative ids are what keeps them out of the pinned set: pinned cars are
     * keyed by FINN's own vehicle id, which is never negative, so an example
     * can never collide with or overwrite a real one.
     */
    it("cannot collide with a car FINN listed", () => {
        expect(demoCars().every((car) => car.id < 0)).toBe(true);
    });

    it("link nowhere, because they have no page to open", () => {
        expect(demoCars().every((car) => car.url === "")).toBe(true);
    });

    it("each carry the one-line summary the setup screen shows", () => {
        for (const car of demoCars()) {
            expect(demoCarSummary(car.id).length).toBeGreaterThan(0);
        }
    });

    /*
     * The one rule the marques have to obey. These are shown beside real
     * prices and real reasoning, so a name that happened to be a real
     * manufacturer would be exactly the thing the disclaimer cannot undo.
     */
    it("is named after no real manufacturer", () => {
        const real = [
            "audi", "bmw", "byd", "citroen", "cupra", "dacia", "fiat", "ford",
            "honda", "hyundai", "jaguar", "jeep", "kia", "lexus", "mazda",
            "mercedes", "mg", "mini", "nissan", "opel", "peugeot", "polestar",
            "porsche", "renault", "seat", "skoda", "smart", "subaru", "suzuki",
            "tesla", "toyota", "volkswagen", "volvo", "vw",
        ];

        for (const car of demoCars()) {
            expect(real).not.toContain(car.brand.toLowerCase());
            expect(real).not.toContain(car.model.toLowerCase());
        }
    });

    /*
     * The fields `configurationName` and `configurationDetail` draw. A
     * preview that leaves them empty previews a page nobody will see: the
     * panel would read "Configuration -2" where a real car reads "Style Plus
     * · 150 PS · Petrol".
     */
    it("carries the configuration fields a real listing has", () => {
        for (const car of demoCars()) {
            expect(configurationName(car)).not.toMatch(/^Configuration /);
            expect(configurationDetail(car)).toContain("PS");
            expect(car.engine.length).toBeGreaterThan(0);
            expect(car.year.length).toBeGreaterThan(0);
        }
    });

    it("gives each car a name a reader would recognise as one", () => {
        for (const car of demoCars()) {
            expect(car.name).toBe(`${car.brand} ${car.model}`);
            expect(car.name.trim().length).toBeGreaterThan(0);
        }
    });
});

describe("the worked example the setup flow shows", () => {
    it.each(ORDERS)(
        "produces a recommendation for the $id order",
        ({ priorities }) => {
            const result = adviseOn(priorities);

            expect(result).not.toBeNull();
            expect(result?.narrative.verdict.headline).toBeTruthy();
        },
    );

    it.each(ORDERS)(
        "can say why, for the $id order",
        ({ priorities }) => {
            const result = adviseOn(priorities);

            expect(
                result?.narrative.verdict.reasons.length,
            ).toBeGreaterThan(0);
        },
    );

    it.each(ORDERS)(
        "can cost the winner for the $id order",
        ({ priorities }) => {
            const result = adviseOn(priorities);

            expect(result?.narrative.cost.subject.total).toBeGreaterThan(0);
            expect(result?.narrative.cost.subject.complete).toBe(true);
        },
    );

    /*
     * The whole point of the screen. If every order picked the same car the
     * demonstration would quietly argue that the priorities don't matter.
     */
    /*
     * The contract in the file's own doc comment: each car is strongest
     * somewhere different. It is worth asserting per car rather than only
     * counting distinct winners, because a car that never wins is a car in
     * the demonstration for nothing — and this broke silently once already,
     * when the shipped defaults changed underneath it and left the electric
     * car losing even to an emissions-led order.
     */
    it("gives every example car an order it wins", () => {
        const winners = new Set(
            ORDERS.map(
                ({ priorities }) => adviseOn(priorities)?.recommendation.winner.id,
            ),
        );

        for (const car of demoCars()) {
            expect(winners).toContain(car.id);
        }
    });

    /* And the one a reader would check first: emissions-led picks the EV. */
    it("names the electric car when emissions lead", () => {
        const result = adviseOn([
            "environmental",
            "safetyAssistance",
            "practicality",
            "longDistance",
            "comfort",
        ]);

        expect(result?.recommendation.winner.fuelType).toBe("Electric");
    });

    it("does not always name the same winner", () => {
        const winners = new Set(
            ORDERS.map(
                ({ priorities }) => adviseOn(priorities)?.recommendation.winner.id,
            ),
        );

        expect(winners.size).toBeGreaterThan(1);
    });

    it("names something given up, on an order that has a clear winner", () => {
        /*
         * Emissions-led, with a powered tailgate raised: the electric car wins
         * and gives up the tailgate the petrol SUV has.
         */
        const result = adviseOn(["environmental", "practicality", "cityParking"], {
            ...DEFAULT_CATEGORY_FEATURES,
            practicality: [{ key: "hasElectricTailgate", importance: "high" }],
        });

        expect(result?.recommendation.winner.name).toBe("Aveline Lumo");
        expect(result?.narrative.tradeoffs.length).toBeGreaterThan(0);
    });

    it("changes its answer when the reader's order changes", () => {
        const ecoLed = adviseOn([
            "environmental",
            "practicality",
            "comfort",
        ]);

        const spaceLed = adviseOn([
            "practicality",
            "safetyAssistance",
            "longDistance",
        ]);

        expect(ecoLed?.recommendation.winner.id).not.toBe(
            spaceLed?.recommendation.winner.id,
        );
    });
});
