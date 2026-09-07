/**
 * Making room for the panel where it actually matters: around the car.
 *
 * The panel used to narrow the whole of finn.com. `body` got a margin, every
 * `position: fixed` element on the page got a matching one, and the entire
 * site slid left — header, footer, cookie widget and all. It worked, and it
 * was far more than the job needed: the reader is not comparing the panel
 * against FINN's navigation, they are comparing it against one car. Moving
 * the rest of the page to keep the parts of it nobody is reading in view cost
 * a full-width reflow of somebody else's layout on every open, and any site
 * that pins something with an explicit width came out of it looking broken.
 *
 * So nothing moves now except the block the car is in. The panel simply sits
 * over the right-hand strip of the page, and the one section that holds the
 * marked card is narrowed by the panel's width so the card reflows out from
 * under it. Everything else is allowed to be covered — the panel is a strip
 * down one side, and what it covers is still there when it closes.
 *
 * As before, nothing of FINN's is rewritten: a class, a custom property and
 * one stylesheet, all three of which come off again on close.
 */

/**
 * How wide the panel sits, and how much room the section beside it gives up.
 *
 * One number, used by both, and they have to agree or the card is still
 * half-covered.
 */
export const PANEL_WIDTH = 416;

const STYLE_ID = "finn-lens-dock-style";
const DOCKED = "finn-lens-docked";
const SECTION = "finn-lens-section";
const WIDTH_PROPERTY = "--finn-lens-panel-width";

/**
 * Below this the page has nothing left to show beside the panel, so the panel
 * covers it instead. Two panels' worth is the least that leaves finn.com
 * readable next to one.
 */
const MIN_WIDTH_TO_DOCK = 2;

const CSS = `
  html.${DOCKED} .${SECTION} {
    margin-right: var(${WIDTH_PROPERTY}) !important;
    transition: margin-right 180ms ease;
  }
`;

/** Whether the panel can sit beside the page rather than over all of it. */
export function hasRoomBeside(width: number = PANEL_WIDTH): boolean {
  return window.innerWidth >= width * MIN_WIDTH_TO_DOCK;
}

/**
 * Whether an ancestor of the marked card is the block worth narrowing.
 *
 * Two conditions, and both are needed. It has to **reach under the panel**,
 * or narrowing it moves something that was never covered; and it has to hold
 * **more than the card itself**, because the smallest box around one card is
 * the card, and shrinking that squashes the very thing we are trying to keep
 * readable. The first ancestor that satisfies both is the row, grid or column
 * the card is laid out in — which is exactly the thing that can reflow.
 */
export function isSection(
  box: { width: number; right: number },
  childCount: number,
  edge: number,
): boolean {
  if (box.width <= 0) return false;
  if (childCount < 2) return false;

  return box.right > edge;
}

/** The block the marked card is laid out in, or null when nothing is covered. */
export function sectionFor(
  card: HTMLElement,
  width: number = PANEL_WIDTH,
): HTMLElement | null {
  const edge = window.innerWidth - width;

  let node: HTMLElement | null = card.parentElement;

  while (node && node !== document.body) {
    if (isSection(node.getBoundingClientRect(), node.childElementCount, edge)) {
      return node;
    }

    node = node.parentElement;
  }

  return null;
}

let docked: HTMLElement | null = null;

/**
 * Narrows the one block the marked card sits in.
 *
 * Docking a second card undocks the first: the panel talks about one car at a
 * time, and two narrowed sections would be two claims about where the reader
 * is looking.
 */
export function dockSectionFor(
  card: HTMLElement,
  width: number = PANEL_WIDTH,
): void {
  if (!hasRoomBeside(width)) return;

  const section = sectionFor(card, width);

  if (!section || section === docked) return;

  undockSection();

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");

    style.id = STYLE_ID;
    style.textContent = CSS;

    document.head.append(style);
  }

  document.documentElement.style.setProperty(WIDTH_PROPERTY, `${width}px`);

  section.classList.add(SECTION);
  document.documentElement.classList.add(DOCKED);

  docked = section;
}

export function undockSection(): void {
  document.documentElement.classList.remove(DOCKED);
  document.documentElement.style.removeProperty(WIDTH_PROPERTY);

  if (docked) {
    docked.classList.remove(SECTION);

    /*
     * An element that had no class attribute before would be left carrying an
     * empty one. Small, but "the page is exactly as we found it" is only true
     * if it is true.
     */
    if (!docked.getAttribute("class")) docked.removeAttribute("class");
  }

  docked = null;

  document.getElementById(STYLE_ID)?.remove();
}
