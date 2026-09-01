/**
 * Pointing at the car the panel is talking about.
 *
 * The panel names a configuration — "Comfort · 156 PS · 310 km range" — and
 * FINN's own page has that same car on it as a card in the comparison grid.
 * Until now the reader had to match one to the other themselves, on a page
 * where three configurations of the same model differ by a trim name and a
 * number. Marking the card removes that job entirely: the answer and the thing
 * it is about are visibly the same object.
 *
 * Nothing of FINN's is rewritten. A class goes on the card, a stylesheet goes
 * in the head, and one label of our own goes on the card beside the pin button
 * this extension already puts there — all three come off again when the panel
 * closes or the reader goes back to the list.
 *
 * The ring is a box-shadow rather than a background or a border. A background
 * would fight the card's own `bg-snow`, and a border would change its box and
 * nudge the grid around it; a box-shadow paints outside the box, inherits
 * whatever corner radius the card already has, and moves nothing.
 *
 * The label that says why the card is ringed has to go *inside* it, though.
 * FINN's cards carry `overflow-hidden`, so anything hung off the top edge is
 * clipped to a sliver — which is what a first attempt at this did. It sits
 * beside the pin button instead: the one place on a card this extension has
 * already made its own, measured off the pin itself rather than guessed at, so
 * the two read as one row of Lens's marks rather than two things that happen
 * to be near each other.
 */

const STYLE_ID = "finn-lens-highlight-style";
const HIGHLIGHTING = "finn-lens-highlighting";
const CURRENT = "finn-lens-current";
const BADGE = "finn-lens-current-badge";

/** The pin button this extension puts on every card. */
const PIN = ".finn-lens-add-car-btn";

/** Between the label and the pin, matching the gap FINN leaves around it. */
const GAP = 8;

/* FINN's own accent blue, so the mark reads as the site's and not as ours. */
const CSS = `
  html.${HIGHLIGHTING} .${CURRENT} {
    position: relative;
    box-shadow:
      0 0 0 2px #0072ea,
      0 8px 28px rgba(0, 114, 234, 0.18) !important;
    transition: box-shadow 220ms ease !important;
  }

  html.${HIGHLIGHTING} .${BADGE} {
    position: absolute;
    z-index: 10;
    display: inline-flex;
    align-items: center;
    height: 24px;
    padding: 0 9px;
    border-radius: 999px;
    background: #0072ea;
    color: #fff;
    font: 700 10px/1 system-ui, -apple-system, sans-serif;
    letter-spacing: 0.04em;
    white-space: nowrap;
    pointer-events: none;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.18);
  }
`;

/** The card FINN draws for one configuration. */
export function configurationCard(id: number): HTMLElement | null {
  return document.getElementById(`product-${id}`);
}

let marked: HTMLElement | null = null;
let badge: HTMLElement | null = null;

/**
 * Marks one configuration on FINN's page, and clears whatever was marked.
 *
 * `scroll` is deliberately not automatic. Choosing a configuration in the
 * panel is a request to be shown it, so the page goes there; opening the panel
 * on a car the URL already named is not, and moving someone's page under them
 * before they have asked for anything is the kind of help nobody wants.
 */
export function highlightConfiguration(
  id: number | null,
  { scroll = false }: { scroll?: boolean } = {},
): void {
  const card = id == null ? null : configurationCard(id);

  if (card === marked) {
    if (card && scroll) reveal(card);
    return;
  }

  clearHighlight();

  if (!card) return;

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");

    style.id = STYLE_ID;
    style.textContent = CSS;

    document.head.append(style);
  }

  card.classList.add(CURRENT);
  document.documentElement.classList.add(HIGHLIGHTING);

  marked = card;

  badge = document.createElement("span");
  badge.className = BADGE;
  badge.textContent = "Shown in FINN Lens";

  /*
   * Into whatever the pin button is positioned against, so both are laid out
   * in the same coordinates and the label can be placed off the pin's own box
   * rather than off a guess about where FINN puts things.
   */
  const pin = card.querySelector<HTMLElement>(PIN);
  const anchor = (pin?.offsetParent as HTMLElement | null) ?? card;

  anchor.append(badge);

  place();

  window.addEventListener("resize", place);

  if (scroll) reveal(card);
}

/** Puts the label immediately to the left of the pin, centred on it. */
function place(): void {
  if (!badge || !marked) return;

  const anchor = badge.parentElement;

  if (!anchor) return;

  const pin = marked.querySelector<HTMLElement>(PIN);

  if (pin && pin.offsetParent === anchor) {
    badge.style.top = `${pin.offsetTop + pin.offsetHeight / 2}px`;
    badge.style.right = `${anchor.clientWidth - pin.offsetLeft + GAP}px`;
    badge.style.transform = "translateY(-50%)";

    return;
  }

  /* No pin to sit beside — the corner it would have been in will do. */
  badge.style.top = "16px";
  badge.style.right = "16px";
  badge.style.transform = "";
}

export function clearHighlight(): void {
  document.documentElement.classList.remove(HIGHLIGHTING);

  window.removeEventListener("resize", place);

  badge?.remove();
  badge = null;

  if (marked) {
    marked.classList.remove(CURRENT);

    /* The page is only exactly as we found it if this is true too. */
    if (!marked.getAttribute("class")) marked.removeAttribute("class");
  }

  marked = null;

  document.getElementById(STYLE_ID)?.remove();
}

/**
 * Centred rather than scrolled to the top, so the cards either side of it stay
 * visible — the reader is being shown which of several this one is, and a card
 * alone at the top of the screen doesn't answer that.
 */
function reveal(card: HTMLElement): void {
  card.scrollIntoView({ behavior: "smooth", block: "center" });
}
