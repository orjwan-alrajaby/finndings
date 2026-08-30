import { describe, expect, it } from "vitest";

import {
  DEFAULT_CATEGORY_FEATURES,
  DEFAULT_DEFAULT_PROFILE_ID,
  DEFAULT_PREFERENCES,
  DEFAULT_PRIORITIES,
  DEFAULT_PRIORITY_DEFINITIONS,
  DEFAULT_PROFILES,
} from "@/lib/reasoning-engine/constants";
import type { LensSettings } from "@/lib/reasoning-engine/types";

import { snapshot } from "./snapshot";

/**
 * What the settings page compares to decide whether anything is unsaved.
 *
 * The only interesting property is that it answers on the settings and not on
 * how the object holding them happened to be built — the page assembles its
 * settings in a different field order than `loadLensSettings` does, and a
 * comparison sensitive to that would call every freshly loaded page unsaved.
 */
const settings = (over: Partial<LensSettings> = {}): LensSettings => ({
  preferences: DEFAULT_PREFERENCES,
  priorities: DEFAULT_PRIORITIES,
  priorityDefinitions: DEFAULT_PRIORITY_DEFINITIONS,
  categoryFeatures: DEFAULT_CATEGORY_FEATURES,
  profiles: DEFAULT_PROFILES,
  defaultProfileId: DEFAULT_DEFAULT_PROFILE_ID,
  ...over,
});

describe("snapshot", () => {
  it("is the same for the same settings", () => {
    expect(snapshot(settings())).toBe(snapshot(settings()));
  });

  it("doesn't care what order the settings object was built in", () => {
    const loaded = settings();

    /* The same values, assembled the way loadLensSettings assembles them. */
    const rebuilt = {
      priorityDefinitions: loaded.priorityDefinitions,
      defaultProfileId: loaded.defaultProfileId,
      profiles: loaded.profiles,
      preferences: loaded.preferences,
      categoryFeatures: loaded.categoryFeatures,
      priorities: loaded.priorities,
    } as LensSettings;

    expect(snapshot(rebuilt)).toBe(snapshot(loaded));
  });

  it("doesn't care what order a record's keys were inserted in", () => {
    const reversed = Object.fromEntries(
      Object.entries(DEFAULT_CATEGORY_FEATURES).reverse(),
    ) as typeof DEFAULT_CATEGORY_FEATURES;

    expect(snapshot(settings({ categoryFeatures: reversed }))).toBe(
      snapshot(settings()),
    );
  });

  it("notices a reordered priority list, which is an actual change", () => {
    const [first, second, ...rest] = DEFAULT_PRIORITIES;

    expect(
      snapshot(settings({ priorities: [second, first, ...rest] as never })),
    ).not.toBe(snapshot(settings()));
  });

  it("notices a dropped priority", () => {
    expect(
      snapshot(settings({ priorities: DEFAULT_PRIORITIES.slice(0, 3) })),
    ).not.toBe(snapshot(settings()));
  });

  it("notices a changed driving assumption", () => {
    expect(
      snapshot(
        settings({
          preferences: { ...DEFAULT_PREFERENCES, monthlyBudget: 123 },
        }),
      ),
    ).not.toBe(snapshot(settings()));
  });

  it("notices a feature raised inside a priority", () => {
    expect(
      snapshot(
        settings({
          categoryFeatures: {
            ...DEFAULT_CATEGORY_FEATURES,
            safetyAssistance: [
              { key: "hasBlindSpotAssist", importance: "high" },
            ],
          },
        }),
      ),
    ).not.toBe(snapshot(settings()));
  });
});
