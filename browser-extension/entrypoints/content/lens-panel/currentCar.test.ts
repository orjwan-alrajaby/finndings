import { beforeEach, describe, expect, it } from "vitest";
import { parseHTML } from "linkedom";

import {
  configurationCards,
  resolveCurrentConfigId,
} from "./currentCar";

/**
 * The skeleton of a real FINN detail page.
 *
 * Taken from `https://www.finn.com/de-DE/models/byd/dolphin-surf`: the
 * `product-details` root the content script already gates on, and the
 * `group-comparison` grid where FINN lists the configurations a model comes
 * in, each carrying its own `product-XXXXX` id. The `product-card` elements
 * are the "similar cars" further down the page — they are here because the
 * resolver must never mistake one for a configuration of this model.
 *
 * Everything else about the page is markup this feature doesn't read.
 */
const detailsPage = (cards: number[]) => `
  <header><div data-testid="search-button"></div></header>
  <div class="md:mt-6" data-appid="product-details">
    <div class="container">
      <section>
        <h1>BYD Dolphin Surf</h1>
        <p>ab 209 € pro Monat</p>
        <div data-testid="group-comparison" class="grid gap-4">
          ${cards
            .map(
              (id, index) =>
                `<div id="product-${id}" data-idx="${index}"><span>Comfort</span></div>`,
            )
            .join("")}
        </div>
      </section>
      <section>
        <div data-testid="product-card" data-productid="90001">
          <h3><a href="/de-DE/models/mg/4?selected_config=33797">MG 4</a></h3>
        </div>
        <div data-testid="product-card" data-productid="90002"></div>
      </section>
    </div>
  </div>
`;

const rootOf = (html: string): HTMLElement => {
  const { document } = parseHTML(`<!doctype html><html><body>${html}</body></html>`);

  Object.assign(globalThis, { document });

  return document.querySelector(
    'div[data-appid="product-details"]',
  ) as unknown as HTMLElement;
};

describe("configurationCards", () => {
  it("finds every configuration FINN lists for the model", () => {
    expect(configurationCards(rootOf(detailsPage([36918, 34889, 34888])))).toEqual([
      36918, 34889, 34888,
    ]);
  });

  it("doesn't count the similar cars further down the page", () => {
    /* They are product-cards carrying a data-productid, not product-XXXXX ids. */
    expect(configurationCards(rootOf(detailsPage([36918])))).toEqual([36918]);
  });
});

describe("resolveCurrentConfigId", () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = rootOf(detailsPage([36918, 34889, 34888]));
  });

  it("takes the configuration named in the URL", () => {
    expect(resolveCurrentConfigId(root, "?selected_config=34889")).toBe(34889);
  });

  it("keeps the URL's answer even when it isn't one of the cards", () => {
    /* The cards are what the model comes in; the parameter is what's on screen. */
    expect(resolveCurrentConfigId(root, "?selected_config=41007")).toBe(41007);
  });

  it("resolves nothing on a model page with no configuration chosen", () => {
    /*
     * The page is asking the reader to pick — it heads its sidebar "Wähle ein
     * Auto" and prices the model "ab 209 €" rather than at any one
     * configuration. Picking whichever card is drawn first would be analysing
     * a car the reader hasn't chosen.
     */
    expect(resolveCurrentConfigId(root, "")).toBeNull();
  });

  it("resolves the only configuration when there is nothing to choose", () => {
    expect(resolveCurrentConfigId(rootOf(detailsPage([36918])), "")).toBe(36918);
  });

  it("ignores other query parameters", () => {
    expect(resolveCurrentConfigId(root, "?utm_source=x&selected_config=34888")).toBe(
      34888,
    );
  });
});

describe("config ids that aren't five digits", () => {
  it("reads a longer id whole rather than truncating it", () => {
    const root = rootOf(detailsPage([364918]));

    expect(configurationCards(root)).toEqual([364918]);
    expect(resolveCurrentConfigId(root, "?selected_config=364918")).toBe(364918);
  });

  it("refuses a parameter that isn't a number", () => {
    const root = rootOf(detailsPage([36918, 34889]));

    expect(resolveCurrentConfigId(root, "?selected_config=abc")).toBeNull();
  });
});
