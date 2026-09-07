import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseHTML } from "linkedom";

import {
  dockSectionFor,
  hasRoomBeside,
  isSection,
  undockSection,
} from "./section-dock";

/**
 * Borrowing width from one block of a page that isn't ours.
 *
 * Two properties worth protecting. The panel narrows the section the marked
 * card is laid out in and nothing else — narrowing the card itself, or the
 * document, is the bug this replaced. And it all comes back: everything
 * docking does to finn.com is a class, a custom property and one stylesheet,
 * so after undocking the page has to be indistinguishable from the one that
 * was there before Lens opened.
 */

const PANEL = 416;

/** Boxes linkedom will not measure, keyed by the element's id. */
type Boxes = Record<string, { width: number; right: number }>;

function page(html: string, boxes: Boxes = {}) {
  const { document, window } = parseHTML(
    `<!doctype html><html><head></head><body>${html}</body></html>`,
  );

  for (const [id, box] of Object.entries(boxes)) {
    const node = document.getElementById(id);

    if (node) {
      node.getBoundingClientRect = () => ({ ...box }) as DOMRect;
    }
  }

  Object.assign(globalThis, {
    document,
    window: Object.assign(window, { innerWidth: 1440 }),
  });

  return document as unknown as Document;
}

let document: Document;

beforeEach(() => {
  document = page("<p>FINN</p>");
});

afterEach(() => {
  undockSection();
});

describe("hasRoomBeside", () => {
  it("sits beside a page with room for both", () => {
    (globalThis as { window: { innerWidth: number } }).window.innerWidth = 1440;

    expect(hasRoomBeside(PANEL)).toBe(true);
  });

  it("covers a page with nothing left to show", () => {
    (globalThis as { window: { innerWidth: number } }).window.innerWidth = 600;

    expect(hasRoomBeside(PANEL)).toBe(false);
  });

  it("needs a whole panel's width left over, not a sliver", () => {
    (globalThis as { window: { innerWidth: number } }).window.innerWidth =
      PANEL * 2 - 1;

    expect(hasRoomBeside(PANEL)).toBe(false);
  });
});

describe("isSection", () => {
  const edge = 1440 - PANEL;

  it("takes a block that reaches under the panel and holds several cards", () => {
    expect(isSection({ width: 1200, right: 1400 }, 3, edge)).toBe(true);
  });

  it("leaves a block the panel was never going to cover", () => {
    expect(isSection({ width: 400, right: 400 }, 3, edge)).toBe(false);
  });

  it("won't squash the smallest box around one card", () => {
    expect(isSection({ width: 1200, right: 1400 }, 1, edge)).toBe(false);
  });

  it("ignores what isn't drawn", () => {
    expect(isSection({ width: 0, right: 1400 }, 3, edge)).toBe(false);
  });
});

describe("dockSectionFor", () => {
  const grid = () =>
    page(
      `<main id="page">
         <div id="grid">
           <article id="card"><div id="photo"></div></article>
           <article id="sibling"></article>
         </div>
       </main>`,
      {
        page: { width: 1440, right: 1440 },
        grid: { width: 1200, right: 1400 },
        card: { width: 400, right: 800 },
      },
    );

  it("narrows the grid the card is in rather than the page", () => {
    document = grid();

    dockSectionFor(document.getElementById("card")!, PANEL);

    expect(
      document.getElementById("grid")?.classList.contains("finn-lens-section"),
    ).toBe(true);
    expect(
      document.getElementById("page")?.classList.contains("finn-lens-section"),
    ).toBe(false);
  });

  it("carries the panel's width for the stylesheet to read", () => {
    document = grid();

    dockSectionFor(document.getElementById("card")!, PANEL);

    expect(
      document.documentElement.style.getPropertyValue(
        "--finn-lens-panel-width",
      ),
    ).toBe(`${PANEL}px`);
  });

  it("puts its stylesheet in the page rather than in the panel", () => {
    document = grid();

    dockSectionFor(document.getElementById("card")!, PANEL);

    const style = document.getElementById("finn-lens-dock-style");

    /* The panel is in a shadow root; the section it narrows is not. */
    expect(style).not.toBeNull();
    expect(style?.textContent).toContain("margin-right");
  });

  it("narrows nothing when the panel covers the page anyway", () => {
    document = grid();
    (globalThis as { window: { innerWidth: number } }).window.innerWidth = 600;

    dockSectionFor(document.getElementById("card")!, PANEL);

    expect(document.getElementById("finn-lens-dock-style")).toBeNull();
  });

  it("gives everything back", () => {
    document = grid();

    const before = document.documentElement.outerHTML;

    dockSectionFor(document.getElementById("card")!, PANEL);
    undockSection();

    expect(document.documentElement.outerHTML).toBe(before);
  });

  it("moves the narrowing when the panel moves to another card", () => {
    document = page(
      `<div id="left"><article id="one"></article><article id="two"></article></div>
       <div id="right"><article id="three"></article><article id="four"></article></div>`,
      {
        left: { width: 1200, right: 1400 },
        right: { width: 1200, right: 1400 },
      },
    );

    dockSectionFor(document.getElementById("one")!, PANEL);
    dockSectionFor(document.getElementById("three")!, PANEL);

    expect(
      document.getElementById("left")?.classList.contains("finn-lens-section"),
    ).toBe(false);
    expect(
      document.getElementById("right")?.classList.contains("finn-lens-section"),
    ).toBe(true);
  });

  it("undocks a page that was never docked without complaint", () => {
    const before = document.documentElement.outerHTML;

    undockSection();

    expect(document.documentElement.outerHTML).toBe(before);
  });
});
