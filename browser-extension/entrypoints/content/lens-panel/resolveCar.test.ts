import { beforeEach, describe, expect, it } from "vitest";

import { makeCar } from "@/lib/reasoning-engine/test-fixtures";
import type { FinnCar } from "@/lib/types";

import { resolveCar } from "./currentCar";

/**
 * Answering "which car is this?" for a button that is drawn before the answer
 * exists.
 *
 * The control on a card now appears the moment the card does, alongside the
 * pin button, while the car's data arrives separately — finn.com draws the
 * cards, and the interceptor's copy of FINN's own response reaches storage
 * afterwards. So a reader can very reasonably click a car we are about to
 * know about, and "we couldn't load this car" would be a lie told
 * milliseconds before it stopped being one.
 *
 * Hence a wait, and hence its two limits: it wakes on the write rather than
 * polling for it, and it gives up rather than spinning forever on a car FINN
 * never sends.
 */

let storage: Record<string, unknown>;
let listeners: ((
  changes: Record<string, unknown>,
  areaName: string,
) => void)[];

/** Writes the way `mergeLoadedCars` does — value, then the event. */
function land(...cars: FinnCar[]) {
  storage.loadedCarsFromFinnApi = {
    cars: Object.fromEntries(cars.map((car) => [car.id, car])),
    total: cars.length,
  };

  for (const listener of listeners) {
    listener({ loadedCarsFromFinnApi: {} }, "local");
  }
}

beforeEach(() => {
  storage = {};
  listeners = [];

  Object.assign(globalThis, {
    window: { location: { href: "https://www.finn.com/de-DE/cars" } },
    browser: {
      storage: {
        local: {
          get: async (keys: string | string[]) =>
            Object.fromEntries(
              (Array.isArray(keys) ? keys : [keys])
                .filter((key) => key in storage)
                .map((key) => [key, storage[key]]),
            ),
        },
        onChanged: {
          addListener: (fn: (typeof listeners)[number]) => {
            listeners.push(fn);
          },
          removeListener: (fn: (typeof listeners)[number]) => {
            listeners = listeners.filter((item) => item !== fn);
          },
        },
      },
    },
  });
});

describe("resolveCar", () => {
  it("answers straight away from what is already in hand", async () => {
    land(makeCar({ id: 36933 }));

    expect((await resolveCar(36933))?.id).toBe(36933);
  });

  it("prefers the pinned copy, which carries a real pinned date", async () => {
    land(makeCar({ id: 36933, name: "Cached" }));

    storage.pinnedCars = {
      36933: { ...makeCar({ id: 36933, name: "Pinned" }), pinnedAt: "2026-01-01" },
    };

    expect((await resolveCar(36933))?.name).toBe("Pinned");
  });

  /* Without a wait asked for, nothing is waited for. */
  it("says no immediately when it is not allowed to wait", async () => {
    expect(await resolveCar(36933)).toBeNull();
  });

  it("waits for a car that is still on its way", async () => {
    const pending = resolveCar(36933, { waitMs: 1000 });

    /* The interceptor's response reaches storage a moment later. */
    land(makeCar({ id: 36933 }));

    expect((await pending)?.id).toBe(36933);
  });

  it("ignores a write that brings some other car", async () => {
    const pending = resolveCar(36933, { waitMs: 120 });

    land(makeCar({ id: 34889 }));

    expect(await pending).toBeNull();
  });

  it("gives up rather than spinning on a car FINN never sends", async () => {
    expect(await resolveCar(36933, { waitMs: 40 })).toBeNull();
  });

  /* The listener lives on somebody else's event bus; it has to come off. */
  it("unsubscribes whether it found the car or not", async () => {
    await resolveCar(36933, { waitMs: 30 });

    expect(listeners).toHaveLength(0);

    const pending = resolveCar(36933, { waitMs: 1000 });

    land(makeCar({ id: 36933 }));
    await pending;

    expect(listeners).toHaveLength(0);
  });
});
