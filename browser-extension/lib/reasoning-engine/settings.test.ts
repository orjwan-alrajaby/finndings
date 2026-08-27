import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AVAILABLE_CATEGORY_FEATURES,
  DEFAULT_CATEGORY_FEATURES,
  DEFAULT_DEFAULT_PROFILE_ID,
  DEFAULT_PROFILES,
  MAX_FEATURES_PER_CATEGORY,
  PROFILES,
} from "./constants";

/**
 * Settings migration.
 *
 * Merging two categories into one and turning profiles into fixed
 * configuration are both changes that land on people who already have data
 * stored. None of it may be silently dropped, and nothing may come back in a
 * shape the current build can't render.
 */

/* A minimal stand-in for the extension storage API. */
let stored: Record<string, unknown> = {};

vi.stubGlobal("browser", {
  storage: {
    local: {
      get: async (keys: string[]) =>
        Object.fromEntries(
          keys
            .filter((key) => key in stored)
            .map((key) => [key, stored[key]]),
        ),
      set: async (values: Record<string, unknown>) => {
        stored = { ...stored, ...values };
      },
    },
  },
});

const { loadLensSettings } = await import("./index");

beforeEach(() => {
  stored = {};
});

/* -------------------------------------------------------------------------- */
/* The category merge                                                         */
/* -------------------------------------------------------------------------- */

describe("the safety merge reaches existing users without breaking them", () => {
  it("rewrites a stored priority order onto the merged category", async () => {
    stored.finnLensPriorities = [
      "safety",
      "practicality",
      "driverAssistance",
      "comfort",
    ];

    const settings = await loadLensSettings();

    expect(settings.priorities).toEqual([
      "safetyAssistance",
      "practicality",
      "comfort",
    ]);
  });

  /*
   * Someone who ranked safety #1 and driver assistance #4 cared most about
   * the first position, so that is the one the merged priority keeps.
   */
  it("collapses the duplicate a merge creates to the higher position", async () => {
    stored.finnLensPriorities = [
      "safety",
      "practicality",
      "comfort",
      "driverAssistance",
    ];

    const settings = await loadLensSettings();

    expect(settings.priorities[0]).toBe("safetyAssistance");
    expect(
      settings.priorities.filter((id) => id === "safetyAssistance"),
    ).toHaveLength(1);
  });

  it("still drops the retired affordability priority", async () => {
    stored.finnLensPriorities = ["affordability", "safety", "practicality"];

    const settings = await loadLensSettings();

    expect(settings.priorities).not.toContain("affordability");
    expect(settings.priorities).toContain("safetyAssistance");
  });

  it("folds both old feature lists into the merged one", async () => {
    stored.finnLensCategoryFeatures = {
      safety: [
        { key: "hasEmergencyBrakingAssist", tier: "essential" },
        { key: "hasBlindSpotAssist", tier: "essential" },
      ],
      driverAssistance: [
        { key: "hasAdaptiveCruiseControl", tier: "good" },
        { key: "hasParkingSensors", tier: "good" },
      ],
    };

    const settings = await loadLensSettings();
    const merged = settings.categoryFeatures.safetyAssistance;

    const keys = merged.map((feature) => feature.key);

    expect(keys).toContain("hasEmergencyBrakingAssist");
    expect(keys).toContain("hasAdaptiveCruiseControl");
    expect(merged.length).toBeLessThanOrEqual(MAX_FEATURES_PER_CATEGORY);
  });

  /* The same feature sat in both old lists, sometimes at different tiers. */
  it("keeps the louder tier when a merge duplicates a feature", async () => {
    stored.finnLensCategoryFeatures = {
      safety: [{ key: "hasEmergencyBrakingAssist", tier: "essential" }],
      driverAssistance: [{ key: "hasEmergencyBrakingAssist", tier: "good" }],
    };

    const settings = await loadLensSettings();
    const merged = settings.categoryFeatures.safetyAssistance;

    expect(merged).toHaveLength(1);
    expect(merged[0]?.tier).toBe("essential");
  });

  it("caps a merged list that overflows the maximum", async () => {
    stored.finnLensCategoryFeatures = {
      safety: AVAILABLE_CATEGORY_FEATURES.safetyAssistance.slice(0, 5),
      driverAssistance: AVAILABLE_CATEGORY_FEATURES.safetyAssistance.slice(
        5,
        10,
      ),
    };

    const settings = await loadLensSettings();

    expect(
      settings.categoryFeatures.safetyAssistance,
    ).toHaveLength(MAX_FEATURES_PER_CATEGORY);
  });
});

/* -------------------------------------------------------------------------- */
/* Feature lists                                                              */
/* -------------------------------------------------------------------------- */

describe("stored feature lists are brought up to the current rules", () => {
  it("drops features the catalogue no longer offers", async () => {
    stored.finnLensCategoryFeatures = {
      practicality: [
        { key: "hasSplitFoldingRearSeats", tier: "essential" },
        { key: "hasSomethingRemoved", tier: "good" },
      ],
    };

    const settings = await loadLensSettings();
    const keys = settings.categoryFeatures.practicality.map((f) => f.key);

    expect(keys).toContain("hasSplitFoldingRearSeats");
    expect(keys).not.toContain("hasSomethingRemoved");
  });

  /*
   * A priority with nothing enabled silently stops meaning anything while
   * still appearing in the user's order, which is worse than resetting it.
   */
  it("restores the defaults rather than leaving a priority with nothing", async () => {
    stored.finnLensCategoryFeatures = { practicality: [] };

    const settings = await loadLensSettings();

    expect(settings.categoryFeatures.practicality).toEqual(
      DEFAULT_CATEGORY_FEATURES.practicality,
    );
  });

  it("leaves untouched categories on their defaults", async () => {
    stored.finnLensCategoryFeatures = {
      practicality: [{ key: "hasRoofRails", tier: "good" }],
    };

    const settings = await loadLensSettings();

    expect(settings.categoryFeatures.comfort).toEqual(
      DEFAULT_CATEGORY_FEATURES.comfort,
    );
  });
});

/* -------------------------------------------------------------------------- */
/* Profiles                                                                   */
/* -------------------------------------------------------------------------- */

describe("profiles are configuration, and reconcile to the shipped set", () => {
  it("rebuilds a profile edited by an older build", async () => {
    stored.finnLensProfiles = [
      {
        id: "family",
        label: "My Renamed Profile",
        icon: "🚗",
        forWhom: "whatever",
        assumes: "whatever",
        priorities: ["comfort"],
        enabled: true,
      },
    ];

    const settings = await loadLensSettings();
    const family = settings.profiles.find((p) => p.id === "family")!;

    expect(family.label).toBe(PROFILES.family.label);
    expect(family.priorities).toEqual([...PROFILES.family.priorities]);
  });

  it("brings back profiles an older build deleted", async () => {
    stored.finnLensProfiles = [
      { ...DEFAULT_PROFILES[0], enabled: true },
    ];

    const settings = await loadLensSettings();

    expect(settings.profiles).toHaveLength(DEFAULT_PROFILES.length);
  });

  /* Enabled state is the one thing the user owns, so it survives. */
  it("keeps which profiles the user switched off", async () => {
    stored.finnLensProfiles = DEFAULT_PROFILES.map((profile) => ({
      ...profile,
      enabled: profile.id !== "eco",
    }));

    const settings = await loadLensSettings();

    expect(
      settings.profiles.find((p) => p.id === "eco")?.enabled,
    ).toBe(false);
    expect(
      settings.profiles.find((p) => p.id === "family")?.enabled,
    ).toBe(true);
  });

  it("never comes back with every profile switched off", async () => {
    stored.finnLensProfiles = DEFAULT_PROFILES.map((profile) => ({
      ...profile,
      enabled: false,
    }));

    const settings = await loadLensSettings();

    expect(settings.profiles.some((profile) => profile.enabled)).toBe(true);
  });

  it("falls back to the shipped default when the stored one is unknown", async () => {
    stored.finnLensDefaultProfileId = "a-profile-that-never-existed";

    const settings = await loadLensSettings();

    expect(settings.defaultProfileId).toBe(DEFAULT_DEFAULT_PROFILE_ID);
  });

  it("keeps a valid stored default", async () => {
    stored.finnLensDefaultProfileId = "eco";

    expect((await loadLensSettings()).defaultProfileId).toBe("eco");
  });
});

/* -------------------------------------------------------------------------- */
/* Default profile means selected                                             */
/* -------------------------------------------------------------------------- */

describe("the default profile is the one you actually start on", () => {
  it("starts a fresh install on the default profile's order", async () => {
    const settings = await loadLensSettings();

    expect(settings.priorities).toEqual([
      ...PROFILES[DEFAULT_DEFAULT_PROFILE_ID].priorities,
    ]);
  });

  it("uses the user's chosen default rather than the shipped one", async () => {
    stored.finnLensDefaultProfileId = "roadtrip";

    const settings = await loadLensSettings();

    expect(settings.priorities).toEqual([...PROFILES.roadtrip.priorities]);
  });

  /* A profile that is switched off can't be what you're started on. */
  it("skips a disabled default rather than starting you on it", async () => {
    stored.finnLensDefaultProfileId = "roadtrip";
    stored.finnLensProfiles = DEFAULT_PROFILES.map((profile) => ({
      ...profile,
      enabled: profile.id !== "roadtrip",
    }));

    const settings = await loadLensSettings();

    expect(settings.priorities).not.toEqual([
      ...PROFILES.roadtrip.priorities,
    ]);
    expect(settings.priorities.length).toBeGreaterThan(0);
  });

  /*
   * A profile is a starting point, not something that reasserts itself. Once
   * the user has an order of their own it survives everything else.
   */
  it("never overrides an order the user set themselves", async () => {
    stored.finnLensDefaultProfileId = "eco";
    stored.finnLensPriorities = ["comfort", "practicality"];

    const settings = await loadLensSettings();

    expect(settings.priorities).toEqual(["comfort", "practicality"]);
  });
});
