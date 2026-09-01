import type { FinnCar, FuelType } from "@/lib/types";

import { formatNumber } from "./format";

/**
 * What a car emits, how efficiently it uses what it burns, and what neither
 * figure can say on its own.
 *
 * This replaces a model that scored four things and averaged them: CO₂ g/km,
 * CO₂ class, consumption, and fuel type. Three of those four were not
 * independent of the first, and the research says so plainly.
 *
 * **The CO₂ class is the CO₂ figure.** Since the Pkw-EnVKV was amended in
 * February 2024 the German class is a pure function of WLTP combined CO₂ in
 * g/km — A at 0, B to 95, C to 115, D to 135, E to 155, F to 175, G above
 * that — and the amendment's own summary of what changed is that the reference
 * to vehicle weight was dropped. Scoring the figure and the class as two votes
 * counted one measurement twice.
 *
 * **Consumption is the CO₂ figure too, for anything that burns fuel.** The
 * Commission's real-world monitoring puts 1.2 L/100 km of petrol at 28 g
 * CO₂/km, which is the carbon in a litre of petrol and nothing else. A petrol
 * car's CO₂ per kilometre is its litres per kilometre times a constant.
 *
 * **Fuel type is not a measurement at all.** It is what tells you how to read
 * the other two — that a zero is a tailpipe zero, that a plug-in hybrid's
 * figure assumes charging — and giving it its own score marked a petrol car
 * down twice for being petrol: once in its CO₂ and again for the fuel that
 * produced it.
 *
 * So there is one score here, not four:
 *
 * - **Environmental impact** is tailpipe CO₂, placed on the EU's own class
 *   scale. The boundaries are the regulation's, not ours.
 *
 * - **Efficiency** is a separate, cohort-relative reading of consumption —
 *   "frugal for a petrol car" — because a litre and a kilowatt-hour are not
 *   comparable quantities, and because a reader who wants a petrol car is
 *   entitled to know which petrol car is the frugal one rather than being told
 *   again that petrol cars burn petrol.
 *
 * - **Powertrain** is context, and carries the caveats.
 *
 * The two answers are allowed to disagree, and that disagreement is the useful
 * part: a frugal petrol car is genuinely efficient *and* genuinely a worse
 * emitter than an electric one, and a reader deciding between petrol cars
 * needs the first while a reader deciding between powertrains needs the second.
 *
 * Sources: Pkw-EnVKV §3a and ADAC's summary of the 2024 amendment; the
 * European Commission's report on real-world CO₂ from on-board monitoring;
 * ICCT's European vehicle market statistics and its work on plug-in hybrid
 * utility factors.
 */

/* -------------------------------------------------------------------------- */
/* Reference points, all of them published                                    */
/* -------------------------------------------------------------------------- */

/**
 * The EU CO₂ classes, as the upper bound of each band in g/km.
 *
 * Straight out of the regulation. `G` has no upper bound in law; the figure
 * here is where this stops distinguishing, one band-width past where G starts.
 */
const CO2_CLASS_BANDS: { letter: string; upTo: number }[] = [
  { letter: "A", upTo: 0 },
  { letter: "B", upTo: 95 },
  { letter: "C", upTo: 115 },
  { letter: "D", upTo: 135 },
  { letter: "E", upTo: 155 },
  { letter: "F", upTo: 175 },
  { letter: "G", upTo: 195 },
];

/**
 * Where each class sits on the 0–100 the rest of the engine speaks in.
 *
 * The one product judgement in this file, and a single table tied to the
 * official classes rather than a set of ceilings pulled out of the air.
 *
 * Each class occupies a range rather than a point, and every range sits wholly
 * inside one of the reader's bands: A and B read as a strong match, C as good,
 * D and E as partial, F and G as limited. So the class a car is in decides the
 * word a reader sees, and where it sits inside that class decides where in the
 * band — two class D cars twenty grams apart are not reported as the same car,
 * and neither of them is ever reported as better than a class C one.
 *
 * D is the commonest class among cars that burn fuel. A car of average
 * emissions reading as a partial match to somebody who put the environment
 * near the top of their list is the intended result, not an accident.
 */
const CLASS_POSITION: Record<string, { from: number; to: number }> = {
  A: { from: 100, to: 100 },
  B: { from: 88, to: 70 },
  C: { from: 64, to: 52 },
  D: { from: 44, to: 34 },
  E: { from: 33, to: 28 },
  F: { from: 22, to: 14 },
  G: { from: 12, to: 0 },
};

/**
 * Grams of CO₂ per litre burned.
 *
 * Physical constants, not estimates: the Commission's monitoring report gives
 * 1.2 L/100 km of petrol as 28 g CO₂/km, which is this number. They are used
 * to turn the emissions cohort average into a consumption one, so the
 * efficiency reference is derived from published data rather than set by hand.
 */
const CARBON_PER_LITRE: Partial<Record<FuelType, number>> = {
  Petrol: 2330,
  Diesel: 2640,
};

/**
 * The average new car that burns fuel, in WLTP CO₂ g/km.
 *
 * ICCT's European market statistics: combustion vehicles including hybrids
 * have sat at about this figure since 2021.
 */
const COMBUSTION_FLEET_CO2 = 136;

/**
 * The average new battery-electric car, in WLTP kWh/100 km.
 *
 * ICCT reports real-world consumption averaging 19 kWh/100 km and running
 * about 12% above the type-approval figure, which puts the WLTP average here.
 * There is no CO₂ figure to derive an electric cohort from — every electric
 * car is 0 g/km — so consumption is the only thing separating one from another.
 */
const ELECTRIC_FLEET_KWH = 17;

/**
 * How far from typical a car has to be before the word changes.
 *
 * One CO₂ class is 20 g/km wide, which is 15% of the combustion fleet average.
 * Using that proportion for every cohort makes "highly efficient" the same
 * distance from ordinary whether it is measured in litres or kilowatt-hours,
 * and it is a width the label already uses rather than one chosen to make cars
 * look good.
 */
const EFFICIENCY_BAND = 20 / COMBUSTION_FLEET_CO2;

/* -------------------------------------------------------------------------- */
/* Shapes                                                                     */
/* -------------------------------------------------------------------------- */

export type EfficiencyLevel = "high" | "moderate" | "low";

export interface EfficiencyAssessment {
  level: EfficiencyLevel;
  /** "Highly efficient". */
  label: string;
  /** What that means, naming the cohort it is relative to. */
  explanation: string;
  /** The figure it was read from. */
  display: string;
  /** What an ordinary car of this kind uses, so the reader can judge it. */
  typical: string;
}

/**
 * How far the emissions figure can be trusted as a description of the car.
 *
 * `optimistic` is the plug-in hybrid case: the number is real, but it measures
 * an assumed pattern of use as much as it measures the car.
 */
export type EmissionsConfidence = "measured" | "optimistic" | "unknown";

export interface EnvironmentalAssessment {
  /** 0–100 on the class scale. Null when FINN supplied no CO₂ figure. */
  score: number | null;

  /** The primary signal, with the class that is its published shorthand. */
  co2: { gPerKm: number; className: string; display: string } | null;

  /** The separate question: how well it uses what it burns. */
  efficiency: EfficiencyAssessment | null;

  powertrain: FuelType | null;
  confidence: EmissionsConfidence;

  /** What the figures can't say for themselves. */
  caveats: string[];

  /** Measurements FINN didn't supply, named in plain English. */
  missing: string[];
}

/* -------------------------------------------------------------------------- */
/* Reading the figures                                                        */
/* -------------------------------------------------------------------------- */

const isMeasured = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

/** The official class for a CO₂ figure, computed rather than trusted. */
export function co2ClassFor(gPerKm: number): string {
  for (const band of CO2_CLASS_BANDS) {
    if (gPerKm <= band.upTo) return band.letter;
  }

  return "G";
}

/**
 * Where a CO₂ figure sits on the 0–100 scale.
 *
 * The class decides which stretch of the scale; the figure's position inside
 * its own class decides where in that stretch. So the answer moves smoothly
 * with the emissions while never letting a car cross into a band its class
 * doesn't belong to.
 */
export function positionForCo2(gPerKm: number): number {
  for (let index = 0; index < CO2_CLASS_BANDS.length; index += 1) {
    const band = CO2_CLASS_BANDS[index] as { letter: string; upTo: number };

    if (gPerKm > band.upTo) continue;

    const { from, to } = CLASS_POSITION[band.letter] as {
      from: number;
      to: number;
    };

    /* Where in its own class this car sits: 0 at the clean end, 1 at the dirty. */
    const floor = index === 0 ? 0 : (CO2_CLASS_BANDS[index - 1]?.upTo ?? 0) + 1;
    const span = band.upTo - floor;
    const into = span > 0 ? Math.min(1, (gPerKm - floor) / span) : 0;

    return Math.round(from + (to - from) * into);
  }

  return 0;
}

/* -------------------------------------------------------------------------- */
/* Efficiency, within the powertrain the reader is looking at                 */
/* -------------------------------------------------------------------------- */

const EFFICIENCY_LABEL: Record<EfficiencyLevel, string> = {
  high: "Highly efficient",
  moderate: "Moderately efficient",
  low: "Less efficient",
};

interface Cohort {
  typical: number;
  unit: string;
  /** "fuel" or "electricity". */
  noun: string;
  /** "a typical new petrol car". */
  peer: string;
}

/** What an ordinary car of this powertrain uses, and in what unit. */
function cohortFor(fuel: FuelType): Cohort | null {
  if (fuel === "Electric") {
    return {
      typical: ELECTRIC_FLEET_KWH,
      unit: "kWh/100km",
      noun: "electricity",
      peer: "a typical new electric car",
    };
  }

  const carbon = CARBON_PER_LITRE[fuel];

  if (!carbon) return null;

  return {
    /* The fleet's emissions average, read through the fuel's own carbon. */
    typical: (COMBUSTION_FLEET_CO2 / carbon) * 100,
    unit: "L/100km",
    noun: "fuel",
    peer: fuel === "Diesel" ? "a typical new diesel car" : "a typical new petrol car",
  };
}

/**
 * How efficiently this car uses its own kind of energy.
 *
 * Cohort-relative on purpose, and separate from the emissions answer on
 * purpose. There is no honest single number covering litres and kilowatt-hours
 * at once, and a reader who wants a petrol car needs to know which petrol car
 * is the frugal one.
 *
 * Returns null for a plug-in hybrid: its single figure is a blend of two
 * energy sources over an assumed pattern of charging, there is no cohort it
 * can honestly be placed in, and FINN publishes no separate electric
 * consumption to build one from.
 */
export function assessEfficiency(
  vehicle: FinnCar,
): EfficiencyAssessment | null {
  const fuel = vehicle.fuelType;
  const consumption = Number(vehicle.consumption?.combined);

  if (!fuel || !isMeasured(consumption) || consumption <= 0) return null;
  if (fuel === "Plug-in Hybrid") return null;

  const cohort = cohortFor(fuel);

  if (!cohort) return null;

  const margin = cohort.typical * EFFICIENCY_BAND;

  const level: EfficiencyLevel =
    consumption <= cohort.typical - margin
      ? "high"
      : consumption >= cohort.typical + margin
        ? "low"
        : "moderate";

  const explanation = {
    high: `Uses noticeably less ${cohort.noun} than ${cohort.peer}.`,
    moderate: `Uses about as much ${cohort.noun} as ${cohort.peer}.`,
    low: `Uses noticeably more ${cohort.noun} than ${cohort.peer}.`,
  }[level];

  return {
    level,
    label: EFFICIENCY_LABEL[level],
    explanation,
    display: `${formatNumber(consumption)} ${cohort.unit}`,
    typical: `${formatNumber(cohort.typical)} ${cohort.unit} is typical`,
  };
}

/* -------------------------------------------------------------------------- */
/* Powertrain context                                                         */
/* -------------------------------------------------------------------------- */

/**
 * What the figures can't say about themselves.
 *
 * Each is a limit of the measurement rather than an opinion about the car, and
 * each is a reason not to take the number in front of the reader at face value.
 */
function caveatsFor(vehicle: FinnCar): string[] {
  const caveats: string[] = [];

  if (vehicle.fuelType === "Electric") {
    caveats.push(
      "Zero here is zero at the tailpipe. What charging actually costs the climate depends on how the electricity was generated, which isn't in FINN's data.",
    );
  }

  if (vehicle.fuelType === "Plug-in Hybrid") {
    caveats.push(
      "A plug-in hybrid's official CO₂ assumes a share of electric driving set by the test rather than by the driver. On-road studies have found real emissions several times the official figure where cars are charged less often than the test assumes, so this number describes a pattern of use as much as it describes the car.",
    );
  }

  caveats.push(
    "Based on the emissions and energy figures FINN publishes, which cover what the car does per kilometre. Building it, its battery and its disposal aren't in that data and aren't estimated here.",
  );

  return caveats;
}

/* -------------------------------------------------------------------------- */
/* The assessment                                                             */
/* -------------------------------------------------------------------------- */

/**
 * The whole environmental reading of one car.
 *
 * Null only when there is nothing at all to say — no CO₂ figure and no usable
 * consumption. A car with one but not the other is reported on what it has,
 * with the gap named rather than filled in.
 */
export function assessEnvironment(
  vehicle: FinnCar,
): EnvironmentalAssessment | null {
  const fuel = vehicle.fuelType ?? null;
  const raw = Number(vehicle.co2?.value);
  const missing: string[] = [];

  const co2 = isMeasured(raw)
    ? {
        gPerKm: raw,
        /*
         * Computed from the figure rather than read from FINN's field. Where a
         * car predates the 2024 scale its stored letter can disagree with its
         * own emissions, and the regulation is the better authority on its own
         * classes.
         */
        className: co2ClassFor(raw),
        display: `${formatNumber(raw)} g/km`,
      }
    : null;

  if (!co2) missing.push("its CO₂ figure");

  const efficiency = assessEfficiency(vehicle);
  const consumption = Number(vehicle.consumption?.combined);

  if (!isMeasured(consumption) || consumption <= 0) {
    missing.push("what it consumes");
  }

  if (!fuel) missing.push("what it runs on");

  if (!co2 && !efficiency) return null;

  let score = co2 ? positionForCo2(co2.gPerKm) : null;
  let confidence: EmissionsConfidence = co2 ? "measured" : "unknown";

  /*
   * A plug-in hybrid's scale is compressed rather than its figure corrected.
   *
   * The research is clear that official plug-in hybrid CO₂ understates real
   * emissions by a large and growing margin, and equally clear that the size
   * of the gap depends on how one particular driver charges — which FINN's
   * data cannot tell us. So no real-world figure is invented here. What is
   * refused is the top of the scale: this will not call a car a strong
   * environmental match on a number that assumes a habit we can't check.
   *
   * Compressed and not clipped, because clipping flattened them. A plug-in
   * hybrid at 26 g/km and one at 75 g/km both hit the ceiling and came out
   * identical, which threw away the one real distinction between them. Scaling
   * the whole range keeps them ordered against each other while keeping all of
   * them below the cars whose figures don't need this caveat.
   */
  if (score != null && fuel === "Plug-in Hybrid") {
    confidence = "optimistic";
    score = Math.round(
      score * ((CLASS_POSITION.C as { to: number }).to / 100),
    );
  }

  return {
    score,
    co2,
    efficiency,
    powertrain: fuel,
    confidence,
    caveats: caveatsFor(vehicle),
    missing,
  };
}

/* -------------------------------------------------------------------------- */
/* Saying it                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The reading in one or two sentences.
 *
 * Where the two answers differ, both are given. That is the whole value of
 * separating them: "efficient for a petrol car, and still a worse emitter than
 * an electric one" is two true things a single score cannot hold.
 */
export function describeEnvironment(
  assessment: EnvironmentalAssessment,
): string {
  const { co2, efficiency, powertrain } = assessment;

  if (!co2) {
    return efficiency
      ? `FINN doesn't publish a CO₂ figure for this car, so this is judged on what it uses: ${efficiency.explanation.toLowerCase()}`
      : "FINN doesn't publish the figures this priority is judged on.";
  }

  if (powertrain === "Electric") {
    return efficiency
      ? `No CO₂ at the tailpipe, and ${efficiency.label.toLowerCase()} for an electric car at ${efficiency.display}.`
      : "No CO₂ at the tailpipe. FINN doesn't publish what it consumes, so how efficiently it uses that electricity is unknown.";
  }

  if (powertrain === "Plug-in Hybrid") {
    return `Its official figure is ${co2.display}, class ${co2.className} — low, but it assumes the car is charged as often as the test does, and that is not something FINN's data can confirm.`;
  }

  const grams = co2.gPerKm;

  const standing =
    grams <= 115
      ? "low for a car that burns fuel"
      : grams <= 155
        ? "around average for a car that burns fuel"
        : "high even among cars that burn fuel";

  const fuelName = powertrain === "Diesel" ? "diesel" : "petrol";

  return efficiency
    ? `${efficiency.label} for a ${fuelName} car at ${efficiency.display}, but at ${co2.display} its CO₂ is ${standing} — an electric car emits none at the tailpipe.`
    : `At ${co2.display}, class ${co2.className}, its CO₂ is ${standing}.`;
}

/* -------------------------------------------------------------------------- */
/* The method, for a reader who wants it                                      */
/* -------------------------------------------------------------------------- */

export interface EnvironmentalMethodNote {
  heading: string;
  body: string;
}

/** How this priority is judged, said where there is no car to say it about. */
export const ENVIRONMENTAL_METHOD: EnvironmentalMethodNote[] = [
  {
    heading: "CO₂ emissions decide the result",
    body: "The car's CO₂ per kilometre is placed on the EU's own scale — the A-to-G classes from the label, where A is 0 g/km and G starts at 176. Nothing else moves the result.",
  },
  {
    heading: "The CO₂ class is shown, not counted",
    body: "Since 2024 the class is worked out from the CO₂ figure alone; vehicle weight no longer comes into it. So it carries nothing the figure doesn't, and it's here because it's the form you'll recognise from FINN's own page rather than as a second opinion.",
  },
  {
    heading: "Efficiency is a separate question",
    body: "How much fuel or electricity a car uses is reported against other cars of the same powertrain, because a litre and a kilowatt-hour aren't comparable quantities. It tells you whether this is a frugal example of what it is, which is a different question from how much it emits.",
  },
  {
    heading: "The powertrain explains the figures rather than scoring them",
    body: "What a car runs on isn't counted separately. For anything burning fuel the CO₂ figure is its consumption times the carbon in a litre, so scoring both would mark the same car down twice for the same fact.",
  },
  {
    heading: "Plug-in hybrids are capped, not corrected",
    body: "Their official CO₂ assumes a share of electric driving the test sets rather than the driver does, and on-road studies find real emissions several times higher where cars are charged less than assumed. No real-world figure is invented here — what's refused is calling such a car a strong match on a number that can't be checked.",
  },
  {
    heading: "This is what the car does per kilometre",
    body: "Building it, its battery, the electricity mix it charges from and its disposal aren't in FINN's data and aren't estimated here. This is not a lifecycle assessment.",
  },
];
