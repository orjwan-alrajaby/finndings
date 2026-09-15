import type { PublicPath } from "wxt/browser";
import { needsOnboarding } from "@/lib/onboarding";

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((req) => {
    if (req.type === "OPEN_COMPARE_PAGE") { 
      void openOrFocusNewPage("/compare.html");
    } 
    else if (req.type === "OPEN_SETTINGS_PAGE") {
      void openOrFocusNewPage("/settings.html");
    }
    else if (req.type === "OPEN_ONBOARDING_PAGE") {
      void openOrFocusNewPage("/onboarding.html");
    }
    else if (req.type === "OPEN_PINS_PAGE") {
      /*
       * A car to open is carried in the hash rather than the query: the pins
       * tab may already be open, and changing only the hash of an open tab
       * tells the page without reloading it.
       */
      const carId = Number(req.carId);

      void openOrFocusNewPage(
        "/pins.html",
        Number.isInteger(carId) && carId > 0 ? `#car=${carId}` : undefined,
      );
    }
  });

  /**
   * Meet a new reader with an explanation rather than an empty product.
   *
   * Only on a first install: an update must never interrupt someone
   * mid-task to re-explain a product they already use. `needsOnboarding`
   * is checked as well as the reason, because an extension can be removed
   * and reinstalled with its stored settings intact, and a reader who
   * already answered these questions should not be asked them again.
   */
  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason !== "install") return;

    void (async () => {
      try {
        if (await needsOnboarding()) {
          await openOrFocusNewPage("/onboarding.html");
        }
      } catch (error) {
        console.error("Finn Lens: could not open the setup flow", error);
      }
    })();
  });
});

/**
 * Opens compare page if it doesn't exist.
 * Otherwise focuses existing compare tab.
 */
async function openOrFocusNewPage(
  url: PublicPath,
  /** Appended to the page's URL, and set on an existing tab too. */
  hash?: string,
) {
  /**
   * Extension page URL.
   *
   * Example:
   * chrome-extension://abc123/compare.html
   */
  const comparePageUrl =
    browser.runtime.getURL(url);

  /**
   * Search for existing compare page tab.
   */
  const existingTabs =
    await browser.tabs.query({
      url: comparePageUrl,
    });

  /**
   * Opens or focuses the specified extension page.
   * If a tab with the target URL already exists, focuses it instead of creating a duplicate.
   */
  if (existingTabs.length > 0) {
    const existingTab = existingTabs[0];

    if (!existingTab?.id) return;

    await browser.tabs.update(
      existingTab.id,
      {
        active: true,
        /*
         * Only the hash changes, so the page stays loaded and hears about
         * it through `hashchange`. The query above still finds the tab
         * whatever hash it has, since URL patterns ignore fragments.
         */
        ...(hash ? { url: `${comparePageUrl}${hash}` } : {}),
      }
    );

    if (existingTab.windowId && existingTab.windowId !== -1) {
      await browser.windows.update(
        existingTab.windowId,
        {
          focused: true,
        }
      );
    }
    return;
  }

  /**
   * Otherwise create fresh compare page.
   */
  await browser.tabs.create({
    url: `${comparePageUrl}${hash ?? ""}`,
  });
}