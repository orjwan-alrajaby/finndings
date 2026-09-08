import { beforeEach, describe, expect, it } from "vitest";
import { parseHTML } from "linkedom";

import { analysisBody } from "./sections";
import { buildFitAnalysis } from "@/lib/reasoning-engine/fit";
import {
  DEFAULT_PREFERENCES,
  DEFAULT_PRIORITIES,
} from "@/lib/reasoning-engine/constants";
import { makeCar, type CarOverrides } from "@/lib/reasoning-engine/test-fixtures";
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
 * **A judgement has to show its working.** "Highly efficient" is a comparison
 * against a fleet average, not a property of the car, so the figure, the
 * average and the distance between them all have to be on the page or the
 * reader is being asked to take our word for it.
 */

function panel(
  overrides: CarOverrides,
  priorities: CategoryId[] = DEFAULT_PRIORITIES,
) {
  const car = makeCar(overrides);
  const analysis = buildFitAnalysis(car, priorities, DEFAULT_PREFERENCES);
  const host = document.createElement("div");

  host.append(analysisBody(analysis));

  return host;
}

/**
 * One section's text, whitespace flattened so wrapping can't break a match.
 *
 * Matched on the section's own heading rather than anywhere in its text. The
 * environmental priority's method notes include a note *called* "How much it
 * uses is reported separately", so a looser match finds that block and reports
 * the deferral test passing when it is failing — or failing when it passes.
 */
function sectionSaying(host: HTMLElement, heading: string): string {
  const found = [...host.querySelectorAll("section")].find(
    (node) => node.querySelector("h3")?.textContent?.trim() === heading,
  );

  return (found?.textContent ?? "").replace(/\s+/g, " ").trim();
}

const usage = (host: HTMLElement) => sectionSaying(host, "How much it uses");
const costs = (host: HTMLElement) => sectionSaying(host, "What it costs you");

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

    expect(text).toContain("Highly efficient");
    /* Both figures, so the verdict can be checked rather than believed. */
    expect(text).toContain("4 L/100km");
    expect(text).toMatch(/5,8 L\/100km/);
    expect(text).toMatch(/\d+% less/);
  });

  it("says so plainly when a car drinks more than its peers", () => {
    const text = usage(panel({ id: 2, fuelType: "Petrol", consumption: 9 }));

    expect(text).toContain("Less efficient");
    expect(text).toMatch(/\d+% more/);
    /* The reason it is worth knowing, not a scolding. */
    expect(text).toContain("you pay for it every month");
  });

  it("does not dress an ordinary car up as a failure", () => {
    const text = usage(panel({ id: 3, fuelType: "Petrol", consumption: 6 }));

    expect(text).toContain("Moderately efficient");
    expect(text).toContain("perfectly reasonable thing to be");
  });

  it("measures an electric car against electric cars", () => {
    const text = usage(
      panel({ id: 4, fuelType: "Electric", consumption: 15, co2: 0 }),
    );

    expect(text).toContain("kWh/100km");
    expect(text).toContain("typical new electric car");
  });

  it("carries the caveat that both figures are lab results", () => {
    const text = usage(panel({ id: 5, consumption: 6 }));

    expect(text).toContain("WLTP");
    expect(text).toContain("fair to compare");
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
   * A reader who ranked the environment already gets this ground covered in
   * full, with emissions beside it, inside that priority's own block. Saying
   * it twice in one panel would read as a bug rather than as thoroughness.
   */
  it("stands down when the environmental priority already covers it", () => {
    const host = panel({ id: 11, consumption: 6 }, ["environmental"]);

    expect(usage(host)).toBe("");
    /* And the priority block is still the one saying it. */
    expect(host.textContent).toContain("L/100km");
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
    const text = costs(panel({ id: 12, consumption: 6 }));

    /* The per-100km figure belongs to the energy row's own explanation. */
    expect(text.match(/per 100 km/g) ?? []).toHaveLength(1);
  });

  it("still leads with the reader's mileage when a part can't be priced", () => {
    const text = costs(panel({ id: 10, consumption: null }));

    expect(text).toMatch(/At the [\d.,]+ km a month you told us you drive/);
    /* Named as partial rather than quietly presented as the whole answer. */
    expect(text).toContain("the part we can price");
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

  /*
   * Both are on the listing behind the panel. Repeating them spends the first
   * line the reader looks at on something they have just read.
   */
  it("does not recite the advertised price back in the header", () => {
    const host = panel({ id: 21, customerMonthly: 500 });

    expect(header(host)).not.toContain("from €500");
  });

  it("leaves horsepower out, since nothing here is decided by it", () => {
    const host = panel({ id: 22 });

    expect(header(host)).not.toMatch(/\bPS\b/);
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

    expect(text).toContain("400 L of boot space");
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
