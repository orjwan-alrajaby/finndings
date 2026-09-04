import { describe, expect, it } from "vitest";

import { extractFeatures, hasSuppliedEquipment } from "./helpers";
import type { FinnApiConfig } from "./types";

/**
 * Reading FINN's answer at the one point it is still legible.
 *
 * `extractFeatures` turns every entry it can't find into `false`, so once it
 * has run, a car FINN said nothing about and a car FINN said has nothing are
 * the same object. The question has to be asked of the raw response, and this
 * is where it is asked.
 */
const config = (list?: unknown): FinnApiConfig =>
  ({ closed_features_list: list } as unknown as FinnApiConfig);

describe("hasSuppliedEquipment", () => {
  it("is false when FINN sent no list at all", () => {
    expect(hasSuppliedEquipment(config(undefined))).toBe(false);
  });

  it("is false for an empty list", () => {
    expect(hasSuppliedEquipment(config({}))).toBe(false);
  });

  /*
   * The case the whole distinction exists for: FINN answered, and the answer
   * was no. Presence of the list is the test, never what is in it.
   */
  it("is true for a list that says no to everything", () => {
    expect(
      hasSuppliedEquipment(
        config({
          "Adaptive Geschwindigkeitsregelanlage": false,
          "Sitzheizung": false,
          "ISOFIX": false,
        }),
      ),
    ).toBe(true);
  });

  it("is true for a list with equipment on it", () => {
    expect(hasSuppliedEquipment(config({ ISOFIX: true }))).toBe(true);
  });

  /* Storage and APIs both hand back shapes nobody promised. */
  it("is false for a list that isn't an object", () => {
    expect(hasSuppliedEquipment(config("nope"))).toBe(false);
    expect(hasSuppliedEquipment(config(null))).toBe(false);
  });

  /*
   * The two states really are indistinguishable afterwards — which is the
   * argument for recording the answer rather than inferring it later.
   */
  it("cannot be recovered from the mapped features", () => {
    const saidNothing = extractFeatures(config(undefined));

    const saidNo = extractFeatures(
      config({ "Sitzheizung": false, ISOFIX: false }),
    );

    expect(saidNothing).toEqual(saidNo);
  });
});
