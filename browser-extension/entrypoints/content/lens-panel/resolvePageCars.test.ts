import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseHTML } from "linkedom";

import { makeCar } from "@/lib/reasoning-engine/test-fixtures";
import type { FinnCar } from "@/lib/types";

import { resolvePageCars } from "./currentCar";

/**
 * Reading a whole model page's worth of cars.
 *
 * The properties worth holding onto are about restraint: the panel asks FINN
 * for nothing it already has, asks once when it does have to ask, and never
 * reports a car it couldn't actually load.
 */

const page = `
  <div data-appid="product-details">
    <h1>BYD Dolphin Surf</h1>
    <div data-testid="group-comparison">
      <div id="product-36918"></div>
      <div id="product-34889"></div>
      <div id="product-34888"></div>
    </div>
  </div>
`;

let storage: Record<string, unknown>;
let fetchCalls: string[];

function cache(...cars: FinnCar[]) {
  storage.loadedCarsFromFinnApi = {
    cars: Object.fromEntries(cars.map((car) => [car.id, car])),
    total: cars.length,
  };
}

function root(search = ""): HTMLElement {
  const { document } = parseHTML(
    `<!doctype html><html lang="de-DE"><body>${page}</body></html>`,
  );

  Object.assign(globalThis, {
    document,
    window: {
      location: {
        href: `https://www.finn.com/de-DE/models/byd/dolphin-surf${search}`,
        pathname: "/de-DE/models/byd/dolphin-surf",
        search,
      },
    },
  });

  return document.querySelector(
    'div[data-appid="product-details"]',
  ) as unknown as HTMLElement;
}

beforeEach(() => {
  storage = {};
  fetchCalls = [];

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
          set: async (values: Record<string, unknown>) => {
            Object.assign(storage, values);
          },
        },
      },
    },
    fetch: async (url: string) => {
      fetchCalls.push(url);

      return { ok: true, json: async () => ({ results: [] }) };
    },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("resolvePageCars", () => {
  it("returns every configuration the page lists, in its order", async () => {
    cache(makeCar({ id: 36918 }), makeCar({ id: 34889 }), makeCar({ id: 34888 }));

    const result = await resolvePageCars(root());

    expect(result.status).toBe("ready");
    expect(result.status === "ready" && result.cars.map((car) => car.id)).toEqual([
      36918, 34889, 34888,
    ]);
    expect(fetchCalls).toHaveLength(0);
  });

  it("reports which one the URL selected", async () => {
    cache(makeCar({ id: 36918 }), makeCar({ id: 34889 }), makeCar({ id: 34888 }));

    const result = await resolvePageCars(root("?selected_config=34889"));

    expect(result.status === "ready" && result.selectedId).toBe(34889);
  });

  it("selects nothing when the URL doesn't say", async () => {
    cache(makeCar({ id: 36918 }), makeCar({ id: 34889 }), makeCar({ id: 34888 }));

    const result = await resolvePageCars(root());

    expect(result.status === "ready" && result.selectedId).toBeNull();
  });

  it("leads with a selected car the page doesn't list", async () => {
    /* A configuration reached by link is still the car the reader opened. */
    cache(makeCar({ id: 41007 }), makeCar({ id: 36918 }), makeCar({ id: 34889 }));

    const result = await resolvePageCars(root("?selected_config=41007"));

    expect(result.status === "ready" && result.cars[0]?.id).toBe(41007);
    expect(result.status === "ready" && result.selectedId).toBe(41007);
  });

  it("prefers the pinned record, so a pinned car keeps its pinned date", async () => {
    storage.pinnedCars = {
      34889: { ...makeCar({ id: 34889 }), pinnedAt: "2026-02-01T00:00:00.000Z" },
    };
    cache(makeCar({ id: 36918 }), makeCar({ id: 34888 }));

    const result = await resolvePageCars(root());

    const pinned =
      result.status === "ready"
        ? result.cars.find((car) => car.id === 34889)
        : null;

    expect(pinned?.pinnedAt).toBe("2026-02-01T00:00:00.000Z");
    expect(fetchCalls).toHaveLength(0);
  });

  it("asks FINN once when anything is missing, not once per car", async () => {
    cache(makeCar({ id: 36918 }));

    await resolvePageCars(root());

    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0]).toContain("brands=BYD");
    expect(fetchCalls[0]).toContain("models=Dolphin%20Surf");
  });

  it("still answers with what it has when the call brings nothing back", async () => {
    cache(makeCar({ id: 36918 }));

    const result = await resolvePageCars(root());

    expect(result.status === "ready" && result.cars.map((car) => car.id)).toEqual([
      36918,
    ]);
  });

  it("says so when it could load none of them", async () => {
    const result = await resolvePageCars(root());

    expect(result.status).toBe("unavailable");
  });

  it("says so when the page lists no cars at all", async () => {
    const { document } = parseHTML(
      '<!doctype html><html><body><div data-appid="product-details"></div></body></html>',
    );
    Object.assign(globalThis, { document });

    const empty = document.querySelector(
      'div[data-appid="product-details"]',
    ) as unknown as HTMLElement;

    expect((await resolvePageCars(empty)).status).toBe("unidentified");
  });
});
