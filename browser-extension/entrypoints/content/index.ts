import "@/assets/tailwind.css";
import { injectPinBtnIntoDetailsPage } from "./injectors/inject-pin-button/injectPinBtnIntoDetailsPage";
import { injectPinBtnIntoCarListItem } from "./injectors/inject-pin-button/injectPinBtnIntoCarListItem";
import { HOME_PAGE_SELECTOR, LISTINGS_PAGE_SELECTOR, DETAILS_PAGE_SELECTOR } from "./constants";
import { mapFinnConfigToAll } from "./manipulateApiData";
import {
  getPinnedCars,
  mergeLoadedCars,
} from "./injectors/inject-pin-button/injectPinCarButtonIntoNode/storage";
import { mountLauncher, unmountLauncher } from "./lens-panel/launcher";
import {
  applyFitVerdicts,
  injectFitButtons,
  refreshFitBadges,
  removeFitBadges,
} from "./lens-panel/card-badges";

export default defineContentScript({
  matches: ["https://www.finn.com/*"],

  async main() {
    try {
      await injectScript("/network-interceptor.js");
      console.info("[FinnLens] interceptor injected");
    } catch (e) {
      console.error("[FinnLens] injection failed", e);
    }

    browser.runtime.onMessage.addListener(async (message) => {
      if (message.type !== "GET_PAGE_STATS") return;

      const pinnedCars = await getPinnedCars();

      return {
        detectedCount: document.querySelectorAll(
          '[data-finn-lens-processed="true"]'
        ).length,
        pinnedCount: Object.keys(pinnedCars ?? {}).length,
        pinnedCars,
      };
    });

    /*
     * Every car FINN's own page loads, kept.
     *
     * The interceptor forwards each /api/cars response, so the in-page analysis
     * usually needs no request of its own: the car the reader is looking at was
     * fetched by the page that is showing it.
     *
     * Merged into whatever is already stored rather than accumulated here. This
     * used to keep its own running copy of the cache, starting empty on every
     * page load and writing that copy back — so the first response after any
     * navigation replaced the entire cache with one page's worth of cars, and
     * quietly threw away everything the pin button and the panel had written
     * through `mergeLoadedCars` in the meantime.
     */
    window.addEventListener("message", async (event) => {
      if (event.source !== window) return;
      if (event.data?.source !== "finn-lens") return;
      if (event.data?.type !== "FINN_CARS_RESPONSE") return;

      const batchLoaded = event.data.payload?.results;

      /* FINN's response shape is not ours to rely on. */
      if (!Array.isArray(batchLoaded) || !batchLoaded.length) return;

      try {
        await mergeLoadedCars(mapFinnConfigToAll(batchLoaded));
      } catch (error) {
        console.error("[FinnLens] couldn't keep this page's cars", error);
      }
    });

    let activeObserver: MutationObserver | null = null;
    let mutationDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    let navDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    let badgeDebounceTimer: ReturnType<typeof setTimeout> | null = null;

    /*
     * A verdict pass is worth doing once after a burst, not once per write.
     * Several `/api/cars` responses land together on a listing page and each
     * one writes the cache.
     */
    const scheduleBadgePass = () => {
      if (badgeDebounceTimer !== null) clearTimeout(badgeDebounceTimer);

      badgeDebounceTimer = setTimeout(() => {
        badgeDebounceTimer = null;

        void applyFitVerdicts().catch(reportBadgeFailure);
      }, 80);
    };

    const patchHistory = (method: "pushState" | "replaceState") => {
      const original = history[method].bind(history);

      history[method] = (...args: Parameters<typeof history.pushState>) => {
        original(...args);
        window.dispatchEvent(new Event("finnlens:navigate"));
      };
    };

    patchHistory("pushState");
    patchHistory("replaceState");

    window.addEventListener("popstate", () =>
      window.dispatchEvent(new Event("finnlens:navigate"))
    );

    const runInjections = () => {
      injectAllExistingCards();

      if (document.querySelector(DETAILS_PAGE_SELECTOR)) {
        injectPinBtnIntoDetailsPage();
        void mountLauncher();
      }

      /*
       * Every car FINN draws gets a Lens control, wherever it is drawn — the
       * listing, the similar-cars rail, the configurations of one model.
       *
       * Synchronous, and in the same pass as the pin buttons on purpose: the
       * two controls sit on the same card and appearing at different moments
       * is what made this one look unreliable. Drawing it asks storage
       * nothing, so there is nothing to wait for.
       */
      injectFitButtons();

      /* The verdict follows whenever there is one to give. */
      scheduleBadgePass();
    };

    const startObserving = () => {
      activeObserver?.disconnect();

      activeObserver = new MutationObserver(() => {
        if (mutationDebounceTimer !== null) {
          clearTimeout(mutationDebounceTimer);
        }

        mutationDebounceTimer = setTimeout(() => {
          mutationDebounceTimer = null;

          runInjections();

          browser.runtime.sendMessage({
            type: "CARDS_LOADED",
          });
        }, 100);
      });

      activeObserver.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    };

    const handleNavigation = () => {
      runInjections();
      startObserving();

      if (document.querySelector(HOME_PAGE_SELECTOR)) {
        console.info("[FinnLens] home page detected");
      } else if (document.querySelector(LISTINGS_PAGE_SELECTOR)) {
        console.info("[FinnLens] listings page detected");
      } else if (document.querySelector(DETAILS_PAGE_SELECTOR)) {
        console.info("[FinnLens] product details page detected");
      }
    };

    const onNavigate = () => {
      if (navDebounceTimer !== null) {
        clearTimeout(navDebounceTimer);
      }

      /*
       * Taken down before the new page is read rather than after. FINN moves
       * between cars without reloading, and a panel still describing the car
       * the reader has just left is worse than no panel at all.
       */
      unmountLauncher();
      removeFitBadges();

      navDebounceTimer = setTimeout(() => {
        navDebounceTimer = null;
        handleNavigation();
      }, 150);
    };

    window.addEventListener("finnlens:navigate", onNavigate);

    /*
     * Storage is the other thing a verdict depends on, and it changes for two
     * different reasons that want two different answers.
     *
     * **The settings changed.** Saving new priorities in the options tab
     * makes every badge on the page a claim about what the reader used to
     * care about, so all of them come off and are worked out again.
     *
     * **The cars arrived.** A verdict needs the car's data, which does not
     * arrive with the card: the interceptor forwards FINN's own `/api/cars`
     * response and `mergeLoadedCars` writes it some time after the cards are
     * already on screen. The control is on the card either way now, so this
     * is no longer the difference between a badge and no badge — but it is
     * still the difference between a verdict and a question, and the write
     * is what settles it.
     *
     * Additive rather than a refresh, because this fires several times per
     * page — FINN makes more than one request — and taking every verdict off
     * to put most of them straight back would flicker the whole page each
     * time. `applyFitVerdicts` only touches controls that have none.
     */
    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") return;

      const settingsChanged = [
        "finnLensPreferences",
        "finnLensPriorities",
        "finnLensCategoryFeatures",
      ].some((key) => key in changes);

      if (settingsChanged) {
        void refreshFitBadges().catch(reportBadgeFailure);
        return;
      }

      const carsChanged = ["loadedCarsFromFinnApi", "pinnedCars"].some(
        (key) => key in changes,
      );

      if (carsChanged) scheduleBadgePass();
    });

    handleNavigation();
  },
});

/**
 * A badge that couldn't be worked out is worth a line in the console and
 * nothing more: FINN's page is unaffected, and the reader has lost a verdict
 * rather than the use of the site.
 */
function reportBadgeFailure(error: unknown) {
  console.error("[FinnLens] couldn't put verdicts on these cards", error);
}

function injectAllExistingCards() {
  const cards = document.body.querySelectorAll<HTMLDivElement>(
    'div[data-testid="product-card"]'
  );
  cards?.forEach((card) => injectPinBtnIntoCarListItem(card));
}