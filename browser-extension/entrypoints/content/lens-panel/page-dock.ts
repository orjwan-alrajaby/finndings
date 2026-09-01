/**
 * Making room on finn.com, rather than sitting on top of it.
 *
 * The panel used to open over a dimmed page: a modal, which is what you build
 * when the thing you are showing replaces what is behind it. This one doesn't.
 * A reader comparing what Lens says against what FINN's own page says is doing
 * the most reasonable thing there is, and a dimmed backdrop tells them to stop.
 *
 * So the page is narrowed by exactly the panel's width and the panel takes the
 * space. Nothing is inserted into FINN's DOM — the panel still lives in its own
 * shadow root, and all this does is add a class, a custom property and one
 * stylesheet, every one of which comes off again on close.
 *
 * Two things need moving, and they move differently:
 *
 * - the document, which is ordinary flow content and follows a margin on
 *   `body`;
 * - anything `position: fixed`, which is laid out against the viewport and so
 *   ignores that margin entirely. FINN's header is `fixed inset-x-0 top-0`,
 *   and without help it would stay full width and slide underneath the panel.
 *
 * The fixed elements are found once, on open, and given a class. The rule that
 * class carries is `margin-right`, which is the one property that does the
 * right thing to both shapes a fixed element comes in: an element stretched
 * between `left: 0` and `right: 0` gets narrower by that much and stays put on
 * the left, and one anchored to the right edge moves left by that much. An
 * element pinned with an explicit `width: 100%` is over-constrained and
 * ignores it, which is a fair degradation — it doesn't move, and it doesn't
 * break either.
 */

const STYLE_ID = "finn-lens-dock-style";
const DOCKED = "finn-lens-docked";
const SHIFTED = "finn-lens-shifted";
const WIDTH_PROPERTY = "--finn-lens-panel-width";

/**
 * Below this the page has nothing left to show, so the panel covers it
 * instead and no room is made. Two panels' worth of room is the least that
 * leaves finn.com readable beside it.
 */
const MIN_WIDTH_TO_DOCK = 2;

const CSS = `
  html.${DOCKED} body {
    margin-right: var(${WIDTH_PROPERTY}) !important;
    transition: margin-right 180ms ease;
  }

  html.${DOCKED} .${SHIFTED} {
    margin-right: var(${WIDTH_PROPERTY}) !important;
    transition: margin-right 180ms ease;
  }
`;

/** Whether there is room to sit beside the page rather than over it. */
export function canDock(width: number): boolean {
  return window.innerWidth >= width * MIN_WIDTH_TO_DOCK;
}

/**
 * Everything laid out against the viewport that the panel would cover.
 *
 * Anything whose right edge reaches into the panel's strip needs to move —
 * FINN's own header, and equally the chat bubbles and cookie widgets that
 * live in that corner of every site. Anything anchored on the left is left
 * alone; the panel was never going to be on top of it.
 */
export function needsShifting(
  position: string,
  box: { width: number; height: number; right: number },
  edge: number,
): boolean {
  if (position !== "fixed") return false;

  /* Something with no box on screen has nothing to be in the way of. */
  if (box.width <= 0 || box.height <= 0) return false;

  return box.right > edge;
}

function overlappedByPanel(width: number): HTMLElement[] {
  const edge = window.innerWidth - width;

  return Array.from(
    document.body.querySelectorAll<HTMLElement>("*"),
  ).filter((node) =>
    needsShifting(
      getComputedStyle(node).position,
      node.getBoundingClientRect(),
      edge,
    ),
  );
}

let shifted: HTMLElement[] = [];

export function dockPage(width: number): void {
  if (document.documentElement.classList.contains(DOCKED)) return;

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");

    style.id = STYLE_ID;
    style.textContent = CSS;

    document.head.append(style);
  }

  document.documentElement.style.setProperty(WIDTH_PROPERTY, `${width}px`);

  /*
   * Found before the class goes on. Once the page is narrowed the boxes have
   * all moved, and an element would be measured against a viewport it is no
   * longer laid out in.
   */
  shifted = overlappedByPanel(width);

  for (const node of shifted) node.classList.add(SHIFTED);

  document.documentElement.classList.add(DOCKED);
}

export function undockPage(): void {
  document.documentElement.classList.remove(DOCKED);
  document.documentElement.style.removeProperty(WIDTH_PROPERTY);

  for (const node of shifted) {
    node.classList.remove(SHIFTED);

    /*
     * An element that had no class attribute before would be left carrying an
     * empty one. Small, but "the page is exactly as we found it" is only true
     * if it is true.
     */
    if (!node.getAttribute("class")) node.removeAttribute("class");
  }

  shifted = [];

  document.getElementById(STYLE_ID)?.remove();
}
