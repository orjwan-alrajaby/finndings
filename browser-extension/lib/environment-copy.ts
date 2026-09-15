import type {
  EfficiencyStep,
  EnvironmentalAssessment,
  EnvironmentalMethodNote,
} from "./reasoning-engine/environmental";
import type { FitBand, FitLevel } from "./reasoning-engine/fit";

import {
  COMBUSTION_FLEET_CO2,
  ENVIRONMENTAL_METHOD,
  TEST_DISCLAIMER,
} from "./reasoning-engine/environmental";
import { formatNumber } from "./reasoning-engine/format";
import type { RowTone } from "./row-tone";

/**
 * The environmental result, the way a friend who knows cars would explain it.
 *
 * Read in the order a reader actually asks for it, which is not the order the
 * model computes it in:
 *
 *   1. **the verdict** — the figure read back in plain words ("Moderate
 *      emissions") and one sentence saying what the number is. Somebody who
 *      knows nothing about cars can stop here and still have the answer.
 *   2. **the table** — this car's CO₂ against the FINN Lens comparison point,
 *      with a bar under it so the relationship between the two figures is
 *      seen rather than worked out.
 *   3. **the meaning** — where the car lands against that comparison point and
 *      why that is the match it got.
 *   4. **the usage line** — for a car whose CO₂ is the fuel it burns, one
 *      sentence saying so and pointing at "How much it uses".
 *   5. **the method** — the notes in `ENVIRONMENTAL_METHOD`, behind one fold,
 *      for a reader who wants to check the thinking rather than the car.
 *
 * That split is the whole point of this file's shape. It used to open with a
 * single paragraph carrying all three of the figure, the comparison and the
 * conclusion, which meant the plainest fact in the section ("this car produces
 * 126 g of CO₂ per km") arrived welded to two clauses about how FINN Lens
 * scores things. Simple on the surface, rigorous underneath: nothing has been
 * dropped, only re-ordered and put at the depth it earns.
 *
 * The A–G class stays a pill beside the CO₂ row, each number worth explaining
 * keeps its "i", and one short disclaimer closes the table.
 *
 * The CO₂ row's words and colours come from the class the car is in, so the
 * pill reads "Moderate emissions" in yellow exactly when the label says D or
 * E.
 *
 * How much a car uses is not in this table. It is its own section, drawn from
 * `usage-copy` in the same place on every surface whether or not the reader
 * ranked the environment, so it never moves depending on their setup. This
 * section only says where the two meet.
 *
 * Nothing here decides anything: the match is the band the engine produced,
 * and the class is the one the model computed from the car's CO₂ figure.
 *
 * Sits beside `usage-copy` for the same reason that file exists: three
 * surfaces draw this (the advice page, the pinned car's card and the in-page
 * panel) and they must not differ on what the reader is told.
 */

/* -------------------------------------------------------------------------- */
/* Shapes                                                                     */
/* -------------------------------------------------------------------------- */

/** An explanation behind an "i". */
export interface EnvironmentInfo {
  title: string;
  body: string;
}

/** A figure, what it means in words, and its "i" where it has one. */
export interface EnvironmentFigure {
  value: string;
  meaning: string;
  info: EnvironmentInfo | null;
}

export interface EnvironmentRow {
  id: "co2" | "energy";
  /** Named rather than drawn: each renderer draws from its own icon set. */
  icon: "co2" | "fuel" | "electricity";
  label: string;
  /** Whether this row decides the match or is only there for context. */
  note: string;
  car: EnvironmentFigure;
  /** Always shown: the reference doesn't depend on what the car published. */
  reference: EnvironmentFigure;
  /** "Moderate emissions", "Low fuel use": in words, never a bare percentage. */
  comparison: string | null;
  /**
   * What the car runs on, as a pill beside the row's name — the way the class
   * sits beside CO₂. Only on "How much it uses", whose benchmark it decides.
   */
  fuel?: string | null;
  /** Where the car's figure sits against the reference, drawn as a bar. */
  relation: RowRelation | null;
  tone: RowTone;
}

/**
 * The two figures as one picture: a bar for the car, a marker for the
 * comparison point, and the relationship between them said in words.
 *
 * Two numbers in two columns are a subtraction the reader has to do. This is
 * the answer to it, and it is the one thing the table could not say before:
 * "126 g/km" beside "136 g/km" told a reader who has never bought a car
 * nothing at all about whether 126 was the good end.
 *
 * Shares are computed here rather than in the two renderers so the React
 * table and the in-page panel's hand-rolled twin cannot drift on the scale.
 * Both are percentages of a track that runs from zero to a quarter past
 * whichever figure is larger, so a bar never fills its track and the marker
 * never sits on the edge.
 */
export interface RowRelation {
  /** 0–100: how much of the track the car's own figure fills. */
  car: number;
  /** 0–100: where the comparison point's marker sits. */
  reference: number;
  /** "Below the FINN Lens comparison point", and the two others. */
  words: string;
}

/**
 * Everything the comparison table draws.
 *
 * Its own shape rather than part of the environmental reading, because "How
 * much it uses" draws the same table from `usage-copy`: one row, its own
 * figure against its own benchmark, in the same colours and the same cards.
 */
export interface ComparisonReading {
  rows: EnvironmentRow[];
  /**
   * The pill beside the first row's name, where that row has a verdict of its
   * own to carry: "Class D", in the class's colour, with what the letter means
   * behind the row's "i". "Class not published" when there is no CO₂ figure to
   * read a class from — said, not skipped, and never filled in from anywhere
   * else. Null on a table whose rows say it all themselves.
   */
  rating: { label: string; tone: RowTone; info: EnvironmentInfo } | null;
  /** The short line under the table: `TEST_DISCLAIMER`. */
  source: string;
}

/**
 * The result in plain English, before any of the working.
 *
 * `words` is the figure said back as a judgement a reader can act on without
 * knowing what a gram of CO₂ per kilometre is; `plain` is the figure itself in
 * a sentence. The tone is the class's, except for a plug-in hybrid, whose
 * letter depends on a habit nobody can check.
 */
export interface EnvironmentVerdict {
  /** "Moderate emissions", "No CO₂ while driving", "No CO₂ figure published". */
  words: string;
  tone: RowTone;
  /** "This car produces 126 g of CO₂ for every kilometre you drive." */
  plain: string;
}

export interface EnvironmentReading extends ComparisonReading {
  /** "126 g/km". Null when FINN published no CO₂ figure. */
  headline: string | null;
  band: FitBand;
  /** The answer, first and in plain words. */
  verdict: EnvironmentVerdict;
  /** Why that is the answer: where the car lands, and what band it earns. */
  meaning: string[];
  /** Shown only when it changes how the result should be read. */
  note: EnvironmentInfo | null;
  /**
   * Where how much it uses meets this result, said last. Only for a petrol or
   * diesel car with a CO₂ figure, whose CO₂ is the fuel it burns; an electric
   * car's electricity use moves nothing here, and a plug-in hybrid's note
   * already says how its fuel use bends the figure.
   */
  usage: UsagePointer | null;
}

/**
 * The usage line, in two parts so a renderer can make its last words a link
 * to "How much it uses": `text`, a space, `section`, then a full stop.
 */
export interface UsagePointer {
  /** Everything before the link, ending "See". */
  text: string;
  /** "how much fuel it uses": the words that go to the section. */
  section: string;
}

/**
 * How the method reads once it is opened: two headings rather than six cards.
 *
 * The notes themselves are the model's, word for word — this only says which
 * of them answer "what is measured" and which answer "where does it stop".
 * One fold, two headings, no fold inside a fold.
 */
export interface MethodGroup {
  id: EnvironmentalMethodNote["group"];
  title: string;
  /**
   * The half's colour, from the one scale this section already uses: blue for
   * what Lens does — the same blue its priority marks and eyebrows wear — and
   * amber for where it stops, the tone the plug-in caveat above the table is
   * already written in. Six grey boxes said nothing by being grey; these two
   * say which half you are in before a word is read.
   */
  tone: RowTone;
  /** The half's own mark: a rule for what is measured, a bar for what isn't. */
  icon: "ruler" | "circle-slash";
  notes: EnvironmentalMethodNote[];
}

const GROUP: Record<
  EnvironmentalMethodNote["group"],
  Omit<MethodGroup, "id" | "notes">
> = {
  measures: {
    title: "What the result is based on",
    tone: "info",
    icon: "ruler",
  },
  limits: {
    title: "What it doesn't cover",
    tone: "warning",
    icon: "circle-slash",
  },
};

export const METHOD_GROUPS: MethodGroup[] = (
  ["measures", "limits"] as const
).map((id) => ({
  id,
  ...GROUP[id],
  notes: ENVIRONMENTAL_METHOD.filter((note) => note.group === id),
}));

/* -------------------------------------------------------------------------- */
/* Reading the model back                                                     */
/* -------------------------------------------------------------------------- */

const PRIORITY = "your environmental priority";
const COMPARISON_POINT = "the FINN Lens comparison point for petrol and diesel cars";

/** The same reference, named short enough to sit under a bar. */
const SHORT_POINT = "the FINN Lens comparison point";

/**
 * What each letter on the German CO₂ label means, and its colour.
 *
 * Green for the low end, yellow for the middle where most petrol and diesel
 * cars sit, orange and then red for the high end. The class itself is the
 * model's, computed from the car's CO₂ figure; this only says it in words.
 */
const CLASS_MEANING: Record<string, { words: string; tone: RowTone }> = {
  A: { words: "Very low emissions", tone: "success" },
  B: { words: "Low emissions", tone: "success" },
  C: { words: "Fairly low emissions", tone: "success" },
  D: { words: "Moderate emissions", tone: "warning" },
  E: { words: "Higher emissions", tone: "warning" },
  F: { words: "High emissions", tone: "caution" },
  G: { words: "Very high emissions", tone: "error" },
};

/**
 * A plug-in hybrid's colour comes from its match rather than its letter: its
 * letter depends on how often it's charged, and a green "Low emissions" beside
 * a note saying real emissions can be several times higher would be the table
 * arguing with itself.
 */
const BAND_TONE: Record<FitLevel, RowTone> = {
  strong: "success",
  good: "success",
  partial: "warning",
  limited: "error",
  unknown: "neutral",
};

/**
 * The colour of a fuel-use step, shared with "How much it uses".
 *
 * The CO₂ class colours, step for step. The model's efficiency band is one
 * class wide, so for petrol and diesel "Low fuel use" sits where class C does,
 * "Moderate" where D and E do, "High" where F does and "Very high" where G
 * does, and a car's two pills agree. An electric car's electricity use gets
 * the same scale against its own reference.
 */
export const USE_TONE: Record<EfficiencyStep, RowTone> = {
  veryLow: "success",
  low: "success",
  moderate: "warning",
  high: "caution",
  veryHigh: "error",
};

const percentFrom = (value: number, reference: number) =>
  Math.round((Math.abs(value - reference) / reference) * 100);

/** "a partial match", from "Partial match". */
const aMatch = (band: FitBand) => `a ${band.label.toLowerCase()}`;

const isElectric = (assessment: EnvironmentalAssessment) =>
  assessment.powertrain === "Electric";

const isPlugIn = (assessment: EnvironmentalAssessment) =>
  assessment.powertrain === "Plug-in Hybrid";

/* -------------------------------------------------------------------------- */
/* The answer                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The result before any of the working: what the number means, then what it is.
 *
 * Deliberately carries no comparison and no match. A reader who stops reading
 * here should still be right about this car, and "126 g/km, which is 7% below
 * a figure you have not been told about yet, which is why it is a partial
 * match" is three answers stacked on top of the one that was asked for.
 */
function verdictFor(
  assessment: EnvironmentalAssessment,
  band: FitBand,
): EnvironmentVerdict {
  const { co2 } = assessment;

  if (!co2) {
    /*
       * Not "No CO₂ figure published": every surface that draws this card has
       * already said that just above it, in the band chip and in the priority's
       * own subtitle. The card's job here is to say what follows from it.
       *
       * Nothing about consumption either, published or not: "How much it
       * uses" says that in its own place.
       */
    return {
      words: "Nothing to judge this on",
      tone: "neutral",
      plain: "FINN doesn't publish this car's CO₂ figure or its CO₂ class.",
    };
  }

  const grams = formatNumber(co2.gPerKm);

  if (co2.gPerKm === 0) {
    return {
      words: "No CO₂ while driving",
      tone: "success",
      plain: "This car produces no CO₂ while you drive it.",
    };
  }

  const meaning = CLASS_MEANING[co2.className];

  /*
   * A plug-in hybrid's words carry the condition the number depends on, and
   * its colour comes from the match rather than the letter: "Low emissions" in
   * green above a note saying real use can be several times that would be the
   * section arguing with itself.
   */
  if (isPlugIn(assessment)) {
    return {
      words: `${meaning?.words ?? "Low emissions"}, if you charge it often`,
      tone: BAND_TONE[band.level],
      plain: `This car produces ${grams} g of CO₂ for every kilometre you drive in the official EU test, which assumes you plug it in regularly.`,
    };
  }

  return {
    words: meaning?.words ?? "On the CO₂ scale",
    tone: meaning?.tone ?? "neutral",
    plain: `This car produces ${grams} g of CO₂ for every kilometre you drive.`,
  };
}

/**
 * Why that is the answer, under the table that shows the two figures.
 *
 * It sits below the comparison rather than above it because every sentence
 * here is *about* the comparison: where the car lands against the FINN Lens
 * point, and which band that earns. Above the table it was a claim; under it,
 * the reader has just seen the two numbers and the bar between them.
 */
function meaningFor(assessment: EnvironmentalAssessment, band: FitBand): string[] {
  const { co2 } = assessment;

  if (!co2) {
    return [
      `Without a CO₂ figure there's nothing here to judge this car on, so it isn't scored on ${PRIORITY}. FINN Lens won't guess one.`,
    ];
  }

  if (co2.gPerKm === 0) {
    return [
      `Nothing comes out of it while you drive, which is as low as this priority goes, so it's ${aMatch(band)} for ${PRIORITY}.`,
    ];
  }

  const grams = formatNumber(co2.gPerKm);

  if (isPlugIn(assessment)) {
    return [
      `Its ${grams} g/km holds only while the battery is kept charged, and FINN Lens can't know how often you'd plug it in. So it's ${aMatch(band)} for ${PRIORITY}, and never a strong one.`,
    ];
  }

  const percent = percentFrom(co2.gPerKm, COMBUSTION_FLEET_CO2);

  const comparison =
    percent === 0
      ? `At ${grams} g/km it's about the same as ${COMPARISON_POINT}.`
      : `At ${grams} g/km it's about ${percent}% ${co2.gPerKm < COMBUSTION_FLEET_CO2 ? "below" : "above"} ${COMPARISON_POINT}.`;

  const conclusion: Record<FitLevel, string> = {
    strong: `It's low enough for a strong match for ${PRIORITY}.`,
    good: `It's low enough for a good match for ${PRIORITY}, but not a strong one.`,
    partial: `It's not low enough for more than a partial match for ${PRIORITY}.`,
    limited: `It's too high for more than a limited match for ${PRIORITY}.`,
    unknown: `FINN Lens can't judge it on ${PRIORITY}.`,
  };

  return [`${comparison} ${conclusion[band.level]}`];
}

/**
 * Where how much it uses meets this result, for the one kind of car it does.
 *
 * Fuel use never moves the score: CO₂ alone does. But for a petrol or diesel
 * car the CO₂ figure is the fuel it burns, so the two go together, and a
 * reader who has just read "Moderate emissions" should know the fuel figure in
 * the other section is the same fact from the pump's side rather than a second
 * verdict to weigh. For an electric car there is nothing to connect, and a
 * plug-in hybrid's note already says how its fuel use bends the figure.
 */
function usageFor(assessment: EnvironmentalAssessment): UsagePointer | null {
  const { co2, powertrain } = assessment;

  if (!co2 || co2.gPerKm === 0) return null;
  if (powertrain !== "Petrol" && powertrain !== "Diesel") return null;

  return {
    text: `A ${powertrain.toLowerCase()} car's CO₂ comes from the fuel it burns, so its fuel use goes up and down with this result. See`,
    section: "how much fuel it uses",
  };
}

/**
 * The car's figure and the comparison point as one picture.
 *
 * The track runs to a quarter past the larger of the two, so neither the bar
 * nor the marker ever reaches the end and a car well over the comparison point
 * still has somewhere to go. An electric car's zero is a bar of no width with
 * the marker four fifths along, which is exactly the fact.
 */
export function relationBetween(value: number, reference: number): RowRelation | null {
  if (!Number.isFinite(value) || !Number.isFinite(reference) || reference <= 0) {
    return null;
  }

  const span = Math.max(value, reference) * 1.25;
  const percent = percentFrom(value, reference);

  const words =
    percent === 0
      ? `About the same as ${SHORT_POINT}`
      : `${value < reference ? "Below" : "Above"} ${SHORT_POINT}`;

  return {
    car: Math.round((value / span) * 100),
    reference: Math.round((reference / span) * 100),
    words,
  };
}

function ratingFor(assessment: EnvironmentalAssessment): EnvironmentReading["rating"] {
  const { co2 } = assessment;

  if (!co2) {
    return {
      label: "Class not published",
      tone: "neutral",
      info: {
        title: "Why is there no class?",
        body: "The A–G class comes straight from a car's CO₂ number. FINN doesn't publish that number for this car, so there's no class to show, and FINN Lens won't guess one.",
      },
    };
  }

  const letter = co2.className;
  const meaning = CLASS_MEANING[letter];

  return {
    label: `Class ${letter}`,
    tone: isPlugIn(assessment) ? "info" : (meaning?.tone ?? "neutral"),
    info: {
      title: `What does Class ${letter} mean?`,
      body: `In Germany, every car gets a CO₂ label from A to G. A means the least CO₂ and G means the most. Class ${letter} means ${(meaning?.words ?? "a place on that scale").toLowerCase()}. It comes straight from the car's CO₂ number, so it's the same information as a letter you'll recognise from car listings.`,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* The table                                                                  */
/* -------------------------------------------------------------------------- */

const CO2_REFERENCE_INFO: EnvironmentInfo = {
  title: `Where does ${COMBUSTION_FLEET_CO2} g/km come from?`,
  body: "It's roughly what new petrol and diesel cars sold in Europe produce on average, based on figures from the ICCT, an independent research group. It's just there to compare against, not a legal limit or a target.",
};

function co2Row(assessment: EnvironmentalAssessment, band: FitBand): EnvironmentRow {
  const { co2 } = assessment;

  const shared = {
    id: "co2" as const,
    icon: "co2" as const,
    label: "CO₂ while driving",
    /*
     * What the row is for and which way is good, beside the number itself. It
     * was a sentence in the paragraph above the table, where a reader
     * scanning the figures never reached it. It names CO₂ rather than saying
     * "this", so it still answers the question when it is read on its own.
     */
    note: "CO₂ decides the match. Lower is better.",
    reference: {
      value: `${COMBUSTION_FLEET_CO2} g/km`,
      meaning: "Average new petrol or diesel car",
      info: CO2_REFERENCE_INFO,
    },
  };

  if (!co2) {
    return {
      ...shared,
      car: { value: "No data", meaning: "Not published by FINN", info: null },
      comparison: null,
      relation: null,
      tone: "neutral",
    };
  }

  const grams = formatNumber(co2.gPerKm);

  /*
   * No bar for a plug-in hybrid. Drawing its 30 g/km a long way under the
   * comparison point would make the picture say the one thing the note beside
   * it spends a paragraph taking back.
   */
  if (isPlugIn(assessment)) {
    return {
      ...shared,
      car: { value: `${grams} g/km`, meaning: "Only if you charge the battery often", info: null },
      comparison: "If charged often",
      relation: null,
      tone: BAND_TONE[band.level],
    };
  }

  const meaning = CLASS_MEANING[co2.className];

  return {
    ...shared,
    car: {
      value: `${grams} g/km`,
      /*
       * What the figure means, not the figure again. This read "126 grams of
       * CO₂ per km" under "126 g/km", which spent a line of the table saying
       * the unit out loud to a reader who had just read it.
       */
      meaning:
        co2.gPerKm === 0
          ? "No CO₂ while driving"
          : "Out of the exhaust, every kilometre",
      info: null,
    },
    comparison: meaning?.words ?? null,
    relation: relationBetween(co2.gPerKm, COMBUSTION_FLEET_CO2),
    tone: meaning?.tone ?? "neutral",
  };
}

/* -------------------------------------------------------------------------- */
/* All of it                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The reading for a car FINN published nothing this priority can use: no CO₂
 * figure and no consumption. The row and the class say "no data" rather than
 * anything being filled in.
 */
const NOTHING_PUBLISHED: EnvironmentalAssessment = {
  score: null,
  co2: null,
  efficiency: null,
  powertrain: null,
  confidence: "unknown",
  caveats: [],
  missing: ["its CO₂ figure", "what it consumes"],
};

export function readEnvironment(
  published: EnvironmentalAssessment | null,
  band: FitBand,
): EnvironmentReading {
  const assessment = published ?? NOTHING_PUBLISHED;
  const { co2 } = assessment;

  return {
    headline: co2 ? `${formatNumber(co2.gPerKm)} g/km` : null,
    rating: ratingFor(assessment),
    band,
    verdict: verdictFor(assessment, band),
    meaning: meaningFor(assessment, band),
    note: isPlugIn(assessment)
      ? {
          title: "About plug-in hybrids",
          body: "They have an engine and a battery you charge from a plug. Their official numbers assume you charge often. If you don't, they burn more fuel and produce a lot more CO₂. FINN Lens can't know how often you'll charge, so it never calls one a strong match.",
        }
      : null,
    usage: usageFor(assessment),
    rows: [co2Row(assessment, band)],
    source: TEST_DISCLAIMER,
  };
}
