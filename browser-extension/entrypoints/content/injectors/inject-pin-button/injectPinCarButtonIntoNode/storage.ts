import type { FinnCar, PinnedFinnCar } from "@/lib/types";
import { refreshPinnedCars } from "@/lib/refresh-pinned";

export interface FinnCarWithUrl extends FinnCar {
  url: string;
}

export async function getPinnedCars(): Promise<Record<number, PinnedFinnCar>> {
  const { pinnedCars = {} }: { pinnedCars: Record<number, PinnedFinnCar> } =
    await browser.storage.local.get("pinnedCars");
  return pinnedCars;
}

export async function updatePinnedCars(
  carConfigId: number,
  carDetails: FinnCarWithUrl
): Promise<{ wasPinned: boolean }> {
  const pinnedCars = await getPinnedCars();
  const next = { ...pinnedCars };
  const wasPinned = Boolean(next[carConfigId]);

  if (wasPinned) {
    delete next[carConfigId];
  } else {
    next[carConfigId] = { ...carDetails, pinnedAt: new Date().toISOString() };
  }

  await browser.storage.local.set({ pinnedCars: next });

  return { wasPinned };
}

/* -------------------------------------------------------------------------- */
/* The browsing cache                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Every car FINN's own pages have loaded while the reader browsed.
 *
 * It is a cache, not a record of intent — `pinnedCars` is that — and its whole
 * job is to make the panel and the card badges free: the car the reader is
 * looking at was already fetched by the page showing it, so asking FINN for it
 * again would be asking twice for the same answer.
 *
 * `total` is the number of distinct cars held. It used to be a running tally of
 * everything ever merged, which counted the same car once per page that
 * happened to list it and so drifted arbitrarily far from the size of the thing
 * it named.
 */
export interface LoadedCarsCache {
  cars: Record<number, FinnCar>;
  total: number;
}

const EMPTY_CACHE: LoadedCarsCache = { cars: {}, total: 0 };

/**
 * Reads the cache, tolerating anything actually found there.
 *
 * Storage is shared with earlier builds of this extension and can be edited by
 * hand, so what comes back is untrusted. A malformed record reads as an empty
 * cache rather than throwing: the caller's fallback is one API call, and losing
 * the content script to a bad `JSON` shape would take the pin buttons and the
 * badges down with it.
 */
async function readLoadedCache(): Promise<LoadedCarsCache> {
  try {
    const stored = await browser.storage.local.get("loadedCarsFromFinnApi");
    const value = stored.loadedCarsFromFinnApi as unknown;

    if (!value || typeof value !== "object") return { ...EMPTY_CACHE };

    const cars = (value as { cars?: unknown }).cars;

    if (!cars || typeof cars !== "object" || Array.isArray(cars)) {
      return { ...EMPTY_CACHE };
    }

    const entries = cars as Record<number, FinnCar>;

    return { cars: entries, total: Object.keys(entries).length };
  } catch (error) {
    console.error("[FinnLens] couldn't read the loaded-car cache", error);

    return { ...EMPTY_CACHE };
  }
}

export async function getLoadedCars(): Promise<Record<number, FinnCar>> {
  return (await readLoadedCache()).cars;
}

/**
 * Writes are serialised through one chain.
 *
 * Merging is read-modify-write, and FINN fires several `/api/cars` requests for
 * one page. Two of those landing at once would each read the same cache and the
 * second write would silently drop the first one's cars — which is the failure
 * this whole function exists to prevent, arriving by a different route.
 */
let writeQueue: Promise<void> = Promise.resolve();

/**
 * Adds cars to the cache, keeping everything already in it.
 *
 * Keyed by config id, so a car FINN lists on twenty pages is held once and the
 * freshest copy wins. Nothing is ever removed here: cars leave the cache only
 * when the browser clears storage.
 */
export async function mergeLoadedCars(
  newCars: Record<number, FinnCar>
): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    if (!newCars || !Object.keys(newCars).length) return;

    const existing = await readLoadedCache();
    const cars = { ...existing.cars, ...newCars };

    try {
      await browser.storage.local.set({
        loadedCarsFromFinnApi: {
          cars,
          total: Object.keys(cars).length,
        } satisfies LoadedCarsCache,
      });
    } catch (error) {
      console.error("[FinnLens] couldn't write the loaded-car cache", error);
    }

    /*
     * The same fresh data keeps pins current: prices, terms and delivery
     * windows change after a car is pinned, and a pin that kept the old ones
     * would be costed on a price FINN no longer offers.
     */
    try {
      const refreshed = refreshPinnedCars(await getPinnedCars(), newCars);

      if (refreshed) await browser.storage.local.set({ pinnedCars: refreshed });
    } catch (error) {
      console.error("[FinnLens] couldn't refresh pinned cars", error);
    }
  });

  return writeQueue;
}
