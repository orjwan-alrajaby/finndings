import type { FinnApiConfig, PinnedFinnCar } from "@/lib/types";
import { mapFinnConfigToAll } from "@/entrypoints/content/manipulateApiData";

import snapshot from "./finn-fleet-snapshot.json";

/**
 * FINN's real inventory, as the engine's fleet tests see it.
 *
 * Rebuilt from the committed snapshot (see scripts/snapshot-finn-fleet.mjs)
 * into the shape FINN's API sends, then passed through the same mapper the
 * extension uses — so a test over this data is a test of the mapping too.
 */

interface SnapshotCar {
  features: {
    true: number[];
    values: Record<string, string | number>;
    absent: number[];
  };
  [field: string]: unknown;
}

function toConfig(car: SnapshotCar): FinnApiConfig {
  const { features, ...fields } = car;
  const absent = new Set(features.absent);
  const truthy = new Set(features.true);

  const list: Record<string, boolean | string | number> = {};

  snapshot.featureKeys.forEach((key, index) => {
    if (absent.has(index)) return;

    const value = features.values[String(index)];
    list[key] = value ?? truthy.has(index);
  });

  return {
    ...fields,
    brand: { ...(fields.brand as object), picture: { url: "" } },
    availability_by_term: {},
    color: { id: "", specific: "", color_hex: "" },
    picture: { url: "", type: "" },
    pictures: [],
    closed_features_list: list,
  } as unknown as FinnApiConfig;
}

let cached: PinnedFinnCar[] | null = null;

/** Every car in the snapshot, mapped. */
export function fleet(): PinnedFinnCar[] {
  cached ??= Object.values(
    mapFinnConfigToAll((snapshot.cars as SnapshotCar[]).map(toConfig)),
  ).map((car) => ({ ...car, url: "", pinnedAt: "" }));

  return cached;
}

/** When the snapshot was taken, for messages that quote its figures. */
export const FLEET_TAKEN_AT: string = snapshot.takenAt;

/** Lowest advertised private monthly price, for grouping comparable cars. */
export function monthlyPrice(car: PinnedFinnCar): number {
  return car.pricing.customerMonthly.price;
}
