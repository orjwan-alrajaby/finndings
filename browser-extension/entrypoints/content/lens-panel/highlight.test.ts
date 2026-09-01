import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseHTML } from "linkedom";

import { clearHighlight, configurationCard, highlightConfiguration } from "./highlight";

/**
 * Marking the car the panel is describing, on FINN's own page.
 *
 * Three things to hold. One card is marked at a time, because the panel talks
 * about one car at a time. The page is scrolled only when the reader asked for
 * a car rather than merely opened the panel on one. And everything comes off
 * again — the mark lives on somebody else's element, so leaving any of it
 * behind is leaving a change on a page we don't own.
 */

/*
 * FINN's cards, with the pin button this extension has already injected into
 * each. `overflow-hidden` is the detail that matters: it is why the label has
 * to live inside the card rather than hang off its top edge.
 */
const card = (id: number, name: string) => `
  <div id="product-${id}" class="group bg-snow overflow-hidden relative">
    <div class="relative px-4 pt-4" data-top-half>
      <button class="finn-lens-add-car-btn absolute top-4 right-4"></button>
    </div>
    ${name}
  </div>
`;

const grid = `
  <div data-appid="product-details">
    <div class="container">
      <div data-testid="group-comparison">
        ${card(36918, "Boost")}
        ${card(34889, "Comfort")}
        ${card(34888, "Comfort Design")}
      </div>
    </div>
  </div>
`;

let document: Document;
let scrolled: string[];

beforeEach(() => {
  const { document: page, window } = parseHTML(
    `<!doctype html><html><head></head><body>${grid}</body></html>`,
  );

  scrolled = [];

  for (const node of page.querySelectorAll("[id^=product-]")) {
    (node as unknown as { scrollIntoView: () => void }).scrollIntoView = () => {
      scrolled.push((node as Element).id);
    };
  }

  /*
   * linkedom has no layout, so the geometry the label is placed from is
   * stubbed to what a browser would report: a 32px pin inset 16px from the
   * top-right of a 360px-wide card top.
   */
  for (const pin of page.querySelectorAll(".finn-lens-add-car-btn")) {
    Object.assign(pin, {
      offsetParent: (pin as Element).parentElement,
      offsetTop: 16,
      offsetLeft: 312,
      offsetHeight: 32,
    });
  }

  for (const half of page.querySelectorAll("[data-top-half]")) {
    Object.assign(half, { clientWidth: 360 });
  }

  Object.assign(globalThis, { document: page, window });

  document = page as unknown as Document;
});

afterEach(() => {
  clearHighlight();
  vi.restoreAllMocks();
});

const marked = () => document.querySelectorAll(".finn-lens-current");

describe("configurationCard", () => {
  it("finds the card FINN drew for a configuration", () => {
    expect(configurationCard(34889)?.textContent).toContain("Comfort");
  });

  it("is empty for a configuration this page doesn't list", () => {
    expect(configurationCard(99999)).toBeNull();
  });
});

describe("highlightConfiguration", () => {
  it("marks the card the panel is describing", () => {
    highlightConfiguration(34889);

    expect(marked()).toHaveLength(1);
    expect(marked()[0]?.id).toBe("product-34889");
  });

  it("marks one at a time, because the panel describes one at a time", () => {
    highlightConfiguration(34889);
    highlightConfiguration(36918);

    expect(marked()).toHaveLength(1);
    expect(marked()[0]?.id).toBe("product-36918");
  });

  it("clears the mark when the reader goes back to the list", () => {
    highlightConfiguration(34889);
    highlightConfiguration(null);

    expect(marked()).toHaveLength(0);
  });

  it("styles the card without changing its box", () => {
    highlightConfiguration(34889);

    const css = document.getElementById("finn-lens-highlight-style")?.textContent ?? "";

    /* A ring painted outside the box: no border, no background, no reflow. */
    expect(css).toContain("box-shadow");
    expect(css).not.toContain("border:");
    expect(css).not.toContain("background-color:");
  });

  it("says why the card is marked", () => {
    highlightConfiguration(34889);

    const label = document.querySelector(".finn-lens-current-badge");

    expect(label?.textContent).toBe("Shown in FINN Lens");
  });

  it("puts the label inside the card, which clips anything outside it", () => {
    /*
     * FINN's cards are overflow-hidden. A label hung off the top edge is
     * shaved to a sliver, which is exactly what the first attempt did.
     */
    highlightConfiguration(34889);

    const label = document.querySelector(".finn-lens-current-badge");

    expect(configurationCard(34889)?.contains(label as Node)).toBe(true);
  });

  it("sits beside the pin button, measured off the pin", () => {
    highlightConfiguration(34889);

    const label = document.querySelector<HTMLElement>(
      ".finn-lens-current-badge",
    );

    /* Same container as the pin, so both are in the same coordinates. */
    expect(label?.parentElement?.hasAttribute("data-top-half")).toBe(true);

    /* Centred on a 32px pin inset 16px from the top: 16 + 16 = 32. */
    expect(label?.style.top).toBe("32px");
    expect(label?.style.transform).toBe("translateY(-50%)");

    /* Immediately left of it: 360 − 312 + 8 = 56 from the right edge. */
    expect(label?.style.right).toBe("56px");
  });

  it("falls back to the corner on a card with no pin", () => {
    const bare = document.getElementById("product-34888") as HTMLElement;

    bare.querySelector(".finn-lens-add-car-btn")?.remove();

    highlightConfiguration(34888);

    const label = document.querySelector<HTMLElement>(
      ".finn-lens-current-badge",
    );

    expect(label?.style.top).toBe("16px");
    expect(label?.style.right).toBe("16px");
  });

  it("takes the label with it when the mark moves", () => {
    highlightConfiguration(34889);
    highlightConfiguration(36918);

    const labels = document.querySelectorAll(".finn-lens-current-badge");

    expect(labels).toHaveLength(1);
    expect(configurationCard(36918)?.contains(labels[0] as Node)).toBe(true);
  });

  it("goes to the car when the reader picked it", () => {
    highlightConfiguration(34889, { scroll: true });

    expect(scrolled).toEqual(["product-34889"]);
  });

  it("doesn't move the page for a car the reader merely arrived on", () => {
    highlightConfiguration(34889);

    expect(scrolled).toEqual([]);
  });

  it("goes there again when the same car is asked for again", () => {
    /* Re-picking the car already shown is still a request to be shown it. */
    highlightConfiguration(34889, { scroll: true });
    highlightConfiguration(34889, { scroll: true });

    expect(scrolled).toEqual(["product-34889", "product-34889"]);
  });

  it("doesn't re-mark on a repaint that changes nothing", () => {
    highlightConfiguration(34889);
    const style = document.getElementById("finn-lens-highlight-style");

    highlightConfiguration(34889);

    expect(document.getElementById("finn-lens-highlight-style")).toBe(style);
  });

  it("leaves the page alone for a car it can't find", () => {
    const before = document.documentElement.outerHTML;

    highlightConfiguration(99999);

    expect(document.documentElement.outerHTML).toBe(before);
  });

  it("gives everything back", () => {
    const before = document.documentElement.outerHTML;

    highlightConfiguration(34889, { scroll: true });
    clearHighlight();

    expect(document.documentElement.outerHTML).toBe(before);
  });

  it("clears a page that was never marked without complaint", () => {
    const before = document.documentElement.outerHTML;

    clearHighlight();

    expect(document.documentElement.outerHTML).toBe(before);
  });
});

describe("cards that aren't configuration cards", () => {
  it("marks a listing card, which identifies itself differently", () => {
    /*
     * A configuration card carries its id in `id="product-34889"`; a listing
     * card carries it inside `data-productid`. The panel can be opened from
     * either, so the mark has to land on either.
     */
    const { document: page } = parseHTML(
      `<!doctype html><html><body>
        <div data-testid="product-card" data-productid="byd-dolphin-36933-obsidianblack">
          <div class="finn-lens-add-car-btn"></div>
        </div>
      </body></html>`,
    );

    Object.assign(globalThis, { document: page });

    highlightConfiguration(36933);

    expect(
      page.querySelectorAll(".finn-lens-current"),
    ).toHaveLength(1);
    expect(
      page.querySelector(".finn-lens-current")?.getAttribute("data-productid"),
    ).toBe("byd-dolphin-36933-obsidianblack");
  });
});
