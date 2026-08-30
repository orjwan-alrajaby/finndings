import type { FinnCar } from "@/lib/types";

import { formatNumber } from "./format";
import { inSentence } from "./narrative/phrase";

/**
 * What a car costs the environment, judged on its own.
 *
 * Every other priority is scored by comparing cars, because "roomy" and
 * "well equipped" only mean anything relative to something else. Emissions
 * aren't like that. A gram of CO₂ is a gram of CO₂ whether or not another car
 * is parked next to it, and the EU already publishes an absolute grade for
 * exactly this. So this priority is scored against fixed reference points
 * rather than against the rest of the reader's list, which is both more
 * honest and the reason it now works for a single car on finn.com.
 *
 * It replaces a relative score that was wrong in three ways at once:
 *
 * - it needed two cars carrying a CO₂ figure, so a car looked at on its own
 *   was always reported as "not enough data";
 * - it filtered out figures of zero as missing, so an electric car — the one
 *   case where the number is unambiguous — was treated as having no data;
 * - and an electric car ranked among petrol ones fell outside the range being
 *   normalised, producing scores in the hundreds.
 *
 * Four signals, because no one of them is enough. The tailpipe figure says
 * nothing about a plug-in hybrid nobody plugs in; the class is a coarse
 * bucket; consumption alone can't compare a litre with a kilowatt-hour; and
 * the fuel type is the only one that says what the car burns at all.
 */

/* -------------------------------------------------------------------------- */
/* Reference points                                                           */
/* -------------------------------------------------------------------------- */

/**
 * The tailpipe figure at which this stops distinguishing between cars.
 *
 * Chosen as a scale, not a threshold: at 250 g/km a car is at the dirty end of
 * anything FINN rents, and everything at or above it scores zero rather than
 * going negative. The EU's fleet-average target of about 95 g/km lands at 62
 * on this scale, and a zero-tailpipe car at 100.
 */
const CO2_CEILING_G_PER_KM = 250;

/**
 * The same idea for energy, on the two scales cars are actually measured on.
 *
 * A litre of fuel and a kilowatt-hour are not comparable quantities, so they
 * cannot share a ceiling. Each is set where the figure stops being a
 * meaningful distinction: 12 L/100 km is a thirsty combustion car, and
 * 30 kWh/100 km is a heavy, inefficient electric one.
 */
const FUEL_CEILING_L_PER_100KM = 12;
const ELECTRIC_CEILING_KWH_PER_100KM = 30;

/**
 * The EU's CO₂ class, as a score.
 *
 * Seven official buckets, scored at even steps, so the grade the reader can
 * see on FINN's own page is the grade this uses. Older labels that carried
 * pluses (A+, A++, A+++) predate the current scale and are read as A.
 */
const CO2_CLASS_LETTERS = ["A", "B", "C", "D", "E", "F", "G"];

const CO2_CLASS_SCORE: Record<string, number> = {
  A: 100,
  B: 83,
  C: 67,
  D: 50,
  E: 33,
  F: 17,
  G: 0,
};

/**
 * What the car runs on, as a score.
 *
 * The coarsest of the four signals, and here because the other three can't say
 * what it is: a plug-in hybrid's official CO₂ figure assumes it is charged,
 * and an electric car's zero is a tailpipe figure rather than a claim about
 * the grid it charges from.
 *
 * Diesel and petrol score the same on purpose. Where one of them genuinely
 * emits less per kilometre than the other, that difference is already the CO₂
 * figure above, and scoring it twice would be counting the same fact twice.
 */
const POWERTRAIN_SCORE: Record<string, number> = {
  Electric: 100,
  "Plug-in Hybrid": 55,
  Diesel: 20,
  Petrol: 20,
};

/* -------------------------------------------------------------------------- */
/* Shapes                                                                     */
/* -------------------------------------------------------------------------- */

export type EnvironmentalSignal =
  | "emissions"
  | "co2Class"
  | "energy"
  | "powertrain";

/** One of the four signals, with the figure behind it and how it was read. */
export interface EnvironmentalComponent {
  id: EnvironmentalSignal;
  label: string;
  /** The car's own figure, as it should be shown. */
  display: string;
  /** 0–100. */
  score: number;
  /** How that figure became that score, in one line. */
  basis: string;
  /**
   * The same thing as arithmetic, with this car's own numbers in it.
   *
   * A reader who is told a scale still has to trust that it was applied. A
   * reader shown "100 × (1 − 0 ÷ 250) = 100" can check it.
   */
  working: string;
}

export interface EnvironmentalImpact {
  /** The mean of whatever could be worked out. 0–100. */
  score: number;
  /** How the components became that mean, as arithmetic. */
  working: string;
  components: EnvironmentalComponent[];
  /** Signals FINN supplied nothing for, named in plain English. */
  missing: string[];
  /** Something true about this car that the score alone would misrepresent. */
  caveat: string | null;
}

/* -------------------------------------------------------------------------- */
/* Calculation                                                                */
/* -------------------------------------------------------------------------- */

const clamp = (value: number): number =>
  Math.max(0, Math.min(100, Math.round(value)));

/** Distance below a ceiling, as a percentage of it. */
const againstCeiling = (value: number, ceiling: number): number =>
  clamp(100 * (1 - value / ceiling));

/** The ceiling rule as the reader would work it out on paper. */
const ceilingWorking = (value: number, ceiling: number): string =>
  `100 × (1 − ${formatNumber(value)} ÷ ${ceiling}) = ${againstCeiling(
    value,
    ceiling,
  )}`;

const isMeasured = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

/**
 * Reads a CO₂ class label into its letter.
 *
 * FINN supplies these as they appear on the label — "A", sometimes with
 * whitespace or a legacy plus — so the letter is taken rather than the string
 * matched.
 */
function co2ClassLetter(raw: string | null | undefined): string | null {
  const letter = String(raw ?? "").trim().toUpperCase().charAt(0);

  return letter in CO2_CLASS_SCORE ? letter : null;
}

export function environmentalImpact(
  vehicle: FinnCar,
): EnvironmentalImpact | null {
  const components: EnvironmentalComponent[] = [];
  const missing: string[] = [];

  const isElectric = vehicle.fuelType === "Electric";

  /* 1. Tailpipe CO₂. Zero is a figure, not a gap — that is the whole point. */
  const co2 = Number(vehicle.co2?.value);

  if (isMeasured(co2)) {
    components.push({
      id: "emissions",
      label: "CO₂ emissions",
      display: `${formatNumber(co2)} g/km`,
      score: againstCeiling(co2, CO2_CEILING_G_PER_KM),
      basis: `Scored against a ${CO2_CEILING_G_PER_KM} g/km ceiling, so a car emitting nothing at the tailpipe scores full marks.`,
      working: ceilingWorking(co2, CO2_CEILING_G_PER_KM),
    });
  } else {
    missing.push("its CO₂ figure");
  }

  /* 2. The official class. */
  const letter = co2ClassLetter(vehicle.co2?.class);

  if (letter) {
    components.push({
      id: "co2Class",
      label: "CO₂ class",
      display: letter,
      score: CO2_CLASS_SCORE[letter] as number,
      basis: "The EU efficiency class FINN publishes for this car, A through G.",
      working: `Class ${letter} is step ${
        CO2_CLASS_LETTERS.indexOf(letter) + 1
      } of ${CO2_CLASS_LETTERS.length}, counting down evenly from A = 100 to G = 0`,
    });
  } else {
    missing.push("its CO₂ class");
  }

  /* 3. What it uses, on the scale its powertrain is measured on. */
  const consumption = Number(vehicle.consumption?.combined);

  if (isMeasured(consumption) && consumption > 0) {
    const ceiling = isElectric
      ? ELECTRIC_CEILING_KWH_PER_100KM
      : FUEL_CEILING_L_PER_100KM;

    const unit = isElectric ? "kWh/100km" : "L/100km";

    components.push({
      id: "energy",
      label: "Energy use",
      display: `${formatNumber(consumption)} ${unit}`,
      score: againstCeiling(consumption, ceiling),
      basis: `Scored against a ${ceiling} ${unit} ceiling — the scale for ${
        isElectric ? "an electric car" : "a combustion car"
      }, since litres and kilowatt-hours aren't the same quantity.`,
      working: ceilingWorking(consumption, ceiling),
    });
  } else {
    missing.push("what it consumes");
  }

  /* 4. What it runs on. */
  const powertrain = POWERTRAIN_SCORE[vehicle.fuelType];

  if (powertrain != null) {
    components.push({
      id: "powertrain",
      label: "Fuel type",
      display: vehicle.fuelType,
      score: powertrain,
      basis:
        "What the car burns, which the figures above can't say on their own.",
      working: `${vehicle.fuelType} is fixed at ${powertrain}`,
    });
  } else {
    missing.push("what it runs on");
  }

  if (!components.length) return null;

  const score = Math.round(
    components.reduce((total, item) => total + item.score, 0) /
      components.length,
  );

  return {
    score,
    working: `(${components
      .map((item) => item.score)
      .join(" + ")}) ÷ ${components.length} = ${score}`,
    components,
    missing,
    caveat: caveatFor(vehicle),
  };
}

/**
 * The thing the score can't say for itself.
 *
 * Both of these are about the difference between a measurement and its
 * meaning, and both would be dishonest to leave out: an official plug-in
 * hybrid figure assumes a charged battery, and a tailpipe figure of zero is
 * about the tailpipe and not about the electricity.
 */
function caveatFor(vehicle: FinnCar): string | null {
  if (vehicle.fuelType === "Plug-in Hybrid") {
    return "A plug-in hybrid's official CO₂ figure assumes you charge it. Driven on petrol it emits far more than the number above.";
  }

  if (vehicle.fuelType === "Electric") {
    return "Zero here means zero at the tailpipe. What the car is responsible for depends on how the electricity you charge it with was generated.";
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* Explanation                                                                */
/* -------------------------------------------------------------------------- */

/**
 * How this priority is judged, said to the reader.
 *
 * Environmental impact is the one priority scored on figures rather than on
 * equipment, so the reader has no list of features to look at and check the
 * result against. That makes saying how it was worked out part of the answer
 * rather than a footnote.
 */
export function describeEnvironmentalMethod(
  impact: EnvironmentalImpact,
): string[] {
  /* `inSentence` leaves acronyms alone, so CO₂ stays CO₂ mid-sentence. */
  const named = impact.components.map((item) => inSentence(item.label));

  const lines = [
    `This priority isn't scored on equipment — it's scored on what the car emits and uses. Four figures count equally: ${named.join(
      ", ",
    )}.`,
  ];

  if (impact.missing.length) {
    lines.push(
      `FINN didn't supply ${impact.missing.join(
        " or ",
      )} for this car, so the score is the average of what's left rather than of all four.`,
    );
  }

  if (impact.caveat) lines.push(impact.caveat);

  return lines;
}

/**
 * Each signal as a clause, so the figures can be read as a sentence rather
 * than as a table.
 *
 * The fuel type gets its own wording because "runs on electric" is not
 * English and "runs on plug-in hybrid" is not either.
 */
export function environmentalPhrases(impact: EnvironmentalImpact): string[] {
  return impact.components.map((component) => {
    switch (component.id) {
      case "emissions":
        return `emits ${component.display}`;
      case "co2Class":
        return `sits in CO\u2082 class ${component.display}`;
      case "energy":
        return `uses ${component.display}`;
      case "powertrain":
        return component.display === "Plug-in Hybrid"
          ? "is a plug-in hybrid"
          : `runs on ${
              component.display === "Electric"
                ? "electricity"
                : component.display.toLowerCase()
            }`;
    }
  });
}

/* -------------------------------------------------------------------------- */
/* The method, without a car                                                  */
/* -------------------------------------------------------------------------- */

/** One signal, described where there is no particular car to describe. */
export interface EnvironmentalMethodStep {
  id: EnvironmentalSignal;
  label: string;
  /** What it reads off the car. */
  reads: string;
  /** How that figure becomes a mark out of a hundred. */
  scale: string;
  /** The rule itself, so the reader can apply it to a car of their own. */
  formula: string;
}

/**
 * How this priority works, for the places that explain it before there is a
 * car to explain — the settings page and the compare flow's step 3.
 *
 * Built from the same constants the scoring uses, so the explanation cannot
 * drift from the arithmetic: change a ceiling and this changes with it.
 */
export const ENVIRONMENTAL_METHOD: EnvironmentalMethodStep[] = [
  {
    id: "emissions",
    label: "CO\u2082 emissions",
    reads: "The tailpipe figure FINN publishes, in grams per kilometre.",
    scale: `Scored against a ${CO2_CEILING_G_PER_KM} g/km ceiling: a car emitting nothing at the tailpipe scores full marks, one at ${CO2_CEILING_G_PER_KM} or above scores none.`,
    formula: `100 × (1 − g/km ÷ ${CO2_CEILING_G_PER_KM})`,
  },
  {
    id: "co2Class",
    label: "CO\u2082 class",
    reads: "The EU efficiency label, A through G.",
    scale: "A scores full marks and G none, in even steps — the same grade you can see on FINN's own page.",
    formula: "A = 100, B = 83, C = 67, D = 50, E = 33, F = 17, G = 0",
  },
  {
    id: "energy",
    label: "Energy use",
    reads: "What the car consumes over 100 km.",
    scale: `Against ${FUEL_CEILING_L_PER_100KM} L/100 km for a combustion car and ${ELECTRIC_CEILING_KWH_PER_100KM} kWh/100 km for an electric one. Litres and kilowatt-hours aren't the same quantity, so they can't share a scale.`,
    formula: `100 × (1 − consumption ÷ ${FUEL_CEILING_L_PER_100KM} or ${ELECTRIC_CEILING_KWH_PER_100KM})`,
  },
  {
    id: "powertrain",
    label: "Fuel type",
    reads: "What the car runs on.",
    scale: "Electric scores highest, then plug-in hybrid. Diesel and petrol score alike: where one emits less per kilometre, that is already the CO\u2082 figure above.",
    formula: `Electric = ${POWERTRAIN_SCORE.Electric}, plug-in hybrid = ${POWERTRAIN_SCORE["Plug-in Hybrid"]}, diesel and petrol = ${POWERTRAIN_SCORE.Petrol}`,
  },
];

/** What the four steps don't say on their own. */
/** The last step: what happens to the four marks. */
export const ENVIRONMENTAL_METHOD_TOTAL =
  "The four marks are added up and divided by four.";

export const ENVIRONMENTAL_METHOD_NOTES: string[] = [
  "The four count equally, and the result is their average. Where FINN hasn't supplied one of them, it's named and left out rather than counted as zero.",
  "Two things no figure can say for itself: a plug-in hybrid's official CO\u2082 figure assumes you charge it, and an electric car's zero is a figure about the tailpipe rather than about the electricity you charge it with. Lens says both where they apply.",
];
