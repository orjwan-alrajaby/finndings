import { beforeEach, describe, expect, it } from "vitest";
import { parseHTML } from "linkedom";

import { analysisBody } from "./sections";
import { buildFitAnalysis } from "@/lib/reasoning-engine/fit";
import {
  DEFAULT_PREFERENCES,
  DEFAULT_PRIORITIES,
} from "@/lib/reasoning-engine/constants";
import { makeCar, type CarOverrides } from "@/lib/reasoning-engine/test-fixtures";
import { ENVIRONMENTAL_METHOD } from "@/lib/reasoning-engine/environmental";
import { LENS_PANEL_ICONS } from "./icons";
import type { CategoryId } from "@/lib/reasoning-engine/types";

/**
 * What the panel says about running a car, and who it says it to.
 *
 * Two properties, and both are about the reader rather than the car.
 *
 * **Efficiency is owed to everyone.** It used to be written only inside the
 * environmental-impact priority, so whether a reader was told how much fuel a
 * car drinks depended on whether they had ranked the environment — when the
 * fact is on their bill every month either way.
 *
 * **A judgement has to show its working.** "Low fuel use" is a comparison
 * against a reference, not a property of the car, so the figure, the
 * reference and the distance between them all have to be on the page or the
 * reader is being asked to take our word for it.
 */

function panel(
  overrides: CarOverrides,
  priorities: CategoryId[] = DEFAULT_PRIORITIES,
  preferences = DEFAULT_PREFERENCES,
) {
  const car = makeCar(overrides);
  const analysis = buildFitAnalysis(car, priorities, preferences);
  const host = document.createElement("div");

  host.append(analysisBody(analysis));

  return host;
}

/**
 * One section's text, whitespace flattened so wrapping can't break a match.
 *
 * Matched on the section's own heading rather than anywhere in its text: a
 * looser match reads across section boundaries and reports the deferral test
 * passing when it is failing — or failing when it passes.
 */
function sectionSaying(host: HTMLElement, heading: string): string {
  const found = [...host.querySelectorAll("section")].find(
    (node) => node.querySelector("h3")?.textContent?.trim() === heading,
  );

  return (found?.textContent ?? "").replace(/\s+/g, " ").trim();
}

const usage = (host: HTMLElement) => sectionSaying(host, "How much it uses");

/**
 * The mark a row is drawn with, as its shapes.
 *
 * The panel builds its icons out of copied lucide shapes and puts no name on
 * the element, so "is this the pump or the bolt" is answered by comparing what
 * was drawn with what that name draws.
 */
const drawnMark = (row: Element) =>
  [...(row.querySelector("svg")?.children ?? [])].map(
    (shape) => shape.getAttribute("d") ?? shape.tagName.toLowerCase(),
  );

const shapesOf = (name: string) =>
  (LENS_PANEL_ICONS[name] ?? []).map(([tag, attrs]) => attrs.d ?? tag);
const costs = (host: HTMLElement) => sectionSaying(host, "What it costs you");

const costSection = (host: HTMLElement) =>
  [...host.querySelectorAll("section")].find(
    (node) => node.querySelector("h3")?.textContent?.trim() === "What it costs you",
  );

let document: Document;

beforeEach(() => {
  const { document: doc } = parseHTML(
    "<!doctype html><html><body></body></html>",
  );

  Object.assign(globalThis, {
    document: doc,
    browser: {
      storage: {
        local: { get: async () => ({}), set: async () => {} },
        onChanged: { addListener: () => {}, removeListener: () => {} },
      },
    },
  });

  document = doc as unknown as Document;
});

describe("how much it uses", () => {
  it("grades a frugal car against the average, and says by how much", () => {
    const text = usage(panel({ id: 1, fuelType: "Petrol", consumption: 4 }));

    expect(text).toContain("Very low fuel use");
    /* Both figures, so the verdict can be checked rather than believed. */
    expect(text).toContain("4 L/100km");
    expect(text).toMatch(/5.8 L\/100km/);
    expect(text).toMatch(/\d+% less/);
  });

  it("says what the unit means, and whose reference the other figure is", () => {
    const host = panel({ id: 12, fuelType: "Petrol", consumption: 5.5 });
    const text = usage(host);

    expect(text).toContain("This car consumes 5.5 litres of petrol per 100 km");
    expect(text).not.toContain("to drive 100 km. That's");

    /* A reference, named as FINN Lens's — never "typical for its kind". */
    expect(text).toContain("FINN Lens benchmark");
    expect(text).toContain("FINN Lens's comparison point, not an official average");
    expect(text).not.toMatch(
      /typical for its kind|(average|typical) (new )?(petrol|diesel) car|too close to call/i,
    );

    /* The conclusion says how it compares, and nothing more. */
    expect(text).toContain(
      "It uses about 6% less petrol than the 5.8 L/100km FINN Lens benchmark, so its fuel use is broadly in line with the benchmark.",
    );

    /* And where it came from, one tap away. */
    expect(host.querySelector('button[aria-label="More about fuel use"]')).not.toBeNull();
  });

  /*
   * The figure and the benchmark are one row of the environmental result's own
   * table now, not two readouts, so they share that row's "i" — which sits at
   * its far right, like an accordion's arrow, and opens both explanations
   * under the numbers they are about.
   */
  it("opens what both figures mean under the row, from an i at its far right", () => {
    const host = panel({ id: 13, fuelType: "Petrol", consumption: 5.5 });
    const flat = (node: Element | null | undefined) => (node?.textContent ?? "").replace(/\s+/g, " ").trim();

    const row = host.querySelector('[data-row="energy"]');
    const buttons = [...(row?.querySelectorAll("button") ?? [])];
    const [button] = buttons as HTMLElement[];
    const answer = host.querySelector(`#${button?.getAttribute("aria-controls")}`);

    /* One i for the row, last on its line, with the answers under that line. */
    expect(buttons).toHaveLength(1);
    expect(button?.parentElement?.lastElementChild).toBe(button);
    expect(row?.lastElementChild).toBe(answer);
    expect(answer?.classList.contains("hidden")).toBe(true);
    expect(button?.getAttribute("aria-expanded")).toBe("false");

    button?.click();

    expect(answer?.classList.contains("hidden")).toBe(false);
    expect(button?.getAttribute("aria-expanded")).toBe("true");

    /* What the unit means, then where the benchmark comes from, in the order the figures sit. */
    expect([...(answer?.querySelectorAll("p.font-black") ?? [])].map(flat)).toEqual([
      /* Named, so the two explanations under one row can't be confused. */
      "What does 5.5 L/100km mean?",
      "Where does the FINN Lens benchmark come from?",
    ]);
    expect(flat(answer)).toContain("L/100km tells you how much fuel a car uses to travel 100 kilometres");
    expect(flat(answer)).toContain("The figure comes from the official EU test");
    expect(flat(answer)).toContain("136 g of CO₂ per km");

    button?.click();

    expect(answer?.classList.contains("hidden")).toBe(true);
    expect(button?.getAttribute("aria-expanded")).toBe("false");

    /* Both figures are on the row itself, under the caption that says which is which. */
    expect(flat(row)).toContain("This car");
    expect(flat(row)).toContain("FINN Lens benchmark");

    /* No tooltips for these any more. */
    expect(host.querySelector('[role="tooltip"]')).toBeNull();

    const disclaimer = host.querySelector("[data-disclaimer]");

    expect(disclaimer?.textContent).toBe(
      "Official EU test figures. Real-world use is usually higher.",
    );
    expect(disclaimer?.parentElement?.lastElementChild).toBe(disclaimer);
  });

  it("carries the verdict's colour on the card, and says it there in words", () => {
    const host = panel({ id: 14, fuelType: "Petrol", consumption: 9 });
    const row = host.querySelector('[data-row="energy"]');

    /*
     * The tone is on the card as data as well as in its colours. It used to
     * be asserted through a `border-l-finn-error` class, which pinned the one
     * piece of the old table that had to go: a 4px edge is the visual grammar
     * of a documentation callout, and the colour now lives where the reader
     * is already looking — the mark, the verdict's own words, and the bar.
     */
    expect(row?.getAttribute("data-tone")).toBe("error");

    expect(
      [...(row?.querySelectorAll("span") ?? [])].some(
        (node) =>
          node.textContent === "Very high fuel use" &&
          (node.getAttribute("class") ?? "").includes("text-finn-fit-limited"),
      ),
    ).toBe(true);

    /* The bar under the figures is filled in the same colour. */
    expect(row?.querySelector("div.bg-finn-error")).not.toBeNull();

    /* And the verdict is not said a second time as a chip above the section. */
    expect(
      [...host.querySelectorAll("span")].filter((node) => node.textContent === "Very high fuel use"),
    ).toHaveLength(1);
  });

  it("says so plainly when a car uses more than the reference", () => {
    const text = usage(panel({ id: 2, fuelType: "Petrol", consumption: 9 }));

    expect(text).toContain("Very high fuel use");
    expect(text).toMatch(/\d+% more/);
    /* How it compares, not a scolding. */
    expect(text).toContain("so its fuel use is noticeably higher than the benchmark");
  });

  it("does not dress an ordinary car up as a failure", () => {
    const text = usage(panel({ id: 3, fuelType: "Petrol", consumption: 6 }));

    expect(text).toContain("Moderate fuel use");
    expect(text).toContain("so its fuel use is broadly in line with the benchmark");
    expect(text).not.toMatch(/high fuel use/i);
  });

  it("measures an electric car against the electric reference", () => {
    const text = usage(
      panel({ id: 4, fuelType: "Electric", consumption: 15, co2: 0 }),
    );

    expect(text).toContain("kWh/100km");
    expect(text).toContain("kWh of electricity per 100 km");
    expect(text).toContain("FINN Lens benchmark");
    expect(text).toContain("so its electricity use is broadly in line with the benchmark");
  });

  it("ends on the short disclaimer, with the full version behind the i", () => {
    const host = panel({ id: 5, consumption: 6 });

    expect(usage(host)).toMatch(/Official EU test figures\. Real-world use is usually higher\.$/);

    const button = host.querySelector('button[aria-label="More about fuel use"]') as HTMLElement;

    button.click();

    expect(host.querySelector(`#${button.getAttribute("aria-controls")}`)?.textContent).toMatch(
      /Real-world use is usually higher, especially on motorways/,
    );

    button.click();
  });

  it("refuses to grade a plug-in hybrid, and says why", () => {
    const text = usage(
      panel({ id: 6, fuelType: "Plug-in Hybrid", consumption: 2 }),
    );

    expect(text).toContain("Can't be graded fairly");
    expect(text).toContain("how often you plug it in");
  });

  it("says nothing is published rather than skipping the question", () => {
    const text = usage(panel({ id: 7, consumption: null }));

    expect(text).toContain("Not published");
    expect(text).toContain("won't guess");
  });

  /*
   * Always here, and always straight after the cost, whether or not the reader
   * ranked the environment. It used to stand down when they had, and move into
   * that priority's block instead, so where a car's consumption sat on the
   * panel depended on the reader's setup. The environmental result now carries
   * CO₂ alone and only points here.
   */
  it("stays in the same place when the environmental priority is ranked", () => {
    const headings = (host: HTMLElement) =>
      [...host.querySelectorAll("section > h3")].map((node) => node.textContent?.trim());

    for (const priorities of [DEFAULT_PRIORITIES, ["environmental"] as CategoryId[]]) {
      const host = panel({ id: 11, consumption: 6 }, priorities);
      const order = headings(host);

      expect(usage(host)).toContain("6 L/100km");
      expect(order[order.indexOf("What it costs you") + 1]).toBe("How much it uses");
    }
  });
});

describe("what it costs you", () => {
  it("ties the total to the reader's own driving, and names what is added", () => {
    const text = costs(panel({ id: 8, consumption: 6 }));

    expect(text).toMatch(/At the [\d.,]+ km a month you told us you drive/);
    expect(text).toContain("you'd also pay");
    expect(text).toContain("of fuel");
    expect(text).toContain("all in");
  });

  /*
   * The one number here that is news. The subscription is on the listing the
   * panel is standing on; what the reader cannot see anywhere on FINN is that
   * their own mileage turns it into a bigger number.
   */
  it("leads with the gap between the advertised price and theirs", () => {
    const text = costs(panel({ id: 9, consumption: 6 }));

    expect(text).toContain("more than the advertised price");
    expect(text).toContain("FINN's page says");
  });

  it("does not repeat the running cost it has already itemised", () => {
    const host = panel({ id: 12, consumption: 6 });
    const row = host.querySelector('[data-line="energy"]');
    const button = host.querySelector('button[aria-label^="What is Estimated"]') as HTMLElement;
    const answer = host.querySelector(`#${button.getAttribute("aria-controls")}`);

    /* Said once in the whole section, behind the energy line's own "i". */
    expect(costs(host).match(/per 100 km/g) ?? []).toHaveLength(1);
    expect(answer?.textContent?.match(/per 100 km/g) ?? []).toHaveLength(1);

    /* Never on the row itself, which is the figure and where it came from. */
    expect(row?.firstElementChild?.textContent).not.toContain("per 100 km");
    expect(answer?.classList.contains("hidden")).toBe(true);

    button.click();

    expect(answer?.classList.contains("hidden")).toBe(false);

    button.click();

    expect(answer?.classList.contains("hidden")).toBe(true);
  });

  /*
   * One affordance for one idea. These were tooltips pinned to the label while
   * the section below opened its explanations under the row — two ways of
   * asking the same question, a few hundred pixels apart.
   */
  it("explains each line the way the usage section does, under the row", () => {
    const host = panel({ id: 17, consumption: 6 });

    for (const row of host.querySelectorAll("[data-line]")) {
      const button = row.querySelector("button") as HTMLElement;
      const answer = host.querySelector(`#${button.getAttribute("aria-controls")}`);

      /* The "i" last on the row's line, the answer under it, closed to begin with. */
      expect(button.parentElement?.lastElementChild).toBe(button);
      expect(row.lastElementChild).toBe(answer);
      expect(button.getAttribute("aria-expanded")).toBe("false");
      expect(answer?.classList.contains("hidden")).toBe(true);

      button.click();

      expect(button.getAttribute("aria-expanded")).toBe("true");
      expect(answer?.classList.contains("hidden")).toBe(false);
    }

    /* All three can stay open at once, and none of them is a tooltip. */
    expect(
      [...host.querySelectorAll("[data-line] button")].every(
        (button) => button.getAttribute("aria-expanded") === "true",
      ),
    ).toBe(true);
    expect(costSection(host)?.querySelector('[role="tooltip"]')).toBeNull();
  });

  /*
   * FINN advertises two prices for the same car and the panel shows one of
   * them. Which one is not a detail — the business price is the one without
   * VAT — and it was said only inside the line's explanation, where a reader
   * has to go looking to find out that every figure below rests on a setting
   * they may not remember choosing.
   */
  it("says which of FINN's two prices the subscription line is", () => {
    const priv = panel({ id: 18, consumption: 6 });
    const business = panel({ id: 18, consumption: 6 }, DEFAULT_PRIORITIES, {
      ...DEFAULT_PREFERENCES,
      contractType: "business",
    });

    expect(priv.querySelector("[data-contract]")?.textContent).toBe("Private");
    expect(business.querySelector("[data-contract]")?.textContent).toBe("Business");

    /* On the subscription line and nowhere else: the rest are the same either way. */
    expect(priv.querySelectorAll("[data-contract]")).toHaveLength(1);
    expect(
      priv.querySelector('[data-line="subscription"] [data-contract]'),
    ).not.toBeNull();
  });

  /*
   * The "i" is named for the question, so printing it above the answer as well
   * asks it twice. Rows that open several answers at once keep their titles —
   * there they are the only thing telling one answer from the next.
   */
  it("opens the answer without asking the question again", () => {
    const host = panel({ id: 19, fuelType: "Petrol", consumption: 6 });
    const button = host.querySelector('[data-line="energy"] button') as HTMLElement;
    const answer = host.querySelector(`#${button.getAttribute("aria-controls")}`);

    expect(button.getAttribute("aria-label")).toBe("What is Estimated fuel?");
    expect(answer?.textContent).not.toContain("What is Estimated fuel?");
    expect(answer?.querySelector("p.font-black")).toBeNull();
    expect(answer?.textContent).toContain("using the fuel price you set");
  });

  /*
   * Three figures that look alike and are not: a charge FINN makes, a number
   * Lens worked out, and one the reader set. The mark says which line it is
   * and the circle it sits in says which of the three kinds of number it is,
   * with the words under the label saying the same thing in full.
   */
  it("marks each line of the bill, and says where its number came from", () => {
    const host = panel({ id: 15, fuelType: "Petrol", consumption: 6 });

    const bill = [...host.querySelectorAll("[data-line]")];

    expect(bill).toHaveLength(3);
    expect(bill.map(drawnMark)).toEqual([
      shapesOf("receipt"),
      shapesOf("fuel"),
      shapesOf("route"),
    ]);

    /* The tint of the circle each mark sits in says where its number came from. */
    expect(bill[0]?.querySelector("span")?.getAttribute("class")).toContain("text-finn-accent-blue");
    expect(costs(host)).toContain("FINN charges this");
  });

  it("gives an electric car's energy line the mark its consumption carries", () => {
    const host = panel({ id: 16, fuelType: "Electric", consumption: 15, co2: 0 });

    const energy = host.querySelector('[data-line="energy"]');

    expect(energy && drawnMark(energy)).toEqual(shapesOf("zap"));
  });

  it("still leads with the reader's mileage when a part can't be priced", () => {
    const text = costs(panel({ id: 10, consumption: null }));

    expect(text).toMatch(/At the [\d.,]+ km a month you told us you drive/);
    /* Named as partial rather than quietly presented as the whole answer. */
    expect(text).toContain("the part we can price");
  });
});

/*
 * The compromises, in the table language the rest of the panel now reads in.
 *
 * They were soft grey boxes of three grey lines, which said nothing by being
 * grey — and buried the one thing that decides how loudly a compromise should
 * land, the priority it costs, in the last of the three.
 */
describe("what you'd be accepting", () => {
  const consider = (host: HTMLElement) => sectionSaying(host, "Things to consider");

  it("edges each compromise in how loudly the engine said it, and names what it costs", () => {
    const host = panel({ id: 30, consumption: 6, featuresSupplied: true, features: ["hasIsofix"] });
    const rows = [...host.querySelectorAll("[data-tradeoff]")];

    expect(rows.length).toBeGreaterThan(0);
    expect(consider(host)).not.toBe("");

    /* One table, its rows divided, as the environmental result's are. */
    const tables = new Set(rows.map((row) => row.parentElement));

    expect(tables.size).toBe(1);
    expect([...tables][0]?.getAttribute("class")).toContain("divide-y");

    for (const row of rows) {
      const edge = row.getAttribute("class") ?? "";

      /*
       * Red for a feature they gave extra influence and the car lacks, as that
       * group is edged in the feature table. Otherwise orange high on the
       * reader's order and amber further down.
       */
      const missing = row.getAttribute("data-tradeoff") === "missingSelected";

      if (missing) {
        expect(edge).toContain("border-l-finn-error");
      } else {
        expect(edge).toMatch(/border-l-finn-(influence-orange|warning)\b/);
        expect(edge).not.toContain("border-l-finn-error");
      }

      /* Each carries the priority it costs, and where the reader put it. */
      const pill = row.querySelector("span.rounded-full");

      expect(pill?.textContent).toMatch(/^(#\d+ .+|Your budget)$/);

      /* In the row's own colour: red with its edge, or not red at all. */
      if (missing) expect(pill?.getAttribute("class")).toContain("text-finn-fit-limited");
      else expect(pill?.getAttribute("class")).not.toContain("text-finn-fit-limited");

      /* And its mark, so the list can be scanned before it is read. */
      expect(row.querySelector("svg")).not.toBeNull();
    }
  });
});

/**
 * What the panel leads with, and what it declines to repeat.
 *
 * The panel opens over a FINN listing the reader has just read, so its first
 * screen has to earn its place. Anything on that page — the advertised price,
 * the horsepower — is not news, and the two things only this extension can say
 * are what the car costs at *their* mileage and how thirsty it is for its kind.
 */
describe("what the panel leads with", () => {
  const headings = (host: HTMLElement) =>
    [...host.querySelectorAll("section")].map((node) =>
      node.querySelector("h3")?.textContent?.trim() ?? "",
    );

  const header = (host: HTMLElement) =>
    (host.querySelector("header")?.textContent ?? "")
      .replace(/\s+/g, " ")
      .trim();

  it("puts cost and consumption ahead of the equipment audit", () => {
    const order = headings(panel({ id: 20, consumption: 6 }));

    const cost = order.indexOf("What it costs you");
    const uses = order.indexOf("How much it uses");
    const firstPriority = order.findIndex((name) => name.includes("Your priority"));

    expect(cost).toBeGreaterThanOrEqual(0);
    expect(cost).toBeLessThan(uses);
    expect(uses).toBeLessThan(firstPriority);
  });

  it("keeps FINN's own price in the header", () => {
    const host = panel({ id: 21, customerMonthly: 500 });

    expect(header(host)).toContain("€500");
  });

  it("leaves horsepower out, since nothing here is decided by it", () => {
    const host = panel({ id: 22 });

    expect(header(host)).not.toMatch(/\bPS\b/);
  });

  /*
   * What a car runs on decides which cohort its consumption is judged against,
   * so it belongs beside that judgement rather than mid-way through a line of
   * specs where it reads as one more number.
   */
  it("moves the fuel type out of the header and into the usage section", () => {
    const host = panel({ id: 25, fuelType: "Electric", consumption: 15 });

    expect(header(host)).not.toContain("Electric");
    expect(usage(host)).toContain("Electric");
  });

  /*
   * The chip over the photograph already gives the verdict, and every claim the
   * tally made — the count, the order, which priority led — is made again with
   * its evidence by the sections underneath.
   */
  it("drops the tally that summarised the page at the top of the page", () => {
    const host = panel({ id: 26, featuresSupplied: true, features: ["hasIsofix"] });

    expect(header(host)).not.toMatch(/match on \d+ of the \d+ priorities/);
  });

  it("puts the basis for the verdict under the reasons, not above them", () => {
    const host = panel({ id: 27, featuresSupplied: true, features: ["hasIsofix"] });

    expect(header(host)).not.toContain("Measured against");
    expect(host.textContent).toContain("Measured against");
  });

  /* A caveat is worth reading next to the thing it is a caveat about. */
  it("keeps the estimate disclaimer with the estimates", () => {
    const host = panel({ id: 28, consumption: 6 });

    expect(costs(host)).toContain("Every figure in this bill is an estimate");
  });

  /*
   * The engine writes these figures into a sentence — "It has 5 seats and
   * 400 L of boot space" — and the readout list underneath was saying them
   * again two lines below, in a section that is already long.
   */
  it("states a measurement once, not twice, in one section", () => {
    const host = panel({
      id: 23,
      seats: "5",
      trunk: 400,
      /* With an equipment list the engine writes the prose, which is the
         copy this readout would be duplicating. */
      featuresSupplied: true,
      features: ["hasIsofix"],
    });

    const practicality = [...host.querySelectorAll("section")].find((node) =>
      node.querySelector("h3")?.textContent?.includes("Practicality"),
    );

    const text = (practicality?.textContent ?? "").replace(/\s+/g, " ");

    expect(text).toContain("a load volume of 400 L as FINN lists it");
    expect(text.match(/400 L/g) ?? []).toHaveLength(1);
  });

  /*
   * The other side of that gate: a car FINN sent no equipment list for gets no
   * prose, so the readouts are the only place the figures appear and must stay.
   */
  it("still shows the figures when there is no sentence carrying them", () => {
    const host = panel({ id: 24, seats: "5", trunk: 400 });

    const practicality = [...host.querySelectorAll("section")].find((node) =>
      node.querySelector("h3")?.textContent?.includes("Practicality"),
    );

    expect((practicality?.textContent ?? "").replace(/\s+/g, " ")).toContain(
      "400 L",
    );
  });
});

/*
 * The environmental result, as the panel actually draws it.
 *
 * The words are pinned in `lib/environment-copy.test.ts`. What is pinned here
 * is what a reader meets on the page, and in what order: the verdict in plain
 * words first, then the table open with no accordion around it, the class pill
 * with its "i", plain words instead of percentages, the short disclaimer, the
 * reasoning under the table, and the whole method behind exactly one fold.
 */
describe("the environmental result", () => {
  const environmental = (overrides: CarOverrides) =>
    panel(overrides, ["environmental"]);

  const flat = (node: Element | null | undefined) =>
    (node?.textContent ?? "").replace(/\s+/g, " ").trim();

  const controlled = (host: HTMLElement, button: Element | null | undefined) =>
    host.querySelector(`#${button?.getAttribute("aria-controls") ?? "missing"}`);

  const petrol126 = (id: number) =>
    environmental({ id, fuelType: "Petrol", co2: 126, consumption: 5.5 });

  /* The environmental priority's own block, found from the card only it draws. */
  const result = (host: HTMLElement) => host.querySelector('[data-row="co2"]')?.closest("section");

  it("carries CO₂ alone, and ends by pointing at how much it uses", () => {
    const host = petrol126(35);
    const block = result(host);
    const line = block?.querySelector("[data-usage]");

    expect([...(block?.querySelectorAll("[data-row]") ?? [])].map((row) => row.getAttribute("data-row"))).toEqual(["co2"]);
    expect(flat(line)).toBe(
      "A petrol car's CO₂ comes from the fuel it burns, so its fuel use goes up and down with this result. See how much fuel it uses.",
    );
    expect(line?.parentElement?.lastElementChild).toBe(line);

    /* Its last words are the link, and they take the drawer up to that section. */
    const link = line?.querySelector("button[data-usage-link]") as HTMLElement | null;
    const target = host.querySelector('[data-section="usage"]') as HTMLElement | null;
    const scrolled: unknown[] = [];

    expect(flat(link)).toBe("how much fuel it uses");
    expect(target?.querySelector("h3")?.textContent).toBe("How much it uses");

    (target as unknown as { scrollIntoView: (options: unknown) => void }).scrollIntoView = (options) =>
      scrolled.push(options);

    link?.click();

    expect(scrolled).toHaveLength(1);
    expect(target?.getAttribute("tabindex")).toBe("-1");

    /* Nothing to point at for an electric car: its electricity use moves nothing here. */
    const electric = environmental({ id: 36, fuelType: "Electric", co2: 0, consumption: 16.5 });

    expect(result(electric)?.querySelector("[data-usage]")).toBeNull();
  });

  it("opens on the verdict, then the table, then why that is the match", () => {
    const host = petrol126(21);
    const text = flat(host);

    const verdict = text.indexOf(
      "Moderate emissionsThis car produces 126 g of CO₂ for every kilometre you drive.",
    );

    const table = text.indexOf("CO₂ while driving");

    const reasoning = text.indexOf(
      "At 126 g/km it's about 7% below the FINN Lens comparison point for petrol and diesel cars. It's not low enough for more than a partial match for your environmental priority.",
    );

    /*
     * The order is the whole point: a reader who stops after the verdict is
     * still right about the car, and the comparison arrives once the two
     * figures it is about are on the screen.
     */
    expect(verdict).toBeGreaterThan(-1);
    expect(verdict).toBeLessThan(table);
    expect(table).toBeLessThan(reasoning);

    const pill = host.querySelector('[data-row="co2"] [data-rating]');

    expect(host.querySelectorAll("[data-rating]")).toHaveLength(1);
    expect(flat(pill)).toBe("Class D");

    /* On the line with the measure's name, and on the card that says what it decides. */
    expect(flat(pill?.parentElement)).toContain("CO₂ while driving");
    expect(flat(pill?.closest("[data-row]"))).toContain("CO₂ decides the match.");
  });

  it("opens what the class means, and where 136 g/km comes from, under the CO₂ row", () => {
    const host = petrol126(22);
    const row = host.querySelector('[data-row="co2"]');
    const button = row?.querySelector('button[aria-label="More about CO₂ while driving"]') as HTMLElement;
    const answer = controlled(host, button);

    /* The pill is only the class now; what it means opens from the row's i. */
    expect(host.querySelector("[data-rating] button")).toBeNull();
    expect(answer?.classList.contains("hidden")).toBe(true);

    button.click();

    expect(answer?.classList.contains("hidden")).toBe(false);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(flat(answer)).toContain("What does Class D mean?");
    expect(flat(answer)).toContain("In Germany, every car gets a CO₂ label from A to G.");
    expect(flat(answer)).toContain("Where does 136 g/km come from?");
    expect(row?.lastElementChild).toBe(answer);

    button.click();

    expect(answer?.classList.contains("hidden")).toBe(true);
  });

  it("shows the table straight away, with no 'at a glance' fold or FAQ list", () => {
    const host = petrol126(23);
    const text = flat(host);

    expect(host.querySelector('[data-row="co2"]')).not.toBeNull();
    expect(result(host)?.querySelector('[data-row="energy"]')).toBeNull();
    expect([...host.querySelectorAll("button")].some((node) => flat(node) === "This car at a glance")).toBe(false);
    expect(host.querySelector("button[data-detail]")).toBeNull();
    expect(text).not.toMatch(/More about this result|Why isn't fuel use scored|What isn't included/);
  });

  /*
   * The method is not on this surface at all.
   *
   * The panel answers "how does this car do?" about a car the reader is
   * looking at; how the priority is worked out is a question about their own
   * setup, and it is answered where the priority is set. It lived here for a
   * while as one closed fold, which was defensible and still cost the panel
   * a control, six notes and a second reading of the regulation on a surface
   * that has one job. `EnvironmentalMethod` in the settings editor holds all
   * of it, word for word.
   */
  it("leaves how the priority is worked out to the settings editor", () => {
    const host = petrol126(33);
    const text = flat(host);

    expect(
      [...host.querySelectorAll("button")].some((node) =>
        flat(node).includes("How Environmental Impact is calculated"),
      ),
    ).toBe(false);

    /* Not the fold, and not its contents loose on the page either. */
    for (const note of ENVIRONMENTAL_METHOD) {
      expect(text).not.toContain(note.heading);
      expect(text).not.toContain(note.body);
    }

    expect(text).not.toContain("What the result is based on");
    expect(text).not.toContain("What it doesn't cover");

    /* What the reader came for is untouched. */
    expect(text).toContain("Moderate emissions");
    expect(host.querySelector('[data-row="co2"]')).not.toBeNull();
  });

  /* Two figures in two columns are a subtraction; the bar is the answer. */
  it("draws a bar under each card's figures, and says the relationship in words", () => {
    const host = petrol126(34);

    /* The CO₂ card here, and the fuel card in "How much it uses". */
    for (const id of ["co2", "energy"]) {
      const row = host.querySelector(`[data-row="${id}"]`);

      expect(flat(row)).toContain("Below the FINN Lens comparison point");
      expect(row?.querySelector('[aria-hidden="true"].relative')).not.toBeNull();
    }
  });

  it("gives each row one i, at its far right, opening everything the row explains", () => {
    const host = petrol126(24);

    /* The CO₂ card here, and the fuel card in "How much it uses". */
    const rows = [
      ["co2", ["What does Class D mean?", "Where does 136 g/km come from?"]],
      ["energy", ["What does 5.5 L/100km mean?", "Where does the FINN Lens benchmark come from?"]],
    ] as const;

    for (const [id, titles] of rows) {
      const row = host.querySelector(`[data-row="${id}"]`);
      const buttons = [...(row?.querySelectorAll("button") ?? [])];

      expect(buttons).toHaveLength(1);
      expect(buttons[0]?.parentElement?.lastElementChild).toBe(buttons[0]);
      expect([...(controlled(host, buttons[0])?.querySelectorAll("p.font-black") ?? [])].map(flat)).toEqual([...titles]);
    }

    /*
     * No column header strip. Each card captions its own two figures instead,
     * at every width — a MEASURE / THIS CAR / FINN LENS BENCHMARK rule over
     * divided rows is what made this read as a spreadsheet.
     */
    expect(flat(host)).not.toContain("MeasureThis car");

    for (const id of ["co2", "energy"]) {
      const card = host.querySelector(`[data-row="${id}"]`);

      expect(flat(card)).toContain("This car");
      expect(flat(card)).toContain("FINN Lens benchmark");
    }
  });

  /* Two rows, two accordions: opening one is not a reason to close the other. */
  it("lets both rows stay open at once, and closes only the one clicked", () => {
    const host = petrol126(30);
    const first = host.querySelector('[data-row="co2"] button') as HTMLElement;
    const second = host.querySelector('[data-row="energy"] button') as HTMLElement;

    first.click();
    second.click();

    expect(first.getAttribute("aria-expanded")).toBe("true");
    expect(second.getAttribute("aria-expanded")).toBe("true");

    first.click();

    expect(first.getAttribute("aria-expanded")).toBe("false");
    expect(second.getAttribute("aria-expanded")).toBe("true");
  });

  it("says what the CO₂ means in the class's words, and never uses a percentage in the table", () => {
    const host = petrol126(25);

    expect(flat(host.querySelector('[data-row="co2"]'))).toContain("Moderate emissions");
    expect(flat(host.querySelector('[data-row="energy"]'))).toContain("Moderate fuel use");

    /*
     * One pill per card: the class beside CO₂, what it runs on beside fuel
     * use. The verdict beside the figure is coloured words now: two tinted
     * lozenges a centimetre apart, saying "Class D" and "Moderate emissions",
     * were the same fact twice.
     */
    for (const row of host.querySelectorAll("[data-row]")) {
      const pills = [...row.querySelectorAll("span.rounded-full")].filter((node) =>
        flat(node),
      );

      expect(pills.map(flat)).toEqual(
        row.getAttribute("data-row") === "co2" ? ["Class D"] : ["Petrol"],
      );
    }

    for (const row of host.querySelectorAll("[data-row]")) {
      expect(flat(row)).not.toMatch(/\d\s?%/);
    }
  });

  it("ends the stack of cards on the short disclaimer", () => {
    const host = petrol126(26);
    const table = host.querySelector('[data-row="co2"]')?.parentElement;
    const disclaimer = table?.querySelector("[data-disclaimer]");

    expect(disclaimer?.textContent).toBe("Official EU test figures. Real-world use is usually higher.");
    expect(table?.lastElementChild).toBe(disclaimer);
  });

  it("leaves a plug-in hybrid's combined figure to how much it uses, which won't grade it", () => {
    const host = environmental({ id: 27, fuelType: "Plug-in Hybrid", co2: 30, consumption: 1.4 });

    expect(host.querySelector('[data-row="energy"]')).toBeNull();
    expect(result(host)?.querySelector("[data-usage]")).toBeNull();
    expect(flat(host.querySelector('[data-row="co2"]'))).toContain("If charged often");
    expect(usage(host)).toContain("Can't be graded fairly");
  });

  it("colours each card by what its comparison means, bar included", () => {
    const host = petrol126(28);

    expect(host.querySelector('[data-row="co2"]')?.getAttribute("data-tone")).toBe("warning");
    expect(host.querySelector('[data-row="energy"]')?.getAttribute("data-tone")).toBe("warning");

    /* The class pill takes the class's colour too. */
    expect(host.querySelector("[data-rating]")?.getAttribute("class")).toContain("text-finn-warning-deep");

    /* And so does the filled part of the bar, which is what the eye lands on. */
    expect(host.querySelector('[data-row="co2"] div.bg-finn-warning')).not.toBeNull();

    const high = environmental({ id: 29, fuelType: "Petrol", co2: 165, consumption: 7 });

    expect(high.querySelector('[data-row="co2"]')?.getAttribute("data-tone")).toBe("caution");
    expect(flat(high.querySelector('[data-row="co2"]'))).toContain("High emissions");
    expect(high.querySelector('[data-row="co2"] div.bg-finn-influence-orange')).not.toBeNull();

    /* For a petrol car the fuel card lands on the same colour, since it's the same measurement. */
    expect(high.querySelector('[data-row="energy"]')?.getAttribute("data-tone")).toBe("caution");
    expect(flat(high.querySelector('[data-row="energy"]'))).toContain("High fuel use");
  });
});

/*
 * A car FINN published no CO₂ figure for. The panel says there's no data,
 * rather than reading the empty figure as zero (Class A, a strong match) or
 * falling back to a generic line about the priority.
 */
describe("when FINN publishes no CO₂ figure", () => {
  const flat = (node: Element | null | undefined) =>
    (node?.textContent ?? "").replace(/\s+/g, " ").trim();

  it("says it has no data rather than showing a class or a verdict", () => {
    const host = panel({ id: 31, fuelType: "Petrol", co2: null, consumption: 5.5 } as never, ["environmental"]);
    const text = flat(host);

    expect(text).toContain("FINN doesn't publish this car's CO₂ figure or its CO₂ class.");
    expect(text).toContain("Nothing to judge this on");
    expect(text).toContain(
      "Without a CO₂ figure there's nothing here to judge this car on, so it isn't scored on your environmental priority.",
    );
    expect(text).toContain("No CO₂ figure published");
    expect(flat(host.querySelector("[data-rating]"))).toBe("Class not published");
    expect(flat(host.querySelector('[data-row="co2"]'))).toContain("No data");
    expect(usage(host)).toContain("5.5 L/100km");
    expect(text).not.toMatch(/Very low emissions|Class A\b|Equipment not listed|FINN's data doesn't carry anything/);
  });

  it("still says so when FINN publishes nothing at all for this priority", () => {
    const host = panel({ id: 32, fuelType: "Petrol", co2: null, consumption: null } as never, ["environmental"]);
    const text = flat(host);

    expect(text).toContain("FINN doesn't publish this car's CO₂ figure or its CO₂ class.");
    expect(host.querySelector('[data-row="energy"]')).toBeNull();
    expect(usage(host)).toContain("Not published");
    expect(text).not.toMatch(/\bNone\b/);
    expect(text).not.toMatch(/Equipment not listed|FINN's data doesn't carry anything/);
  });
});
