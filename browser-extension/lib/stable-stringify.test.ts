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

import { stableStringify } from "./stable-stringify";

/**
 * What a page compares to decide whether anything is unsaved.
 *
 * Written against settings because that is the shape with the most ways to
 * go wrong, and the only interesting property is that it answers on the
 * values and not on how the object holding them happened to be built — the
 * settings page assembles its settings in a different field order than
 * `loadLensSettings` does, and a comparison sensitive to that would call
 * every freshly loaded page unsaved. The compare drawer's draft is compared
 * the same way, for the same reason.
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

describe("stableStringify", () => {
  it("is the same for the same settings", () => {
    expect(stableStringify(settings())).toBe(stableStringify(settings()));
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

    expect(stableStringify(rebuilt)).toBe(stableStringify(loaded));
  });

  it("doesn't care what order a record's keys were inserted in", () => {
    const reversed = Object.fromEntries(
      Object.entries(DEFAULT_CATEGORY_FEATURES).reverse(),
    ) as typeof DEFAULT_CATEGORY_FEATURES;

    expect(stableStringify(settings({ categoryFeatures: reversed }))).toBe(
      stableStringify(settings()),
    );
  });

  it("notices a reordered priority list, which is an actual change", () => {
    const [first, second, ...rest] = DEFAULT_PRIORITIES;

    expect(
      stableStringify(settings({ priorities: [second, first, ...rest] as never })),
    ).not.toBe(stableStringify(settings()));
  });

  it("notices a dropped priority", () => {
    expect(
      stableStringify(settings({ priorities: DEFAULT_PRIORITIES.slice(0, 3) })),
    ).not.toBe(stableStringify(settings()));
  });

  it("notices a changed driving assumption", () => {
    expect(
      stableStringify(
        settings({
          preferences: { ...DEFAULT_PREFERENCES, monthlyBudget: 123 },
        }),
      ),
    ).not.toBe(stableStringify(settings()));
  });

  it("notices a feature raised inside a priority", () => {
    expect(
      stableStringify(
        settings({
          categoryFeatures: {
            ...DEFAULT_CATEGORY_FEATURES,
            safetyAssistance: [
              { key: "hasBlindSpotAssist", importance: "high" },
            ],
          },
        }),
      ),
    ).not.toBe(stableStringify(settings()));
  });
});
