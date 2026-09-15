import { describe, expect, it } from "vitest";

import { assessEnvironment } from "./reasoning-engine/environmental";
import { makeCar } from "./reasoning-engine/test-fixtures";
import { readUsage } from "./usage-copy";

/**
 * "How much it uses", the way every surface draws it.
 *
 * Its own section, in the same place whether or not the reader ranked the
 * environment: the environmental result carries CO₂ alone. What these pin is
 * which of the three answers a car gets, the one row the graded answer draws,
 * and that its words and colours follow the model's efficiency step.
 */

type Fuel = "Petrol" | "Diesel" | "Electric" | "Plug-in Hybrid";

const car = (fuelType: Fuel, co2: number | null, consumption: number | null) =>
  makeCar({ id: 1, fuelType, co2, consumption } as never);

const petrol = (co2: number, consumption: number | null) => car("Petrol", co2, consumption);
const diesel = (co2: number, consumption: number) => car("Diesel", co2, consumption);
const electric = (consumption: number | null) => car("Electric", 0, consumption);
const phev = (co2: number, consumption: number) => car("Plug-in Hybrid", co2, consumption);

/** The one row a graded reading draws. */
function rowFor(vehicle: ReturnType<typeof car>) {
  const reading = readUsage(vehicle);

  if (reading.kind !== "graded") throw new Error("expected a graded reading");

  const [row] = reading.table.rows;

  if (!row) throw new Error("expected a row");

  return row;
}

describe("the three answers", () => {
  it("grades a car with a figure and a fuel to read it against", () => {
    for (const vehicle of [petrol(126, 5.5), diesel(142, 5.4), electric(16.5)]) {
      expect(readUsage(vehicle).kind).toBe("graded");
    }
  });

  it("won't grade a plug-in hybrid's blended figure, and says so", () => {
    expect(readUsage(phev(30, 1.4))).toMatchObject({
      kind: "ungradable",
      fuel: "Plug-in Hybrid",
      verdict: "Can't be graded fairly",
    });
  });

  it("says when FINN publishes no consumption, rather than inventing a comparison", () => {
    expect(readUsage(electric(null))).toMatchObject({
      kind: "unpublished",
      fuel: "Electric",
      verdict: "Not published",
    });
  });
});

describe("the row", () => {
  it("compares fuel use with its benchmark, with an i on both numbers", () => {
    const vehicle = petrol(126, 5.5);
    const efficiency = assessEnvironment(vehicle)?.efficiency;

    expect(rowFor(vehicle)).toEqual({
      id: "energy",
      icon: "fuel",
      label: "Fuel use",
      note: "litres of petrol per 100 km",
      car: {
        value: "5.5 L/100km",
        meaning: "This car consumes 5.5 litres of petrol per 100 km",
        info: efficiency?.meaning,
      },
      reference: {
        value: "5.8 L/100km",
        meaning: "FINN Lens's comparison point, not an official average",
        info: efficiency?.provenance,
      },
      comparison: "Moderate fuel use",
      fuel: "Petrol",
      relation: { car: 75, reference: 80, words: "Below the FINN Lens comparison point" },
      tone: "warning",
    });
  });

  it("puts what it runs on beside the row's name, for every graded car", () => {
    for (const vehicle of [petrol(126, 5.5), diesel(142, 5.4), electric(16.5)]) {
      expect(rowFor(vehicle).fuel).toBe(vehicle.fuelType);
    }
  });

  it("never calls a diesel's fuel petrol", () => {
    const row = rowFor(diesel(120, 4.5));

    expect(row).toMatchObject({
      car: { value: "4.5 L/100km", meaning: "This car consumes 4.5 litres of diesel per 100 km" },
      reference: { value: "5.2 L/100km" },
    });
    expect(`${row.note} ${row.car.meaning}`).not.toMatch(/petrol/i);
  });

  it("reads an electric car in its own terms, with no fuel words", () => {
    const row = rowFor(electric(16.5));

    expect(row).toMatchObject({
      icon: "electricity",
      label: "Electricity use",
      car: { value: "16.5 kWh/100km", meaning: "This car consumes 16.5 kWh of electricity per 100 km" },
      reference: { value: "17 kWh/100km" },
      comparison: "Moderate electricity use",
    });
    expect(`${row.label} ${row.note} ${row.car.meaning}`).not.toMatch(/petrol|diesel|litre|\bfuel\b/i);
  });

  it("says fuel use in plain words, step by step", () => {
    const useAt = (litres: number) => rowFor(petrol(130, litres)).comparison;

    expect([useAt(4.0), useAt(4.9), useAt(5.9), useAt(6.1), useAt(6.8), useAt(7.8)]).toEqual([
      "Very low fuel use",
      "Low fuel use",
      "Moderate fuel use",
      "Moderate fuel use",
      "High fuel use",
      "Very high fuel use",
    ]);
  });

  it("never lets the words disagree with the efficiency level", () => {
    for (const litres of [3.8, 4.2, 4.9, 5.0, 5.5, 6.0, 6.6, 6.7, 7.0, 8.5]) {
      const vehicle = petrol(130, litres);
      const level = assessEnvironment(vehicle)?.efficiency?.level;
      const words = rowFor(vehicle).comparison ?? "";

      expect(/^(Very low|Low) fuel use$/.test(words)).toBe(level === "high");
      expect(/^(Very high|High) fuel use$/.test(words)).toBe(level === "low");
    }
  });

  it("colours fuel use green, amber, then red, in the CO₂ classes' colours", () => {
    expect(rowFor(petrol(102, 4.4)).tone).toBe("success");
    expect(rowFor(petrol(128, 5.5)).tone).toBe("warning");
    expect(rowFor(petrol(190, 8.2)).tone).toBe("error");
  });

  it("judges an electric car's use on its own, whatever its CO₂", () => {
    expect(rowFor(electric(22.4))).toMatchObject({ comparison: "Very high electricity use", tone: "error" });
    expect(rowFor(petrol(102, 4.4))).toMatchObject({ comparison: "Low fuel use", tone: "success" });
  });

  it("never uses a percentage in the row", () => {
    for (const vehicle of [petrol(126, 5.5), diesel(142, 5.4), electric(16.5), electric(22.4)]) {
      const row = rowFor(vehicle);

      expect(`${row.comparison ?? ""} ${row.car.meaning} ${row.reference.meaning} ${row.relation?.words ?? ""}`).not.toMatch(/\d\s?%/);
    }
  });
});
