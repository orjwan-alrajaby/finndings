import { describe, expect, it } from "vitest";

import {
  AVAILABLE_CATEGORY_FEATURES,
  CATEGORIES,
  CATEGORY_IDS,
  DEFAULT_CATEGORY_FEATURES,
  DEFAULT_DEFAULT_PROFILE_ID,
  DEFAULT_PRIORITIES,
  DEFAULT_PROFILES,
  FEATURE_IMPORTANCE,
  FEATURES,
  IMPORTANCE_LEVELS,
  MAX_FEATURES_PER_CATEGORY,
  NUMERIC_ONLY_CATEGORIES,
  PROFILE_PRIORITY_COUNT,
  PROFILES,
  SUGGESTED_CATEGORY_FEATURES,
} from "./constants";

import { validatePriorityDraft } from "@/entrypoints/settings/utils/PriorityValidation";
import type { CategoryId } from "./types";

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
    const keys = AVAILABLE_CATEGORY_FEATURES.safetyAssistance;

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

  /*
   * Nothing is picked on the user's behalf. A pick now says "this matters to
   * me" and carries an importance they chose, so pre-selecting five would be
   * the product inventing preferences and then reasoning from them.
   */
  it("picks nothing for the user", () => {
    for (const id of CATEGORY_IDS) {
      expect(DEFAULT_CATEGORY_FEATURES[id]).toEqual([]);
    }
  });

  /* Suggestions are a starting point, and stay clearly separate from picks. */
  it("suggests a handful without selecting them", () => {
    for (const id of featureCategories) {
      const suggested = SUGGESTED_CATEGORY_FEATURES[id];

      expect(suggested.length).toBeGreaterThan(0);
      expect(suggested.length).toBeLessThanOrEqual(MAX_FEATURES_PER_CATEGORY);

      /* Drawn from the front of the catalogue, which is relevance-ordered. */
      expect(suggested).toEqual(
        AVAILABLE_CATEGORY_FEATURES[id].slice(0, suggested.length),
      );
    }
  });

  it("offers more than it suggests, so there is something to explore", () => {
    for (const id of featureCategories) {
      expect(
        AVAILABLE_CATEGORY_FEATURES[id].length,
      ).toBeGreaterThan(SUGGESTED_CATEGORY_FEATURES[id].length);
    }
  });

  it("only offers features that actually exist in the data", () => {
    for (const id of CATEGORY_IDS) {
      for (const key of AVAILABLE_CATEGORY_FEATURES[id]) {
        expect(FEATURES[key]).toBeDefined();
      }
    }
  });

  it("never offers the same feature twice within one priority", () => {
    for (const id of CATEGORY_IDS) {
      const keys = AVAILABLE_CATEGORY_FEATURES[id];

      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  /*
   * The only rule left is the ceiling. There is deliberately no floor: an
   * empty selection means "compare on the category as a whole", which the
   * editors must accept rather than treat as an unfinished form.
   */
  it("accepts an empty selection and refuses one over the cap", () => {
    const id: CategoryId = "practicality";

    expect(validatePriorityDraft([], id)).toBeNull();

    const overCap = AVAILABLE_CATEGORY_FEATURES[id]
      .slice(0, MAX_FEATURES_PER_CATEGORY + 1)
      .map((key) => ({ key, importance: "medium" }) as const);

    expect(validatePriorityDraft([...overCap], id)).toMatch(/at most/i);
  });

  /* Three levels, and none of them reads as a hard requirement. */
  it("describes importance as preference, never as a requirement", () => {
    expect(Object.keys(FEATURE_IMPORTANCE)).toEqual([
      "high",
      "medium",
      "low",
    ]);

    for (const level of IMPORTANCE_LEVELS) {
      const meta = FEATURE_IMPORTANCE[level];

      expect(meta.label).not.toMatch(/essential|required|must/i);
      expect(meta.hint.length).toBeGreaterThan(0);
      expect(meta.weight).toBeGreaterThan(0);
    }

    /* Ordered, and gentler than the 5-to-1 the old tier system used. */
    expect(FEATURE_IMPORTANCE.high.weight).toBeGreaterThan(
      FEATURE_IMPORTANCE.medium.weight,
    );
    expect(FEATURE_IMPORTANCE.medium.weight).toBeGreaterThan(
      FEATURE_IMPORTANCE.low.weight,
    );
    expect(FEATURE_IMPORTANCE.high.weight).toBeLessThan(5);
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
    CATEGORY_IDS.flatMap((id) => AVAILABLE_CATEGORY_FEATURES[id]),
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
