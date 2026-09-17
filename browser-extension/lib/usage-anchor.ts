/**
 * The way from the environmental result to "How much it uses". The scrolling
 * itself is `section-anchor`, shared with the standard-equipment link.
 *
 * The environmental result points at that section in words, and the words are
 * a link. Three surfaces draw both — the in-page panel, the pinned car's card
 * and the advice page — and the advice page draws a "How much it uses" per
 * tab, so the link doesn't look the section up on the whole document: it
 * climbs from itself and takes the first one it finds, which is the one
 * describing the same car.
 */

import { goToSection, sectionNear } from "./section-anchor";

/** On every "How much it uses" section, as `data-section`. */
export const USAGE_SECTION = "usage";

/** The nearest "How much it uses" to `from`, or null where there isn't one. */
export function usageSectionNear(from: Element): HTMLElement | null {
  return sectionNear(from, USAGE_SECTION);
}

/** Scrolls to it and moves focus there. Returns whether there was anywhere to go. */
export function goToUsage(from: Element): boolean {
  return goToSection(from, USAGE_SECTION);
}
