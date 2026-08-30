import type { LensSettings } from "@/lib/reasoning-engine/types";

/**
 * The settings as one comparable string.
 *
 * Written out field by field with record keys sorted, rather than handed
 * straight to `JSON.stringify`: two objects holding identical settings
 * serialise differently if their keys were inserted in a different order, and
 * `loadLensSettings` and this page build theirs in different orders. Comparing
 * those directly would report every freshly loaded page as unsaved.
 */
export function snapshot(settings: LensSettings): string {
  const sorted = (record: Record<string, unknown>) =>
    Object.keys(record)
      .sort()
      .map((key) => [key, record[key]] as const);

  return JSON.stringify([
    sorted(settings.preferences as unknown as Record<string, unknown>),
    settings.priorities,
    settings.priorityDefinitions,
    sorted(settings.categoryFeatures as Record<string, unknown>),
    settings.profiles,
    settings.defaultProfileId,
  ]);
}
