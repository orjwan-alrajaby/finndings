import "@/assets/tailwind.css";
import { injectPinBtnIntoDetailsPage } from "./injectors/inject-pin-button/injectPinBtnIntoDetailsPage";
import { injectPinBtnIntoCarListItem } from "./injectors/inject-pin-button/injectPinBtnIntoCarListItem";
import { HOME_PAGE_SELECTOR, LISTINGS_PAGE_SELECTOR, DETAILS_PAGE_SELECTOR } from "./constants";
import { mapFinnConfigToAll } from "./manipulateApiData";
import { getPinnedCars } from "./injectors/inject-pin-button/injectPinCarButtonIntoNode/storage";
import { mountLauncher, unmountLauncher } from "./lens-panel/launcher";

export default defineContentScript({
  matches: ["https://www.finn.com/*"],

  async main() {
    let allLoadedSoFar = { cars: {}, total: 0 };

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
     * The interceptor forwards each /api/cars response and this is the only
     * place that accumulates them, so the in-page analysis usually needs no
     * request of its own: the car the reader is looking at was fetched by the
     * page that is showing it.
     */
    window.addEventListener("message", async (event) => {
      if (event.source !== window) return;
      if (event.data?.source !== "finn-lens") return;
      if (event.data?.type !== "FINN_CARS_RESPONSE") return;

      const batchLoaded = event.data.payload.results;
      const formatted = mapFinnConfigToAll(batchLoaded);

      allLoadedSoFar = {
        cars: { ...allLoadedSoFar.cars, ...formatted },
        total: allLoadedSoFar.total + batchLoaded.length,
      };

      await browser.storage.local.set({
        loadedCarsFromFinnApi: allLoadedSoFar,
      });
    });

    let activeObserver: MutationObserver | null = null;
    let mutationDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    let navDebounceTimer: ReturnType<typeof setTimeout> | null = null;

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

      navDebounceTimer = setTimeout(() => {
        navDebounceTimer = null;
        handleNavigation();
      }, 150);
    };

    window.addEventListener("finnlens:navigate", onNavigate);

    handleNavigation();
  },
});

function injectAllExistingCards() {
  const cards = document.body.querySelectorAll<HTMLDivElement>(
    'div[data-testid="product-card"]'
  );
  cards?.forEach((card) => injectPinBtnIntoCarListItem(card));
}