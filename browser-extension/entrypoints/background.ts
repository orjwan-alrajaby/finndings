import type { PublicPath } from "wxt/browser";

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((req) => {
    if (req.type === "OPEN_COMPARE_PAGE") { 
      void openOrFocusNewPage("/compare.html");
    } 
    else if (req.type === "OPEN_SETTINGS_PAGE") {
      void openOrFocusNewPage("/settings.html");
    }
  });
});

/**
 * Opens compare page if it doesn't exist.
 * Otherwise focuses existing compare tab.
 */
async function openOrFocusNewPage(url: PublicPath) {
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
    url: comparePageUrl,
  });
}