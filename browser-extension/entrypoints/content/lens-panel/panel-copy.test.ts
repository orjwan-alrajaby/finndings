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
  it("ties the total to the reader's own driving, and names the parts", () => {
    const text = costs(panel({ id: 8, consumption: 6 }));

    expect(text).toMatch(/At the [\d.,]+ km a month you told us you drive/);
    expect(text).toContain("to FINN for the subscription");
    expect(text).toContain("of fuel");
  });

  it("says which part of the bill moves with the driving", () => {
    const text = costs(panel({ id: 9, consumption: 6 }));

    expect(text).toContain("every 100 km you drive");
    expect(text).toContain("moves when your driving does");
  });

  it("still leads with the reader's mileage when a part can't be priced", () => {
    const text = costs(panel({ id: 10, consumption: null }));

    expect(text).toMatch(/At the [\d.,]+ km a month you told us you drive/);
    /* Named as partial rather than quietly presented as the whole answer. */
    expect(text).toContain("the part we can price");
  });
});
