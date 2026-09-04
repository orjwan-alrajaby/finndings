import { describe, expect, it } from "vitest";

import { sameFeatureSelection } from "./feature-selection-diff";
import type { FeatureSelection } from "./reasoning-engine/types";

/**
 * What the priority editor uses to know whether it is holding work.
 *
 * The page's Save button asks this, indirectly, before writing: an editor
 * that wrongly reported itself clean would have its draft saved around and
 * lost, which is the exact failure the check exists to prevent. One that
 * wrongly reported itself dirty would send the reader to an editor with
 * nothing in it to decide.
 */
const picks = (...entries: [string, string][]): FeatureSelection =>
  entries.map(([key, importance]) => ({
    key,
    importance,
  })) as FeatureSelection;

describe("sameFeatureSelection", () => {
  it("treats two empty selections as the same", () => {
    expect(sameFeatureSelection([], [])).toBe(true);
  });

  it("treats identical selections as the same", () => {
    const a = picks(["hasHeatedSeats", "high"], ["hasSunroof", "low"]);
    const b = picks(["hasHeatedSeats", "high"], ["hasSunroof", "low"]);

    expect(sameFeatureSelection(a, b)).toBe(true);
  });

  it("notices a feature added", () => {
    expect(
      sameFeatureSelection(
        picks(["hasHeatedSeats", "high"]),
        picks(["hasHeatedSeats", "high"], ["hasSunroof", "low"]),
      ),
    ).toBe(false);
  });

  it("notices a feature dropped", () => {
    expect(
      sameFeatureSelection(
        picks(["hasHeatedSeats", "high"], ["hasSunroof", "low"]),
        picks(["hasHeatedSeats", "high"]),
      ),
    ).toBe(false);
  });

  /* The change that moves no feature and still changes the answer. */
  it("notices a feature re-graded", () => {
    expect(
      sameFeatureSelection(
        picks(["hasHeatedSeats", "high"]),
        picks(["hasHeatedSeats", "low"]),
      ),
    ).toBe(false);
  });

  /*
   * Order counts. The list is stored as written and shown in that order, so
   * a reader who reordered their picks has changed something even though the
   * set is identical — and losing that would lose real work.
   */
  it("notices a reordering", () => {
    expect(
      sameFeatureSelection(
        picks(["hasHeatedSeats", "high"], ["hasSunroof", "low"]),
        picks(["hasSunroof", "low"], ["hasHeatedSeats", "high"]),
      ),
    ).toBe(false);
  });
});
