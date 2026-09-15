import { describe, expect, it } from "vitest";

import {
  METHOD_GROUPS,
  readEnvironment,
  type EnvironmentReading,
} from "./environment-copy";
import {
  assessEnvironment,
  co2ClassFor,
  ENVIRONMENTAL_METHOD,
  TEST_DISCLAIMER,
} from "./reasoning-engine/environmental";
import { buildFitAnalysis, classifyFit } from "./reasoning-engine/fit";
import { makeCar, prefs } from "./reasoning-engine/test-fixtures";
import { readUsage } from "./usage-copy";

/**
 * The environmental result, the way a friend would explain it.
 *
 * What these pin is the presentation rather than the model: the verdict in
 * plain words before any of the working, the reasoning after the table rather
 * than in front of it, the class as a pill with its meaning behind an "i", a
 * table of this car against the reference with plain words instead of
 * percentages and a bar for the relationship between the two figures, copy
 * that follows the car's powertrain, and nothing claimed that the score
 * doesn't support. The model has its own tests.
 */

type Fuel = "Petrol" | "Diesel" | "Electric" | "Plug-in Hybrid";

const car = (fuelType: Fuel, co2: number | null, consumption: number | null) =>
  makeCar({ id: 1, fuelType, co2, consumption } as never);

const petrol = (co2: number | null, consumption: number | null) => car("Petrol", co2, consumption);
const diesel = (co2: number, consumption: number) => car("Diesel", co2, consumption);
const electric = (consumption: number | null) => car("Electric", 0, consumption);
const phev = (co2: number, consumption: number) => car("Plug-in Hybrid", co2, consumption);

/** The reading a reader actually gets: the engine's own band for this priority. */
function readingFor(vehicle: ReturnType<typeof car>): EnvironmentReading {
  const priority = buildFitAnalysis(vehicle, ["environmental"], prefs()).priorities[0];

  if (!priority?.impact) throw new Error("expected an environmental reading");

  return readEnvironment(priority.impact, priority.band);
}

const rowOf = (reading: EnvironmentReading, id: "co2") => {
  const found = reading.rows.find((row) => row.id === id);

  if (!found) throw new Error(`expected a ${id} row`);

  return found;
};

/** Everything a reader can see or open. */
const allCopy = (reading: EnvironmentReading) =>
  [
    reading.headline ?? "",
    reading.rating?.label ?? "",
    reading.rating?.info.title ?? "",
    reading.rating?.info.body ?? "",
    reading.verdict.words,
    reading.verdict.plain,
    ...reading.meaning,
    reading.note?.title ?? "",
    reading.note?.body ?? "",
    reading.usage ? `${reading.usage.text} ${reading.usage.section}.` : "",
    ...reading.rows.flatMap((row) => [
      row.label,
      row.note,
      row.comparison ?? "",
      row.relation?.words ?? "",
      ...[row.car, row.reference].flatMap((figure) =>
        figure ? [figure.value, figure.meaning, figure.info?.title ?? "", figure.info?.body ?? ""] : [],
      ),
    ]),
    reading.source,
  ].join(" ");

const everyKind = () => [
  petrol(126, 5.5),
  petrol(185, 8),
  diesel(142, 5.4),
  electric(16.5),
  electric(22.4),
  phev(30, 1.4),
];

/**
 * A car FINN published no CO₂ figure for, as FINN's API sends it: `null`.
 * Read through the real path, so the reading it gets is the one a reader sees.
 */
const missingReading = () => readingFor(petrol(null, 5.5));

/** A car FINN published nothing for that this priority could use. */
const nothingReading = () => readingFor(petrol(null, null));

const everyReading = () => [...everyKind().map(readingFor), missingReading(), nothingReading()];

/* -------------------------------------------------------------------------- */

describe("the answer", () => {
  it("opens on what the figure means, and says the figure in one plain sentence", () => {
    const reading = readingFor(petrol(126, 5.5));

    expect(reading.headline).toBe("126 g/km");
    expect(reading.band.label).toBe("Partial match");

    /*
     * The verdict carries no comparison and no match. Somebody who stops
     * reading here is still right about this car, which is the whole reason
     * the paragraph that used to carry all three was taken apart.
     */
    expect(reading.verdict).toEqual({
      words: "Moderate emissions",
      tone: "warning",
      plain: "This car produces 126 g of CO₂ for every kilometre you drive.",
    });
    expect(reading.verdict.plain).not.toMatch(/%|match|comparison/i);
  });

  it("keeps the comparison and the match out of the verdict and under the table", () => {
    const reading = readingFor(petrol(126, 5.5));

    expect(reading.meaning).toEqual([
      "At 126 g/km it's about 7% below the FINN Lens comparison point for petrol and diesel cars. It's not low enough for more than a partial match for your environmental priority.",
    ]);
  });

  it("says above, below or the same, then what that means for the match", () => {
    const cases: [number, string, string][] = [
      [90, "Strong match", "At 90 g/km it's about 34% below the FINN Lens comparison point for petrol and diesel cars. It's low enough for a strong match"],
      [110, "Good match", "At 110 g/km it's about 19% below the FINN Lens comparison point for petrol and diesel cars. It's low enough for a good match for your environmental priority, but not a strong one."],
      [136, "Partial match", "At 136 g/km it's about the same as the FINN Lens comparison point for petrol and diesel cars. It's not low enough for more than a partial match"],
      [140, "Partial match", "At 140 g/km it's about 3% above the FINN Lens comparison point for petrol and diesel cars. It's not low enough for more than a partial match"],
      [185, "Limited match", "At 185 g/km it's about 36% above the FINN Lens comparison point for petrol and diesel cars. It's too high for more than a limited match"],
    ];

    for (const [grams, label, says] of cases) {
      const reading = readingFor(petrol(grams, 5.5));

      expect(reading.band.label).toBe(label);
      expect(reading.meaning[0]).toContain(says);
    }
  });

  it("names the class in words for every car, so the letter is never the answer", () => {
    const wordsAt = (grams: number) => readingFor(petrol(grams, 5.5)).verdict.words;

    expect([wordsAt(90), wordsAt(110), wordsAt(126), wordsAt(142), wordsAt(165), wordsAt(185)]).toEqual([
      "Low emissions",
      "Fairly low emissions",
      "Moderate emissions",
      "Higher emissions",
      "High emissions",
      "Very high emissions",
    ]);
  });

  it("puts an electric car's answer in a single plain sentence", () => {
    const reading = readingFor(electric(16.5));

    expect(reading.verdict).toEqual({
      words: "No CO₂ while driving",
      tone: "success",
      plain: "This car produces no CO₂ while you drive it.",
    });
    expect(reading.meaning).toEqual([
      "Nothing comes out of it while you drive, which is as low as this priority goes, so it's a strong match for your environmental priority.",
    ]);
  });

  it("keeps a plug-in hybrid's condition in the verdict itself", () => {
    const reading = readingFor(phev(30, 1.4));

    /* The words carry the condition, and the colour comes from the match
       rather than the letter: green "Low emissions" over the note below it
       would be the section arguing with itself. */
    expect(reading.verdict).toEqual({
      words: "Low emissions, if you charge it often",
      tone: "warning",
      plain: "This car produces 30 g of CO₂ for every kilometre you drive in the official EU test, which assumes you plug it in regularly.",
    });
    expect(reading.meaning).toEqual([
      "Its 30 g/km holds only while the battery is kept charged, and FINN Lens can't know how often you'd plug it in. So it's a partial match for your environmental priority, and never a strong one.",
    ]);
  });

  it("says plainly when FINN publishes no CO₂ figure, instead of reading it as zero", () => {
    const priority = buildFitAnalysis(petrol(null, 5.5), ["environmental"], prefs()).priorities[0];

    /* Not scored and not guessed: no match, no class, no emissions words. */
    expect(priority?.band.level).toBe("unknown");

    const reading = missingReading();

    expect(reading.headline).toBeNull();

    /* The card says what follows from the gap; the band chip and the
       priority's own subtitle have already said the gap itself. */
    expect(reading.verdict).toEqual({
      words: "Nothing to judge this on",
      tone: "neutral",
      plain: "FINN doesn't publish this car's CO₂ figure or its CO₂ class.",
    });
    expect(reading.meaning).toEqual([
      "Without a CO₂ figure there's nothing here to judge this car on, so it isn't scored on your environmental priority. FINN Lens won't guess one.",
    ]);
    expect(reading.rating).toEqual({
      label: "Class not published",
      tone: "neutral",
      info: {
        title: "Why is there no class?",
        body: "The A–G class comes straight from a car's CO₂ number. FINN doesn't publish that number for this car, so there's no class to show, and FINN Lens won't guess one.",
      },
    });
    expect(rowOf(reading, "co2")).toMatchObject({
      car: { value: "No data", meaning: "Not published by FINN" },
      comparison: null,
      relation: null,
      tone: "neutral",
    });

    /* Consumption is "How much it uses"'s to show, published or not. */
    expect(reading.rows.map((row) => row.id)).toEqual(["co2"]);
    expect(reading.usage).toBeNull();
    expect(allCopy(reading)).not.toMatch(/produces no CO₂|emissions\b|Class [A-G]\b/);
  });

  it("says so when FINN publishes nothing this priority can use", () => {
    const reading = nothingReading();

    expect(reading.verdict.plain).toBe("FINN doesn't publish this car's CO₂ figure or its CO₂ class.");
    expect(reading.rating?.label).toBe("Class not published");
    expect(rowOf(reading, "co2").car.value).toBe("No data");
    expect(reading.rows).toHaveLength(1);
  });

  it("writes decimals with a dot", () => {
    for (const reading of everyReading()) {
      expect(allCopy(reading)).not.toMatch(/\d,\d/);
    }
  });
});

/* -------------------------------------------------------------------------- */

describe("the class pill", () => {
  it("names the class in its colour, and says what the letter means behind its i", () => {
    expect(readingFor(petrol(126, 5.5)).rating).toEqual({
      label: "Class D",
      tone: "warning",
      info: {
        title: "What does Class D mean?",
        body: "In Germany, every car gets a CO₂ label from A to G. A means the least CO₂ and G means the most. Class D means moderate emissions. It comes straight from the car's CO₂ number, so it's the same information as a letter you'll recognise from car listings.",
      },
    });
  });

  it("gives every letter its own words and colour", () => {
    const expected: [ReturnType<typeof car>, string, string, string][] = [
      [electric(16.5), "A", "very low emissions", "success"],
      [petrol(90, 3.8), "B", "low emissions", "success"],
      [petrol(110, 4.7), "C", "fairly low emissions", "success"],
      [petrol(126, 5.5), "D", "moderate emissions", "warning"],
      [diesel(142, 5.4), "E", "higher emissions", "warning"],
      [petrol(165, 7), "F", "high emissions", "caution"],
      [petrol(185, 8), "G", "very high emissions", "error"],
    ];

    for (const [vehicle, letter, words, tone] of expected) {
      const rating = readingFor(vehicle).rating;

      expect(rating?.label).toBe(`Class ${letter}`);
      expect(rating?.tone).toBe(tone);
      expect(rating?.info.body).toContain(`Class ${letter} means ${words}.`);
    }
  });

  it("keeps a plug-in hybrid's class out of the green, since it depends on charging", () => {
    expect(readingFor(phev(30, 1.4)).rating).toMatchObject({ label: "Class B", tone: "info" });
  });
});

/* -------------------------------------------------------------------------- */

describe("the table", () => {
  it("says what the car's CO₂ means, and explains the reference behind an i", () => {
    expect(rowOf(readingFor(petrol(126, 5.5)), "co2")).toEqual({
      id: "co2",
      icon: "co2",
      label: "CO₂ while driving",
      note: "CO₂ decides the match. Lower is better.",
      car: { value: "126 g/km", meaning: "Out of the exhaust, every kilometre", info: null },
      reference: {
        value: "136 g/km",
        meaning: "Average new petrol or diesel car",
        info: {
          title: "Where does 136 g/km come from?",
          body: "It's roughly what new petrol and diesel cars sold in Europe produce on average, based on figures from the ICCT, an independent research group. It's just there to compare against, not a legal limit or a target.",
        },
      },
      comparison: "Moderate emissions",
      /* 126 of a track running to a quarter past 136, and the words for it. */
      relation: { car: 74, reference: 80, words: "Below the FINN Lens comparison point" },
      tone: "warning",
    });
  });

  it("says what the CO₂ means in the class's own words", () => {
    const co2At = (grams: number) => rowOf(readingFor(petrol(grams, 5.8)), "co2").comparison;

    expect([co2At(90), co2At(95), co2At(96), co2At(115), co2At(116), co2At(135), co2At(136), co2At(155), co2At(156), co2At(175), co2At(176)]).toEqual([
      "Low emissions",
      "Low emissions",
      "Fairly low emissions",
      "Fairly low emissions",
      "Moderate emissions",
      "Moderate emissions",
      "Higher emissions",
      "Higher emissions",
      "High emissions",
      "High emissions",
      "Very high emissions",
    ]);

    /* The percentage belongs to the answer; the table speaks in words. */
    for (const reading of everyReading()) {
      for (const row of reading.rows) {
        expect(`${row.comparison ?? ""} ${row.car.meaning} ${row.reference?.meaning ?? ""}`).not.toMatch(/\d\s?%/);
      }
    }
  });

  it("colours the CO₂ row by its class: green, yellow, orange, then red", () => {
    const toneFor = { A: "success", B: "success", C: "success", D: "warning", E: "warning", F: "caution", G: "error" } as const;

    for (let grams = 5; grams <= 250; grams += 5) {
      const letter = co2ClassFor(grams) as keyof typeof toneFor;
      const reading = readingFor(petrol(grams, 5.5));

      expect(rowOf(reading, "co2").tone).toBe(toneFor[letter]);
      expect(reading.rating?.tone).toBe(toneFor[letter]);
    }
  });

  it("gives a plug-in hybrid no emissions verdict beyond its condition", () => {
    const reading = readingFor(phev(30, 1.4));

    /* And no bar: drawing 30 g/km a long way under the comparison point would
       make the picture say the one thing the note beside it takes back. */
    expect(rowOf(reading, "co2")).toMatchObject({
      car: { value: "30 g/km", meaning: "Only if you charge the battery often", info: null },
      comparison: "If charged often",
      relation: null,
      tone: "warning",
    });
  });

  it("carries CO₂ alone, for every car", () => {
    for (const reading of everyReading()) {
      expect(reading.rows.map((row) => row.id)).toEqual(["co2"]);
    }
  });

  it("ends on one short disclaimer", () => {
    for (const reading of everyReading()) {
      expect(reading.source).toBe(TEST_DISCLAIMER);
    }
  });
});

/* -------------------------------------------------------------------------- */

describe("plug-in hybrids", () => {
  it("get a short note, and nobody else does", () => {
    expect(readingFor(phev(30, 1.4)).note).toEqual({
      title: "About plug-in hybrids",
      body: "They have an engine and a battery you charge from a plug. Their official numbers assume you charge often. If you don't, they burn more fuel and produce a lot more CO₂. FINN Lens can't know how often you'll charge, so it never calls one a strong match.",
    });

    for (const vehicle of [petrol(126, 5.5), diesel(142, 5.4), electric(16.5)]) {
      expect(readingFor(vehicle).note).toBeNull();
    }
  });

  it("get no usage line, since their note already says how fuel use bends the figure", () => {
    expect(readingFor(phev(30, 1.4)).usage).toBeNull();
  });

  it("are never a strong match, as the note says", () => {
    for (let grams = 1; grams <= 200; grams += 3) {
      expect(readingFor(phev(grams, 1.5)).band.level).not.toBe("strong");
    }
  });
});

/* -------------------------------------------------------------------------- */

/**
 * Where how much it uses meets this result.
 *
 * Consumption has its own section, in the same place whether or not the reader
 * ranked the environment. This section only points at it, and only where the
 * two are connected: a petrol or diesel car's CO₂ is the fuel it burns.
 */
describe("the usage line", () => {
  it("tells a petrol or diesel car's reader that fuel use goes with the result, and where it is", () => {
    expect(readingFor(petrol(126, 5.5)).usage).toEqual({
      text: "A petrol car's CO₂ comes from the fuel it burns, so its fuel use goes up and down with this result. See",
      section: "how much fuel it uses",
    });
    expect(readingFor(diesel(142, 5.4)).usage?.text).toContain("A diesel car's CO₂ comes from the fuel it burns");
  });

  it("says nothing where fuel use doesn't move the result", () => {
    for (const vehicle of [electric(16.5), electric(22.4), petrol(null, 5.5), petrol(null, null)]) {
      expect(readingFor(vehicle).usage).toBeNull();
    }

    expect(readEnvironment(null, classifyFit(0, false)).usage).toBeNull();
  });

  it("never judges fuel use itself, which is the other section's job", () => {
    for (const reading of everyReading()) {
      expect(reading.usage?.text ?? "").not.toMatch(/L\/100km|kWh|fuel use\b.*(low|high|moderate)|\bmatch\b/i);
    }
  });

  it("changes nothing in the result, whatever the car uses", () => {
    const frugal = readingFor(petrol(126, 4.0));
    const thirsty = readingFor(petrol(126, 9.0));

    expect({ ...frugal }).toEqual({ ...thirsty });
    expect(readUsage(petrol(126, 4.0))).not.toEqual(readUsage(petrol(126, 9.0)));
  });
});

/* -------------------------------------------------------------------------- */

/**
 * The order the section is read in, which is the thing this pass was about.
 *
 * A reader who knows nothing about cars has to be right about the car after
 * the verdict alone; somebody checking the thinking has to be able to reach
 * all of it. Both of those are properties of *where* copy sits, so they are
 * pinned here rather than left to the two renderers to agree on.
 */
describe("progressive disclosure", () => {
  it("puts the whole answer in the verdict, with no methodology in it", () => {
    for (const reading of everyReading()) {
      const upFront = `${reading.verdict.words} ${reading.verdict.plain}`;

      expect(reading.verdict.words.length).toBeGreaterThan(0);
      expect(reading.verdict.plain.length).toBeGreaterThan(0);

      /* No percentage, no band, no scale, no regulation: those are later. */
      expect(upFront).not.toMatch(/\d\s?%/);
      expect(upFront).not.toMatch(/match|A–G|A-to-G|Class [A-G]|comparison point/i);
    }
  });

  it("keeps the verdict short enough to be read at a glance", () => {
    for (const reading of everyReading()) {
      expect(reading.verdict.words.length).toBeLessThanOrEqual(40);
      expect(reading.verdict.plain.length).toBeLessThanOrEqual(160);
      expect(reading.meaning.length).toBe(1);
    }
  });

  it("keeps every method note, and hands them over in two groups", () => {
    const inGroups = METHOD_GROUPS.flatMap((group) => group.notes);

    /* Nothing simplified away: the fold holds the model's notes, word for word. */
    expect(inGroups).toEqual(ENVIRONMENTAL_METHOD);
    expect(METHOD_GROUPS.map((group) => group.id)).toEqual(["measures", "limits"]);

    for (const group of METHOD_GROUPS) {
      expect(group.notes.length).toBeGreaterThan(0);
      expect(group.title.length).toBeGreaterThan(0);
    }
  });

  /*
   * Both notes name the figure they are about rather than saying "this" and
   * "it": each row is read on its own, and a row that says "it doesn't change
   * the match" leaves the reader to work out both what "it" is and what does.
   */
  it("says which way is better beside the figure that decides it", () => {
    for (const reading of everyReading()) {
      expect(rowOf(reading, "co2").note).toBe("CO₂ decides the match. Lower is better.");
    }
  });
});

/* -------------------------------------------------------------------------- */

/**
 * The bar under a row's two figures.
 *
 * "126 g/km" beside "136 g/km" is a subtraction the reader has to do, and a
 * reader who has never bought a car cannot do it — they don't know which end
 * is good. These pin the answer: a share for each figure on one track, and the
 * relationship in words.
 */
describe("the comparison bar", () => {
  it("puts both figures on one track, with neither at the end of it", () => {
    const relation = rowOf(readingFor(petrol(126, 5.5)), "co2").relation;

    expect(relation).toEqual({
      car: 74,
      reference: 80,
      words: "Below the FINN Lens comparison point",
    });
  });

  it("says below, above or about the same, and never a percentage", () => {
    const wordsAt = (grams: number) => rowOf(readingFor(petrol(grams, 5.5)), "co2").relation?.words;

    expect(wordsAt(90)).toBe("Below the FINN Lens comparison point");
    expect(wordsAt(136)).toBe("About the same as the FINN Lens comparison point");
    expect(wordsAt(185)).toBe("Above the FINN Lens comparison point");

    for (const reading of everyReading()) {
      for (const row of reading.rows) {
        expect(row.relation?.words ?? "").not.toMatch(/\d\s?%/);
      }
    }
  });

  it("keeps a car well over the comparison point inside its own track", () => {
    for (const grams of [5, 60, 126, 136, 200, 400]) {
      const relation = rowOf(readingFor(petrol(grams, 5.5)), "co2").relation;

      expect(relation?.car ?? 0).toBeLessThanOrEqual(80);
      expect(relation?.reference ?? 0).toBeLessThanOrEqual(80);
      expect(relation?.car ?? 0).toBeGreaterThanOrEqual(0);
    }
  });

  it("draws no bar where there is nothing honest to compare", () => {
    /* A plug-in hybrid's figure, and a missing one. */
    expect(rowOf(readingFor(phev(30, 1.4)), "co2").relation).toBeNull();
    expect(rowOf(missingReading(), "co2").relation).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */

describe("the writing", () => {
  it("carries only the verdict, the meaning, the pill, the note, the table and the usage line", () => {
    expect(Object.keys(readingFor(petrol(126, 5.5))).sort()).toEqual(
      ["band", "headline", "meaning", "note", "rating", "rows", "source", "usage", "verdict"],
    );
  });

  it("sounds like a person, not a report", () => {
    for (const reading of everyReading()) {
      expect(allCopy(reading)).not.toMatch(
        /combustion|tailpipe|carbon|cohort|utility factor|fleet|manufacturer|lifecycle|WLTP|PHEV|Pkw|EnVKV|emissions figure|underlying fact|benchmark|equivalent|consumption average|regulation/i,
      );
    }
  });

  it("uses no marketing words and no em dashes", () => {
    for (const reading of everyReading()) {
      const copy = allCopy(reading);

      expect(copy).not.toMatch(
        /\bgreen\b|\bclean(er|est)?\b|eco.?friendly|sustainab|planet|zero.impact|environmentally friendly/i,
      );
      expect(copy).not.toContain("—");
    }
  });

  it("describes the score without touching it", () => {
    const vehicle = petrol(126, 5.5);
    const before = structuredClone(assessEnvironment(vehicle));
    const priority = buildFitAnalysis(vehicle, ["environmental"], prefs()).priorities[0];

    if (!priority?.impact) throw new Error("expected an environmental reading");

    const snapshot = structuredClone(priority.impact);
    const reading = readEnvironment(priority.impact, priority.band);

    expect(priority.impact).toEqual(snapshot);
    expect(priority.impact).toEqual(before);
    expect(reading.band).toBe(priority.band);
  });
});
