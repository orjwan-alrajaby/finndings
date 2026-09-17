/**
 * A link that scrolls to a section elsewhere on the same card, such as the
 * environmental result's link to "How much it uses".
 *
 * Several surfaces draw a section more than once — the advice page draws one
 * per tab — so a link doesn't look its section up on the whole document: it
 * climbs from itself and takes the first one it finds, which is the one
 * describing the same car.
 */

/** The nearest section named `name` to `from`, or null where there isn't one. */
export function sectionNear(from: Element, name: string): HTMLElement | null {
  for (let node: Element | null = from; node; node = node.parentElement) {
    const found = node.querySelector<HTMLElement>(`[data-section="${name}"]`);

    if (found) return found;
  }

  return null;
}

/**
 * Scrolls to it, and moves focus there so a keyboard or screen-reader user
 * lands where a sighted one does. Returns whether there was anywhere to go.
 */
export function goToSection(from: Element, name: string): boolean {
  const target = sectionNear(from, name);

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
