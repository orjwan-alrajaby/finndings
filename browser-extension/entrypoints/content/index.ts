import "@/assets/tailwind.css";
import { injectPinBtnIntoDetailsPage } from "./injectors/inject-pin-button/injectPinBtnIntoDetailsPage";
import { injectPinBtnIntoCarListItem } from "./injectors/inject-pin-button/injectPinBtnIntoCarListItem";
import { HOME_PAGE_SELECTOR, LISTINGS_PAGE_SELECTOR, DETAILS_PAGE_SELECTOR } from "./constants";
import { mapFinnConfigToAll } from "./manipulateApiData";

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

      await browser.storage.local.set({ loadedCarsFromFinnApi: allLoadedSoFar });
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
      }
    };

    const startObserving = () => {
      activeObserver?.disconnect();
      activeObserver = new MutationObserver(() => {
        if (mutationDebounceTimer !== null) clearTimeout(mutationDebounceTimer);
        mutationDebounceTimer = setTimeout(() => {
          mutationDebounceTimer = null;
          runInjections();
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
      if (navDebounceTimer !== null) clearTimeout(navDebounceTimer);
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