import type { PinnedFinnCar } from "@/lib/types";
import type {
  CategoryDef,
  CategoryDetail,
  CategoryId,
  FeatureId,
  FeaturePreference,
  FeatureSelection,
  LensPreferences,
  NumericEvidence,
  PriorityWeight,
  VehicleScore,
} from "./types";

import {
  AVAILABLE_CATEGORY_FEATURES,
  BASE_FEATURE_WEIGHT,
  CATEGORIES,
  DEFAULT_CATEGORY_FEATURES,
  DEFAULT_PRIORITIES,
  FEATURE_IMPORTANCE,
  FEATURES,
} from "./constants";

import { formatNumber } from "./format";
import {
  assessEnvironment,
  type EnvironmentalAssessment,
} from "./environmental";

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

/**
 * A feature's name as it reads inside a sentence: "a towbar", "adaptive
 * cruise control".
 *
 * Prose says "it doesn't have …" far more often now that features are a
 * simple list, so the article matters. Chips and headings keep the bare
 * label — "No towbar" is correct as a heading and wrong as a clause.
 */
export const featurePhrase = (key: string): string => {
  const meta = FEATURES[key as keyof typeof FEATURES];

  if (!meta) return key;

  const name = sentenceCase(meta.label);

  return "article" in meta ? `${meta.article} ${name}` : name;
};

/**
 * Lowercases a label for mid-sentence use without mangling acronyms,
 * symbols or brand names — "Heated seats" → "heated seats", but "ISOFIX
 * child seat anchors" and "360° camera" are left alone.
 */
function sentenceCase(label: string): string {
  const first = label.split(" ")[0] ?? label;

  const isAcronymOrSymbol = first.length > 1 && first === first.toUpperCase();

  if (isAcronymOrSymbol || !/^[A-Z]/.test(label)) return label;

  return label.charAt(0).toLowerCase() + label.slice(1);
}

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

/**
 * How far apart a set has to be before the full 0–100 is earned.
 *
 * The same 35% `classifyMeasurementGap` calls "decisive", so the scale and the
 * prose agree about when a difference is real. See `spreadAwareScore`.
 */
const DECISIVE_SPREAD = 0.35;

/** The score for a set the measurement cannot separate at all. */
const INDIFFERENT = 50;

/**
 * A relative score that only claims as much of the scale as the figures support.
 *
 * Plain min-max hands the worst car 0 and the best 100 whatever the spread, so
 * 495 km against 500 km comes out as the widest gap the engine can express. In
 * a category built out of one measurement that is not a rounding error — it is
 * the whole category score, and from there a third of the overall result.
 *
 * So the spread decides the reach: a set spanning 35% or more of its own top
 * figure uses the full scale, and anything tighter is compressed proportionally
 * toward the middle. Ordering is untouched — the better car still scores
 * higher, every time — and what changes is how much that lead is allowed to be
 * worth. Two cars a few kilometres apart end up a few points apart, which is
 * what leaves the rest of the priority free to decide the result.
 */
function spreadAwareScore(
  value: number,
  values: number[],
  lowerIsBetter: boolean,
): number {
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (max === min || max === 0) return INDIFFERENT;

  const ratio = (value - min) / (max - min);
  const placed = lowerIsBetter ? 1 - ratio : ratio;

  const reach = Math.min(1, (max - min) / max / DECISIVE_SPREAD);

  return Math.round(INDIFFERENT + (placed - 0.5) * 100 * reach);
}

interface NumericResult {
  score: number;
  /** Null where the score rests on several figures rather than one. */
  evidence: NumericEvidence | null;
  /** The reading behind a category scored on figures rather than equipment. */
  environmental?: EnvironmentalAssessment;
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
 * The three things that can be measured about how a car travels a long way,
 * and which of them applies to one car.
 *
 * They are cohorts rather than a preference order: a car belongs to exactly
 * one, and is only ever ranked inside it. `range` beats `energy` for an
 * electric car because kilometres between stops is the more direct answer to
 * the question and FINN publishes it.
 */
type LongDistanceBasis = "range" | "energyElectric" | "energyFuel";

interface LongDistanceReading {
  basis: LongDistanceBasis;
  value: number;
  label: string;
  unit: string;
  lowerIsBetter: boolean;
}

function longDistanceReading(
  vehicle: PinnedFinnCar,
): LongDistanceReading | null {
  const isElectric = vehicle.fuelType === "Electric";

  const rawRange = vehicle.electric?.range;

  const range =
    rawRange != null && rawRange !== "Unknown" ? Number(rawRange) : Number.NaN;

  if (Number.isFinite(range) && range > 0) {
    return {
      basis: "range",
      value: range,
      label: "Electric range",
      unit: "km",
      lowerIsBetter: false,
    };
  }

  const consumption = Number(vehicle.consumption?.combined);

  if (!Number.isFinite(consumption) || consumption <= 0) return null;

  /*
   * `consumption.unit` is hard-coded to litres by the mapper for every car, so
   * the powertrain is what says which quantity this actually is. A plug-in
   * hybrid's figure is litres — FINN publishes one combined fuel figure and no
   * electric split — so it sits with the combustion cars.
   */
  return isElectric
    ? {
        basis: "energyElectric",
        value: consumption,
        label: "Consumption",
        unit: "kWh/100km",
        lowerIsBetter: true,
      }
    : {
        basis: "energyFuel",
        value: consumption,
        label: "Consumption",
        unit: "L/100km",
        lowerIsBetter: true,
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
      const own = longDistanceReading(vehicle);

      if (!own) return null;

      /*
       * Measured only against cars carrying the same reading.
       *
       * This used to pool everything: a car with an electric range was ranked
       * against the other ranges, and everything else was ranked on
       * consumption across the whole set — which put an electric car's
       * kilowatt-hours into the same min-max as a petrol car's litres. FINN
       * reports both in `consumption.combined` and the mapper labels the field
       * litres regardless, so a 17 kWh/100 km electric car was read as a
       * catastrophically thirsty one and scored near zero for it.
       *
       * Kilometres of range, litres per 100 km and kilowatt-hours per 100 km
       * are three different quantities. Nothing in FINN's data converts
       * between them — a combustion car's real range needs a tank size FINN
       * doesn't publish, and an electric car's needs a charging network this
       * has no view of — so no cross-powertrain ordering is claimed. Each car
       * is placed among its own kind, which is the same thing
       * `assessEfficiency` does when it says "frugal for a petrol car".
       */
      const cohort = vehicles
        .map((item) => longDistanceReading(item))
        .filter(
          (reading): reading is LongDistanceReading =>
            reading != null && reading.basis === own.basis,
        )
        .map((reading) => reading.value);

      /* One car of its kind has nothing to be relative to. */
      if (cohort.length < 2) return null;

      return {
        score: spreadAwareScore(own.value, cohort, own.lowerIsBetter),
        evidence: evidence(own.label, own.value, own.unit, own.lowerIsBetter),
      };
    }

    /*
     * The one category not scored by comparison, and the one scored on a
     * single figure. See `assessEnvironment`: emissions have an absolute,
     * published scale where boot space doesn't, and the three things that used
     * to be averaged alongside CO₂ all turned out to be the CO₂ figure wearing
     * different clothes.
     */
    case "environmental": {
      const assessment = assessEnvironment(vehicle);

      if (!assessment || assessment.score == null) return null;

      return {
        score: assessment.score,
        evidence: assessment.co2
          ? evidence("CO₂ emissions", assessment.co2.gPerKm, "g/km", true)
          : null,
        environmental: assessment,
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
 *
 * Features the user picked out are never a filter. A car missing one stays in
 * the running, scores lower than it otherwise would, and the gap surfaces as a
 * tradeoff the reader weighs — not a decision the engine makes for them.
 */
export function categoryDetail(
  category: CategoryId,
  vehicle: PinnedFinnCar,
  vehicles: PinnedFinnCar[],
  _preferences: LensPreferences,
  categoryFeatures: Record<
    CategoryId,
    FeatureSelection
  > = DEFAULT_CATEGORY_FEATURES,
): CategoryDetail {
  /*
   * The category is measured against its own catalogue, always.
   *
   * Measuring it against the user's picks instead — which an earlier version
   * did — fails in two directions at once. Pick one common feature and every
   * car scores 100, so the priority silently stops separating anything. Pick
   * one rare feature and a car with twelve of the fifteen safety systems
   * scores 0 for want of the thirteenth, which is a hard requirement in all
   * but name.
   *
   * So the catalogue is the denominator, and what the user picked out adjusts
   * the weight of individual entries inside it. That keeps a picked feature
   * genuinely influential while making it arithmetically impossible for any
   * one of them to drive the category to either extreme.
   */
  const catalogue =
    AVAILABLE_CATEGORY_FEATURES[category] ??
    getCategory(category)?.features ??
    [];

  const selected = categoryFeatures[category] ?? [];

  const importanceOf = new Map(
    selected.map((preference) => [preference.key, preference.importance]),
  );

  const matched: FeatureId[] = [];
  const missing: FeatureId[] = [];

  let earned = 0;
  let total = 0;

  for (const key of catalogue) {
    const importance = importanceOf.get(key);

    /*
     * One count for being relevant equipment, plus one, two or three more for
     * how much the user said it matters. See FEATURE_IMPORTANCE.
     */
    const weight = importance
      ? FEATURE_IMPORTANCE[importance].weight
      : BASE_FEATURE_WEIGHT;

    total += weight;

    if (vehicle.features?.[key]) {
      matched.push(key);
      earned += weight;
    } else {
      missing.push(key);
    }
  }

  /* The plain count, for the explanation to quote. */
  const coverageScore = catalogue.length
    ? Math.round((matched.length / catalogue.length) * 100)
    : null;

  /* The weighted share, which is what the ranking runs on. */
  const featureScore = total ? Math.round((earned / total) * 100) : null;

  /*
   * The picks, split by presence and carrying their importance, so the Advice
   * can answer "does it have the things I asked for?" separately from "how
   * well equipped is it here?".
   *
   * Picks the catalogue no longer offers are ignored rather than counted as
   * misses — the user cannot have meant a feature this category doesn't cover.
   */
  const pickedMatched: FeaturePreference[] = [];
  const pickedMissing: FeaturePreference[] = [];

  for (const preference of selected) {
    if (!catalogue.includes(preference.key)) continue;

    if (vehicle.features?.[preference.key]) pickedMatched.push(preference);
    else pickedMissing.push(preference);
  }

  const numeric = numericScore(category, vehicle, vehicles);

  const score =
    numeric != null && featureScore != null
      ? Math.round((numeric.score + featureScore) / 2)
      : (numeric?.score ?? featureScore ?? 50);

  return {
    score,
    matched,
    missing,
    basis: catalogue.length ? "category" : "none",
    pickedMatched,
    pickedMissing,
    coverageScore,
    featureScore,
    numericScore: numeric?.score ?? null,
    numeric: numeric?.evidence ?? null,
    environmental: numeric?.environmental ?? null,
    hasEvidence: featureScore != null || numeric != null,
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
    FeatureSelection
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
