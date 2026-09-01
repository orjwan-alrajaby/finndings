import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseHTML } from "linkedom";

import { findInsetAnchor, insetPage, uninsetPage } from "./page-inset";

/**
 * Opening a gap in a page that isn't ours.
 *
 * Two things to protect. The gap has to land at the seam FINN's own page
 * already has — between the car and the configurations it comes in — rather
 * than somewhere inside either of them. And everything has to come back.
 *
 * The skeleton is the real one, from
 * https://www.finn.com/de-DE/models/byd/dolphin-surf: the details root is a
 * flat stack of sections, and the configurations grid sits two levels inside
 * the last of them.
 */
const detailsPage = `
  <div class="md:mt-6" data-appid="product-details">
    <a class="body-14-regular container" data-testid="desktop-back-link">BYD</a>

    <div class="container" id="hero">
      <section><h1>BYD Dolphin Surf</h1><p>ab 209 €</p></section>
    </div>

    <div class="pt-4 md:pt-11" id="spacer"></div>

    <div class="container" id="configurations">
      <div><p>Verfügbare Konfigurationen</p></div>
      <div><p>3 Fahrzeuge</p></div>
      <div data-testid="group-comparison" class="grid gap-4">
        <div id="product-36918"></div>
        <div id="product-34889"></div>
      </div>
    </div>

    <div class="fixed inset-x-0 top-0" id="sticky-nav">Technische Daten</div>
  </div>
`;

function render(html: string) {
  const { document, window } = parseHTML(
    `<!doctype html><html><head></head><body>${html}</body></html>`,
  );

  Object.assign(globalThis, {
    document,
    window: Object.assign(window, { innerHeight: 900, scrollX: 0, scrollY: 0 }),
    getComputedStyle: () => ({ marginTop: "24px" }),
  });

  return document;
}

let document: Document;

beforeEach(() => {
  document = render(detailsPage) as unknown as Document;
});

afterEach(() => {
  uninsetPage();
});

const root = () =>
  document.querySelector('[data-appid="product-details"]') as HTMLElement;

describe("findInsetAnchor", () => {
  it("finds the configurations section, not the grid inside it", () => {
    /*
     * The grid is what identifies the section; it isn't the section. Opening
     * the gap directly above it would cut its own heading and price toggle
     * away from the cards they belong to.
     */
    expect(findInsetAnchor(root())?.id).toBe("configurations");
  });

  it("lands after the car and before the configurations", () => {
    const anchor = findInsetAnchor(root()) as HTMLElement;
    const children = Array.from(root().children);

    expect(children.indexOf(anchor)).toBeGreaterThan(
      children.indexOf(document.getElementById("hero") as Element),
    );
  });

  it("has nowhere to sit on a page with no configurations", () => {
    document = render(
      '<div data-appid="product-details"><div class="container"><h1>A car</h1></div></div>',
    ) as unknown as Document;

    expect(findInsetAnchor(root())).toBeNull();
  });
});

describe("insetPage", () => {
  it("adds the gap to the section's own spacing rather than replacing it", () => {
    /* The stub reports 24px of existing margin; 560 of gap makes 584. */
    insetPage(findInsetAnchor(root()) as HTMLElement, 560);

    expect(
      document.documentElement.style.getPropertyValue(
        "--finn-lens-inset-offset",
      ),
    ).toBe("584px");
  });

  it("marks only the section the gap opens above", () => {
    insetPage(findInsetAnchor(root()) as HTMLElement, 560);

    const marked = document.querySelectorAll(".finn-lens-inset-anchor");

    expect(marked).toHaveLength(1);
    expect(marked[0]?.id).toBe("configurations");
  });

  it("puts its stylesheet in the page, where the page can see it", () => {
    insetPage(findInsetAnchor(root()) as HTMLElement, 560);

    expect(
      document.getElementById("finn-lens-inset-style")?.textContent,
    ).toContain("margin-top");
  });

  it("gives everything back", () => {
    const before = document.documentElement.outerHTML;

    insetPage(findInsetAnchor(root()) as HTMLElement, 560);
    uninsetPage();

    expect(document.documentElement.outerHTML).toBe(before);
  });

  it("uninsets a page that was never inset without complaint", () => {
    const before = document.documentElement.outerHTML;

    uninsetPage();

    expect(document.documentElement.outerHTML).toBe(before);
  });
});
