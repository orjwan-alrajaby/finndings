import { describe, expect, it } from "vitest";

import {
  AVAILABLE_CATEGORY_FEATURES,
  CATEGORIES,
  CATEGORY_IDS,
  DEFAULT_CATEGORY_FEATURES,
  DEFAULT_DEFAULT_PROFILE_ID,
  DEFAULT_PRIORITIES,
  DEFAULT_PROFILES,
  FEATURES,
  MAX_FEATURES_PER_CATEGORY,
  MIN_FEATURES_PER_CATEGORY,
  NUMERIC_ONLY_CATEGORIES,
  PROFILE_PRIORITY_COUNT,
  PROFILES,
} from "./constants";

import { validatePriorityDraft } from "@/entrypoints/settings/utils/PriorityValidation";
import type { CategoryId, FeatureWeight } from "./types";

/* -------------------------------------------------------------------------- */
/* One safety priority, not two                                               */
/* -------------------------------------------------------------------------- */

describe("safety and driver assistance are one priority", () => {
  it("no longer exist as separate categories", () => {
    expect(CATEGORY_IDS).not.toContain("safety");
    expect(CATEGORY_IDS).not.toContain("driverAssistance");
    expect(CATEGORY_IDS).toContain("safetyAssistance");
  });

  it("is named for what it covers", () => {
    expect(CATEGORIES.safetyAssistance.label).toBe(
      "Safety & Driver Assistance",
    );
  });

  /*
   * The merge exists because these systems overlapped: automatic emergency
   * braking was in both lists, so the user was ranking the same feature
   * against itself.
   */
  it("carries the systems that used to be split across the two", () => {
    const keys = AVAILABLE_CATEGORY_FEATURES.safetyAssistance.map(
      (feature) => feature.key,
    );

    expect(keys).toContain("hasEmergencyBrakingAssist");
    expect(keys).toContain("hasEmergencyCallSystem");
    expect(keys).toContain("hasAdaptiveCruiseControl");
    expect(keys).toContain("hasParkingAssistant");
  });

  it("is gone from every shipped profile", () => {
    for (const profile of DEFAULT_PROFILES) {
      expect(profile.priorities).not.toContain("safety");
      expect(profile.priorities).not.toContain("driverAssistance");
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Feature selection rules                                                    */
/* -------------------------------------------------------------------------- */

describe("feature selection", () => {
  const featureCategories = CATEGORY_IDS.filter(
    (id) => !NUMERIC_ONLY_CATEGORIES.includes(id),
  );

  it("never enables more than the maximum by default", () => {
    for (const id of CATEGORY_IDS) {
      expect(
        DEFAULT_CATEGORY_FEATURES[id].length,
      ).toBeLessThanOrEqual(MAX_FEATURES_PER_CATEGORY);
    }
  });

  /* Five is a cap, not a quota — a short catalogue starts fully enabled. */
  it("enables the whole catalogue when it is shorter than the maximum", () => {
    for (const id of CATEGORY_IDS) {
      const available = AVAILABLE_CATEGORY_FEATURES[id];

      if (available.length <= MAX_FEATURES_PER_CATEGORY) {
        expect(DEFAULT_CATEGORY_FEATURES[id]).toHaveLength(available.length);
      } else {
        expect(DEFAULT_CATEGORY_FEATURES[id]).toHaveLength(
          MAX_FEATURES_PER_CATEGORY,
        );
      }
    }
  });

  it("leaves every feature-based priority something to measure", () => {
    for (const id of featureCategories) {
      expect(
        DEFAULT_CATEGORY_FEATURES[id].length,
      ).toBeGreaterThanOrEqual(MIN_FEATURES_PER_CATEGORY);
    }
  });

  it("defaults to the front of the catalogue, so relevance order matters", () => {
    for (const id of CATEGORY_IDS) {
      expect(DEFAULT_CATEGORY_FEATURES[id]).toEqual(
        AVAILABLE_CATEGORY_FEATURES[id].slice(0, MAX_FEATURES_PER_CATEGORY),
      );
    }
  });

  it("offers more than it enables, so there is something to swap in", () => {
    const swappable = featureCategories.filter(
      (id) =>
        AVAILABLE_CATEGORY_FEATURES[id].length >
        DEFAULT_CATEGORY_FEATURES[id].length,
    );

    expect(swappable.length).toBe(featureCategories.length);
  });

  it("only offers features that actually exist in the data", () => {
    for (const id of CATEGORY_IDS) {
      for (const feature of AVAILABLE_CATEGORY_FEATURES[id]) {
        expect(FEATURES[feature.key]).toBeDefined();
      }
    }
  });

  it("never offers the same feature twice within one priority", () => {
    for (const id of CATEGORY_IDS) {
      const keys = AVAILABLE_CATEGORY_FEATURES[id].map(
        (feature) => feature.key,
      );

      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  /* The rules the editors enforce, checked at their edges. */
  it("refuses an empty feature list and one over the cap", () => {
    const feature = (key: string): FeatureWeight =>
      ({ key, tier: "good" }) as FeatureWeight;

    const id: CategoryId = "practicality";

    expect(validatePriorityDraft([], id)).toMatch(/at least one/i);

    expect(
      validatePriorityDraft(
        Array.from({ length: 6 }, (_, index) => feature(`f${index}`)),
        id,
      ),
    ).toMatch(/at most/i);

    expect(
      validatePriorityDraft(DEFAULT_CATEGORY_FEATURES[id], id),
    ).toBeNull();
  });

  /* A calculated priority has nothing to enable, so the rule doesn't apply. */
  it("exempts priorities measured from vehicle data", () => {
    expect(validatePriorityDraft([], "environmental")).toBeNull();
  });
});

/* -------------------------------------------------------------------------- */
/* Feature explanations                                                        */
/* -------------------------------------------------------------------------- */

describe("no reader should have to look a feature up elsewhere", () => {
  const offered = new Set(
    CATEGORY_IDS.flatMap((id) =>
      AVAILABLE_CATEGORY_FEATURES[id].map((feature) => feature.key),
    ),
  );

  it("explains every feature it offers, specifically", () => {
    for (const key of offered) {
      const { explanation } = FEATURES[key];

      expect(explanation.length).toBeGreaterThan(30);
      expect(explanation).toMatch(/[.!]$/);
    }
  });

  /*
   * The explanations are the one place vagueness does the most damage: a
   * reader who clicks "what is this?" and gets "provides useful everyday
   * assistance" has been told nothing and now trusts the page less.
   */
  it("never answers with filler", () => {
    const FILLER = [
      "useful everyday",
      "a general package",
      "designed to support",
      "improve your experience",
      "for added convenience",
      "and much more",
      "state of the art",
      "premium feel",
    ];

    for (const key of offered) {
      const explanation = FEATURES[key].explanation.toLowerCase();

      for (const phrase of FILLER) {
        expect(explanation).not.toContain(phrase);
      }
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Profiles                                                                   */
/* -------------------------------------------------------------------------- */

describe("profiles", () => {
  it("each carry exactly five priorities", () => {
    for (const profile of DEFAULT_PROFILES) {
      expect(profile.priorities).toHaveLength(PROFILE_PRIORITY_COUNT);
    }
  });

  it("never repeat a priority within one profile", () => {
    for (const profile of DEFAULT_PROFILES) {
      expect(new Set(profile.priorities).size).toBe(
        profile.priorities.length,
      );
    }
  });

  it("only reference priorities that exist", () => {
    for (const profile of DEFAULT_PROFILES) {
      for (const priority of profile.priorities) {
        expect(CATEGORY_IDS).toContain(priority);
      }
    }
  });

  it("all ship enabled, so the user starts with a full choice", () => {
    expect(DEFAULT_PROFILES.every((profile) => profile.enabled)).toBe(true);
  });

  /*
   * "Default" means automatically selected, not merely present in the list.
   * The starting priority order is therefore the default profile's own — if
   * these two ever drift apart, the product is claiming one thing and doing
   * another.
   */
  it("makes the default profile the one the user actually starts on", () => {
    expect(PROFILES[DEFAULT_DEFAULT_PROFILE_ID]).toBeDefined();

    expect(DEFAULT_PRIORITIES).toEqual([
      ...PROFILES[DEFAULT_DEFAULT_PROFILE_ID].priorities,
    ]);
  });

  it("explains who each one is for, without marketing", () => {
    for (const profile of DEFAULT_PROFILES) {
      expect(profile.forWhom.length).toBeGreaterThan(30);
      expect(profile.assumes.length).toBeGreaterThan(30);
      expect(profile.label.length).toBeGreaterThan(0);
    }
  });
});
