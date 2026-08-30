import { describe, expect, it } from "vitest";

import {
  describeEnvironmentalMethod,
  environmentalImpact,
  environmentalPhrases,
} from "./environmental";
import { categoryDetail } from "./scoring";
import { buildFitAnalysis } from "./fit";
import { makeCar, prefs } from "./test-fixtures";

/**
 * Emissions, judged on their own.
 *
 * The case these exist for is the one that was broken: an electric car emits
 * zero, and zero is a figure. It was being read as an absent one, which made
 * the cleanest car on FINN the only one Lens claimed to know nothing about.
 */

const electric = (over = {}) =>
  makeCar({
    id: 1,
    fuelType: "Electric",
    co2: 0,
    co2Class: "A",
    consumption: 15,
    range: 400,
    ...over,
  });

const petrol = (over = {}) =>
  makeCar({ id: 2, fuelType: "Petrol", co2: 130, co2Class: "D", consumption: 6.5, ...over });

describe("environmentalImpact", () => {
  it("scores an electric car rather than calling its zero a gap", () => {
    const impact = environmentalImpact(electric());

    expect(impact).not.toBeNull();
    expect(impact?.components.map((item) => item.id)).toEqual([
      "emissions",
      "co2Class",
      "energy",
      "powertrain",
    ]);
    expect(impact?.missing).toEqual([]);
  });

  it("gives a zero-emission car full marks on the emissions figure", () => {
    const emissions = environmentalImpact(electric())?.components.find(
      (item) => item.id === "emissions",
    );

    expect(emissions?.score).toBe(100);
    expect(emissions?.display).toBe("0 g/km");
  });

  it("puts an electric car well ahead of a petrol one", () => {
    const clean = environmentalImpact(electric())?.score ?? 0;
    const dirty = environmentalImpact(petrol())?.score ?? 0;

    expect(clean).toBeGreaterThan(dirty);
    expect(clean).toBeLessThanOrEqual(100);
    expect(dirty).toBeGreaterThanOrEqual(0);
  });

  it("never leaves the 0–100 scale, whatever the figures", () => {
    for (const car of [
      electric(),
      petrol(),
      petrol({ co2: 400, consumption: 20, co2Class: "G" }),
      petrol({ co2: 0, consumption: 0.1, co2Class: "A" }),
    ]) {
      const impact = environmentalImpact(car);

      expect(impact?.score).toBeGreaterThanOrEqual(0);
      expect(impact?.score).toBeLessThanOrEqual(100);

      for (const component of impact?.components ?? []) {
        expect(component.score).toBeGreaterThanOrEqual(0);
        expect(component.score).toBeLessThanOrEqual(100);
      }
    }
  });

  it("reads the CO₂ class off the label, pluses and whitespace included", () => {
    for (const [written, score] of [
      ["A", 100],
      [" a ", 100],
      ["A+++", 100],
      ["D", 50],
      ["G", 0],
    ] as [string, number][]) {
      const found = environmentalImpact(
        petrol({ co2Class: written }),
      )?.components.find((item) => item.id === "co2Class");

      expect(found?.score).toBe(score);
    }
  });

  it("measures energy on the scale the powertrain is sold in", () => {
    const kwh = environmentalImpact(electric({ consumption: 15 }))?.components.find(
      (item) => item.id === "energy",
    );

    const litres = environmentalImpact(petrol({ consumption: 6 }))?.components.find(
      (item) => item.id === "energy",
    );

    expect(kwh?.display).toContain("kWh/100km");
    expect(litres?.display).toContain("L/100km");
    /* 15 of 30 and 6 of 12 are the same fraction of their own ceiling. */
    expect(kwh?.score).toBe(litres?.score);
  });

  it("scores diesel and petrol alike, leaving the difference to the CO₂ figure", () => {
    const diesel = environmentalImpact(
      petrol({ fuelType: "Diesel" }),
    )?.components.find((item) => item.id === "powertrain");

    const unleaded = environmentalImpact(petrol())?.components.find(
      (item) => item.id === "powertrain",
    );

    expect(diesel?.score).toBe(unleaded?.score);
  });

  it("names what's missing instead of scoring it as zero", () => {
    const impact = environmentalImpact(
      petrol({ co2: Number.NaN, co2Class: "", consumption: null }),
    );

    expect(impact?.components.map((item) => item.id)).toEqual(["powertrain"]);
    expect(impact?.missing).toHaveLength(3);
    expect(impact?.score).toBe(20);
  });

  it("returns nothing when there is genuinely nothing to go on", () => {
    expect(
      environmentalImpact(
        petrol({
          co2: Number.NaN,
          co2Class: "",
          consumption: null,
          fuelType: "Unknown" as never,
        }),
      ),
    ).toBeNull();
  });

  it("says what a plug-in hybrid's figure assumes", () => {
    expect(
      environmentalImpact(petrol({ fuelType: "Plug-in Hybrid" }))?.caveat,
    ).toMatch(/charge it/i);
  });

  it("says that an electric car's zero is a tailpipe figure", () => {
    expect(environmentalImpact(electric())?.caveat).toMatch(/tailpipe/i);
  });
});

describe("the explanation", () => {
  it("names the four figures and says they count equally", () => {
    const lines = describeEnvironmentalMethod(
      environmentalImpact(electric()) as never,
    ).join(" ");

    expect(lines).toMatch(/count equally/i);
    expect(lines).toMatch(/co₂ emissions/i);
    expect(lines).toMatch(/co₂ class/i);
    expect(lines).toMatch(/energy use/i);
    expect(lines).toMatch(/fuel type/i);
  });

  it("says which figures were missing when some were", () => {
    const lines = describeEnvironmentalMethod(
      environmentalImpact(petrol({ co2Class: "" })) as never,
    ).join(" ");

    expect(lines).toMatch(/didn't supply its CO₂ class/i);
  });

  it("reads the figures as English", () => {
    expect(environmentalPhrases(environmentalImpact(electric()) as never)).toEqual([
      "emits 0 g/km",
      "sits in CO₂ class A",
      "uses 15 kWh/100km",
      "runs on electricity",
    ]);
  });
});

describe("the priority as a whole", () => {
  it("is answerable for a single car, which is why any of this changed", () => {
    const detail = categoryDetail(
      "environmental",
      electric(),
      [electric()],
      prefs(),
    );

    expect(detail.hasEvidence).toBe(true);
    expect(detail.environmental).not.toBeNull();
  });

  it("no longer tells a reader looking at an electric car that we don't know", () => {
    const analysis = buildFitAnalysis(electric(), ["environmental"], prefs());

    const environmental = analysis.priorities[0];

    expect(environmental?.band.level).not.toBe("unknown");
    expect(environmental?.hasEvidence).toBe(true);
    expect(environmental?.impact).not.toBeNull();
    expect(environmental?.sentences.join(" ")).toMatch(/emits 0 g\/km/);
  });

  it("explains itself even when the car's equipment list is missing", () => {
    /* Emissions don't depend on the equipment list, so the answer stands. */
    const analysis = buildFitAnalysis(
      electric({ features: [] }),
      ["environmental"],
      prefs(),
    );

    expect(analysis.priorities[0]?.band.level).not.toBe("unknown");
    expect(analysis.priorities[0]?.impact).not.toBeNull();
  });
});
