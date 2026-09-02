import { beforeEach, describe, expect, it } from "vitest";
import { parseHTML } from "linkedom";

import {
  injectFitBadges,
  refreshFitBadges,
  removeFitBadges,
} from "./card-badges";
import { cardConfigId } from "./currentCar";
import { AVAILABLE_CATEGORY_FEATURES } from "@/lib/reasoning-engine/constants";
import { makeCar } from "@/lib/reasoning-engine/test-fixtures";
import type { FinnCar } from "@/lib/types";

/**
 * Lens's verdict on the cards, before anything is opened.
 *
 * What these protect is restraint. A badge is a claim about the reader's own
 * preferences, so it appears only where there are preferences to claim it
 * from and data to base it on — and where either is missing, the card is left
 * exactly as FINN drew it.
 */

const SAFETY = AVAILABLE_CATEGORY_FEATURES.safetyAssistance;

const page = `
  <div data-testid="product-card" data-productid="byd-dolphin-36933-obsidianblack">
    <div class="group"><h3><a href="/de-DE/models/byd/dolphin?selected_config=36933">BYD Dolphin</a></h3></div>
  </div>
  <div data-testid="product-card" data-productid="mg-4-33797-black">
    <div class="group"><h3><a href="/x">MG 4</a></h3></div>
  </div>
  <div data-appid="product-details">
    <div data-testid="group-comparison">
      <div id="product-34889">Comfort</div>
    </div>
  </div>
`;

let storage: Record<string, unknown>;

function render() {
  const { document, window } = parseHTML(
    `<!doctype html><html><head></head><body>${page}</body></html>`,
  );

  Object.assign(globalThis, { document, window });

  return document as unknown as Document;
}

let document: Document;

function cache(...cars: FinnCar[]) {
  storage.loadedCarsFromFinnApi = {
    cars: Object.fromEntries(cars.map((car) => [car.id, car])),
    total: cars.length,
  };
}

function configured() {
  storage.finnLensPriorities = ["safetyAssistance", "practicality", "comfort"];
}

beforeEach(() => {
  storage = {};
  document = render();

  Object.assign(globalThis, {
    browser: {
      storage: {
        local: {
          get: async (keys: string | string[]) =>
            Object.fromEntries(
              (Array.isArray(keys) ? keys : [keys])
                .filter((key) => key in storage)
                .map((key) => [key, storage[key]]),
            ),
          set: async () => {},
        },
      },
    },
  });
});

const badges = () => document.querySelectorAll(".finn-lens-fit-badge");

describe("cardConfigId", () => {
  it("reads a listing card's id out of its product id", () => {
    const card = document.querySelector<HTMLElement>("[data-productid]");

    expect(cardConfigId(card as HTMLElement)).toBe(36933);
  });

  it("reads a configuration card's id off the card itself", () => {
    const card = document.getElementById("product-34889");

    expect(cardConfigId(card as HTMLElement)).toBe(34889);
  });
});

describe("injectFitBadges", () => {
  it("puts a verdict on every card it has both settings and data for", async () => {
    configured();
    cache(
      makeCar({ id: 36933, features: SAFETY.slice(0, 9) as never }),
      makeCar({ id: 34889, features: SAFETY.slice(0, 4) as never }),
    );

    await injectFitBadges();

    expect(badges()).toHaveLength(2);
    expect(badges()[0]?.textContent).toMatch(/match/i);
  });

  it("says nothing at all when the reader hasn't set Lens up", async () => {
    /* A verdict measured against defaults they've never seen isn't theirs. */
    cache(makeCar({ id: 36933, features: SAFETY as never }));

    await injectFitBadges();

    expect(badges()).toHaveLength(0);
  });

  it("says nothing about a car it doesn't already have", async () => {
    /* Forty cards are not forty reasons to call FINN's API. */
    configured();
    cache(makeCar({ id: 36933, features: SAFETY as never }));

    await injectFitBadges();

    expect(badges()).toHaveLength(1);
    expect(
      document.getElementById("product-34889")?.querySelector(".finn-lens-fit-badge"),
    ).toBeNull();
  });

  it("says nothing about a car FINN listed no equipment for", async () => {
    configured();
    cache(makeCar({ id: 36933, features: [] }));

    await injectFitBadges();

    expect(badges()).toHaveLength(0);
  });

  it("names the car and the verdict for anyone not looking at it", async () => {
    configured();
    cache(makeCar({ id: 36933, name: "BYD Dolphin", features: SAFETY as never }));

    await injectFitBadges();

    expect(badges()[0]?.getAttribute("aria-label")).toMatch(
      /FINN Lens: .*match for BYD Dolphin/,
    );
  });

  it("badges a card once, however many passes run over it", async () => {
    configured();
    cache(makeCar({ id: 36933, features: SAFETY as never }));

    await injectFitBadges();
    await injectFitBadges();
    await injectFitBadges();

    expect(badges()).toHaveLength(1);
  });

  /*
   * The failure this whole mechanism exists to avoid, and the one that made
   * badges appear on some page loads and not others.
   *
   * A badge needs the car's data, and that does not arrive with the card:
   * finn.com draws the cards, and the interceptor's copy of FINN's own
   * response is written to storage some time afterwards. Every pass before
   * that write finds nothing — and must leave the card alone rather than
   * recording a decision, or the pass that could have answered never gets
   * the chance.
   */
  it("leaves a card it has no data for open to a later pass", async () => {
    configured();

    await injectFitBadges();

    expect(badges()).toHaveLength(0);

    /* The interceptor's response lands. */
    cache(makeCar({ id: 36933, features: SAFETY as never }));

    await injectFitBadges();

    expect(badges()).toHaveLength(1);
  });

  it("does not mark a card it said nothing about", async () => {
    configured();

    await injectFitBadges();

    expect(document.querySelectorAll("[data-finn-lens-fit]")).toHaveLength(0);
  });

  /*
   * finn.com moves between cars without reloading, and reading the settings
   * and the cache takes four storage round-trips — so a pass is easily still
   * in flight when the reader navigates and the page is cleared. It must not
   * come back and paint the previous page's verdicts onto the new one.
   */
  it("abandons a pass the reader has navigated away from", async () => {
    configured();
    cache(makeCar({ id: 36933, features: SAFETY as never }));

    const inFlight = injectFitBadges();

    removeFitBadges();

    await inFlight;

    expect(badges()).toHaveLength(0);
  });

  it("gives the block it hangs the pill on a positioning context", async () => {
    configured();
    cache(makeCar({ id: 36933, features: SAFETY as never }));

    await injectFitBadges();

    const badge = badges()[0] as HTMLElement;

    /*
     * An absolutely positioned pill inside a static parent escapes to
     * whichever ancestor is positioned — which reads to the user as a badge
     * that didn't load, because it is drawn somewhere other than the card it
     * belongs to.
     */
    expect(
      (badge.parentElement as HTMLElement).classList.contains("relative"),
    ).toBe(true);
  });

  it("offers the reasoning rather than only hinting at it", async () => {
    configured();
    cache(makeCar({ id: 36933, features: SAFETY as never }));

    await injectFitBadges();

    /*
     * The pill sits on a photograph inside a card that is itself a link, so
     * a bare chevron reads as "this opens the car" — the one thing this
     * control does not do.
     */
    expect(badges()[0]?.textContent).toContain("Why");
  });
});

describe("removeFitBadges", () => {
  it("gives the cards back", async () => {
    configured();
    cache(makeCar({ id: 36933, features: SAFETY as never }));

    const before = document.body.innerHTML;

    await injectFitBadges();
    removeFitBadges();

    expect(document.body.innerHTML).toBe(before);
  });

  it("lets a re-read replace a verdict rather than stack one", async () => {
    configured();
    cache(makeCar({ id: 36933, features: SAFETY as never }));

    await injectFitBadges();
    await refreshFitBadges();

    expect(badges()).toHaveLength(1);
  });

  /* Including the positioning it had to add to hang the pill on. */
  it("hands back a block it made positioned", async () => {
    configured();
    cache(makeCar({ id: 36933, features: SAFETY as never }));

    await injectFitBadges();
    removeFitBadges();

    expect(
      document.querySelectorAll("[data-finn-lens-anchored]"),
    ).toHaveLength(0);

    expect(document.body.innerHTML).not.toContain("relative");
  });
});
