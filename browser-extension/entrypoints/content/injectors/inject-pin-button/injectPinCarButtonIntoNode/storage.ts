import type { FinnCar, PinnedFinnCar } from "@/lib/types";

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

export async function getLoadedCars(): Promise<Record<number, FinnCar>> {
  const {
    loadedCarsFromFinnApi,
  }: {
    loadedCarsFromFinnApi?: { cars: Record<number, FinnCar>; total: number };
  } = await browser.storage.local.get("loadedCarsFromFinnApi");

  return loadedCarsFromFinnApi?.cars ?? {};
}

export async function mergeLoadedCars(newCars: Record<number, FinnCar>) {
  const {
    loadedCarsFromFinnApi = { cars: {}, total: 0 },
  }: {
    loadedCarsFromFinnApi: { cars: Record<number, FinnCar>; total: number };
  } = await browser.storage.local.get("loadedCarsFromFinnApi");

  await browser.storage.local.set({
    loadedCarsFromFinnApi: {
      cars: { ...loadedCarsFromFinnApi.cars, ...newCars },
      total: loadedCarsFromFinnApi.total + Object.keys(newCars).length,
    },
  });
}