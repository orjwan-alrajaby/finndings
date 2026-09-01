import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseHTML } from "linkedom";

import { canDock, dockPage, undockPage } from "./page-dock";

/**
 * Borrowing width from the car, not from the site.
 *
 * Two things to protect. Only the product block gives up room — FINN's header
 * is the site's furniture and not this car's, and narrowing it would tell the
 * reader the whole site had changed when one panel opened. And it all comes
 * back: everything docking does is a class, a custom property and one
 * stylesheet, so afterwards the page has to be indistinguishable from the one
 * that was there before.
 */

const PANEL = 416;

const page = `
  <header class="site-header" id="header">FINN</header>
  <div class="md:mt-6" data-appid="product-details" id="product">
    <div class="container"><h1>BYD Dolphin Surf</h1></div>
  </div>
  <footer id="footer">FINN</footer>
`;

function render() {
  const { document, window } = parseHTML(
    `<!doctype html><html><head></head><body>${page}</body></html>`,
  );

  Object.assign(globalThis, {
    document,
    window: Object.assign(window, { innerWidth: 1440 }),
  });

  return document as unknown as Document;
}

let document: Document;

const product = () =>
  document.querySelector('[data-appid="product-details"]') as HTMLElement;

beforeEach(() => {
  document = render();
});

afterEach(() => {
  undockPage();
});

const setWidth = (value: number) => {
  (globalThis as { window: { innerWidth: number } }).window.innerWidth = value;
};

describe("canDock", () => {
  it("makes room when there is room for both", () => {
    setWidth(1440);

    expect(canDock(PANEL)).toBe(true);
  });

  it("won't narrow the car to nothing", () => {
    setWidth(600);

    expect(canDock(PANEL)).toBe(false);
  });

  it("needs a whole panel's width left over, not a sliver", () => {
    setWidth(PANEL * 2 - 1);

    expect(canDock(PANEL)).toBe(false);
  });
});

describe("dockPage", () => {
  it("narrows the product block by exactly the panel's width", () => {
    dockPage(product(), PANEL);

    expect(product().classList.contains("finn-lens-narrowed")).toBe(true);
    expect(
      document.documentElement.style.getPropertyValue(
        "--finn-lens-panel-width",
      ),
    ).toBe(`${PANEL}px`);
  });

  it("leaves the header and everything else on the page alone", () => {
    const before = {
      header: document.getElementById("header")?.outerHTML,
      footer: document.getElementById("footer")?.outerHTML,
      body: document.body.getAttribute("style"),
    };

    dockPage(product(), PANEL);

    expect(document.getElementById("header")?.outerHTML).toBe(before.header);
    expect(document.getElementById("footer")?.outerHTML).toBe(before.footer);
    expect(document.body.getAttribute("style")).toBe(before.body);
  });

  it("marks one element and no others", () => {
    dockPage(product(), PANEL);

    expect(document.querySelectorAll(".finn-lens-narrowed")).toHaveLength(1);
  });

  it("puts its stylesheet in the page rather than in the panel", () => {
    dockPage(product(), PANEL);

    const style = document.getElementById("finn-lens-dock-style");

    /* The panel is in a shadow root; the block it narrows is not. */
    expect(style?.textContent).toContain("margin-right");
  });

  it("gives everything back", () => {
    const before = document.documentElement.outerHTML;

    dockPage(product(), PANEL);
    undockPage();

    expect(document.documentElement.outerHTML).toBe(before);
  });

  it("docks twice without stacking two stylesheets", () => {
    dockPage(product(), PANEL);
    dockPage(product(), PANEL);

    expect(document.querySelectorAll("#finn-lens-dock-style")).toHaveLength(1);
  });

  it("undocks a page that was never docked without complaint", () => {
    const before = document.documentElement.outerHTML;

    undockPage();

    expect(document.documentElement.outerHTML).toBe(before);
  });
});
