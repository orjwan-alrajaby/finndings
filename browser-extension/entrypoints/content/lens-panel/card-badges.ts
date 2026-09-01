import { buildFitAnalysis, type FitLevel } from "@/lib/reasoning-engine/fit";
import { hasSavedLensSettings, loadLensSettings } from "@/lib/reasoning-engine";
import type { LensSettings } from "@/lib/reasoning-engine/types";
import type { FinnCar, PinnedFinnCar } from "@/lib/types";

import { el } from "./dom";
import { openPanel } from "./panel";
import {
  getLoadedCars,
  getPinnedCars,
} from "../injectors/inject-pin-button/injectPinCarButtonIntoNode/storage";
import { extractConfigId } from "../injectors/inject-pin-button/injectPinCarButtonIntoNode/utils";

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
 */

const BADGE = "finn-lens-fit-badge";
const MARKER = "data-finn-lens-fit";

/** Where FINN draws a car the reader could open. */
const CARD_SELECTORS = [
  '[data-testid="product-card"]',
  '[data-testid="group-comparison"] [id^="product-"]',
];

/* -------------------------------------------------------------------------- */
/* What a card is about                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The config id a card stands for.
 *
 * Listing cards carry it inside `data-productid`
 * ("byd-dolphin-36933-obsidianblack") and configuration cards inside their own
 * `id` ("product-34889"), which is exactly what the pin button already reads
 * from each — so a badge and a pin on the same card can never disagree about
 * which car it is.
 */
export function cardConfigId(card: HTMLElement): number | null {
  if (/^product-\d+$/.test(card.id)) {
    return Number(/^product-(\d+)$/.exec(card.id)?.[1]);
  }

  return extractConfigId(card.dataset.productid ?? "");
}

/* -------------------------------------------------------------------------- */
/* The badge                                                                  */
/* -------------------------------------------------------------------------- */

const SEGMENTS: Record<FitLevel, number> = {
  strong: 4,
  good: 3,
  partial: 2,
  limited: 1,
  unknown: 0,
};

function meter(level: FitLevel): HTMLElement {
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
          index < SEGMENTS[level]
            ? "bg-finn-accent-blue"
            : "bg-finn-accent-blue/25",
        ].join(" "),
      }),
    ),
  );
}

/**
 * A strip along the bottom of the card rather than a mark floating on it.
 *
 * The corners are taken — FINN's compare control on one, this extension's own
 * pin on the other — and a verdict is about the whole card anyway, not about
 * the part of the photograph it happens to sit over. Appended as the card's
 * last child, so it lands under the content in normal flow and pushes nothing
 * around.
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
        "mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2",
        "bg-finn-pale-blue text-left text-finn-highlight-navy",
        "cursor-pointer border-0 transition-colors",
        "hover:bg-finn-accent-blue hover:text-white",
        "focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-finn-accent-blue/50",
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
        class: "min-w-0 flex-1 truncate text-[11px] font-black",
        text: label,
      }),

      el("span", {
        class: "shrink-0 text-[11px] font-bold opacity-70",
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

export async function injectFitBadges(): Promise<void> {
  const cards = document.querySelectorAll<HTMLElement>(
    CARD_SELECTORS.join(","),
  );

  if (!cards.length) return;

  const shared = await context();

  if (!shared) return;

  for (const card of cards) {
    if (card.hasAttribute(MARKER)) continue;

    const id = cardConfigId(card);
    const car = id == null ? null : shared.carFor(id);

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
    card.append(badgeFor(car, analysis.overall.level, analysis.overall.label));
  }
}

/**
 * Takes every badge off, so a re-read puts fresh verdicts on rather than
 * leaving one card answering to settings the reader has since changed.
 */
export function removeFitBadges(): void {
  for (const badge of document.querySelectorAll(`.${BADGE}`)) badge.remove();

  for (const card of document.querySelectorAll(`[${MARKER}]`)) {
    card.removeAttribute(MARKER);
  }
}

export async function refreshFitBadges(): Promise<void> {
  removeFitBadges();
  await injectFitBadges();
}
