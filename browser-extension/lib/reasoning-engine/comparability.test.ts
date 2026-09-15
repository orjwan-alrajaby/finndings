import { describe, expect, it } from "vitest";

import {
  alternativeOptions,
  buildReasoningContext,
  buildRecommendation,
  evaluateChallenger,
  evaluateVehicle,
} from "./index";
import { buildAdviceNarrative, reasonAboutChallenge } from "./narrative";
import {
  AVAILABLE_CATEGORY_FEATURES,
  DEFAULT_CATEGORY_FEATURES,
} from "./constants";
import { makeCar, prefs } from "./test-fixtures";

/**
 * Claims the prose makes about two cars' figures that used to be false in
 * cases the ranking itself handled correctly.
 */

/* -------------------------------------------------------------------------- */
/* Figures that aren't the same quantity                                      */
/* -------------------------------------------------------------------------- */

describe("comparing figures across powertrains", () => {
  /*
   * Long distance reads an electric car's range and a petrol car's
   * consumption. Two of each, so both cohorts are scored.
   */
  const evLong = makeCar({ id: 1, name: "EV Long", fuelType: "Electric", range: 500, consumption: 17, co2: 0 });
  const evShort = makeCar({ id: 2, name: "EV Short", fuelType: "Electric", range: 300, consumption: 17, co2: 0 });
  const frugal = makeCar({ id: 3, name: "Petrol Frugal", consumption: 4 });
  const thirsty = makeCar({ id: 4, name: "Petrol Thirsty", consumption: 9 });

  const cars = [evLong, evShort, frugal, thirsty];
  const features = { ...DEFAULT_CATEGORY_FEATURES, longDistance: [] };

  const context = buildReasoningContext(
    cars,
    ["longDistance"],
    prefs(),
    features,
  );

  const mixesUnits = (text: string) =>
    /\bkm\b.*L\/100km|L\/100km.*\bkm\b/.test(text);

  it("never hooks an alternative on a range against a consumption", () => {
    const [option] = alternativeOptions(context, [frugal], evLong, evLong.id);

    expect(option?.hook ?? "").not.toMatch(/ vs /);
  });

  it("gives a figure no rival when the rival's is a different quantity", () => {
    const recommendation = buildRecommendation(cars, ["longDistance"], prefs(), features)!;
    const winner = recommendation.winner;
    const challenger = cars.find((car) => car.fuelType !== winner.fuelType)!;

    const evaluation = evaluateChallenger(challenger, recommendation);
    const narrative = buildAdviceNarrative(evaluation, recommendation.context, recommendation.alternatives);

    const scored = narrative.priorities[0]?.measurements.find((fact) => fact.scored);

    expect(scored).toBeDefined();
    expect(scored?.rival).toBeNull();

    for (const text of [
      ...narrative.priorities.flatMap((item) => item.sentences),
      evaluation.comparison?.summary ?? "",
    ]) {
      expect(mixesUnits(text)).toBe(false);
    }

    const challenge = reasonAboutChallenge(evaluation, recommendation.context);

    for (const line of [...(challenge?.gains ?? []), ...(challenge?.losses ?? [])]) {
      expect(mixesUnits(line.evidence)).toBe(false);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* A leader that leads on equipment, not on the figure                        */
/* -------------------------------------------------------------------------- */

describe("a category leader with the worse figure", () => {
  it("isn't said to have the better boot space", () => {
    const catalogue = AVAILABLE_CATEGORY_FEATURES.practicality;

    const bigBoot = makeCar({ id: 1, name: "Big Boot", trunk: 500, featuresSupplied: true });
    const kitted = makeCar({ id: 2, name: "Kitted Out", trunk: 400, features: [...catalogue] });
    const small = makeCar({ id: 3, name: "Small Boot", trunk: 300, featuresSupplied: true });

    const cars = [bigBoot, kitted, small];

    const context = buildReasoningContext(cars, ["practicality"], prefs(), {
      ...DEFAULT_CATEGORY_FEATURES,
      practicality: [],
    });

    const evaluation = evaluateVehicle(bigBoot, context, {
      compareWith: null,
      peers: cars,
    });

    /* The premise: the leader leads, on a smaller boot. */
    expect(evaluation.priorities[0]?.leader?.vehicleId).toBe(kitted.id);

    const narrative = buildAdviceNarrative(evaluation, context, [kitted, small]);

    for (const tradeoff of narrative.tradeoffs) {
      expect(tradeoff.evidence).not.toMatch(/better boot space/);
    }
  });
});
