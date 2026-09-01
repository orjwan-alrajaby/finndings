/**
 * Making room beside the car, rather than beside the whole site.
 *
 * The panel used to open over a dimmed page: a modal, which is what you build
 * when the thing you are showing replaces what is behind it. This one doesn't.
 * A reader checking what Lens says against what FINN's own page says is doing
 * the most reasonable thing available to them, and a dimmed backdrop tells
 * them to stop. So the page gives up the width instead.
 *
 * Which part of the page gives it up is the whole question, and the answer is
 * the product itself — `[data-appid="product-details"]`, the block the rest of
 * this feature already keys off. Not `body`, which was the first attempt and
 * was wrong twice over:
 *
 * - it narrowed things the panel has no business narrowing. FINN's header is
 *   the site's furniture, not this car's, and a reader looking at a search box
 *   that has quietly shrunk is being told the whole site changed when only one
 *   panel opened.
 *
 * - and it dragged in a pile of machinery to do it. A margin on `body` is
 *   ignored by anything `position: fixed`, so keeping the header aligned meant
 *   finding every fixed element on the page, measuring it, and marking it.
 *   None of that exists any more: fixed chrome is laid out against the
 *   viewport, and leaving it alone is now the point rather than the problem.
 *
 * Nothing is inserted into FINN's DOM. The panel stays in its own shadow root,
 * and this adds a class, a custom property and one stylesheet, all of which
 * come off again on close.
 */

const STYLE_ID = "finn-lens-dock-style";
const DOCKED = "finn-lens-docked";
const NARROWED = "finn-lens-narrowed";
const WIDTH_PROPERTY = "--finn-lens-panel-width";

/**
 * Below this the product has nothing left to show, so the panel covers the
 * page instead and nothing is narrowed. Two panels' worth is the least that
 * leaves the car readable beside it.
 */
const MIN_WIDTH_TO_DOCK = 2;

const CSS = `
  html.${DOCKED} .${NARROWED} {
    margin-right: var(${WIDTH_PROPERTY}) !important;
    transition: margin-right 180ms ease;
  }
`;

/** Whether there is room to sit beside the car rather than over it. */
export function canDock(width: number): boolean {
  return window.innerWidth >= width * MIN_WIDTH_TO_DOCK;
}

let narrowed: HTMLElement | null = null;

/**
 * @param target the product block to narrow — everything else is left as it is.
 */
export function dockPage(target: HTMLElement, width: number): void {
  if (document.documentElement.classList.contains(DOCKED)) return;

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");

    style.id = STYLE_ID;
    style.textContent = CSS;

    document.head.append(style);
  }

  document.documentElement.style.setProperty(WIDTH_PROPERTY, `${width}px`);

  target.classList.add(NARROWED);
  document.documentElement.classList.add(DOCKED);

  narrowed = target;
}

export function undockPage(): void {
  document.documentElement.classList.remove(DOCKED);
  document.documentElement.style.removeProperty(WIDTH_PROPERTY);

  if (narrowed) {
    narrowed.classList.remove(NARROWED);

    /* The page is only exactly as we found it if this is true too. */
    if (!narrowed.getAttribute("class")) narrowed.removeAttribute("class");
  }

  narrowed = null;

  document.getElementById(STYLE_ID)?.remove();
}
