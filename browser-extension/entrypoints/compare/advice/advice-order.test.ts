import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Provider } from "@radix-ui/react-tooltip";
import { parseHTML } from "linkedom";

import { Advice } from "./index";
import { Challenge } from "./Challenge";
import { makeCar } from "@/lib/reasoning-engine/test-fixtures";

/**
 * What the advice page leads with, and what holds it together.
 *
 * The order is the panel's: the money and the consumption before the
 * equipment audit, because those are the two things this page can tell a
 * reader that a FINN listing cannot. The hero already carries the verdict, so
 * nothing is lost by making the case for it afterwards.
 *
 * The recommendation and the challenge are two views now, and the property
 * that split them is that each has one subject. Every figure on the advice
 * view is the winner's; the picker and the hot seat are somewhere else
 * entirely. That is what makes the headings on this view safe to read
 * literally, and it is what makes its PDF a document about one car.
 *
 * The containment assertion is here because moving these sections around is
 * done by moving JSX, and JSX that has escaped its column still compiles and
 * still renders every heading in the right order — it just lands in the wrong
 * grid cell. Order alone would not have caught that.
 */
function cars() {
  return [
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
}

function render(
  view: typeof Advice | typeof Challenge,
): Document {
  const html = renderToStaticMarkup(
    createElement(
      Provider,
      null,
      createElement(view, { cars: cars(), onAdjust: () => {} }),
    ),
  );

  const { document } = parseHTML(
    `<!doctype html><html><body>${html}</body></html>`,
  );

  return document as unknown as Document;
}

const page = () => render(Advice);
const challenge = () => render(Challenge);

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

  /*
   * The reason the two views exist. A page that recommends a car and then
   * argues for a different one has no answer to "what is this page about",
   * and its PDF has none either.
   */
  it("holds nothing that argues for a different car", () => {
    const text = (page().body?.textContent ?? "").replace(/\s+/g, " ");

    expect(text).not.toContain("challenge the recommendation");
    expect(text).not.toContain("in the hot seat");
  });

  it("describes the winner in every section, whatever the hot seat holds", () => {
    const order = headingsIn(page().body);

    expect(order.some((text) => text.startsWith("What Alpha costs"))).toBe(true);
    expect(order.some((text) => text.startsWith("How much Alpha uses"))).toBe(
      true,
    );
    expect(order.some((text) => text.includes("Beta"))).toBe(false);
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

describe("the challenge view", () => {
  it("offers the picker, and waits rather than guessing a challenger", () => {
    const text = (challenge().body?.textContent ?? "").replace(/\s+/g, " ");

    expect(text).toContain("Would another one suit you better?");
    /* Nothing is in the hot seat until the reader puts it there. */
    expect(text).toContain("Choose one of the cars above");
  });

  /*
   * The export button is the tell: a file of an empty picker is a page of
   * furniture, so it only appears once there is a comparison to save.
   */
  it("offers no PDF until there is a comparison in it", () => {
    const text = (challenge().body?.textContent ?? "").replace(/\s+/g, " ");

    expect(text).not.toContain("Save as PDF");
  });

  it("keeps its sections inside the reading column too", () => {
    const grid = challenge().querySelector("div.grid");

    expect(grid?.childElementCount).toBe(2);
  });
});
