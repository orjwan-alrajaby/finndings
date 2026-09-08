import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Provider } from "@radix-ui/react-tooltip";

import { FitAnalysisView } from "./index";
import { buildFitAnalysis } from "@/lib/reasoning-engine/fit";
import {
  DEFAULT_PREFERENCES,
  DEFAULT_PRIORITIES,
} from "@/lib/reasoning-engine/constants";
import { makeCar, type CarOverrides } from "@/lib/reasoning-engine/test-fixtures";

/**
 * The advice card, which is the in-page panel's reading on a page.
 *
 * The two renderers exist because the panel lives in a shadow root on finn.com
 * and cannot carry React in there. Nothing that *decides* anything is
 * duplicated between them — every sentence, band and figure comes off one
 * `FitAnalysis`, and the shared copy lives in `cost-copy` and the assessments
 * — but the two can still drift in what they choose to show and in what order.
 * These are the properties that were deliberately made to match, so a reader
 * who meets a car in the panel and again here is not told two different
 * stories about it.
 *
 * Rendered to static markup rather than into a DOM: the unit suite runs in a
 * plain node environment, and everything asserted here is text and order.
 */
function card(overrides: CarOverrides): string {
  const analysis = buildFitAnalysis(
    makeCar(overrides),
    DEFAULT_PRIORITIES,
    DEFAULT_PREFERENCES,
  );

  const html = renderToStaticMarkup(
    createElement(Provider, null, createElement(FitAnalysisView, { analysis })),
  );

  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** Where a phrase falls in the card, for asserting on order. */
const at = (text: string, phrase: string) => text.indexOf(phrase);

describe("the advice card says what the panel says", () => {
  it("leads with cost, then consumption, then the equipment audit", () => {
    const text = card({ id: 1, consumption: 6 });

    const cost = at(text, "What it costs you");
    const uses = at(text, "How much it uses");
    const priorities = at(text, "Your priority #1");

    expect(cost).toBeGreaterThanOrEqual(0);
    expect(cost).toBeLessThan(uses);
    expect(uses).toBeLessThan(priorities);
  });

  it("contrasts the advertised price with what the reader would pay", () => {
    const text = card({ id: 2, consumption: 6, customerMonthly: 500 });

    expect(text).toContain("more than the advertised price");
    expect(text).toContain("FINN's page says");
    expect(text).toContain("all in");
  });

  /*
   * "At your mileage we estimate €651/month in total" was the same claim
   * `costLead` makes two lines below it, in more words.
   */
  it("does not state the total twice in different words", () => {
    const text = card({ id: 3, consumption: 6 });

    expect(text).not.toContain("we estimate");
  });

  it("keeps the estimate disclaimer with the estimates", () => {
    const text = card({ id: 4, consumption: 6 });

    const disclaimer = at(text, "These numbers are estimates");
    const priorities = at(text, "Your priority #1");

    expect(disclaimer).toBeGreaterThanOrEqual(0);
    expect(disclaimer).toBeLessThan(priorities);
  });

  it("grades consumption for a car whose reader never ranked the environment", () => {
    const text = card({ id: 5, fuelType: "Petrol", consumption: 4 });

    expect(text).toContain("Highly efficient");
    expect(text).toContain("WLTP");
  });

  it("moves the fuel type beside the judgement it governs", () => {
    const text = card({ id: 6, fuelType: "Electric", consumption: 15 });

    /* Out of the spec line, which now runs straight from range to price. */
    expect(text).not.toMatch(/Electric · /);
    expect(at(text, "Electric")).toBeGreaterThan(at(text, "How much it uses"));
  });

  it("drops the tally that summarised the card at the top of it", () => {
    const text = card({ id: 7, featuresSupplied: true, features: ["hasIsofix"] });

    expect(text).not.toMatch(/match on \d+ of the \d+ priorities/);
  });

  it("puts the basis for the verdict below the reasons, not above them", () => {
    const text = card({ id: 8, featuresSupplied: true, features: ["hasIsofix"] });

    expect(at(text, "Measured against")).toBeGreaterThan(
      at(text, "What it costs you"),
    );
  });

  it("leaves horsepower out, since nothing here is decided by it", () => {
    const text = card({ id: 9 });

    expect(text).not.toMatch(/\bPS\b/);
  });

  /*
   * Scoped to one priority. Boot space legitimately appears under more than
   * one — practicality and family friendliness both rest on it, and each
   * section is accounting for its own band. What must not happen is one
   * section saying it in prose and then listing it again underneath.
   */
  it("states a measurement once, not twice, within one section", () => {
    const text = card({
      id: 10,
      trunk: 400,
      featuresSupplied: true,
      features: ["hasIsofix"],
    });

    const practicality = text.slice(
      text.indexOf("Practicality"),
      text.indexOf("Your priority #3"),
    );

    expect(practicality).toContain("400 L of boot space");
    expect(practicality.match(/400 L/g) ?? []).toHaveLength(1);
  });

  it("still shows the figures when no sentence carries them", () => {
    const text = card({ id: 11, trunk: 400 });

    expect(text).toContain("400 L");
  });
});
