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

/**
 * One `onChanged` for the whole file, on purpose.
 *
 * `pin-control` subscribes once and keeps the subscription for the life of the
 * page, which is right in a content script and awkward in a test file that
 * rebuilds the world between cases: a fresh emitter per test would leave that
 * one subscription pointing at the first test's. So the emitter outlives the
 * tests, and it is the *controls* that come and go — which is what the module
 * sweeps for anyway.
 */
type ChangeListener = (
  changes: Record<string, { newValue?: unknown }>,
  areaName: string,
) => void;

const changeListeners: ChangeListener[] = [];

const onChanged = {
  addListener: (fn: ChangeListener) => changeListeners.push(fn),
  removeListener: (fn: ChangeListener) => {
    const at = changeListeners.indexOf(fn);

    if (at >= 0) changeListeners.splice(at, 1);
  },
};

/** What the browser sends every open surface after a write to the pinned set. */
const storedPinnedCarsChanged = () => {
  for (const listener of changeListeners) {
    listener({ pinnedCars: { newValue: storage.pinnedCars ?? {} } }, "local");
  }
};

/** On the page, which is the only state the module keeps a control for. */
const onPage = (button: HTMLElement) => {
  document.body.append(button);

  return button;
};

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
        onChanged,
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

    expect(button.textContent).toContain("Pin this car for comparison");
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

/**
 * The other direction, which is the one that was missing.
 *
 * The panel sits over the card it is about, so the card's own pin circle is
 * usually visible right behind it. Pressing that one wrote the pinned set and
 * told nobody, leaving the panel offering to pin a car that was already
 * pinned until it was closed and opened again.
 */
describe("a change made somewhere else", () => {
  it("pins the panel's button when the card behind it is pinned", async () => {
    const button = onPage(pinControl(car()));
    await settle();

    expect(button.getAttribute("aria-pressed")).toBe("false");

    storage.pinnedCars = { 36933: car({ pinnedAt: "2026-01-01" }) };
    storedPinnedCarsChanged();

    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.textContent).toContain("Pinned");
  });

  it("unpins it again when the car is dropped elsewhere", async () => {
    storage.pinnedCars = { 36933: car({ pinnedAt: "2026-01-01" }) };

    const button = onPage(pinControl(car()));
    await settle();

    expect(button.getAttribute("aria-pressed")).toBe("true");

    storage.pinnedCars = {};
    storedPinnedCarsChanged();

    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(button.textContent).toContain("Pin this car");
  });

  it("ignores a change about a car it isn't showing", async () => {
    const button = onPage(pinControl(car()));
    await settle();

    storage.pinnedCars = { 99999: car({ id: 99999 }) };
    storedPinnedCarsChanged();

    expect(button.getAttribute("aria-pressed")).toBe("false");
  });

  /*
   * The panel is thrown away and rebuilt on every render, so its buttons are
   * abandoned rather than unsubscribed. Nothing may keep them alive, or a long
   * browsing session accumulates one dead control per render.
   */
  it("lets go of a button that has left the page", async () => {
    const button = onPage(pinControl(car()));
    await settle();

    button.remove();

    storage.pinnedCars = { 36933: car({ pinnedAt: "2026-01-01" }) };
    storedPinnedCarsChanged();

    expect(button.getAttribute("aria-pressed")).toBe("false");
  });
});
