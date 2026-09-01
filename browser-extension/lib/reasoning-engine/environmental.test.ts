import { describe, expect, it } from "vitest";

import {
  assessEfficiency,
  assessEnvironment,
  co2ClassFor,
  describeEnvironment,
  ENVIRONMENTAL_METHOD,
  positionForCo2,
} from "./environmental";
import { buildFitAnalysis } from "./fit";
import { makeCar, prefs } from "./test-fixtures";
import type { FuelType } from "@/lib/types";

/**
 * Emissions, efficiency, and the difference between them.
 *
 * The model these protect is the one the research forced: CO₂ decides the
 * result, consumption answers a separate question inside the car's own
 * powertrain, and the CO₂ class and the fuel type are shown rather than
 * counted. Most of what is asserted here is an absence — that the same fact is
 * not counted twice.
 */

const car = (over: Record<string, unknown> = {}) =>
  makeCar({ id: 1, ...over } as never);

const petrol = (co2: number, consumption: number) =>
  car({ fuelType: "Petrol", co2, consumption });

const diesel = (co2: number, consumption: number) =>
  car({ fuelType: "Diesel", co2, consumption });

const electric = (consumption: number | null) =>
  car({ fuelType: "Electric", co2: 0, consumption, range: 400 });

const phev = (co2: number, consumption: number) =>
  car({ fuelType: "Plug-in Hybrid", co2, consumption });

/* -------------------------------------------------------------------------- */

describe("the CO₂ class", () => {
  it("follows the boundaries the regulation sets", () => {
    /* Pkw-EnVKV §3a as amended 2024: A 0, B ≤95, C ≤115, D ≤135, E ≤155, F ≤175. */
    expect(co2ClassFor(0)).toBe("A");
    expect(co2ClassFor(1)).toBe("B");
    expect(co2ClassFor(95)).toBe("B");
    expect(co2ClassFor(96)).toBe("C");
    expect(co2ClassFor(115)).toBe("C");
    expect(co2ClassFor(116)).toBe("D");
    expect(co2ClassFor(135)).toBe("D");
    expect(co2ClassFor(136)).toBe("E");
    expect(co2ClassFor(155)).toBe("E");
    expect(co2ClassFor(156)).toBe("F");
    expect(co2ClassFor(175)).toBe("F");
    expect(co2ClassFor(176)).toBe("G");
    expect(co2ClassFor(400)).toBe("G");
  });

  it("is computed from the figure, not read from FINN's field", () => {
    /*
     * A car predating the 2024 scale can carry a letter that disagrees with
     * its own emissions. The regulation is the better authority on its classes.
     */
    const stale = car({ fuelType: "Petrol", co2: 130, co2Class: "A" });

    expect(assessEnvironment(stale)?.co2?.className).toBe("D");
  });

  it("is never a second vote on top of the figure", () => {
    /* Two cars, same emissions, different stored letters: same result. */
    const honest = assessEnvironment(car({ fuelType: "Petrol", co2: 130, co2Class: "D" }));
    const stale = assessEnvironment(car({ fuelType: "Petrol", co2: 130, co2Class: "A" }));

    expect(honest?.score).toBe(stale?.score);
  });
});

describe("where a CO₂ figure lands", () => {
  it("falls as emissions rise, all the way down", () => {
    const grams = [0, 50, 95, 110, 125, 145, 165, 185, 250];
    const scores = grams.map(positionForCo2);

    for (let i = 1; i < scores.length; i += 1) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1] as number);
    }
  });

  it("separates two cars inside the same class", () => {
    /* 118 and 134 g/km are both class D and are not the same car. */
    expect(positionForCo2(118)).toBeGreaterThan(positionForCo2(134));
  });

  it("puts each class where the reader's band expects it", () => {
    /* Bands are strong ≥65, good ≥45, partial ≥25, limited below. */
    expect(positionForCo2(0)).toBeGreaterThanOrEqual(65);
    expect(positionForCo2(60)).toBeGreaterThanOrEqual(65);
    expect(positionForCo2(105)).toBeGreaterThanOrEqual(45);
    expect(positionForCo2(105)).toBeLessThan(65);
    expect(positionForCo2(127)).toBeGreaterThanOrEqual(25);
    expect(positionForCo2(127)).toBeLessThan(45);
    expect(positionForCo2(165)).toBeLessThan(25);
  });

  it("stays on the scale for a car far past the last class", () => {
    expect(positionForCo2(400)).toBeGreaterThanOrEqual(0);
    expect(positionForCo2(400)).toBeLessThanOrEqual(100);
  });
});

/* -------------------------------------------------------------------------- */

describe("efficiency", () => {
  it("is judged inside the car's own powertrain", () => {
    /*
     * 5.0 L/100 km is frugal for a petrol car and ordinary for a diesel,
     * because a litre of diesel carries more carbon and diesels use fewer.
     */
    expect(assessEfficiency(petrol(112, 4.8))?.level).toBe("high");
    expect(assessEfficiency(diesel(127, 4.8))?.level).toBe("moderate");
  });

  it("recognises a frugal petrol car as frugal", () => {
    expect(assessEfficiency(petrol(105, 4.5))?.label).toBe("Highly efficient");
  });

  it("recognises a thirsty petrol car as thirsty", () => {
    expect(assessEfficiency(petrol(190, 8.2))?.label).toBe("Less efficient");
  });

  it("separates an efficient EV from an inefficient one", () => {
    expect(assessEfficiency(electric(14))?.level).toBe("high");
    expect(assessEfficiency(electric(17))?.level).toBe("moderate");
    expect(assessEfficiency(electric(23))?.level).toBe("low");
  });

  it("says what it is relative to, in the reader's terms", () => {
    expect(assessEfficiency(petrol(117, 4.5))?.explanation).toMatch(
      /less fuel than a typical new petrol car/,
    );
    expect(assessEfficiency(electric(14))?.explanation).toMatch(
      /less electricity than a typical new electric car/,
    );
  });

  it("refuses to grade a plug-in hybrid's single blended figure", () => {
    /* One weighted number over two energy sources has no cohort. */
    expect(assessEfficiency(phev(32, 1.4))).toBeNull();
  });

  it("says nothing where FINN published no consumption", () => {
    expect(assessEfficiency(electric(null))).toBeNull();
    expect(assessEfficiency(petrol(120, 0))).toBeNull();
  });

  it("uses words a car shopper would use", () => {
    const labels = [
      assessEfficiency(petrol(100, 4.0))?.label,
      assessEfficiency(petrol(130, 5.8))?.label,
      assessEfficiency(petrol(190, 8.5))?.label,
    ];

    expect(labels).toEqual([
      "Highly efficient",
      "Moderately efficient",
      "Less efficient",
    ]);
  });
});

/* -------------------------------------------------------------------------- */

describe("the assessment as a whole", () => {
  it("scores on emissions and nothing else", () => {
    /*
     * The same emissions with wildly different consumption score the same.
     * Efficiency is a separate answer, not a second contribution to this one.
     */
    const a = assessEnvironment(petrol(130, 4.0));
    const b = assessEnvironment(petrol(130, 9.0));

    expect(a?.score).toBe(b?.score);
    expect(a?.efficiency?.level).not.toBe(b?.efficiency?.level);
  });

  it("doesn't mark a car down twice for what it burns", () => {
    /* Two cars at the same g/km score alike whatever the fuel is called. */
    const asPetrol = assessEnvironment(petrol(120, 5.2));
    const asDiesel = assessEnvironment(diesel(120, 4.5));

    expect(asPetrol?.score).toBe(asDiesel?.score);
  });

  it("puts an electric car at the top on tailpipe emissions", () => {
    const ev = assessEnvironment(electric(16));

    expect(ev?.score).toBe(100);
    expect(ev?.co2?.className).toBe("A");
  });

  it("won't claim an electric car has no environmental impact", () => {
    const ev = assessEnvironment(electric(16));

    expect(ev?.caveats.join(" ")).toMatch(/zero at the tailpipe/i);
    expect(ev?.caveats.join(" ")).toMatch(/aren't estimated here/i);
  });

  it("keeps a frugal petrol car ahead of a thirsty one", () => {
    const frugal = assessEnvironment(petrol(105, 4.5));
    const thirsty = assessEnvironment(petrol(180, 7.7));

    expect(frugal?.score).toBeGreaterThan(thirsty?.score as number);
  });

  it("keeps a frugal diesel ahead of a thirsty one", () => {
    const frugal = assessEnvironment(diesel(110, 4.2));
    const thirsty = assessEnvironment(diesel(175, 6.6));

    expect(frugal?.score).toBeGreaterThan(thirsty?.score as number);
  });

  it("still puts an electric car ahead of the cleanest combustion car", () => {
    const ev = assessEnvironment(electric(16));
    const best = assessEnvironment(petrol(96, 4.1));

    expect(ev?.score).toBeGreaterThan(best?.score as number);
  });
});

/* -------------------------------------------------------------------------- */

describe("plug-in hybrids", () => {
  it("won't call one a strong match on its official figure alone", () => {
    /*
     * A 30 g/km official figure would otherwise sit near the top of the scale.
     * On-road studies put real emissions several times higher where the car is
     * charged less than the test assumes, so the top of the scale is refused.
     */
    const assessment = assessEnvironment(phev(30, 1.4));

    expect(assessment?.score).toBeLessThanOrEqual(60);
    expect(assessment?.confidence).toBe("optimistic");
  });

  it("doesn't invent a real-world figure to replace it", () => {
    const assessment = assessEnvironment(phev(30, 1.4));

    /* The number shown is still FINN's own. */
    expect(assessment?.co2?.gPerKm).toBe(30);
    expect(assessment?.co2?.display).toContain("30");
  });

  it("says what the figure actually assumes", () => {
    expect(assessEnvironment(phev(30, 1.4))?.caveats.join(" ")).toMatch(
      /charged less often than the test assumes/i,
    );
  });

  it("leaves a high-emitting one where its emissions put it", () => {
    /* The cap is a ceiling, not a floor: a dirty PHEV isn't lifted to it. */
    const dirty = assessEnvironment(phev(140, 5.6));

    expect(dirty?.score).toBeLessThan(60);
  });

  it("keeps two plug-in hybrids apart from each other", () => {
    /*
     * Clipping them to a ceiling made a 26 g/km car and a 75 g/km car
     * identical, which threw away the one distinction between them that the
     * data actually supports.
     */
    const clean = assessEnvironment(phev(26, 1.1));
    const heavy = assessEnvironment(phev(75, 3.3));

    expect(clean?.score).toBeGreaterThan(heavy?.score as number);
  });

  it("is never treated as equivalent to a battery electric car", () => {
    const hybrid = assessEnvironment(phev(28, 1.2));
    const battery = assessEnvironment(electric(16));

    expect(battery?.score).toBeGreaterThan(hybrid?.score as number);
  });
});

/* -------------------------------------------------------------------------- */

describe("missing data", () => {
  it("reports on consumption alone when there is no CO₂ figure", () => {
    const assessment = assessEnvironment(
      car({ fuelType: "Petrol", co2: Number.NaN, consumption: 4.4 }),
    );

    expect(assessment?.score).toBeNull();
    expect(assessment?.efficiency?.level).toBe("high");
    expect(assessment?.missing).toContain("its CO₂ figure");
  });

  it("reports on emissions alone when there is no consumption", () => {
    const assessment = assessEnvironment(
      car({ fuelType: "Petrol", co2: 120, consumption: null }),
    );

    expect(assessment?.score).toBe(positionForCo2(120));
    expect(assessment?.efficiency).toBeNull();
    expect(assessment?.missing).toContain("what it consumes");
  });

  it("never reads a missing consumption as a frugal one", () => {
    const assessment = assessEnvironment(electric(null));

    expect(assessment?.efficiency).toBeNull();
    expect(describeEnvironment(assessment as never)).toMatch(/unknown/i);
  });

  it("says nothing at all when there is nothing to say", () => {
    expect(
      assessEnvironment(
        car({ fuelType: "Unknown" as FuelType, co2: Number.NaN, consumption: null }),
      ),
    ).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */

describe("what the reader is told", () => {
  it("gives a frugal petrol car both halves of the truth", () => {
    const line = describeEnvironment(assessEnvironment(petrol(117, 4.6)) as never);

    expect(line).toMatch(/Highly efficient for a petrol car/);
    expect(line).toMatch(/an electric car emits none at the tailpipe/);
  });

  it("doesn't tell an electric car's owner about fuel", () => {
    const line = describeEnvironment(assessEnvironment(electric(15)) as never);

    expect(line).toMatch(/No CO₂ at the tailpipe/);
    expect(line).not.toMatch(/petrol|diesel/i);
  });

  it("never claims a percentage improvement it can't support", () => {
    for (const vehicle of [petrol(120, 5), diesel(130, 4.8), electric(16), phev(30, 1.4)]) {
      const line = describeEnvironment(assessEnvironment(vehicle) as never);

      expect(line).not.toMatch(/\d+%/);
    }
  });

  it("explains the method without exposing the arithmetic", () => {
    const method = ENVIRONMENTAL_METHOD.map(
      (note) => `${note.heading} ${note.body}`,
    ).join(" ");

    expect(method).toMatch(/shown|not counted/i);
    expect(method).toMatch(/not a lifecycle assessment/i);
    expect(method).not.toMatch(/count equally/i);
  });
});

/* -------------------------------------------------------------------------- */

describe("the priority as the panel sees it", () => {
  const analyse = (vehicle: ReturnType<typeof car>) =>
    buildFitAnalysis(vehicle, ["environmental"], prefs()).priorities[0];

  it("answers for a single car, whatever it runs on", () => {
    for (const vehicle of [petrol(130, 5.6), diesel(120, 4.5), electric(16), phev(30, 1.4)]) {
      expect(analyse(vehicle)?.band.level).not.toBe("unknown");
    }
  });

  it("reads an efficient petrol car as a partial match, honestly", () => {
    /* Efficient for what it is, and still an average emitter overall. */
    const band = analyse(petrol(127, 5.6));

    expect(band?.band.label).toBe("Partial match");
    expect(band?.impact?.efficiency?.label).toBe("Moderately efficient");
  });

  it("reads an electric car as a strong match", () => {
    expect(analyse(electric(16))?.band.label).toBe("Strong match");
  });

  it("holds up across a large thirsty car and a tiny frugal one", () => {
    /* Nothing here is size-adjusted, and the ordering still makes sense. */
    const cityCar = analyse(petrol(105, 4.5));
    const largeSuv = analyse(petrol(185, 7.9));

    expect(cityCar?.band.level).not.toBe(largeSuv?.band.level);
    expect(cityCar?.impact?.score).toBeGreaterThan(
      largeSuv?.impact?.score as number,
    );
  });
});
