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

export type CurrentCar =
  | { status: "ready"; car: PinnedFinnCar; configId: number; isPinned: boolean }
  | { status: "unidentified" }
  | { status: "unavailable"; reason: string };

/**
 * The config id of the car on screen.
 *
 * Two signals, both of which the extension already relies on elsewhere:
 *
 * 1. `selected_config` in the URL. FINN uses it to address one configuration
 *    of a model, and `buildCarUrl` writes the same parameter when pinning, so
 *    it is the closest thing to a canonical identifier the page offers.
 *
 * 2. A single `id="product-XXXXX"` element inside the details root. The pin
 *    injector treats these as the page's configuration cards; where the page
 *    shows exactly one there is no ambiguity about which car it is.
 *
 * Where the page shows several configurations and the URL doesn't say which is
 * selected, this deliberately gives up. An analysis of the wrong trim is worse
 * than no analysis.
 */
export function resolveCurrentConfigId(root: HTMLElement): number | null {
  const fromUrl = new URLSearchParams(window.location.search).get(
    "selected_config",
  );

  const parsed = fromUrl ? extractConfigId(fromUrl) : null;
  if (parsed != null) return parsed;

  const configCards = Array.from(
    root.querySelectorAll<HTMLElement>('[id^="product-"]'),
  ).filter((element) => /^product-\d+$/.test(element.id));

  const ids = new Set(
    configCards
      .map((element) => extractConfigId(element.id))
      .filter((id): id is number => id != null),
  );

  const [only] = [...ids];

  return ids.size === 1 && only != null ? only : null;
}

/** The details page root, or null when this isn't one. */
export function detailsPageRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>(DETAILS_PAGE_SELECTOR);
}

/**
 * The car on screen, ready for the reasoning engine.
 *
 * Storage is consulted before the network in both directions — the pinned
 * record first, because it is the same car with a real pinned date on it, then
 * the cache the interceptor fills as the reader browses. Most opens of this
 * panel therefore cost nothing: FINN has already fetched the car and we
 * already kept it. Only a cold cache reaches the API, through the same helper
 * the pin button uses.
 */
export async function resolveCurrentCar(
  root: HTMLElement,
): Promise<CurrentCar> {
  const configId = resolveCurrentConfigId(root);

  if (configId == null) return { status: "unidentified" };

  try {
    const pinned = (await getPinnedCars())[configId];

    if (pinned) {
      return { status: "ready", car: pinned, configId, isPinned: true };
    }

    const cached = (await getLoadedCars())[configId];

    if (cached) {
      return {
        status: "ready",
        car: asEvaluatable(cached),
        configId,
        isPinned: false,
      };
    }

    const response = await loadCarsFromFinnApi({
      isHomePage: false,
      isListingsPage: false,
      isDetailsPage: root,
      anchorElementIsAListItem: false,
      /* The branch that asks FINN for every configuration of this model. */
      anchorElementIsAConfigCardItem: true,
      anchorElement: root,
      carConfigId: configId,
    });

    const mapped = mapFinnConfigToAll(response.results);

    await mergeLoadedCars(mapped);

    const car = mapped[configId];

    if (!car) {
      return {
        status: "unavailable",
        reason: "FINN's data for this car didn't come back with the configuration on screen.",
      };
    }

    return {
      status: "ready",
      car: asEvaluatable(car),
      configId,
      isPinned: false,
    };
  } catch (error) {
    console.error("[FinnLens] couldn't load the car on screen", error);

    return {
      status: "unavailable",
      reason: "We couldn't load FINN's data for this car.",
    };
  }
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
