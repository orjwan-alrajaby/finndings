import { describe, expect, it } from "vitest";

import { formatAmount, parseAmount } from "./number-input";

describe("parseAmount", () => {
  it("reads whole numbers and decimals", () => {
    expect(parseAmount("1000")).toBe(1000);
    expect(parseAmount("1.75")).toBe(1.75);
    expect(parseAmount(" 0.32 ")).toBe(0.32);
  });

  it("reads a comma as the decimal separator, the way a German price is written", () => {
    expect(parseAmount("1,75")).toBe(1.75);
    expect(parseAmount(",5")).toBe(0.5);
  });

  it("reads a figure still being typed as the amount it already is", () => {
    expect(parseAmount("1.")).toBe(1);
    expect(parseAmount("0,")).toBe(0);
  });

  it("refuses what isn't an amount rather than calling it zero", () => {
    for (const text of ["", "  ", "abc", "-5", "1.2.3", "1,2,3", "1e3", ".", "€12"]) {
      expect(parseAmount(text)).toBeNull();
    }
  });
});

describe("formatAmount", () => {
  it("writes the amount back", () => {
    expect(formatAmount(1.75)).toBe("1.75");
    expect(formatAmount(0)).toBe("0");
  });

  it("leaves an optional field empty at zero, which means not set", () => {
    expect(formatAmount(0, true)).toBe("");
    expect(formatAmount(600, true)).toBe("600");
  });
});
