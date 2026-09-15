/**
 * The way from the environmental result to "How much it uses".
 *
 * The environmental result points at that section in words, and the words are
 * a link. Three surfaces draw both — the in-page panel, the pinned car's card
 * and the advice page — and the advice page draws a "How much it uses" per
 * tab, so the link doesn't look the section up on the whole document: it
 * climbs from itself and takes the first one it finds, which is the one
 * describing the same car.
 */

/** On every "How much it uses" section, as `data-section`. */
export const USAGE_SECTION = "usage";

/** The nearest "How much it uses" to `from`, or null where there isn't one. */
export function usageSectionNear(from: Element): HTMLElement | null {
  for (let node: Element | null = from; node; node = node.parentElement) {
    const found = node.querySelector<HTMLElement>(`[data-section="${USAGE_SECTION}"]`);

    if (found) return found;
  }

  return null;
}

/**
 * Scrolls to it, and moves focus there so a keyboard or screen-reader user
 * lands where a sighted one does. Returns whether there was anywhere to go.
 */
export function goToUsage(from: Element): boolean {
  const target = usageSectionNear(from);

  if (!target) return false;

  const reduced =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  target.scrollIntoView?.({ behavior: reduced ? "auto" : "smooth", block: "start" });

  if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");

  target.focus?.({ preventScroll: true });

  return true;
}
