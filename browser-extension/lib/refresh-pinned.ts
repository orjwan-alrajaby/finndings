import type { FinnCar, PinnedFinnCar } from "@/lib/types";

/**
 * Pinned cars with FINN's latest prices, terms and delivery dates.
 *
 * A pin is a snapshot taken when the reader pressed the button, and prices,
 * terms and delivery windows are exactly the parts of a listing FINN changes
 * afterwards. Everything else about a pin — the car itself, when it was pinned,
 * its link — stays as it was. A car without fresher data is left untouched,
 * and the result is null when nothing changed, so a caller can skip a write.
 */
export function refreshPinnedCars(
  pinned: Record<number, PinnedFinnCar>,
  fresh: Record<number, FinnCar>,
): Record<number, PinnedFinnCar> | null {
  let changed = false;
  const next = { ...pinned };

  for (const [id, car] of Object.entries(pinned)) {
    const latest = fresh[Number(id)];

    if (!latest?.contract) continue;

    const refreshed: PinnedFinnCar = {
      ...car,
      pricing: latest.pricing,
      availability: latest.availability,
      contract: latest.contract,
    };

    if (
      JSON.stringify([car.pricing, car.availability, car.contract]) !==
      JSON.stringify([refreshed.pricing, refreshed.availability, refreshed.contract])
    ) {
      next[Number(id)] = refreshed;
      changed = true;
    }
  }

  return changed ? next : null;
}
