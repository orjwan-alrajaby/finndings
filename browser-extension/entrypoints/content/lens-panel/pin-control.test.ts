import { beforeEach, describe, expect, it } from "vitest";
import { parseHTML } from "linkedom";

import { pinControl } from "./pin-control";
import { makeCar } from "@/lib/reasoning-engine/test-fixtures";
import type { PinnedFinnCar } from "@/lib/types";

/**
 * Pinning from the panel.
 *
 * There is one pinned set, not a panel one and a card one, so what matters is
 * that this writes where the card button writes and leaves the card button
 * telling the truth afterwards.
 */

let storage: Record<string, unknown>;
let document: Document;

const car = (over = {}) =>
  ({ ...makeCar({ id: 36933, name: "BYD Dolphin" }), url: "", ...over }) as PinnedFinnCar;

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  storage = {};

  const { document: page, window } = parseHTML(
    `<!doctype html><html><body>
      <div data-testid="product-card" data-productid="byd-dolphin-36933-black">
        <a href="https://www.finn.com/de-DE/models/byd/dolphin?selected_config=36933">BYD Dolphin</a>
        <button class="finn-lens-add-car-btn" data-pinned="false"></button>
      </div>
    </body></html>`,
  );

  Object.assign(globalThis, {
    document: page,
    window: Object.assign(window, {
      location: { href: "https://www.finn.com/de-DE/subscribe/byd" },
    }),
    browser: {
      storage: {
        local: {
          get: async (keys: string | string[]) =>
            Object.fromEntries(
              (Array.isArray(keys) ? keys : [keys])
                .filter((key) => key in storage)
                .map((key) => [key, storage[key]]),
            ),
          set: async (values: Record<string, unknown>) => {
            Object.assign(storage, values);
          },
        },
      },
    },
  });

  document = page as unknown as Document;
});

const pinned = () =>
  (storage.pinnedCars ?? {}) as Record<number, PinnedFinnCar>;

describe("pinControl", () => {
  it("offers to pin a car that isn't pinned", async () => {
    const button = pinControl(car());
    await settle();

    expect(button.textContent).toBe("Pin for comparison");
    expect(button.getAttribute("aria-pressed")).toBe("false");
  });

  it("shows a car that is already pinned as pinned", async () => {
    storage.pinnedCars = { 36933: car({ pinnedAt: "2026-01-01" }) };

    const button = pinControl(car());
    await settle();

    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.textContent).toContain("Pinned");
  });

  it("writes to the same pinned set the card button writes to", async () => {
    const button = pinControl(car());
    await settle();

    button.click();
    await settle();

    expect(Object.keys(pinned())).toEqual(["36933"]);
    expect(pinned()[36933]?.pinnedAt).toBeTruthy();
  });

  it("pins the car's own page, not the page the reader is on", async () => {
    /* A pinned car is one to open again later, so the URL has to be its own. */
    const button = pinControl(car());
    await settle();

    button.click();
    await settle();

    expect(pinned()[36933]?.url).toContain("selected_config=36933");
  });

  it("leaves the card's own button telling the truth", async () => {
    const button = pinControl(car());
    await settle();

    button.click();
    await settle();

    expect(
      document.querySelector(".finn-lens-add-car-btn")?.getAttribute("data-pinned"),
    ).toBe("true");
  });

  it("unpins what it pinned", async () => {
    const button = pinControl(car());
    await settle();

    button.click();
    await settle();
    button.click();
    await settle();

    expect(Object.keys(pinned())).toEqual([]);
    expect(button.getAttribute("aria-pressed")).toBe("false");
  });
});
