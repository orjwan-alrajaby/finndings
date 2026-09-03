import { beforeEach, describe, expect, it } from "vitest";
import { parseHTML } from "linkedom";

import {
  applyFitVerdicts,
  injectFitBadges,
  injectFitButtons,
  refreshFitBadges,
  removeFitBadges,
} from "./card-badges";
import { cardConfigId } from "./currentCar";
import { AVAILABLE_CATEGORY_FEATURES } from "@/lib/reasoning-engine/constants";
import { makeCar } from "@/lib/reasoning-engine/test-fixtures";
import type { FinnCar } from "@/lib/types";

/**
 * Lens's control on the cards, and the verdict that catches up with it.
 *
 * Two separate promises, and the tests are split the same way.
 *
 * The **control** is unconditional. It goes on with the pin button, needs
 * nothing but the card, and is always clickable — because the thing that used
 * to gate it, the car's data, arrives after the card does, and gating on it
 * made the button appear on some page loads and not others.
 *
 * The **verdict** needs the car's data, and says nothing without it — a pill
 * that stayed a question is the honest state for a car FINN told us nothing
 * about. What it no longer needs is the reader's settings: Lens ships
 * defaults, so it always has an opinion, and the honesty that used to be
 * bought by silence is bought by the panel instead, which names whose
 * assumptions produced the band before showing it.
 *
 * The card still gets its markup back untouched at the end.
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

const verdicts = () => document.querySelectorAll("[data-finn-lens-verdict]");

describe("injectFitButtons", () => {
  /*
   * The whole point of splitting this out. The pin button appears the moment
   * a card exists because it needs nothing else; this now does too, so the
   * two controls on one card never appear at different times again.
   */
  it("puts a control on every card with nothing read at all", () => {
    injectFitButtons();

    expect(badges()).toHaveLength(3);
    expect(verdicts()).toHaveLength(0);
  });

  it("needs no settings, no cars and no awaiting", () => {
    /* Synchronous on purpose: it runs inside the pin button's own pass. */
    injectFitButtons();

    expect(badges()).toHaveLength(3);
  });

  it("asks a question rather than making a claim", () => {
    injectFitButtons();

    expect(badges()[0]?.textContent).toContain("How does it fit?");
    expect(badges()[0]?.textContent).not.toMatch(/match/i);
  });

  it("names the car it will open, for anyone not looking at it", () => {
    injectFitButtons();

    expect(badges()[0]?.getAttribute("aria-label")).toBe(
      "FINN Lens: see how BYD Dolphin fits you.",
    );
  });

  it("puts one control on a card, however many passes run over it", () => {
    injectFitButtons();
    injectFitButtons();
    injectFitButtons();

    expect(badges()).toHaveLength(3);
  });

  it("gives the block it hangs the pill on a positioning context", () => {
    injectFitButtons();

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

  it("offers the reasoning rather than only hinting at it", () => {
    injectFitButtons();

    /*
     * The pill sits on a photograph inside a card that is itself a link, so
     * a bare chevron reads as "this opens the car" — the one thing this
     * control does not do.
     */
    expect(badges()[0]?.textContent).toContain("Why");
  });
});

describe("applyFitVerdicts", () => {
  it("puts a verdict on every card it has both settings and data for", async () => {
    configured();
    cache(
      makeCar({ id: 36933, features: SAFETY.slice(0, 9) as never }),
      makeCar({ id: 34889, features: SAFETY.slice(0, 4) as never }),
    );

    await injectFitBadges();

    expect(verdicts()).toHaveLength(2);
    expect(badges()[0]?.textContent).toMatch(/match/i);
  });

  /*
   * Lens ships defaults, so it has an opinion before the reader gives it one
   * and there is no reason to withhold it — the pill would otherwise sit on
   * the card saying nothing about a car we can perfectly well read.
   *
   * The rule behind the old refusal is kept where there is room to keep it:
   * the panel this pill opens leads with `defaultsNotice`, which says whose
   * assumptions produced the band before the reader gets to the band.
   */
  it("gives a verdict from Lens's own defaults before the reader answers", async () => {
    cache(makeCar({ id: 36933, features: SAFETY as never }));

    await injectFitBadges();

    expect(verdicts()).toHaveLength(1);
    expect(badges()[0]?.textContent).toMatch(/match/i);
  });

  it("claims nothing about a car it doesn't already have", async () => {
    /* Forty cards are not forty reasons to call FINN's API. */
    configured();
    cache(makeCar({ id: 36933, features: SAFETY as never }));

    await injectFitBadges();

    expect(verdicts()).toHaveLength(1);
    expect(
      document.getElementById("product-34889")?.getAttribute(
        "data-finn-lens-verdict",
      ),
    ).toBeNull();
  });

  it("claims nothing about a car FINN listed no equipment for", async () => {
    configured();
    cache(makeCar({ id: 36933, features: [] }));

    await injectFitBadges();

    expect(verdicts()).toHaveLength(0);
    expect(badges()[0]?.textContent).toContain("How does it fit?");
  });

  it("names the car and the verdict for anyone not looking at it", async () => {
    configured();
    cache(makeCar({ id: 36933, name: "BYD Dolphin", features: SAFETY as never }));

    await injectFitBadges();

    expect(badges()[0]?.getAttribute("aria-label")).toMatch(
      /FINN Lens: .*match for BYD Dolphin/,
    );
  });

  /*
   * The car's data arrives after the card. A control drawn before it must
   * pick the verdict up when it lands rather than staying a question — and
   * must not be torn down and rebuilt to do it, or a reader mid-click loses
   * the button under their cursor.
   */
  it("upgrades a control in place when the data lands", async () => {
    configured();

    injectFitButtons();

    const before = badges()[0];

    expect(before?.textContent).toContain("How does it fit?");

    /* The interceptor's response reaches storage. */
    cache(makeCar({ id: 36933, features: SAFETY as never }));

    await applyFitVerdicts();

    expect(badges()[0]).toBe(before);
    expect(before?.textContent).toMatch(/match/i);
  });

  it("verdicts a card once, however many passes run over it", async () => {
    configured();
    cache(makeCar({ id: 36933, features: SAFETY as never }));

    await injectFitBadges();
    await injectFitBadges();
    await injectFitBadges();

    expect(badges()).toHaveLength(3);
    expect(verdicts()).toHaveLength(1);
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

    expect(verdicts()).toHaveLength(0);
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

    expect(badges()).toHaveLength(3);
    expect(verdicts()).toHaveLength(1);
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
