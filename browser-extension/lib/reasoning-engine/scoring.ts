import type { PinnedFinnCar } from "@/lib/types";
import type {
  CategoryDef,
  CategoryDetail,
  CategoryId,
  FeatureWeight,
  LensPreferences,
  NumericEvidence,
  PriorityWeight,
  VehicleScore,
} from "./types";

import {
  CATEGORIES,
  DEFAULT_CATEGORY_FEATURES,
  DEFAULT_PRIORITIES,
  FEATURES,
  TIERS,
} from "./constants";

import { formatNumber } from "./format";

/* -------------------------------------------------------------------------- */
/* Runtime category registry                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Built-in categories are immutable.
 *
 * Custom categories live here instead of being added directly to CATEGORIES.
 * This keeps CATEGORIES as the single source of truth for built-in product
 * configuration while still allowing user-created priorities at runtime.
 */
const CUSTOM_CATEGORIES: Record<string, CategoryDef> = {};

/** Resolves either a built-in or custom category. */
export function getCategory(category: CategoryId): CategoryDef | undefined {
  return (
    CATEGORIES[category as keyof typeof CATEGORIES] ??
    CUSTOM_CATEGORIES[category]
  );
}

/** Registers or updates metadata for a custom category. */
export function registerCategoryMeta(id: CategoryId, meta: CategoryDef): void {
  if (id in CATEGORIES) return;
  CUSTOM_CATEGORIES[id] = meta;
}

/**
 * Removes a custom category.
 *
 * Built-in categories can never be removed from the registry.
 */
export function unregisterCategoryMeta(id: CategoryId): void {
  if (id in CATEGORIES) return;
  delete CUSTOM_CATEGORIES[id];
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

export const featureLabel = (key: string): string =>
  FEATURES[key as keyof typeof FEATURES]?.label ?? key;

const tierWeight = (tier: FeatureWeight["tier"]): number => TIERS[tier].weight;

/* -------------------------------------------------------------------------- */
/* Numeric scoring                                                            */
/* -------------------------------------------------------------------------- */

function relativeScore(
  value: number,
  values: number[],
  lowerIsBetter: boolean,
): number {
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (max === min) return 80;

  const ratio = (value - min) / (max - min);

  return Math.round((lowerIsBetter ? 1 - ratio : ratio) * 100);
}

interface NumericResult {
  score: number;
  evidence: NumericEvidence;
}

function evidence(
  label: string,
  value: number,
  unit: string,
  lowerIsBetter: boolean,
): NumericEvidence {
  return {
    label,
    value,
    unit,
    display: unit ? `${formatNumber(value)} ${unit}` : formatNumber(value),
    lowerIsBetter,
  };
}

/**
 * Scores the measurable part of a category against the rest of the comparison.
 *
 * Deliberately has no cost case. Price is a budget constraint, not a priority,
 * so no number here is allowed to reward a car for being cheap.
 */
function numericScore(
  category: CategoryId,
  vehicle: PinnedFinnCar,
  vehicles: PinnedFinnCar[],
): NumericResult | null {
  switch (category) {
    case "practicality": {
      const values = vehicles
        .map((item) => Number.parseFloat(item.capacity.trunk))
        .filter(Number.isFinite);

      const trunk = Number.parseFloat(vehicle.capacity.trunk);

      if (!Number.isFinite(trunk) || values.length < 2) return null;

      return {
        score: relativeScore(trunk, values, false),
        evidence: evidence("Boot space", trunk, "L", false),
      };
    }

    case "longDistance": {
      const ranges = vehicles
        .map((item) =>
          item.electric?.range && item.electric.range !== "Unknown"
            ? Number(item.electric.range)
            : null,
        )
        .filter(
          (value): value is number => value != null && Number.isFinite(value),
        );

      if (
        vehicle.electric?.range &&
        vehicle.electric.range !== "Unknown" &&
        ranges.length > 1
      ) {
        const range = Number(vehicle.electric.range);

        return {
          score: relativeScore(range, ranges, false),
          evidence: evidence("Electric range", range, "km", false),
        };
      }

      const consumption = Number(vehicle.consumption.combined);

      const values = vehicles
        .map((item) => Number(item.consumption.combined))
        .filter(Number.isFinite);

      if (!Number.isFinite(consumption) || values.length < 2) return null;

      return {
        score: relativeScore(consumption, values, true),
        evidence: evidence(
          "Consumption",
          consumption,
          vehicle.fuelType === "Electric" ? "kWh/100km" : "L/100km",
          true,
        ),
      };
    }

    case "environmental": {
      const values = vehicles
        .map((item) => Number(item.co2.value))
        .filter((value) => Number.isFinite(value) && value > 0);

      const co2 = Number(vehicle.co2.value);

      if (!Number.isFinite(co2) || values.length < 2) return null;

      return {
        score: relativeScore(co2, values, true),
        evidence: evidence("CO₂ emissions", co2, "g/km", true),
      };
    }

    default:
      return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Category scoring                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Scores one vehicle in one category and records the evidence behind it.
 *
 * The returned feature and numeric sub-scores are kept separate from the
 * combined `score` so an explanation can point at whichever actually drove
 * the result.
 */
export function categoryDetail(
  category: CategoryId,
  vehicle: PinnedFinnCar,
  vehicles: PinnedFinnCar[],
  _preferences: LensPreferences,
  categoryFeatures: Record<
    CategoryId,
    FeatureWeight[]
  > = DEFAULT_CATEGORY_FEATURES,
): CategoryDetail {
  const configured =
    categoryFeatures[category] ?? getCategory(category)?.features ?? [];

  const matched: FeatureWeight[] = [];
  const missing: FeatureWeight[] = [];

  const max = configured.reduce((sum, item) => sum + tierWeight(item.tier), 0);

  const earned = configured.reduce((sum, item) => {
    if (vehicle.features?.[item.key]) {
      matched.push(item);
      return sum + tierWeight(item.tier);
    }

    missing.push(item);
    return sum;
  }, 0);

  const featureScore = max ? Math.round((earned / max) * 100) : null;

  const numeric = numericScore(category, vehicle, vehicles);

  const score =
    numeric != null && featureScore != null
      ? Math.round((numeric.score + featureScore) / 2)
      : (numeric?.score ?? featureScore ?? 50);

  return {
    score,
    matched,
    missing,
    featureScore,
    numericScore: numeric?.score ?? null,
    numeric: numeric?.evidence ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/* Priority weighting                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Turns a priority *order* into explicit weights.
 *
 * Position 1 gets the largest share and each step down gets one unit less,
 * normalised so the weights sum to 1. Exposing this as data — rather than
 * burying it in the scoring loop — is what lets the UI say "safety accounts
 * for 40% of the result" instead of "your other priorities matter more".
 */
export function priorityWeights(priorities: CategoryId[]): PriorityWeight[] {
  const ordered = priorities.length ? priorities : DEFAULT_PRIORITIES;
  const denominator = (ordered.length * (ordered.length + 1)) / 2;

  return ordered.map((priority, index) => {
    const weight = (ordered.length - index) / denominator;

    return {
      priority,
      rank: index + 1,
      weight,
      weightPercent: Math.round(weight * 100),
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Vehicle scoring                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Calculates the complete score for every vehicle across the user's ordered
 * priorities.
 *
 * This function is intentionally unaware of the user's budget. Cost is not a
 * category and never contributes a point in either direction.
 *
 * Scores are relative to the vehicles passed in, so callers should pass the
 * whole comparison set — including over-budget cars — to keep every vehicle
 * judged against one frame of reference.
 */
export function computeAllScores(
  vehicles: PinnedFinnCar[],
  priorities: CategoryId[],
  preferences: LensPreferences,
  categoryFeatures: Record<
    CategoryId,
    FeatureWeight[]
  > = DEFAULT_CATEGORY_FEATURES,
): VehicleScore[] {
  const weights = priorityWeights(priorities);

  return vehicles.map((vehicle) => {
    const byCategory = {} as Record<CategoryId, number>;
    const details: Partial<Record<CategoryId, CategoryDetail>> = {};

    let total = 0;

    for (const { priority, weight } of weights) {
      const detail = categoryDetail(
        priority,
        vehicle,
        vehicles,
        preferences,
        categoryFeatures,
      );

      byCategory[priority] = detail.score;
      details[priority] = detail;

      total += detail.score * weight;
    }

    return {
      vehicleId: vehicle.id,
      total: Math.round(total),
      byCategory,
      details,
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Score lookups                                                              */
/* -------------------------------------------------------------------------- */

export function scoreFor(
  scores: VehicleScore[],
  vehicleId: number,
  category: CategoryId,
): number {
  return (
    scores.find((score) => score.vehicleId === vehicleId)?.byCategory[
      category
    ] ?? 0
  );
}

export function totalFor(scores: VehicleScore[], vehicleId: number): number {
  return scores.find((score) => score.vehicleId === vehicleId)?.total ?? 0;
}

export function winnerForCategory(
  vehicles: PinnedFinnCar[],
  scores: VehicleScore[],
  category: CategoryId,
): PinnedFinnCar | undefined {
  return [...vehicles].sort(
    (a, b) => scoreFor(scores, b.id, category) - scoreFor(scores, a.id, category),
  )[0];
}
