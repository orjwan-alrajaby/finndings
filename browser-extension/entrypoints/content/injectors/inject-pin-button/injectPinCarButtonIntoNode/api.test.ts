import { describe, expect, it } from "vitest";

import { splitBrandAndModel } from "./api";

/**
 * A detail page gives the car's name twice — as a heading and as a URL — and
 * neither is enough on its own. These are the shapes that broke the old
 * first-word split, taken from real finn.com paths.
 */
describe("splitBrandAndModel", () => {
  const path = (brand: string, model: string) =>
    `/de-DE/models/${brand}/${model}`;

  it("splits a one-word brand", () => {
    expect(splitBrandAndModel("BYD Dolphin Surf", path("byd", "dolphin-surf")))
      .toEqual({ brand: "BYD", model: "Dolphin Surf" });
  });

  it("keeps a two-word brand together", () => {
    expect(splitBrandAndModel("Alfa Romeo Tonale", path("alfa-romeo", "tonale")))
      .toEqual({ brand: "Alfa Romeo", model: "Tonale" });
  });

  it("handles a brand hyphenated in the slug but not in the heading", () => {
    expect(
      splitBrandAndModel("Mercedes Benz A-Klasse", path("mercedes-benz", "a-klasse")),
    ).toEqual({ brand: "Mercedes Benz", model: "A-Klasse" });
  });

  it("handles a brand hyphenated in both", () => {
    expect(
      splitBrandAndModel("Mercedes-Benz A-Klasse", path("mercedes-benz", "a-klasse")),
    ).toEqual({ brand: "Mercedes-Benz", model: "A-Klasse" });
  });

  it("handles a numeric model", () => {
    expect(splitBrandAndModel("MG 4", path("mg", "4"))).toEqual({
      brand: "MG",
      model: "4",
    });
  });

  it("falls back to the first word when the path doesn't say", () => {
    expect(splitBrandAndModel("BYD Dolphin Surf", "/de-DE/subscribe/byd")).toEqual(
      { brand: "BYD", model: "Dolphin Surf" },
    );
  });

  it("doesn't swallow the whole heading when the slug matches all of it", () => {
    /* A brand and no model left over is not a split worth making. */
    expect(splitBrandAndModel("BYD", path("byd", "dolphin-surf"))).toEqual({
      brand: "BYD",
      model: "",
    });
  });
});
