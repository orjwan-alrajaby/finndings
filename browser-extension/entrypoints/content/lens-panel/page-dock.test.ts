import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseHTML } from "linkedom";

import { canDock, dockPage, needsShifting, undockPage } from "./page-dock";

/**
 * Borrowing width from a page that isn't ours.
 *
 * The property worth protecting is that it all comes back. Everything docking
 * does to finn.com is a class, a custom property and one stylesheet, and after
 * undocking the page has to be indistinguishable from the page that was there
 * before Lens was opened — no leftover attributes, no orphaned style element,
 * nothing for a second open to trip over.
 */

const PANEL = 416;

function page(html = "<p>FINN</p>") {
  const { document, window } = parseHTML(
    `<!doctype html><html><head></head><body>${html}</body></html>`,
  );

  Object.assign(globalThis, {
    document,
    window: Object.assign(window, { innerWidth: 1440 }),
    getComputedStyle: () => ({ position: "static" }),
  });

  return document;
}

let document: Document;

beforeEach(() => {
  document = page() as unknown as Document;
});

afterEach(() => {
  undockPage();
});

describe("canDock", () => {
  it("makes room when there is room for both", () => {
    (globalThis as { window: { innerWidth: number } }).window.innerWidth = 1440;

    expect(canDock(PANEL)).toBe(true);
  });

  it("won't narrow a page to nothing", () => {
    (globalThis as { window: { innerWidth: number } }).window.innerWidth = 600;

    expect(canDock(PANEL)).toBe(false);
  });

  it("needs a whole panel's width left over, not a sliver", () => {
    (globalThis as { window: { innerWidth: number } }).window.innerWidth =
      PANEL * 2 - 1;

    expect(canDock(PANEL)).toBe(false);
  });
});

describe("needsShifting", () => {
  const edge = 1440 - PANEL;
  const box = (over = {}) => ({ width: 1440, height: 60, right: 1440, ...over });

  it("moves a fixed header that reaches under the panel", () => {
    expect(needsShifting("fixed", box(), edge)).toBe(true);
  });

  it("moves a widget parked in the corner the panel now occupies", () => {
    expect(
      needsShifting("fixed", box({ width: 60, right: 1424 }), edge),
    ).toBe(true);
  });

  it("leaves anything anchored on the left alone", () => {
    expect(needsShifting("fixed", box({ width: 300, right: 300 }), edge)).toBe(
      false,
    );
  });

  it("leaves ordinary flow content to the margin on body", () => {
    /* Sticky and static elements follow the document; only fixed doesn't. */
    for (const position of ["static", "relative", "absolute", "sticky"]) {
      expect(needsShifting(position, box(), edge)).toBe(false);
    }
  });

  it("ignores what isn't drawn", () => {
    expect(needsShifting("fixed", box({ width: 0 }), edge)).toBe(false);
    expect(needsShifting("fixed", box({ height: 0 }), edge)).toBe(false);
  });
});

describe("dockPage", () => {
  it("narrows the page by exactly the panel's width", () => {
    dockPage(PANEL);

    expect(document.documentElement.classList.contains("finn-lens-docked")).toBe(
      true,
    );
    expect(
      document.documentElement.style.getPropertyValue(
        "--finn-lens-panel-width",
      ),
    ).toBe(`${PANEL}px`);
  });

  it("puts its stylesheet in the page rather than in the panel", () => {
    dockPage(PANEL);

    const style = document.getElementById("finn-lens-dock-style");

    /* The panel is in a shadow root; the page it narrows is not. */
    expect(style).not.toBeNull();
    expect(style?.textContent).toContain("margin-right");
  });

  it("gives everything back", () => {
    const before = document.documentElement.outerHTML;

    dockPage(PANEL);
    undockPage();

    expect(document.documentElement.outerHTML).toBe(before);
  });

  it("docks twice without stacking two stylesheets", () => {
    dockPage(PANEL);
    dockPage(PANEL);

    expect(
      document.querySelectorAll("#finn-lens-dock-style"),
    ).toHaveLength(1);
  });

  it("undocks a page that was never docked without complaint", () => {
    const before = document.documentElement.outerHTML;

    undockPage();

    expect(document.documentElement.outerHTML).toBe(before);
  });
});
