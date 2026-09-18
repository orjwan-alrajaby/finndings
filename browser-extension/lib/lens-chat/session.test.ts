import { describe, expect, it } from "vitest";

import { copyFeatures, type Answers } from "@/entrypoints/compare/store";
import {
    DEFAULT_CATEGORY_FEATURES,
    DEFAULT_PREFERENCES,
    DEFAULT_PRIORITIES,
} from "@/lib/reasoning-engine/constants";
import { fleet } from "@/lib/reasoning-engine/test-data/fleet";
import type { WireUnderstanding } from "@/lib/lens-ai/contract";

import { lengthAmong, lengthGap, parkingContext, widthContext } from "./dimensions";
import { SCENARIOS } from "./scenarios.fixture";
import {
    EMPTY_UNDERSTANDING,
    readSuggestions,
    readUnderstanding,
    toAnswers,
    withoutSuggestion,
    withSuggestion,
} from "./understanding";

/*
 * The temporary profile a conversation builds.
 *
 * Lens's saved settings describe the reader in general; a conversation
 * describes the search in front of them. These hold the line between the two:
 * the session decides what is weighed, the saved settings are read only where
 * the conversation is silent, and nothing is ever written back.
 */

const saved = (): Answers => ({
    /* A reader whose saved profile looks nothing like the conversation. */
    priorities: ["environmental", "longDistance", "comfort"],
    preferences: { ...DEFAULT_PREFERENCES },
    features: copyFeatures({
        ...DEFAULT_CATEGORY_FEATURES,
        /* A saved raise inside a priority this conversation will also use. */
        cityParking: [{ key: "hasElectricallyFoldingMirrors", importance: "high", source: "user" }],
        comfort: [{ key: "hasPremiumSoundSystem", importance: "high", source: "user" }],
    }),
    basedOn: "roadtrip",
});

const cars = fleet().slice(0, 24);
const scenario = (id: string): WireUnderstanding => SCENARIOS.find((item) => item.id === id)!.reading;
const read = (wire: WireUnderstanding) => readUnderstanding(wire, EMPTY_UNDERSTANDING, undefined, "2026-09");

describe("the session profile", () => {
    it("weighs the conversation, not the saved profile", () => {
        const { profile, answers } = toAnswers(saved(), read(scenario("city-parent")));

        expect(profile.priorities.filter((item) => !item.filler).map((item) => item.id)).toEqual(["cityParking", "practicality"]);
        expect(answers.basedOn).toBeNull();
        /* The saved folding-mirrors raise belongs to a different search. */
        expect(answers.features.cityParking.map((item) => item.key)).not.toContain("hasElectricallyFoldingMirrors");
        expect(answers.features.cityParking.map((item) => item.key)).toContain("hasThreeSixtyDegreesCamera");
    });

    it("reads the saved emphasis only where the conversation is silent", () => {
        const { profile, answers } = toAnswers(saved(), read(scenario("nervous-motorway")));
        const filler = profile.priorities.filter((item) => item.filler).map((item) => item.id);

        expect(filler.length).toBeGreaterThan(0);
        for (const id of filler) {
            expect(answers.features[id]).toEqual(saved().features[id]);
        }
    });

    it("builds two different profiles from two different people", () => {
        const parent = toAnswers(saved(), read(scenario("city-parent"))).profile;
        const commuter = toAnswers(saved(), read(scenario("commuter"))).profile;

        expect(parent.priorities[0]?.id).not.toBe(commuter.priorities[0]?.id);
        expect(parent.focus.map((item) => item.label)).not.toEqual(commuter.focus.map((item) => item.label));
    });

    it("can be followed from a sentence to a raised feature", () => {
        const { profile } = toAnswers(saved(), read(scenario("city-parent")));
        const parking = profile.trace.find((row) => row.need === "Parking without the stress")!;

        expect(parking.said).toBe("you're terrible at parking");
        expect(parking.priorities.map((item) => item.id)).toContain("cityParking");
        expect(parking.raised.map((item) => item.id)).toContain("hasThreeSixtyDegreesCamera");
        expect(parking.raised.every((item) => item.importance === "high")).toBe(true);
    });

    it("says which share of the result each priority carries", () => {
        const { profile } = toAnswers(saved(), read(scenario("city-parent")));
        const total = profile.priorities.reduce((sum, item) => sum + item.sharePercent, 0);

        expect(total).toBeGreaterThan(95);
        expect(profile.priorities[0]!.sharePercent).toBeGreaterThan(profile.priorities.at(-1)!.sharePercent);
    });
});

describe("equipment Lens offers", () => {
    const understanding = read(scenario("city-parent"));

    it("offers only what the cars here differ on, and nothing already cited", () => {
        const offers = readSuggestions(
            [
                { id: "hasElectricTailgate", why: "opens when your hands are full of shopping", needId: "shopping" },
                { id: "hasThreeSixtyDegreesCamera", why: "already cited on the parking need", needId: "parking" },
                { id: "hasAirConditioning", why: "on 23 of the 24 cars here, so it separates nothing", needId: "" },
            ],
            understanding,
            cars,
        );

        expect(offers.map((item) => item.id)).toEqual(["hasElectricTailgate"]);
    });

    it("adds it to the need only once the reader says yes", () => {
        const before = understanding.needs.find((need) => need.id === "shopping")!;
        const after = withSuggestion(understanding, "hasElectricTailgate", "opens with your hands full", "shopping");
        const need = after.needs.find((item) => item.id === "shopping")!;

        expect(before.evidence.some((entry) => entry.id === "hasElectricTailgate")).toBe(false);
        expect(need.evidence.at(-1)).toEqual({ id: "hasElectricTailgate", use: "opens with your hands full", unwanted: false, mustHave: false });
    });

    it("never raises or offers again what the reader turned down", () => {
        const after = withoutSuggestion(understanding, "hasThreeSixtyDegreesCamera");

        expect(after.declined).toContain("hasThreeSixtyDegreesCamera");
        expect(after.needs.flatMap((need) => need.evidence.map((entry) => entry.id))).not.toContain("hasThreeSixtyDegreesCamera");
        expect(toAnswers(saved(), after).lessRelevant).toContain("hasThreeSixtyDegreesCamera");
        expect(readSuggestions([{ id: "hasThreeSixtyDegreesCamera", why: "again", needId: "" }], after, cars)).toEqual([]);
    });
});

describe("what a measurement means", () => {
    const short = cars.find((car) => car.dimensions.length < 4100)!;
    const long = cars.find((car) => car.dimensions.length > 4600)!;

    it("puts a length beside a typical German bay, in either direction", () => {
        const huge = { ...long, dimensions: { ...long.dimensions, length: 5300 } };

        expect(parkingContext(short)).toMatch(/shorter than a typical 5 m parking bay/);
        expect(parkingContext(huge)).toMatch(/longer than a typical 5 m parking bay/);
        expect(parkingContext({ ...long, dimensions: { ...long.dimensions, length: 4990 } })).toMatch(/within a few centimetres/);
    });

    it("says what the width leaves either side", () => {
        expect(widthContext(short)).toMatch(/cm either side in a 2\.5 m bay|wider than a 2\.5 m bay/);
    });

    it("compares cars only where the difference is worth saying", () => {
        expect(lengthGap(short, long, "the other one")).toMatch(/\d+ cm shorter than the other one/);
        expect(lengthGap(short, short, "itself")).toBeNull();
    });

    it("places a car among the ones in front of the reader", () => {
        const among = lengthAmong(short, cars)!;

        expect(among.total).toBe(cars.length - 1);
        expect(among.shorterThan).toBeGreaterThan(0);
    });
});
