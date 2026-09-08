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

/**
 * How this car's emissions read against everything else on the road.
 *
 * The mirror of `EfficiencyLevel`, and it exists for the same reason: a number
 * on its own is not an answer. 140 g/km means nothing to a reader who doesn't
 * already know what a car emits, and the UI should never be the thing deciding
 * what it means.
 */
export type EmissionsLevel = "none" | "low" | "moderate" | "high";

export interface EmissionsAssessment {
  level: EmissionsLevel;
  /** "Lower emissions" — the headline for the figure. */
  label: string;
  /** What the figure means, in one sentence. */
  explanation: string;
  /** "140 g/km · Class D". */
  display: string;
  gPerKm: number;
  className: string;
}

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

  /**
   * The same judgement with its working shown, for a reader who wants to know
   * why we called it that rather than being told to accept it.
   *
   * `reasoning` names both figures and the distance between them, because
   * "Highly efficient" on its own is a verdict the reader has no way to check
   * — and this one is a comparison against a fleet average, not a property of
   * the car. `caveat` is the part that is true of every figure here and would
   * be dishonest to leave implied: it is a lab result.
   */
  reasoning: string;
  caveat: string;
  /** The car's own figure and the cohort's, for a side-by-side readout. */
  value: number;
  typicalValue: number;
  unit: string;
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

  /**
   * The primary signal, interpreted — the figure, the class that is its
   * published shorthand, and what the number actually means.
   */
  co2: EmissionsAssessment | null;

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

/**
 * What a CO₂ figure means, said once so no surface has to decide for itself.
 *
 * The boundaries are the official class boundaries, grouped: A–B is the low
 * end, C–D the middle, E and worse the high end. That keeps every word here
 * traceable to the same regulation the score comes from, and it means the
 * sentence and the band can never drift apart.
 *
 * Deliberately plain. "Lower emissions" and "higher emissions" describe a
 * measurement; "clean" and "green" describe a car, and this data does not
 * support describing a car.
 */
function assessEmissions(
  gPerKm: number,
  powertrain: FuelType | null,
): EmissionsAssessment {
  const className = co2ClassFor(gPerKm);
  const display = `${formatNumber(gPerKm)} g/km · Class ${className}`;
  const figure = formatNumber(gPerKm);

  if (gPerKm === 0) {
    return {
      level: "none",
      label: "No CO₂ at the tailpipe",
      explanation:
        powertrain === "Electric"
          ? "It emits no CO₂ while you drive it. That is the strongest result this priority can give."
          : "It emits no CO₂ while you drive it, which is the strongest result this priority can give.",
      display,
      gPerKm,
      className,
    };
  }

  /*
   * A plug-in hybrid's figure is labelled for what it is.
   *
   * 30 g/km is a class B number, and calling it "low emissions" alongside a
   * caveat saying it might be several times that is the panel arguing with
   * itself. The condition goes in the label, where the reader meets it, and
   * the band it is drawn in is the neutral one rather than the flattering
   * one. The figure itself is not touched — see `assessEnvironment` for why
   * no corrected number is invented.
   */
  if (powertrain === "Plug-in Hybrid") {
    return {
      level: "moderate",
      label: "Low only if you charge it",
      explanation: `Its published figure is ${figure} g/km, which is low — but for a plug-in hybrid that number assumes the car is plugged in regularly. How much you'd actually emit depends on how often you do.`,
      display,
      gPerKm,
      className,
    };
  }

  /*
   * Every comparison below is to the same published number — the CO₂ average
   * of new cars that burn fuel — rather than to a petrol average or a diesel
   * average, which aren't published separately. Saying "more than a typical
   * petrol car" would be claiming a benchmark this doesn't have.
   */
  const average = `the ${COMBUSTION_FLEET_CO2} g/km average for a new car that burns fuel`;

  /* Class A–B: below the 95 g/km line the EU label treats as low. */
  if (gPerKm <= 95) {
    return {
      level: "low",
      label: "Low emissions",
      explanation: `At ${figure} g of CO₂ per kilometre it emits well under ${average}.`,
      display,
      gPerKm,
      className,
    };
  }

  /* Class C: still under the average, but not by much. */
  if (gPerKm <= 115) {
    return {
      level: "moderate",
      label: "Below-average emissions",
      explanation: `It puts out ${figure} g of CO₂ for every kilometre driven, under ${average}.`,
      display,
      gPerKm,
      className,
    };
  }

  /* Class D: where most new combustion cars sit. */
  if (gPerKm <= 135) {
    return {
      level: "moderate",
      label: "Around-average emissions",
      explanation: `It puts out ${figure} g of CO₂ for every kilometre driven, close to ${average}.`,
      display,
      gPerKm,
      className,
    };
  }

  /*
   * Class E and worse. The band opens just above the average and has no top,
   * so the sentence says how far above rather than treating 140 g/km and
   * 240 g/km as the same statement.
   */
  const margin = gPerKm >= COMBUSTION_FLEET_CO2 * 1.25 ? "well above" : "above";

  return {
    level: "high",
    label: "Above-average emissions",
    explanation: `At ${figure} g of CO₂ per kilometre it emits ${margin} ${average}.`,
    display,
    gPerKm,
    className,
  };
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
    /*
     * "the average new car that burns fuel", not "the average petrol car".
     *
     * The reference is the combustion fleet's CO₂ average converted through
     * this fuel's carbon content, and no petrol-only or diesel-only WLTP
     * average is published in the sources this was built on. The litre
     * threshold differs between the two precisely because a litre of diesel
     * carries more carbon — which is a true and useful thing to say, and
     * "a typical petrol car" was not.
     */
    peer: "the average new car that burns fuel",
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

  /*
   * How far off the cohort it actually is, rounded to whole percent.
   *
   * Quoted rather than kept internal because the band is the whole judgement:
   * a reader told "Highly efficient" has no way to know whether that meant 2%
   * better or 30%, and the difference is the difference between a rounding
   * artefact and a real saving.
   */
  const differencePct = Math.round(
    (Math.abs(consumption - cohort.typical) / cohort.typical) * 100,
  );

  const mine = `${formatNumber(consumption)} ${cohort.unit}`;
  const theirs = `${formatNumber(cohort.typical)} ${cohort.unit}`;

  const reasoning = {
    high:
      `This car is rated at ${mine}. Measured against ${cohort.peer}, ` +
      `which uses about ${theirs}, it needs roughly ${differencePct}% less ` +
      `${cohort.noun} to cover the same distance — enough of a gap to call ` +
      `it genuinely frugal for its kind.`,
    moderate:
      `This car is rated at ${mine}, and ${cohort.peer} uses about ` +
      `${theirs}. That is close enough — within ${differencePct}% — that we ` +
      `would not claim it is either frugal or thirsty. It is an ordinary ` +
      `car for its kind on ${cohort.noun}, which is a perfectly reasonable ` +
      `thing to be.`,
    low:
      `This car is rated at ${mine}, against about ${theirs} for ` +
      `${cohort.peer}. That is roughly ${differencePct}% more ${cohort.noun} ` +
      `for the same distance, which is worth knowing because you pay for it ` +
      `every month rather than once.`,
  }[level];

  return {
    level,
    label: EFFICIENCY_LABEL[level],
    explanation,
    display: mine,
    typical: `${theirs} is typical`,
    reasoning,
    /*
     * The one caveat that is true of every consumption figure FINN publishes,
     * and the one a reader is most likely to be caught out by — the comparison
     * above is lab-against-lab, so it stays fair, but the absolute number will
     * not match their own driving.
     */
    caveat:
      `Both figures are official WLTP lab results, so they are measured the ` +
      `same way and fair to compare. Real driving — motorway speeds, winter, ` +
      `a loaded car — usually uses more than the lab does, so treat the ` +
      `comparison as reliable and the exact number as optimistic.`,
    value: consumption,
    typicalValue: cohort.typical,
    unit: cohort.unit,
  };
}

/* -------------------------------------------------------------------------- */
/* Powertrain context                                                         */
/* -------------------------------------------------------------------------- */

/**
 * What the figures can't say about themselves.
 *
 * Each is a limit of the measurement rather than an opinion about the car, and
 * each names something a reader would otherwise read the number wrongly
 * without. Nothing generic is here: "this only counts what comes out of the
 * car, not what building it cost" applies to every car equally, tells nobody
 * anything about the one in front of them, and is the sort of line a reader
 * learns to skip — which then costs the two below their credibility. It lives
 * in the method notes instead, where somebody asking that question will find
 * it.
 *
 * Kept short deliberately. A caveat nobody finishes reading protects nobody.
 */
function caveatsFor(vehicle: FinnCar): string[] {
  if (vehicle.fuelType === "Electric") {
    return [
      "Zero here means zero from the car. Making the electricity it charges on isn't free of emissions, and FINN's data doesn't say where yours would come from.",
    ];
  }

  if (vehicle.fuelType === "Plug-in Hybrid") {
    return [
      "This figure assumes the car gets charged often. Drive it mostly on petrol and the real emissions are several times higher — so it describes a way of driving as much as it describes the car.",
    ];
  }

  return [];
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

  /*
   * The class is computed from the figure rather than read from FINN's field.
   * Where a car predates the 2024 scale its stored letter can disagree with
   * its own emissions, and the regulation is the better authority on its own
   * classes.
   */
  const co2 = isMeasured(raw)
    ? assessEmissions(raw, vehicle.fuelType ?? null)
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
      ? `FINN doesn't publish a CO₂ figure for this car, so there's no emissions result. What it does publish is consumption: ${efficiency.explanation.toLowerCase()}`
      : "FINN doesn't publish the emissions or consumption figures this priority is judged on, so there's nothing to judge it on.";
  }

  /*
   * The emissions clause always leads, because emissions are what the result
   * is. Efficiency follows as a second, separate observation — joined by
   * "and" where the two agree and "although" where they don't, since a reader
   * meeting "no CO₂ at the tailpipe, although it uses a lot of electricity"
   * needs the turn signposted rather than smuggled in.
   */
  /*
   * A plug-in hybrid stops at the emissions clause. There is no efficiency
   * reading to add — see `assessEfficiency` — and its one blended
   * consumption figure has no cohort to be frugal within.
   */
  if (powertrain === "Plug-in Hybrid") return co2.explanation;

  if (!efficiency) {
    return `${co2.explanation} FINN doesn't publish what it consumes, so how efficiently it uses that ${
      powertrain === "Electric" ? "electricity" : "fuel"
    } isn't something we can say.`;
  }

  /*
   * The two answers only genuinely disagree at the ends: a car that emits
   * little while using a lot, or one that emits a lot while using little.
   * A middling efficiency figure is not a contradiction of anything, and
   * signposting it as one ("no CO₂ at the tailpipe, although it uses an
   * average amount") tells the reader to brace for bad news that isn't there.
   */
  const disagrees =
    ((co2.level === "none" || co2.level === "low") &&
      efficiency.level === "low") ||
    (co2.level === "high" && efficiency.level === "high");

  const cohort =
    powertrain === "Electric"
      ? "an electric car"
      : "a car that burns fuel";

  const clause = `${efficiency.display}, ${efficiencyInWords(efficiency.level)} for ${cohort}`;

  return disagrees
    ? `${co2.explanation} Even so, it uses ${clause}.`
    : `${co2.explanation} It uses ${clause}.`;
}

/** The efficiency level as a clause, rather than as a label. */
function efficiencyInWords(level: EfficiencyLevel): string {
  return {
    high: "relatively low",
    moderate: "around typical",
    low: "relatively high",
  }[level];
}

/**
 * The thing this model can say that a single score can't.
 *
 * Emissions and efficiency answer two different questions — how much CO₂ comes
 * out per kilometre, and how much energy goes in to cover it — and they can
 * point opposite ways. A reader who understands that once understands every
 * environmental result they will ever see here, so it is worth a sentence of
 * its own rather than being left implicit in two numbers sitting side by side.
 *
 * Returns null when there is nothing interesting to say: with only one of the
 * two figures, or where both point the same way, the observation would be
 * filler.
 */
export function describeEmissionsVersusEfficiency(
  assessment: EnvironmentalAssessment,
): { heading: string; body: string } | null {
  const { co2, efficiency, powertrain } = assessment;

  if (!co2 || !efficiency) return null;

  const energy = powertrain === "Electric" ? "electricity" : "fuel";

  if (co2.level === "none" && efficiency.level === "low") {
    return {
      heading: "Low emissions doesn't always mean low energy use",
      body: `It emits no CO₂ while driving, which is why the result is strong. How much electricity it needs is a separate question, and at ${efficiency.display} it uses more than most electric cars — which shows up in running costs rather than in emissions.`,
    };
  }

  if (co2.level === "none") {
    return {
      heading: "Two separate questions",
      body: `Emissions ask how much CO₂ comes out per kilometre — none, here, at the tailpipe. Efficiency asks how much ${energy} goes in to cover that kilometre, and at ${efficiency.display} this one is ${efficiencyInWords(efficiency.level)} for an electric car.`,
    };
  }

  if (co2.level === "high" && efficiency.level === "high") {
    return {
      heading: "Efficient for what it is, still a high emitter",
      body: `It uses less ${energy} than most cars that burn it, which is a real advantage in running costs. It still puts ${co2.gPerKm} g of CO₂ into the air per kilometre — being frugal with fuel lowers that figure but doesn't remove it.`,
    };
  }

  if (efficiency.level === "high") {
    return {
      heading: "Efficient for what it is",
      body: `Among cars that burn fuel this is a frugal one. That is a different claim from low emissions: at ${co2.gPerKm} g/km it still emits more per kilometre than any electric car, which emits none at the tailpipe.`,
    };
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* Where each number comes from                                               */
/* -------------------------------------------------------------------------- */

/**
 * One label, and the answer to "says who?".
 *
 * Every figure in this priority is measured against something, and the
 * something is a different kind of thing each time: the A-to-G class is set in
 * law, the emissions comparison is an observed average with no legal force,
 * and the consumption benchmark is derived here because nobody publishes one.
 * A reader can't tell those apart from the labels alone, and reading "above
 * average" as "over a limit" is the obvious way to get it wrong.
 *
 * So each label carries its own provenance and the UI hangs it behind a click,
 * rather than the surfaces inventing wording for it or leaving it out.
 */
export interface EnvironmentalTag {
  id: string;
  /** The chip's text. */
  label: string;
  /** Whether this reads as the strong answer, the weak one, or neither. */
  tone: "positive" | "neutral" | "caution";
  /** The heading of the explanation, which answers "says who?". */
  title: string;
  body: string;
}

/** What the powertrain tells you about how to read the other two figures. */
function powertrainTag(powertrain: FuelType): EnvironmentalTag | null {
  const shared = { id: "powertrain", tone: "neutral" as const };

  if (powertrain === "Electric") {
    return {
      ...shared,
      label: "Electric",
      title: "Electric — nothing burns, so nothing comes out",
      body: "It has no tailpipe emissions to measure, which is why its CO₂ figure is zero and why the only thing separating one electric car from another here is how much electricity it uses.",
    };
  }

  if (powertrain === "Plug-in Hybrid") {
    return {
      ...shared,
      label: "Plug-in hybrid",
      title: "Plug-in hybrid — the figures assume a mix",
      body: "It runs on both petrol and electricity, and its official CO₂ is a blend of the two over a share of electric driving the EU test sets rather than you do. That's why it's the one powertrain here whose number depends on a habit.",
    };
  }

  const carbon = CARBON_PER_LITRE[powertrain];

  if (!carbon) return null;

  return {
    ...shared,
    label: powertrain,
    title: `${powertrain} — its CO₂ and its consumption are the same fact`,
    body: `Everything it emits comes from burning fuel, and a litre of ${powertrain.toLowerCase()} always releases about the same ${formatNumber(carbon / 1000, 2)} kg of CO₂. So its emissions figure is its consumption multiplied by a constant — which is why this priority scores one of them and not both.`,
  };
}

/** The A-to-G letter, and the fact that it is the one thing here set in law. */
function classTag(assessment: EmissionsAssessment): EnvironmentalTag {
  return {
    id: "class",
    label: `Class ${assessment.className}`,
    tone: "neutral",
    title: "Set in law, not by us",
    body: "German law (Pkw-EnVKV) puts every new car in a band from A to G on its CO₂ alone — A is 0 g/km, B up to 95, C up to 115, D up to 135, E up to 155, F up to 175, and G above that. Since the 2024 amendment the car's weight no longer comes into it. It's the same letter FINN prints on the car's own page.",
  };
}

/**
 * The emissions reading, and what "average" is actually being claimed.
 *
 * The distinction this exists to draw: 136 g/km is an observation, not a rule.
 * The EU does set CO₂ targets, but they bind a manufacturer's whole range over
 * a year rather than any single car, so no car here is over or under a limit.
 */
function emissionsTag(
  assessment: EmissionsAssessment,
  powertrain: FuelType | null,
): EnvironmentalTag {
  /*
   * A plug-in hybrid isn't being compared with the fleet average at all — its
   * own figure is the thing in question, so pointing at what other cars emit
   * would answer a question nobody asked.
   */
  if (powertrain === "Plug-in Hybrid") {
    return {
      id: "emissions",
      label: assessment.label,
      tone: "neutral",
      title: "Low on the test, not necessarily on the road",
      body: `${formatNumber(assessment.gPerKm)} g/km is a genuine measurement, but the EU test reaches it by assuming the car spends a set share of its kilometres running on the battery. Studies of plug-in hybrids actually on the road find emissions several times higher where owners charge less often than that. FINN's data can't say how often you would, so the figure is left alone and this priority simply won't rank it at the top.`,
    };
  }

  if (assessment.level === "none") {
    return {
      id: "emissions",
      label: assessment.label,
      tone: "positive",
      title: "Nothing to compare it against",
      body: "Cars that burn fuel are read against what other new ones emit. This one emits nothing while driving, so there is no comparison to make — it sits at the top of the scale by measurement rather than by ranking.",
    };
  }

  return {
    id: "emissions",
    label: assessment.label,
    tone:
      assessment.level === "high"
        ? "caution"
        : assessment.level === "low"
          ? "positive"
          : "neutral",
    title: "Compared with what new cars actually emit",
    body: `New cars sold in Europe that burn fuel average about ${COMBUSTION_FLEET_CO2} g of CO₂ per kilometre — measured by the ICCT from registration data, not set by anyone as a target. This car's ${formatNumber(assessment.gPerKm)} g/km is read against that. The EU does set CO₂ limits, but they apply to a manufacturer's whole range over a year, so no individual car is over or under one.`,
  };
}

/**
 * The efficiency reading, and the admission that its benchmark is derived.
 *
 * There is no published figure for how much a car ought to use — no regulator
 * sets one and no test reports one — so this is worked back from the emissions
 * average through the carbon in a litre. Saying so is the difference between a
 * benchmark and a number we appear to have made up.
 */
function efficiencyTag(
  assessment: EfficiencyAssessment,
  powertrain: FuelType | null,
): EnvironmentalTag {
  const body =
    powertrain === "Electric"
      ? `Nobody publishes how much electricity a car ought to use. The ${ELECTRIC_FLEET_KWH} kWh/100km this is measured against is what new electric cars average, from ICCT's real-world consumption work.`
      : `Nobody publishes how much fuel a car ought to use, so this benchmark is worked back from the ${COMBUSTION_FLEET_CO2} g/km emissions average through the carbon in a litre — which puts a typical ${(powertrain ?? "petrol").toLowerCase()} car at ${assessment.typical.replace(" is typical", "")}. A litre of diesel carries more carbon than a litre of petrol, which is why the two figures differ.`;

  return {
    id: "efficiency",
    label: assessment.label,
    tone: assessment.level === "high" ? "positive" : "neutral",
    title: "No official figure exists for this",
    body,
  };
}

/**
 * Everything the reader can tap to ask "says who?", in reading order.
 *
 * Powertrain first because it tells you how to read the rest, then the class,
 * then the emissions result, then efficiency.
 */
export function environmentalTags(
  assessment: EnvironmentalAssessment,
): EnvironmentalTag[] {
  const tags: EnvironmentalTag[] = [];

  const powertrain = assessment.powertrain
    ? powertrainTag(assessment.powertrain)
    : null;

  if (powertrain) tags.push(powertrain);

  if (assessment.co2) {
    tags.push(
      classTag(assessment.co2),
      emissionsTag(assessment.co2, assessment.powertrain),
    );
  }

  if (assessment.efficiency) {
    tags.push(efficiencyTag(assessment.efficiency, assessment.powertrain));
  }

  return tags;
}

/* -------------------------------------------------------------------------- */
/* The method, for a reader who wants it                                      */
/* -------------------------------------------------------------------------- */

export interface EnvironmentalMethodNote {
  heading: string;
  body: string;
}

/**
 * What this priority looks at, for a reader deciding whether to rank it.
 *
 * Ordered so the first note answers "what will this actually judge my cars
 * on?" and the rest answer the questions that follow from it. The limits come
 * last — they matter, but they are no use to someone who doesn't yet know
 * what the thing measures.
 */
export const ENVIRONMENTAL_METHOD: EnvironmentalMethodNote[] = [
  {
    heading: "The result is based on CO₂ per kilometre",
    body: "How much carbon dioxide a car puts out over a kilometre, measured under the EU's official test and placed on the EU's own A-to-G scale. An electric car emits none while driving and sits at the top; the more a car emits, the further down it goes. Nothing else moves the result.",
  },
  {
    heading: "How much it uses is reported separately",
    body: "Fuel and electricity use are shown next to the result but don't change it. They answer a different question — whether this is a frugal example of its kind — and a car can be efficient for what it is while still emitting a lot, or emit nothing while using a lot of electricity.",
  },
  {
    heading: "What a car runs on isn't scored on its own",
    body: "For anything that burns fuel, the CO₂ figure is simply how much it uses multiplied by the carbon in a litre. Counting the fuel type as well would mark the same car down twice for the same fact, so the emissions figure is left to speak for it.",
  },
  {
    heading: "The A-to-G letter is shown for recognition",
    body: "It's the label you'll see on FINN's own page. Since 2024 it's worked out from the CO₂ figure alone — vehicle weight no longer comes into it — so it tells you nothing the figure doesn't. It's here so the number is recognisable, not as a second opinion.",
  },
  {
    heading: "Plug-in hybrids can't reach the top",
    body: "Their official CO₂ assumes the car is plugged in regularly, and studies of cars on the road find real emissions several times higher when it isn't. Nobody can tell from FINN's data how often you'd charge, so no corrected figure is invented — but a plug-in hybrid won't be called a strong environmental match on a number that depends on a habit we can't check.",
  },
  {
    heading: "This isn't the car's full footprint",
    body: "It covers what comes out of the car while you drive. Building it, making its battery, generating the electricity it charges on and scrapping it at the end all carry emissions too, and none of that is in FINN's data or estimated here.",
  },
];
