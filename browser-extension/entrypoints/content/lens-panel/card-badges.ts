import {
  buildFitAnalysis,
  FIT_BANDS,
  FIT_SEGMENTS,
  type FitLevel,
} from "@/lib/reasoning-engine/fit";
import { hasSavedLensSettings, loadLensSettings } from "@/lib/reasoning-engine";
import type { LensSettings } from "@/lib/reasoning-engine/types";
import type { FinnCar, PinnedFinnCar } from "@/lib/types";

import { el } from "./dom";
import { openPanel } from "./panel";
import { cardConfigId, cardPhoto, CARD_SELECTORS } from "./currentCar";
import {
  getLoadedCars,
  getPinnedCars,
} from "../injectors/inject-pin-button/injectPinCarButtonIntoNode/storage";

/**
 * Lens's answer on the card, before the reader opens anything.
 *
 * The panel answers "how does this car fit me" one car at a time, which is the
 * right shape for a car the reader is already looking at and the wrong shape
 * for a page of forty. Browsing is a scanning activity: the reader is deciding
 * which cars are worth opening, and an answer they have to open a car to get
 * arrives after the decision it was meant to inform.
 *
 * So every card FINN draws gets the verdict on it, in the same words and the
 * same four-segment meter the panel uses, and clicking it opens the panel on
 * that car. The badge is the summary and the panel is the reasoning; saying
 * the same thing in both places is the point rather than a duplication.
 *
 * Three rules keep it from becoming noise:
 *
 * - **Nothing without settings.** A verdict measured against defaults the
 *   reader has never seen is not their verdict. With nothing saved, no badges.
 *
 * - **Nothing without data.** A badge appears only where the car is already in
 *   hand, from the interceptor's cache or the pinned set. Forty cards are not
 *   forty reasons to call FINN's API.
 *
 * - **Nothing invented.** A car whose equipment FINN didn't list has no fit to
 *   report, and silence is better than a grey "unknown" on every card.
 *
 * The second rule is why this cannot be a one-shot pass the way the pin
 * button is. That button needs nothing but the card it is going on, so it can
 * be drawn the moment the card exists. A verdict needs the car's data, which
 * arrives separately — the interceptor forwards FINN's own `/api/cars`
 * response and it is merged into storage some time after the cards are on
 * screen. So a badge pass that finds no car is not a decision; it is a pass
 * that ran too early, and something has to run it again when the data lands.
 * See the storage listener in the content script's entry.
 */

const BADGE = "finn-lens-fit-badge";
const MARKER = "data-finn-lens-fit";

/** Marks a block this file made into a positioning context, so it can undo it. */
const POSITIONED = "data-finn-lens-anchored";

/**
 * Whether a block can already hold an absolutely positioned child.
 *
 * Computed style is the real answer and is used wherever it exists. The class
 * check behind it is for the test environment, which has no layout engine —
 * and it is a fair reading of this particular page, since finn.com is built
 * in Tailwind and says so in its class lists.
 */
function isPositioned(element: HTMLElement): boolean {
  try {
    const computed = element.ownerDocument?.defaultView?.getComputedStyle?.(
      element,
    );

    if (computed?.position) return computed.position !== "static";
  } catch {
    /* No layout engine. Fall through to the class list. */
  }

  return ["relative", "absolute", "fixed", "sticky"].some((name) =>
    element.classList.contains(name),
  );
}

/**
 * Make a block able to hold the pill, and remember if we changed it.
 *
 * FINN's own photo wrappers are already positioned, so this is usually a
 * no-op. It matters on the fallback path — the card itself, when the media
 * block can't be identified — where a static parent lets an absolutely
 * positioned pill escape to whatever ancestor is positioned. That is a badge
 * that looks like it failed to load: on the page, but in the wrong card or
 * clipped out of sight. The pin button has always guarded its own anchor this
 * way; the badge never did.
 */
function anchor(element: HTMLElement): void {
  if (isPositioned(element)) return;

  element.classList.add("relative");
  element.setAttribute(POSITIONED, "");
}

/** Puts a block back exactly as FINN wrote it. */
function unanchor(element: Element): void {
  element.classList.remove("relative");
  element.removeAttribute(POSITIONED);

  /* An emptied class attribute is still a change to somebody else's markup. */
  if (element.getAttribute("class") === "") element.removeAttribute("class");
}

/* -------------------------------------------------------------------------- */
/* The badge                                                                  */
/* -------------------------------------------------------------------------- */

function meter(level: FitLevel): HTMLElement {
  const band = FIT_BANDS[level];

  return el(
    "span",
    {
      class: "flex items-center gap-[2px]",
      attrs: { "aria-hidden": "true" },
    },
    [0, 1, 2, 3].map((index) =>
      el("span", {
        class: [
          "block h-2.5 w-[3px] rounded-full",
          index < FIT_SEGMENTS[level] ? band.barClass : band.emptyBarClass,
        ].join(" "),
      }),
    ),
  );
}

/**
 * A pill over the photograph, in the corner nothing else uses.
 *
 * It began as a strip under the card, which was safe and read as a row of
 * furniture bolted on below FINN's own — a second card stacked under the
 * first. On the photograph it reads as part of the card, the way a discount
 * flash or an availability tag would, and it costs the card no height at all.
 *
 * Bottom-left because the top-right is the pin and the top-left is FINN's own
 * compare control. The photo blocks are already positioned, so this lays over
 * one without changing anything about the layout underneath it.
 */
function badgeFor(
  car: FinnCar,
  level: FitLevel,
  label: string,
): HTMLElement {
  return el(
    "button",
    {
      class: [
        BADGE,
        "absolute bottom-2 left-2 z-10 flex max-w-[calc(100%-1rem)]",
        "items-center gap-1.5 rounded-full py-1 pl-2 pr-2.5",
        "cursor-pointer border-0 text-left",
        "shadow-[0_1px_6px_rgba(0,0,0,0.14)] transition-all",
        "hover:shadow-[0_2px_10px_rgba(0,0,0,0.2)]",
        "focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-finn-accent-blue/50",
        FIT_BANDS[level].chipClass,
      ].join(" "),
      attrs: {
        type: "button",
        "aria-label": `FINN Lens: ${label} for ${car.name}. See how it fits you.`,
      },
      on: {
        /*
         * FINN's card is a link, and every part of it is clickable. Without
         * this, asking Lens about a car would navigate away from the page the
         * reader was scanning — which is the opposite of what a badge on a
         * list is for.
         */
        click: (event) => {
          event.preventDefault();
          event.stopPropagation();

          void openPanel({ carId: car.id });
        },
      },
    },
    [
      meter(level),

      el("span", {
        class: "min-w-0 truncate text-[11px] font-black",
        text: label,
      }),

      /*
       * The verdict is a claim; this is the offer to see the working, and it
       * has to look like one. A bare chevron says "there is more" without
       * saying it can be asked for, and on a photograph — where every pixel
       * belongs to a card that is itself a link — "more" reads as "this opens
       * the car", which is the one thing this control does not do. The word
       * restores the promise the panel then keeps: you are about to be told
       * why.
       */
      el("span", {
        class: [
          "flex shrink-0 items-center gap-0.5 border-l pl-1.5",
          "border-current/25 text-[11px] font-bold opacity-70",
        ].join(" "),
        attrs: { "aria-hidden": "true" },
        text: "Why ›",
      }),
    ],
  );
}

/* -------------------------------------------------------------------------- */
/* Putting them on, and taking them off                                       */
/* -------------------------------------------------------------------------- */

/** Read once per pass rather than once per card. */
async function context(): Promise<{
  settings: LensSettings;
  carFor: (id: number) => PinnedFinnCar | null;
} | null> {
  if (!(await hasSavedLensSettings())) return null;

  const [settings, pinned, loaded] = await Promise.all([
    loadLensSettings(),
    getPinnedCars(),
    getLoadedCars(),
  ]);

  return {
    settings,
    carFor: (id) => {
      const car = pinned[id] ?? loaded[id];

      /*
       * `url` and `pinnedAt` are unread by every scoring and narrative
       * function; a card's verdict needs the same car whether or not the
       * reader has pinned it.
       */
      return car ? ({ url: "", pinnedAt: "", ...car } as PinnedFinnCar) : null;
    },
  };
}

/**
 * Which page's badges are the current ones.
 *
 * Reading the settings and the car cache takes four storage round-trips, and
 * finn.com moves between cars without reloading — so a pass can easily be
 * mid-await when the reader navigates and `removeFitBadges` clears the page.
 * Without this the pass would resume afterwards and paint the previous page's
 * verdicts onto the new one's cards, where they would sit until something
 * else happened to clear them.
 */
let generation = 0;

export async function injectFitBadges(): Promise<void> {
  /*
   * The cards still wanting a verdict, worked out before anything is read.
   *
   * The mutation observer fires constantly on finn.com and most passes have
   * nothing to do; asking storage four questions to discover that was the
   * bulk of what this function did.
   */
  const pending = [
    ...document.querySelectorAll<HTMLElement>(CARD_SELECTORS),
  ].filter((card) => !card.hasAttribute(MARKER));

  if (!pending.length) return;

  const era = generation;
  const shared = await context();

  if (!shared || era !== generation) return;

  for (const card of pending) {
    /* Re-checked: a concurrent pass may have got here during the await. */
    if (card.hasAttribute(MARKER)) continue;

    const id = cardConfigId(card);
    const car = id == null ? null : shared.carFor(id);

    /*
     * Left unmarked on purpose. A card whose car has not reached the cache
     * yet is not a card without a verdict — it is a card whose verdict has
     * not arrived, and the next pass has to be free to try again.
     */
    if (!car) continue;

    const analysis = buildFitAnalysis(
      car,
      shared.settings.priorities,
      shared.settings.preferences,
      shared.settings.categoryFeatures,
    );

    /* Nothing to report is reported as nothing. */
    if (analysis.overall.level === "unknown") continue;

    card.setAttribute(MARKER, String(car.id));

    const photo = cardPhoto(card);

    anchor(photo);

    photo.append(
      badgeFor(car, analysis.overall.level, analysis.overall.label),
    );
  }
}

/**
 * Takes every badge off, so a re-read puts fresh verdicts on rather than
 * leaving one card answering to settings the reader has since changed.
 */
export function removeFitBadges(): void {
  generation += 1;

  for (const badge of document.querySelectorAll(`.${BADGE}`)) badge.remove();

  for (const card of document.querySelectorAll(`[${MARKER}]`)) {
    card.removeAttribute(MARKER);
  }

  for (const block of document.querySelectorAll(`[${POSITIONED}]`)) {
    unanchor(block);
  }
}

export async function refreshFitBadges(): Promise<void> {
  removeFitBadges();
  await injectFitBadges();
}
