import type { PinnedFinnCar, FuelType } from "@/lib/types";
import type { FeatureId, LensPreferences } from "./types";
import { DEFAULT_PREFERENCES } from "./constants";

/**
 * Minimal, fully-controllable vehicle fixtures for the engine tests.
 *
 * Only the fields the reasoning engine actually reads are meaningful; the rest
 * exist to satisfy `PinnedFinnCar` and are deliberately inert.
 */
export interface CarOverrides {
  id: number;
  name?: string;
  fuelType?: FuelType;
  /** b2c monthly price. `null` means FINN supplied nothing. */
  customerMonthly?: number | null;
  /** b2b monthly price. `null` means FINN supplied nothing. */
  businessMonthly?: number | null;
  /** L or kWh per 100 km. `null` means FINN supplied nothing. */
  consumption?: number | null;
  /** €/km beyond the included allowance. `null` means FINN supplied nothing. */
  extraKmPrice?: number | null;
  trunk?: number | string;
  seats?: string;
  co2?: number;
  /** The EU efficiency class. Empty means FINN supplied none. */
  co2Class?: string;
  range?: number | null;
  features?: FeatureId[];
}

export function makeCar(overrides: CarOverrides): PinnedFinnCar {
  const {
    id,
    name = `Car ${id}`,
    fuelType = "Petrol",
    customerMonthly = 500,
    businessMonthly = 420,
    consumption = 6,
    extraKmPrice = 0.2,
    trunk = 400,
    seats = "5",
    co2 = 120,
    co2Class = "C",
    range = null,
    features = [],
  } = overrides;

  const featureMap: Record<string, boolean> = {};
  for (const feature of features) featureMap[feature] = true;

  return {
    id,
    name,
    brand: name.split(" ")[0] ?? name,
    model: name,
    trim: "Test",
    year: "2024",
    engine: "Test engine",
    equipmentLine: "",

    fuelType,
    transmission: "Automatic",
    driveType: "Front-Wheel Drive",

    power: { inKw: 100, inHp: 136 },

    isRefurbished: false,
    vehicleType: "SUV",
    doors: "5",

    availability: {
      expectedHandover: { from: null, to: undefined },
      from: null,
      to: null,
      deviationWeeks: null,
      defaultDownPaymentTermInMonths: 6,
    },

    pricing: {
      grossValue: 40_000,
      // extractPricing falls back to 0 when FINN supplies no price.
      customerMonthly: { price: customerMonthly ?? 0, oldPrice: null },
      businessMonthly: { price: businessMonthly ?? 0, oldPrice: null },
      extraKmPrice: extraKmPrice as number,
      currency: "€",
    },

    consumption: {
      combined: consumption as number,
      city: null,
      highway: null,
      unit: fuelType === "Electric" ? "kWh/100Km" : "L/100Km",
    },

    co2: { value: co2, class: co2Class, unit: "g/km" },

    electric:
      fuelType === "Electric"
        ? {
            range: range ?? "Unknown",
            batteryCapacity: 60,
            rangeUnit: "km",
            batteryUnit: "kWh",
          }
        : null,

    capacity: { trunk: String(trunk), trunkUnit: "L", seats },

    color: { id: "black", name: "Black", hex: "#000000" },

    images: { thumbnail: "", gallery: [] },

    features: featureMap,

    dimensions: { length: 4500, width: 1800, height: 1500, unit: "mm" },

    url: `https://www.finn.com/car/${id}`,
    pinnedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
  };
}

export function prefs(
  overrides: Partial<LensPreferences> = {},
): LensPreferences {
  return { ...DEFAULT_PREFERENCES, ...overrides };
}
