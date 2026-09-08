import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Provider } from "@radix-ui/react-tooltip";
import { parseHTML } from "linkedom";

import { Advice } from "./index";
import { Challenge } from "./Challenge";
import { ChallengePicker } from "./components/ChallengePicker";
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

function render(element: ReturnType<typeof createElement>): Document {
  const html = renderToStaticMarkup(createElement(Provider, null, element));

  const { document } = parseHTML(
    `<!doctype html><html><body>${html}</body></html>`,
  );

  return document as unknown as Document;
}

const noop = () => {};

/*
 * The two views take different callbacks now — one crosses to the challenge,
 * the other crosses back — so they cannot share a render helper that guesses
 * at the props.
 */
const page = () =>
  render(
    createElement(Advice, {
      cars: cars(),
      onAdjust: noop,
      onChallenge: noop,
    }),
  );

const challenge = () =>
  render(
    createElement(Challenge, {
      cars: cars(),
      onAdjust: noop,
      onBack: noop,
    }),
  );

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

/**
 * Where the two views send the reader.
 *
 * Both of these are navigation dressed as something else, and both were wrong
 * before. The hero's secondary button opened the answers drawer — the third
 * control on the page to do that, while the obvious next question after
 * reading a recommendation had no affordance at all. And "Back to <winner>"
 * emptied the hot seat, which was the only thing it could mean while the two
 * readings shared a page; with them on separate tabs it means what it says.
 */
describe("crossing between the two views", () => {
  it("offers the challenge from the recommendation's hero", () => {
    const text = (page().body?.textContent ?? "").replace(/\s+/g, " ");

    expect(text).toContain("Challenge recommendation");
    /* The drawer is still reachable — from the header and the sidebar. */
    expect(text).not.toContain("Change my answers");
  });

  /*
   * One pinned car is a recommendation with no rivals, and a button leading to
   * a page that says so is a button that wasted a click.
   */
  it("offers no challenge when there is nothing to challenge with", () => {
    const html = renderToStaticMarkup(
      createElement(
        Provider,
        null,
        createElement(Advice, {
          cars: [cars()[0]!],
          onAdjust: noop,
          onChallenge: noop,
        }),
      ),
    );

    expect(html).not.toContain("Challenge recommendation");
  });

  /*
   * Rendered directly because the tab cannot reach this state under test:
   * `renderToStaticMarkup` does not observe zustand writes, so the challenger
   * is always null there and the picker never draws its selected form.
   */
  it("offers the way back once a car is in the seat", () => {
    const [winner, rival] = cars();

    const html = renderToStaticMarkup(
      createElement(ChallengePicker, {
        options: [
          {
            vehicle: rival!,
            rank: 2,
            isSelected: true,
            monthly: 660,
            difference: "€12 more than Alpha",
            summary: "Adds roof rails",
          },
        ] as never,
        winnerName: winner!.name,
        selectedId: rival!.id,
        onSelect: noop,
        onBack: noop,
      }),
    );

    expect(html).toContain(`Back to ${winner!.name}`);
    /* Navigation, so it leaves the exported report. */
    expect(html).toContain("finn-lens-screen-only");
  });
});
