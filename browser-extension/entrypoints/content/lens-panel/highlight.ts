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
 * Marking is also what keeps the card out from under the panel. The panel is
 * a strip over the right of the page and is allowed to cover it — except for
 * this one card, whose own section is narrowed so it reflows into what is
 * left. That pairing is deliberate: "the card the panel is talking about" and
 * "the card that has to stay visible" are the same card, and splitting the
 * two apart would let them disagree.
 *
 * Nothing of FINN's is rewritten: a class goes on the card's photo block and a
 * stylesheet goes in the head, and both come off again when the panel closes
 * or the reader goes back to the list.
 */

import { cardForCar, cardPhoto } from "./currentCar";
import { dockSectionFor, undockSection } from "./section-dock";

const STYLE_ID = "finn-lens-highlight-style";
const HIGHLIGHTING = "finn-lens-highlighting";
const CURRENT = "finn-lens-current";

/**
 * A wash of FINN's own pale blue across the photograph.
 *
 * This was a ring around the whole card, which is the loud way to say
 * "selected" and reads as an error state as often as a chosen one. The
 * photograph is where the card's identity already lives — it is what the
 * reader recognises the car by — so tinting it says the same thing quietly
 * and, being a background rather than a box, changes no geometry at all.
 */
const CSS = `
  html.${HIGHLIGHTING} .${CURRENT} {
    background-color: #eaf4ff !important;
    transition: background-color 220ms ease !important;
  }
`;

/**
 * The card FINN drew for one car, wherever it drew it.
 *
 * A configuration on a detail page and a car in a listing are the same
 * question with two different markup answers, and the mark has to land on
 * either — the panel can now be opened from a list, so the card it is talking
 * about is often not a configuration card at all.
 */
export function configurationCard(id: number): HTMLElement | null {
  const card = cardForCar(id);

  return card ? cardPhoto(card) : null;
}

let marked: HTMLElement | null = null;

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

  /* The one piece of finn.com that isn't the panel's to cover. */
  dockSectionFor(card);

  if (scroll) reveal(card);
}

export function clearHighlight(): void {
  document.documentElement.classList.remove(HIGHLIGHTING);

  undockSection();

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
