import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Provider } from "@radix-ui/react-tooltip";
import { parseHTML } from "linkedom";

import { Advice } from "./index";
import { makeCar } from "@/lib/reasoning-engine/test-fixtures";

/**
 * What the advice page leads with, and what holds it together.
 *
 * The order is the panel's: the money and the consumption before the
 * equipment audit, because those are the two things this page can tell a
 * reader that a FINN listing cannot. The hero already carries the verdict, so
 * nothing is lost by making the case for it afterwards.
 *
 * The picker and the hot seat travel with the cost rather than staying below
 * it, and that is the part worth protecting: the cost and energy sections
 * describe whoever is in the hot seat, so they have to sit under the control
 * that puts somebody there. Separated, a reader who picked a challenger would
 * meet "What <challenger> costs you" directly beneath a hero recommending a
 * different car.
 *
 * The containment assertion is here because moving these sections around is
 * done by moving JSX, and JSX that has escaped its column still compiles and
 * still renders every heading in the right order — it just lands in the wrong
 * grid cell. Order alone would not have caught that.
 */
function page() {
  const cars = [
    makeCar({
      id: 1,
      name: "Alpha",
      fuelType: "Electric",
      consumption: 15,
      co2: 0,
      customerMonthly: 500,
      featuresSupplied: true,
      features: ["hasIsofix", "hasHeatedSeats"],
    }),
    makeCar({
      id: 2,
      name: "Beta",
      fuelType: "Petrol",
      consumption: 8,
      customerMonthly: 420,
      featuresSupplied: true,
      features: ["hasIsofix"],
    }),
  ];

  const html = renderToStaticMarkup(
    createElement(
      Provider,
      null,
      createElement(Advice, { cars, onAdjust: () => {} }),
    ),
  );

  const { document } = parseHTML(`<!doctype html><html><body>${html}</body></html>`);

  return document;
}

const headingsIn = (root: Element | null) =>
  [...(root?.querySelectorAll("h2") ?? [])].map((node) =>
    (node.textContent ?? "").replace(/\s+/g, " ").trim(),
  );

describe("the advice page's running order", () => {
  it("puts cost and consumption ahead of the equipment audit", () => {
    const order = headingsIn(page().body);

    const cost = order.findIndex((text) => text.startsWith("What Alpha costs"));
    const uses = order.findIndex((text) => text.startsWith("How much Alpha uses"));
    const audit = order.findIndex((text) => text.includes("what Alpha does about it"));

    expect(cost).toBeGreaterThanOrEqual(0);
    expect(cost).toBeLessThan(uses);
    expect(uses).toBeLessThan(audit);
  });

  it("keeps the picker above the sections whose subject it chooses", () => {
    const order = headingsIn(page().body);

    const picker = order.findIndex((text) => text.includes("challenge the recommendation"));
    const cost = order.findIndex((text) => text.startsWith("What Alpha costs"));

    expect(picker).toBeGreaterThanOrEqual(0);
    expect(picker).toBeLessThan(cost);
  });

  it("leaves every section inside the reading column, not loose in the grid", () => {
    const document = page();

    const grid = document.querySelector("div.grid");
    const column = grid?.firstElementChild ?? null;

    /* The sidebar is the column's sibling; everything else is its content. */
    expect(grid?.childElementCount).toBe(2);
    expect(headingsIn(column)).toHaveLength(headingsIn(grid).length);
  });
});
