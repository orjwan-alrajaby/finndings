import type { FinnCar, PinnedFinnCar } from "@/lib/types";

import { DETAILS_PAGE_SELECTOR } from "../constants";
import { mapFinnConfigToAll } from "../manipulateApiData";
import { loadCarsFromFinnApi } from "../injectors/inject-pin-button/injectPinCarButtonIntoNode/api";
import {
  getLoadedCars,
  getPinnedCars,
  mergeLoadedCars,
} from "../injectors/inject-pin-button/injectPinCarButtonIntoNode/storage";
import {
  buildCarUrl,
  extractConfigId,
} from "../injectors/inject-pin-button/injectPinCarButtonIntoNode/utils";

/**
 * Which car the reader is actually looking at, and what we know about it.
 *
 * The pin button never had to answer this: it is attached to an element that
 * carries its own config id, so it always knows which car was clicked. The
 * analysis panel is opened from nowhere in particular and has to work the
 * current car out from the page, which is the one genuinely new piece of DOM
 * reasoning in this feature — so it is kept in one file, ordered from the most
 * reliable signal to the least, and it returns `null` rather than a guess.
 */

/**
 * Every configuration this page offers, and which of them is on screen.
 *
 * The page is read as a set rather than as one car because that is what it is:
 * a model page lists the configurations FINN sells the model in, and
 * `selected_config` picks one out. Loading them all costs nothing extra — the
 * one API call that answers "what is config 34889?" answers it for every
 * sibling too — and it is what lets the panel offer the choice instead of
 * refusing to answer until the reader makes it somewhere else.
 */
export type PageCars =
  | {
      status: "ready";
      /** In the order FINN lists them. */
      cars: PinnedFinnCar[];
      /** The one named by the URL, when it names one. */
      selectedId: number | null;
    }
  | { status: "unidentified" }
  | { status: "unavailable"; reason: string };

/** Where FINN lists the configurations a model is available in. */
export const CONFIGURATIONS_SELECTOR = '[data-testid="group-comparison"]';

/**
 * The configuration cards on a model page.
 *
 * Each carries its own `id="product-XXXXX"`, which is where the pin button
 * gets the id of the car it pins. They are scoped to FINN's comparison grid
 * rather than looked for anywhere in the page, so nothing else that happens to
 * use that id shape can be mistaken for a car.
 */
export function configurationCards(root: HTMLElement): number[] {
  const grid = root.querySelector(CONFIGURATIONS_SELECTOR) ?? root;

  const ids = Array.from(grid.querySelectorAll<HTMLElement>('[id^="product-"]'))
    .map((element) => /^product-(\d+)$/.exec(element.id)?.[1])
    .map((digits) => (digits == null ? null : Number(digits)))
    .filter((id): id is number => id != null && Number.isSafeInteger(id));

  return [...new Set(ids)];
}

/**
 * The config id of the car on screen, if one is on screen at all.
 *
 * `selected_config` in the URL is the answer whenever there is one. It is how
 * FINN addresses a configuration — every "similar car" on a detail page links
 * with it, and `buildCarUrl` writes the same parameter when pinning — so it is
 * as close to canonical as the page gets.
 *
 * Without it, a model page is not showing a car. `/models/byd/dolphin-surf`
 * heads its sidebar "Wähle ein Auto", prices the model "ab 209 €" rather than
 * at any one configuration's price, and lists three of them to choose between.
 * The one case that still resolves is a model with a single configuration,
 * where there is nothing to choose.
 */
export function resolveCurrentConfigId(
  root: HTMLElement,
  search: string = window.location.search,
): number | null {
  /*
   * Read whole, not through `extractConfigId` — that helper matches the first
   * five digits it finds, which is right for the ids it was written against
   * and would quietly truncate anything longer.
   */
  const fromUrl = new URLSearchParams(search).get("selected_config")?.trim();

  if (fromUrl && /^\d+$/.test(fromUrl)) {
    const parsed = Number(fromUrl);

    if (Number.isSafeInteger(parsed)) return parsed;
  }

  const cards = configurationCards(root);
  const [only] = cards;

  return cards.length === 1 && only != null ? only : null;
}

/** Every card FINN draws that stands for one car the reader could open. */
export const CARD_SELECTORS = [
  '[data-testid="product-card"]',
  '[data-testid="group-comparison"] [id^="product-"]',
].join(",");

/**
 * The config id a card stands for.
 *
 * Listing cards carry it inside `data-productid`
 * ("byd-dolphin-36933-obsidianblack") and configuration cards inside their own
 * `id` ("product-34889") — which is exactly what the pin button already reads
 * from each, so nothing that marks a card can disagree with anything else
 * about which car it is.
 */
export function cardConfigId(card: HTMLElement): number | null {
  const own = /^product-(\d+)$/.exec(card.id)?.[1];

  if (own) return Number(own);

  return extractConfigId(card.dataset.productid ?? "");
}

/**
 * The name FINN prints on a card, for the panel's loading state.
 *
 * A hint and nothing more: it names what is being loaded while it loads, and
 * is thrown away the moment the real car arrives. Every word of the analysis
 * itself comes from the car FINN sent, never from the page — the page is
 * markup we don't own and can't hold to a shape.
 *
 * `h3` on a listing card; a configuration card has no name of its own, since
 * the model page's own heading carries it.
 */
export function cardName(card: HTMLElement): string | undefined {
  const heading = card.querySelector("h3")?.textContent?.trim();

  return heading || undefined;
}

/** The card on this page for one car, wherever FINN drew it. */
export function cardForCar(id: number): HTMLElement | null {
  const byId = document.getElementById(`product-${id}`);

  if (byId) return byId;

  for (const card of document.querySelectorAll<HTMLElement>(CARD_SELECTORS)) {
    if (cardConfigId(card) === id) return card;
  }

  return null;
}

/**
 * The part of a card FINN puts the photograph in.
 *
 * Two shapes, because there are two kinds of card: a listing card wraps its
 * media block one level deeper than a configuration card does. Rather than
 * guess which is which, both candidates are tried in order and each is checked
 * for actually holding the image — a selector that matches the wrong block
 * would put the verdict pill over the price.
 *
 * Falls back to the card itself, which is positioned too, so a card built some
 * third way gets its mark in a corner rather than not at all.
 */
export function cardPhoto(card: HTMLElement): HTMLElement {
  const candidates = [
    ":scope > div:first-child > div:first-child",
    ":scope > div:first-child",
  ];

  for (const selector of candidates) {
    const block = card.querySelector<HTMLElement>(selector);

    if (block?.querySelector("img")) return block;
  }

  return card;
}

/** The details page root, or null when this isn't one. */
export function detailsPageRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>(DETAILS_PAGE_SELECTOR);
}

/**
 * Every configuration on this page, ready for the reasoning engine.
 *
 * Storage is consulted before the network in both directions — the pinned
 * record first, because that is the same car with a real pinned date on it,
 * then the cache the interceptor fills as the reader browses. Most opens of
 * this panel therefore cost nothing: FINN has already fetched these cars and
 * we already kept them. Only a gap in the cache reaches the API, through the
 * same helper the pin button uses, and that one call returns every
 * configuration of the model at once.
 */
export async function resolvePageCars(
  root: HTMLElement,
): Promise<PageCars> {
  const selectedId = resolveCurrentConfigId(root);
  const listed = configurationCards(root);

  /*
   * The URL wins on order as well as on selection: a configuration it names
   * that FINN hasn't listed on the page is still the car the reader opened.
   */
  const wanted = [...new Set(selectedId != null ? [selectedId, ...listed] : listed)];

  if (!wanted.length) return { status: "unidentified" };

  try {
    const pinned = await getPinnedCars();
    let loaded = await getLoadedCars();

    const missing = wanted.filter((id) => !pinned[id] && !loaded[id]);

    if (missing.length) {
      const response = await loadCarsFromFinnApi({
        isHomePage: false,
        isListingsPage: false,
        isDetailsPage: root,
        anchorElementIsAListItem: false,
        /* The branch that asks FINN for every configuration of this model. */
        anchorElementIsAConfigCardItem: true,
        anchorElement: root,
        carConfigId: missing[0] as number,
      });

      const mapped = mapFinnConfigToAll(response.results);

      await mergeLoadedCars(mapped);

      loaded = { ...loaded, ...mapped };
    }

    const cars = wanted
      .map((id) => pinned[id] ?? (loaded[id] ? asEvaluatable(loaded[id]) : null))
      .filter((car): car is PinnedFinnCar => car != null);

    if (!cars.length) {
      return {
        status: "unavailable",
        reason:
          "FINN's data came back without the configurations this page is showing.",
      };
    }

    return {
      status: "ready",
      cars,
      /* Only claim a selection we actually have a car for. */
      selectedId:
        selectedId != null && cars.some((car) => car.id === selectedId)
          ? selectedId
          : null,
    };
  } catch (error) {
    console.error("[FinnLens] couldn't load this model's configurations", error);

    return {
      status: "unavailable",
      reason: "We couldn't load FINN's data for this car.",
    };
  }
}

/**
 * One car by id, from what we already have.
 *
 * Deliberately no network: everything this can answer for is a car FINN's own
 * page has already fetched, and the interceptor keeps a copy of every one of
 * those. A request here would be asking FINN twice for something it has
 * already sent us.
 *
 * What it will do is wait. The button that leads here is now drawn the moment
 * the card exists — the same moment the pin button appears — while the car's
 * data arrives separately, when the interceptor's copy of FINN's response
 * reaches storage. So a miss is usually not "we don't have this car"; it is
 * "we don't have it *yet*", and the gap is the few hundred milliseconds
 * between finn.com drawing a card and finishing the request that drew it.
 * Failing instantly in that window would tell the reader something untrue.
 */
export async function resolveCar(
  id: number,
  { waitMs = 0 }: { waitMs?: number } = {},
): Promise<PinnedFinnCar | null> {
  try {
    const found = await readCar(id);

    if (found || waitMs <= 0) return found;

    return await waitForCar(id, waitMs);
  } catch (error) {
    console.error("[FinnLens] couldn't read what we know about a car", error);

    return null;
  }
}

/** What storage holds for one car right now. */
async function readCar(id: number): Promise<PinnedFinnCar | null> {
  const pinned = (await getPinnedCars())[id];

  if (pinned) return pinned;

  const cached = (await getLoadedCars())[id];

  return cached ? asEvaluatable(cached) : null;
}

/**
 * Wait for a car to arrive, or give up.
 *
 * Driven by the storage event rather than by polling: the only thing that can
 * make this car appear is a write, so a write is the only thing worth waking
 * up for. The timeout is what stops a car FINN never sent from leaving the
 * panel spinning — past it the reader gets told plainly that we don't have it.
 */
function waitForCar(
  id: number,
  waitMs: number,
): Promise<PinnedFinnCar | null> {
  return new Promise((resolve) => {
    let settled = false;

    const finish = (car: PinnedFinnCar | null) => {
      if (settled) return;

      settled = true;

      clearTimeout(timer);
      browser.storage.onChanged.removeListener(onChanged);

      resolve(car);
    };

    const onChanged = (
      changes: Record<string, unknown>,
      areaName: string,
    ) => {
      if (areaName !== "local") return;

      const relevant =
        "loadedCarsFromFinnApi" in changes || "pinnedCars" in changes;

      if (!relevant) return;

      void readCar(id).then((car) => {
        if (car) finish(car);
      });
    };

    const timer = setTimeout(() => finish(null), waitMs);

    browser.storage.onChanged.addListener(onChanged);

    /* Re-checked after subscribing, so a write in between isn't missed. */
    void readCar(id).then((car) => {
      if (car) finish(car);
    });
  });
}

/**
 * The engine's vehicle type is `PinnedFinnCar` because the Compare flow is the
 * only thing that has ever fed it cars, and everything it pins has a URL and a
 * pinned date. Neither field is read by any scoring, costing or narrative
 * function — the analysis needs the same car whether or not it was pinned.
 *
 * So rather than widening every signature in the engine (and with it the
 * Compare page's `winner.url`, which is a genuine pinned-car field), the two
 * are filled in here: the URL is the page the reader is on, which is true, and
 * an empty pinned date says plainly that this car isn't pinned.
 */
function asEvaluatable(car: FinnCar): PinnedFinnCar {
  return {
    ...car,
    url: buildCarUrl(window.location.href, car.id),
    pinnedAt: "",
  };
}
