import { describe, expect, it } from "vitest";

import { categoryDetail } from "./scoring";
import { makeCar, prefs } from "./test-fixtures";
import { DEFAULT_CATEGORY_FEATURES } from "./constants";
import type { PinnedFinnCar } from "@/lib/types";

/**
 * Long Distance Travel is the one priority scored on a measurement that isn't
 * the same measurement for every car.
 *
 * An electric car is judged on the kilometres FINN says it covers; anything
 * else on what it consumes per hundred. Those are different quantities in
 * different units, and the bug these cover is what happened when they were
 * pooled: FINN reports both consumption figures in one field and the mapper
 * labels that field litres for every car, so an electric car's 17 kWh/100 km
 * went into the same min-max as a petrol car's 6 L/100 km and came out scored
 * as though it drank three times the fuel.
 *
 * The rule now is that a car is only ever ranked against cars carrying the
 * same reading, and no cross-powertrain ordering is claimed — FINN publishes
 * neither a tank size nor a charging network, so there is nothing to found one
 * on.
 */

const detail = (vehicle: PinnedFinnCar, set: PinnedFinnCar[]) =>
  categoryDetail(
    "longDistance",
    vehicle,
    set,
    prefs(),
    DEFAULT_CATEGORY_FEATURES,
  );

/** The category has a feature catalogue too; this isolates the measurement. */
const numeric = (vehicle: PinnedFinnCar, set: PinnedFinnCar[]) =>
  detail(vehicle, set).numericScore;

const ev = (id: number, range: number | null, consumption = 17) =>
  makeCar({ id, fuelType: "Electric", range, consumption, co2: 0 });

const petrol = (id: number, consumption: number) =>
  makeCar({ id, fuelType: "Petrol", consumption });

const diesel = (id: number, consumption: number) =>
  makeCar({ id, fuelType: "Diesel", consumption });

/* -------------------------------------------------------------------------- */
/* Combustion only                                                            */
/* -------------------------------------------------------------------------- */

describe("a set of cars that all burn fuel", () => {
  it("ranks the frugal one ahead of the thirsty one", () => {
    const frugal = petrol(1, 4);
    const thirsty = petrol(2, 9);
    const set = [frugal, thirsty];

    expect(numeric(frugal, set)).toBeGreaterThan(
      numeric(thirsty, set) as number,
    );
  });

  it("puts diesel and petrol in the same cohort — both are litres", () => {
    const frugalDiesel = diesel(1, 4.5);
    const thirstyPetrol = petrol(2, 8.5);
    const set = [frugalDiesel, thirstyPetrol];

    expect(numeric(frugalDiesel, set)).toBeGreaterThan(
      numeric(thirstyPetrol, set) as number,
    );
    expect(detail(frugalDiesel, set).numeric?.unit).toBe("L/100km");
  });
});

/* -------------------------------------------------------------------------- */
/* Electric only                                                              */
/* -------------------------------------------------------------------------- */

describe("a set of electric cars", () => {
  it("ranks them on range, further being better", () => {
    const far = ev(1, 520);
    const near = ev(2, 260);
    const set = [far, near];

    expect(numeric(far, set)).toBeGreaterThan(numeric(near, set) as number);
    expect(detail(far, set).numeric?.label).toBe("Electric range");
    expect(detail(far, set).numeric?.unit).toBe("km");
  });

  it("falls back to consumption when FINN publishes no range", () => {
    const frugal = ev(1, null, 15);
    const thirsty = ev(2, null, 24);
    const set = [frugal, thirsty];

    expect(numeric(frugal, set)).toBeGreaterThan(
      numeric(thirsty, set) as number,
    );
    expect(detail(frugal, set).numeric?.unit).toBe("kWh/100km");
  });
});

/* -------------------------------------------------------------------------- */
/* Mixed powertrains — the regression                                         */
/* -------------------------------------------------------------------------- */

describe("a set with both electric and combustion cars", () => {
  /*
   * The headline regression. A 17 kWh/100 km electric car alongside petrol
   * cars at 5–6 L/100 km used to be read as the thirstiest car in the set.
   */
  it("never scores an electric car as though its kWh were litres", () => {
    const electric = ev(1, null, 17);
    const set = [electric, petrol(2, 5), petrol(3, 6)];

    /*
     * One electric car has no electric cohort to be placed in, so it takes no
     * measurement rather than borrowing the fuel cars'.
     */
    expect(numeric(electric, set)).toBeNull();
  });

  it("scores each powertrain inside its own cohort", () => {
    const farEv = ev(1, 500);
    const nearEv = ev(2, 250);
    const frugalPetrol = petrol(3, 4);
    const thirstyPetrol = petrol(4, 9);

    const set = [farEv, nearEv, frugalPetrol, thirstyPetrol];

    /* Ordered correctly within each cohort... */
    expect(numeric(farEv, set)).toBeGreaterThan(numeric(nearEv, set) as number);
    expect(numeric(frugalPetrol, set)).toBeGreaterThan(
      numeric(thirstyPetrol, set) as number,
    );

    /* ...and each measured in its own units. */
    expect(detail(farEv, set).numeric?.unit).toBe("km");
    expect(detail(frugalPetrol, set).numeric?.unit).toBe("L/100km");
  });

  it("doesn't let one cohort's spread distort the other's", () => {
    const closeEvs = [ev(1, 400), ev(2, 410)];
    const spreadPetrols = [petrol(3, 3), petrol(4, 12)];

    const withPetrols = numeric(closeEvs[0] as PinnedFinnCar, [
      ...closeEvs,
      ...spreadPetrols,
    ]);

    const alone = numeric(closeEvs[0] as PinnedFinnCar, closeEvs);

    expect(withPetrols).toBe(alone);
  });

  it("treats a plug-in hybrid's combined figure as fuel", () => {
    const phev = makeCar({
      id: 1,
      fuelType: "Plug-in Hybrid",
      consumption: 2,
    });

    const set = [phev, petrol(2, 8)];

    /* It is placed with the fuel cars, so it gets a score at all. */
    expect(numeric(phev, set)).not.toBeNull();
    expect(detail(phev, set).numeric?.unit).toBe("L/100km");
  });
});

/* -------------------------------------------------------------------------- */
/* Missing data                                                               */
/* -------------------------------------------------------------------------- */

describe("cars FINN hasn't measured", () => {
  it("takes no measurement when a car has neither range nor consumption", () => {
    const blank = makeCar({ id: 1, consumption: null });
    const set = [blank, petrol(2, 6), petrol(3, 7)];

    expect(numeric(blank, set)).toBeNull();
  });

  it("still scores the cars that were measured", () => {
    const blank = makeCar({ id: 1, consumption: null });
    const frugal = petrol(2, 5);
    const thirsty = petrol(3, 9);
    const set = [blank, frugal, thirsty];

    expect(numeric(frugal, set)).toBeGreaterThan(
      numeric(thirsty, set) as number,
    );
  });

  it("keeps an unmeasured car in the running on its equipment alone", () => {
    const blank = makeCar({
      id: 1,
      consumption: null,
      features: ["hasAdaptiveCruiseControl", "hasLumbarSupport"],
    });

    const result = detail(blank, [blank, petrol(2, 6), petrol(3, 7)]);

    expect(result.numericScore).toBeNull();
    expect(result.featureScore).not.toBeNull();
    expect(result.hasEvidence).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* Small sets                                                                 */
/* -------------------------------------------------------------------------- */

describe("comparison sets too small to be relative to", () => {
  it("takes no measurement from a single car", () => {
    const only = petrol(1, 6);

    expect(numeric(only, [only])).toBeNull();
  });

  it("takes no measurement when a car is the only one of its kind", () => {
    const loneEv = ev(1, 450);
    const set = [loneEv, petrol(2, 6), petrol(3, 7)];

    expect(numeric(loneEv, set)).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* Proportionality                                                            */
/* -------------------------------------------------------------------------- */

describe("how much of the scale a difference earns", () => {
  /*
   * The second half of the fix. Plain min-max hands the worse car 0 and the
   * better one 100 whatever the spread, so two cars five kilometres apart came
   * out as the widest gap the engine can express — and in a category decided
   * by one measurement, that gap is the whole category score.
   */
  it("keeps near-identical cars near-identical", () => {
    const a = ev(1, 500);
    const b = ev(2, 495);
    const set = [a, b];

    const gap = (numeric(a, set) as number) - (numeric(b, set) as number);

    expect(gap).toBeGreaterThan(0);
    expect(gap).toBeLessThan(10);
  });

  it("still uses the full scale when the gap is genuinely large", () => {
    const far = ev(1, 600);
    const near = ev(2, 200);
    const set = [far, near];

    expect(numeric(far, set)).toBe(100);
    expect(numeric(near, set)).toBe(0);
  });

  it("scores cars the measurement cannot separate identically", () => {
    const a = petrol(1, 6);
    const b = petrol(2, 6);
    const set = [a, b];

    expect(numeric(a, set)).toBe(numeric(b, set));
  });

  it("never inverts the ordering, however tight the set", () => {
    for (const [better, worse] of [
      [400, 399],
      [400, 396],
      [400, 350],
      [400, 100],
    ] as [number, number][]) {
      const good = ev(1, better);
      const bad = ev(2, worse);
      const set = [good, bad];

      expect(numeric(good, set)).toBeGreaterThanOrEqual(
        numeric(bad, set) as number,
      );
    }
  });

  /*
   * A gap under 3% is what `classifyMeasurementGap` calls negligible, and the
   * scale agrees with the prose: 400 km against 399 km collapses to the same
   * score rather than being reported as a reason to prefer one. Separating
   * them is then the tie-break's job, on what the reader actually asked for.
   */
  it("declines to separate cars the measurement calls negligible", () => {
    const a = ev(1, 400);
    const b = ev(2, 399);
    const set = [a, b];

    expect(numeric(a, set)).toBe(numeric(b, set));
  });

  it("does separate cars once the gap is worth a sentence", () => {
    const a = ev(1, 400);
    const b = ev(2, 330);
    const set = [a, b];

    expect(numeric(a, set)).toBeGreaterThan(numeric(b, set) as number);
  });
});
