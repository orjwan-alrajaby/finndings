import { beforeEach, describe, expect, it } from "vitest";
import { parseHTML } from "linkedom";

import { hasRoomBeside } from "./panel-width";

/**
 * The one decision left in this module: beside the page, or over it.
 *
 * This file used to also cover docking — narrowing the block the marked card
 * sat in so the card reflowed out from under the panel. That went with the
 * launcher: the panel is now always opened from the card it is about, so
 * keeping that card visible stopped being the thing that told the reader
 * which car was being discussed, and the reflow it cost finn.com was no
 * longer buying anything.
 */

const PANEL = 416;

function page() {
  const { document, window } = parseHTML(
    `<!doctype html><html><head></head><body><p>FINN</p></body></html>`,
  );

  Object.assign(globalThis, {
    document,
    window: Object.assign(window, { innerWidth: 1440 }),
  });
}

function widthIs(pixels: number) {
  (globalThis as { window: { innerWidth: number } }).window.innerWidth = pixels;
}

beforeEach(page);

describe("hasRoomBeside", () => {
  it("sits beside a page with room for both", () => {
    widthIs(1440);

    expect(hasRoomBeside(PANEL)).toBe(true);
  });

  it("covers a page with nothing left to show", () => {
    widthIs(600);

    expect(hasRoomBeside(PANEL)).toBe(false);
  });

  it("needs a whole panel's width left over, not a sliver", () => {
    widthIs(PANEL * 2 - 1);

    expect(hasRoomBeside(PANEL)).toBe(false);
  });
});
