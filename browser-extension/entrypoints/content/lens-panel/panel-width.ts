/**
 * How wide the panel is, and whether the page has room for it beside them.
 *
 * This file used to also move finn.com out of the way. Three versions of that
 * idea shipped, each smaller than the last: first `body` and every fixed
 * element on the page got a margin and the whole site slid left; then only the
 * block holding the marked card was narrowed so that one card reflowed out
 * from under the panel.
 *
 * Both are gone. The narrowing was solving a problem the panel no longer has:
 * back when the way in was a floating button, the panel opened on whatever car
 * the *page* was about, so keeping that car on screen was how a reader knew
 * which car was being discussed. Now every configuration carries its own
 * badge, so the reader has just clicked the card in question and the panel
 * names it at the top — the card being visible underneath is no longer load
 * bearing. What it cost was real: a reflow of somebody else's grid on every
 * open, a transition the reader did not ask for, and a class plus a stylesheet
 * plus a custom property on finn.com that all had to be taken off again
 * cleanly. The panel now simply sits over the right-hand strip and what it
 * covers is still there when it closes.
 *
 * The highlight survives, because that half was never about layout: the marked
 * card is how the panel says *which* car, and it changes no geometry.
 */

/**
 * How wide the panel sits.
 *
 * Still shared rather than inlined at its one call site: `hasRoomBeside`
 * defaults to it, and the two answers have to be about the same panel.
 */
export const PANEL_WIDTH = 416;

/**
 * Below this the page has nothing left to show beside the panel, so the panel
 * covers it instead. Two panels' worth is the least that leaves finn.com
 * readable next to one.
 */
const MIN_WIDTH_TO_DOCK = 2;

/** Whether the panel can sit beside the page rather than over all of it. */
export function hasRoomBeside(width: number = PANEL_WIDTH): boolean {
  return window.innerWidth >= width * MIN_WIDTH_TO_DOCK;
}
