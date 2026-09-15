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
  PROFILE_PRIORITY_COUNT,
  PROFILES,
} from "./constants";

import { DEFAULT_PREFERENCES } from "./constants";
import { buildReasoningContext, evaluateVehicle, getCategory } from "./index";
import { makeCar } from "./test-fixtures";
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
  /*
   * Nothing is picked on the user's behalf. A pick now says "this matters to
   * me" and carries an importance they chose, so pre-selecting five would be
   * the product inventing preferences and then reasoning from them.
   */
  /*
   * Lens ships an opinion rather than a shrug, and these are the rules that
   * keep it an opinion the product can stand behind: it is a subset of what
   * each category actually offers, it is inside the cap the reader is held
   * to, and it is a real selection rather than a token one.
   */
  it("picks five features in every category that has any", () => {
    for (const id of CATEGORY_IDS) {
      const picked = DEFAULT_CATEGORY_FEATURES[id];

      if (CATEGORIES[id].numericOnly) {
        /* Scored from vehicle data; there is no catalogue to pick from. */
        expect(picked).toEqual([]);
        continue;
      }

      expect(picked).toHaveLength(5);
    }
  });

  it("never picks a feature the category doesn't offer", () => {
    for (const id of CATEGORY_IDS) {
      for (const pick of DEFAULT_CATEGORY_FEATURES[id]) {
        expect(AVAILABLE_CATEGORY_FEATURES[id]).toContain(pick.key);
      }
    }
  });

  it("never picks the same feature twice in one category", () => {
    for (const id of CATEGORY_IDS) {
      const keys = DEFAULT_CATEGORY_FEATURES[id].map((pick) => pick.key);

      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("stays inside the cap the reader is held to", () => {
    for (const id of CATEGORY_IDS) {
      expect(
        DEFAULT_CATEGORY_FEATURES[id].length,
      ).toBeLessThanOrEqual(MAX_FEATURES_PER_CATEGORY);
    }
  });

  /*
   * A default that raised everything to "highly" would be the same as raising
   * nothing: the point of the scale is that some of these matter more than
   * others, and the shipped opinion has to demonstrate that or it teaches the
   * reader the control does nothing.
   */
  it("uses more than one level of importance", () => {
    for (const id of CATEGORY_IDS) {
      const picked = DEFAULT_CATEGORY_FEATURES[id];

      if (picked.length === 0) continue;

      const levels = new Set(picked.map((pick) => pick.importance));

      expect(levels.size).toBeGreaterThan(1);
    }
  });

  /*
   * The rule the picker now enforces: a feature counts extra in one priority
   * only. Shipping defaults that broke it would put the product in a state
   * the reader could see but never recreate — every duplicate would show as
   * locked, under a category they never chose.
   *
   * It cost this list something real. Heated seats genuinely bear on both
   * climate and comfort, and each shared feature had to go to the category
   * with the strongest claim on it while the others backfilled.
   */
  it("never raises the same feature in two categories", () => {
    const homes = new Map<string, CategoryId[]>();

    for (const id of CATEGORY_IDS) {
      for (const pick of DEFAULT_CATEGORY_FEATURES[id]) {
        homes.set(pick.key, [...(homes.get(pick.key) ?? []), id]);
      }
    }

    const shared = [...homes.entries()].filter(
      ([, categories]) => categories.length > 1,
    );

    expect(shared).toEqual([]);
  });

  it("gives every pick a real level", () => {
    for (const id of CATEGORY_IDS) {
      for (const pick of DEFAULT_CATEGORY_FEATURES[id]) {
        expect(IMPORTANCE_LEVELS).toContain(pick.importance);
      }
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

  /*
   * Two priorities are scored on a measured figure as well as their
   * equipment, and `categoryDetail` averages the two — so the figure carries
   * half the answer. A reader is told that in `measured`, and this is what
   * stops the two drifting apart again: add a numeric case to the engine
   * without writing the copy and this fails, and so does the reverse.
   */
  it("names the measured half of every priority that has one", () => {
    const cars = [
      makeCar({ id: 1, trunk: 300, consumption: 5, range: null }),
      makeCar({ id: 2, trunk: 600, consumption: 8, range: null }),
    ];

    const context = buildReasoningContext(cars, CATEGORY_IDS, DEFAULT_PREFERENCES);

    const scoredOnAFigure = evaluateVehicle(cars[0] as never, context)
      .priorities.filter(
        (item) => item.numeric != null && !CATEGORIES[item.priority].numericOnly,
      )
      .map((item) => item.priority)
      .sort();

    expect(scoredOnAFigure).toEqual(["longDistance", "practicality"]);

    for (const id of CATEGORY_IDS) {
      const measured = getCategory(id)?.measured;

      expect(Boolean(measured)).toBe(scoredOnAFigure.includes(id));

      /* And it says what the figure is, not merely that there is one. */
      if (measured) expect(measured.length).toBeGreaterThan(30);
    }
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
