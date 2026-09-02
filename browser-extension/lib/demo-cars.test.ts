import { describe, expect, it } from "vitest";

import { demoCars, demoCarSummary, isDemoCar } from "./demo-cars";
import { shortName } from "./reasoning-engine/narrative/phrase";
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

function adviseOn(priorities: (typeof ORDERS)[number]["priorities"]) {
    const recommendation = buildRecommendation(
        demoCars(),
        priorities,
        DEFAULT_PREFERENCES,
        DEFAULT_CATEGORY_FEATURES,
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
     * The narrative layer reads the first word of a name as the manufacturer
     * and drops it, so what the reader is shown is everything after it. That
     * shortened form is where the word "Example" has to survive — it is the
     * name in the headline, and the headline is the sentence most likely to
     * be read on its own.
     */
    it("still says Example after the narrative shortens the name", () => {
        for (const car of demoCars()) {
            expect(shortName(car.name).startsWith("Example ")).toBe(true);
        }
    });

    it("names nothing after a real manufacturer or model", () => {
        for (const car of demoCars()) {
            expect(car.brand).toBe("Demo");
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
    it("does not always name the same winner", () => {
        const winners = new Set(
            ORDERS.map(
                ({ priorities }) => adviseOn(priorities)?.recommendation.winner.id,
            ),
        );

        expect(winners.size).toBeGreaterThan(1);
    });

    it("names something given up, on an order that has a clear winner", () => {
        /* Emissions-led: the electric car wins and gives up space for it. */
        const result = adviseOn([
            "environmental",
            "practicality",
            "familyFriendly",
        ]);

        expect(result?.recommendation.winner.name).toBe(
            "Demo Example Compact Electric",
        );
        expect(result?.narrative.tradeoffs.length).toBeGreaterThan(0);
    });

    it("changes its answer when the reader's order changes", () => {
        const ecoLed = adviseOn([
            "environmental",
            "practicality",
            "comfort",
        ]);

        const spaceLed = adviseOn([
            "familyFriendly",
            "practicality",
            "longDistance",
        ]);

        expect(ecoLed?.recommendation.winner.id).not.toBe(
            spaceLed?.recommendation.winner.id,
        );
    });
});
