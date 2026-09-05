import { describe, expect, it } from "vitest";

import { adviceFileName, advicePdfOptions } from "./advice-pdf";

/**
 * The file the reader ends up with.
 *
 * Its name is the only part of the export they see before opening it, and
 * the only part that has to survive being dropped in a folder with eleven
 * others.
 */

describe("adviceFileName", () => {
  const day = new Date(2026, 8, 5);

  it("names the car and the day it was true", () => {
    expect(adviceFileName("BYD Dolphin", day)).toBe(
      "finn-lens-advice-byd-dolphin-2026-09-05.pdf",
    );
  });

  /* A folder of these sorts itself, which a localised date would not. */
  it("pads the date so a folder of them sorts", () => {
    expect(adviceFileName("Ora", new Date(2026, 0, 9))).toContain("2026-01-09");
  });

  it("survives everything a model name puts in a filename", () => {
    expect(adviceFileName("Citroën ë-C4 (Shine+)", day)).toBe(
      "finn-lens-advice-citro-n-c4-shine-2026-09-05.pdf",
    );
  });

  it("leaves no stray dashes at either end", () => {
    const name = adviceFileName("...MG4...", day);

    expect(name).toBe("finn-lens-advice-mg4-2026-09-05.pdf");
    expect(name).not.toContain("--");
  });

  /* A car whose name is entirely punctuation still has to produce a file. */
  it("still names something when the car's name reduces to nothing", () => {
    expect(adviceFileName("???", day)).toBe("finn-lens-advice-2026-09-05.pdf");
  });
});

describe("advicePdfOptions", () => {
  it("saves under the name it was given", () => {
    const options = advicePdfOptions("x.pdf");

    expect(options.filename).toBe("x.pdf");
    expect(options.method).toBe("save");
  });

  /*
   * The car's photograph comes from FINN's CDN. Without this the capture
   * leaves a hole where the car was, which is the one thing on the page a
   * reader would notice missing at a glance.
   */
  it("asks for the car's photograph across origins", () => {
    const options = advicePdfOptions("x.pdf");

    expect(options.canvas?.useCORS).toBe(true);
    expect(options.overrides?.canvas?.useCORS).toBe(true);
  });

  /* Margins would otherwise come out black, which reads as a printing fault. */
  it("paints the sheet in the page's own ground", () => {
    expect(advicePdfOptions("x.pdf").overrides?.canvas?.backgroundColor).toBe(
      "#f8f8f8",
    );
  });
});
