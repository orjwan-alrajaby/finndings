import { CONFIGURATIONS_SELECTOR } from "./currentCar";

/**
 * Making room *in* the page rather than beside it.
 *
 * Same trick as the right-hand dock and a different axis: nothing is inserted
 * into FINN's DOM, the panel stays in its own shadow root, and the page is
 * persuaded to open a gap by a class, two custom properties and one
 * stylesheet — all of which come off again on close.
 *
 * The gap goes where the reader's own question changes. FINN's detail page is
 * two things stacked: the car up top — gallery, name, price — and underneath
 * it the configurations it comes in. "Which of these fits me?" is asked
 * exactly at the seam between them, so that is where the answer goes. Above
 * the fold the page still looks like FINN's page; the panel is the thing you
 * scroll into, in the place you were already heading.
 *
 * Where the right-hand dock had to fight `position: fixed`, this doesn't touch
 * it: a horizontal gap moves the document down and leaves everything anchored
 * to the viewport exactly where it was. What it needs instead is geometry —
 * the gap is somewhere on the page rather than somewhere on the screen, so the
 * panel is positioned in document coordinates and has to be told when the
 * page reflows underneath it.
 */

const STYLE_ID = "finn-lens-inset-style";
const INSET = "finn-lens-inset";
const ANCHOR = "finn-lens-inset-anchor";
const OFFSET_PROPERTY = "--finn-lens-inset-offset";

const CSS = `
  html.${INSET} .${ANCHOR} {
    margin-top: var(${OFFSET_PROPERTY}) !important;
    transition: margin-top 180ms ease;
  }
`;

/**
 * The block the gap opens above: FINN's configurations section, whole.
 *
 * Not the grid of cards itself, which would separate it from its own heading
 * and the price toggle that belongs with it. The section is a direct child of
 * the details root — the page is a flat stack of them — so walking up from the
 * grid until the next step would leave the root finds it without depending on
 * how deeply the grid happens to be nested this week.
 */
export function findInsetAnchor(root: HTMLElement): HTMLElement | null {
  const grid = root.querySelector<HTMLElement>(CONFIGURATIONS_SELECTOR);

  if (!grid) return null;

  let node: HTMLElement = grid;

  while (node.parentElement && node.parentElement !== root) {
    node = node.parentElement;
  }

  return node.parentElement === root ? node : null;
}

/** Where the gap is, in page coordinates rather than screen ones. */
export function insetGeometry(
  anchor: HTMLElement,
  height: number,
): { top: number; left: number; width: number } {
  const box = anchor.getBoundingClientRect();

  return {
    top: box.top + window.scrollY - height,
    left: box.left + window.scrollX,
    width: box.width,
  };
}

let anchored: HTMLElement | null = null;

export function insetPage(anchor: HTMLElement, height: number): void {
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");

    style.id = STYLE_ID;
    style.textContent = CSS;

    document.head.append(style);
  }

  /*
   * Added to whatever spacing the section already had, not substituted for it.
   * `!important` is needed to win against FINN's own utility classes, and
   * `!important` overrides rather than accumulates — so the existing margin is
   * read first and carried into the value.
   */
  const existing = Number.parseFloat(getComputedStyle(anchor).marginTop) || 0;

  document.documentElement.style.setProperty(
    OFFSET_PROPERTY,
    `${existing + height}px`,
  );

  anchor.classList.add(ANCHOR);
  document.documentElement.classList.add(INSET);

  anchored = anchor;
}

export function uninsetPage(): void {
  document.documentElement.classList.remove(INSET);
  document.documentElement.style.removeProperty(OFFSET_PROPERTY);

  if (anchored) {
    anchored.classList.remove(ANCHOR);

    /* The page is only exactly as we found it if this is true too. */
    if (!anchored.getAttribute("class")) anchored.removeAttribute("class");
  }

  anchored = null;

  document.getElementById(STYLE_ID)?.remove();
}
