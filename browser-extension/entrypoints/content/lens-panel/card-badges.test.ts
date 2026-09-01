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
});
