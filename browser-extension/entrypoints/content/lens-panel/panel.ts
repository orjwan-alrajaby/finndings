import {
  buildFitAnalysis,
  type FitAnalysis,
} from "@/lib/reasoning-engine/fit";
import { hasSavedLensSettings, loadLensSettings } from "@/lib/reasoning-engine";

import { el, empty, fragment, panelStyles } from "./dom";
import { analysisBody } from "./sections";
import { detailsPageRoot, resolveCurrentCar } from "./currentCar";

/**
 * The panel itself: a drawer over finn.com, and the states it can be in.
 *
 * It lives in a shadow root so that nothing it draws can reach FINN's page and
 * nothing on FINN's page can restyle it. Everything it needs is read when it
 * opens — settings, the car, the analysis — so a reader who never opens it
 * pays for none of it, and a reader who opens it twice gets whatever their
 * settings say the second time.
 */

const HOST_ID = "finn-lens-analysis-root";

/** The stored settings that change what an analysis says. */
const WATCHED_KEYS = [
  "finnLensPreferences",
  "finnLensPriorities",
  "finnLensCategoryFeatures",
];

interface Panel {
  destroy: () => void;
}

let open: Panel | null = null;

/* -------------------------------------------------------------------------- */
/* States                                                                     */
/* -------------------------------------------------------------------------- */

function message(
  title: string,
  body: string,
  action?: { label: string; onClick: () => void },
): DocumentFragment {
  return fragment([
    el("div", { class: "px-5 py-6" }, [
      el("p", {
        class: "text-base font-black leading-6 text-finn-black",
        text: title,
      }),
      el("p", {
        class: "mt-2 text-[13px] leading-5 text-finn-iron",
        text: body,
      }),

      action
        ? el("button", {
            class: [
              "mt-4 flex h-11 w-full items-center justify-center rounded-full",
              "bg-finn-accent-blue text-[13px] font-black text-white",
              "transition-colors hover:bg-finn-highlight-navy",
            ].join(" "),
            attrs: { type: "button" },
            text: action.label,
            on: { click: action.onClick },
          })
        : null,
    ]),
  ]);
}

function loadingState(): DocumentFragment {
  return fragment([
    el("div", { class: "flex items-center gap-3 px-5 py-6" }, [
      el("span", {
        class:
          "block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-finn-cotton border-t-finn-accent-blue",
        attrs: { "aria-hidden": "true" },
      }),
      el("p", {
        class: "text-[13px] text-finn-iron",
        text: "Reading this car…",
      }),
    ]),
  ]);
}

const openSettings = () => {
  void browser.runtime.sendMessage({ type: "OPEN_SETTINGS_PAGE" });
};

/* -------------------------------------------------------------------------- */
/* Content                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Works out what to show, in the order the answers become knowable.
 *
 * Settings first: without them there is no question to ask, and offering to
 * analyse a car against defaults the reader has never seen would be putting
 * words in their mouth. Then the car, which can fail in two different ways
 * that deserve two different sentences — we can't tell which car this is, and
 * we know which car this is but couldn't load it.
 */
async function render(into: HTMLElement, retry: () => void): Promise<void> {
  empty(into);
  into.append(loadingState());

  let configured: boolean;

  try {
    configured = await hasSavedLensSettings();
  } catch (error) {
    console.error("[FinnLens] couldn't read your settings", error);

    empty(into);
    into.append(
      message(
        "We couldn't read your settings",
        "Lens couldn't reach the browser storage your preferences live in. Nothing on this page is affected — try again in a moment.",
        { label: "Try again", onClick: retry },
      ),
    );

    return;
  }

  if (!configured) {
    empty(into);
    into.append(
      message(
        "Set up FINN Lens to personalise this car",
        "Choose the things that matter to you and put them in order, and Lens can tell you how well this car serves them. It takes about a minute, and you only do it once.",
        { label: "Choose your priorities", onClick: openSettings },
      ),
    );

    return;
  }

  const root = detailsPageRoot();

  if (!root) {
    empty(into);
    into.append(
      message(
        "This isn't a car page",
        "Open a car on FINN and Lens can tell you how it fits what you asked for.",
      ),
    );

    return;
  }

  const current = await resolveCurrentCar(root);

  if (current.status === "unidentified") {
    empty(into);
    into.append(
      message(
        "We can't tell which car this is",
        "This page is showing more than one configuration and nothing says which one is selected. Pick a configuration on the page and open Lens again — analysing the wrong trim would be worse than not analysing one.",
        { label: "Try again", onClick: retry },
      ),
    );

    return;
  }

  if (current.status === "unavailable") {
    empty(into);
    into.append(
      message("We couldn't load this car", current.reason, {
        label: "Try again",
        onClick: retry,
      }),
    );

    return;
  }

  const settings = await loadLensSettings();

  const analysis: FitAnalysis = buildFitAnalysis(
    current.car,
    settings.priorities,
    settings.preferences,
    settings.categoryFeatures,
  );

  empty(into);
  into.append(analysisBody(analysis));
  into.scrollTop = 0;
}

/* -------------------------------------------------------------------------- */
/* The drawer                                                                 */
/* -------------------------------------------------------------------------- */

async function build(): Promise<Panel> {
  const host = el("div", { attrs: { id: HOST_ID } });

  /*
   * Above FINN's own overlays without being hostile about it, and out of the
   * page's flow entirely so nothing it does can move anything FINN drew.
   */
  host.style.cssText = "position:fixed;inset:0;z-index:2147483000;";

  const shadow = host.attachShadow({ mode: "open" });

  shadow.append(el("style", { text: await panelStyles() }));

  const scroller = el("div", {
    class: "min-h-0 flex-1 overflow-y-auto overscroll-contain",
  });

  const close = () => closePanel();

  const closeButton = el("button", {
    class: [
      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
      "text-finn-iron transition-colors hover:bg-finn-cotton hover:text-finn-black",
    ].join(" "),
    attrs: { type: "button", "aria-label": "Close FINN Lens" },
    text: "✕",
    on: { click: close },
  });

  const title = el("p", {
    class: "text-[13px] font-black text-finn-black",
    attrs: { id: "finn-lens-title" },
    text: "How this car fits you",
  });

  const bar = el(
    "div",
    {
      class:
        "flex items-center gap-2 border-b border-finn-cotton px-5 py-3",
    },
    [
      el("span", {
        class: "text-sm",
        attrs: { "aria-hidden": "true" },
        text: "🔍",
      }),
      el("div", { class: "min-w-0 flex-1" }, [title]),
      el("button", {
        class: [
          "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold",
          "text-finn-iron transition-colors hover:bg-finn-cotton hover:text-finn-black",
        ].join(" "),
        attrs: { type: "button" },
        text: "Settings",
        on: { click: openSettings },
      }),
      closeButton,
    ],
  );

  const drawer = el(
    "div",
    {
      class: [
        "absolute inset-y-0 right-0 flex w-full max-w-[26rem] flex-col",
        "bg-white shadow-[0_0_40px_rgba(0,0,0,0.18)]",
        "font-sans text-finn-black",
      ].join(" "),
      attrs: {
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": "finn-lens-title",
      },
    },
    [bar, scroller],
  );

  const backdrop = el("div", {
    class: "absolute inset-0 bg-finn-black/25",
    on: { click: close },
  });

  shadow.append(backdrop, drawer);

  /**
   * A dialog's two keyboard obligations.
   *
   * Escape is listened for on the window because a reader who clicked the
   * backdrop has moved focus out of the drawer and still expects it to work.
   * Tab is kept inside, because a modal that tabs you into the page behind it
   * is a modal in appearance only — and here the page behind it belongs to
   * somebody else.
   */
  const focusable = (): HTMLElement[] =>
    Array.from(
      shadow.querySelectorAll<HTMLElement>("button, [href], [tabindex]"),
    ).filter((node) => !node.hasAttribute("disabled"));

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
      return;
    }

    if (event.key !== "Tab") return;
    if (!host.contains(event.target as Node) && event.target !== host) return;

    const nodes = focusable();
    const first = nodes[0];
    const last = nodes[nodes.length - 1];

    if (!first || !last) return;

    const active = shadow.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  window.addEventListener("keydown", onKeyDown, true);

  const retry = () => void render(scroller, retry);

  /*
   * Settings changed in the options tab reach an open panel, which is what
   * makes the setup prompt a step rather than a dead end.
   */
  const onStorageChanged = (
    changes: Record<string, unknown>,
    areaName: string,
  ) => {
    if (areaName !== "local") return;
    if (WATCHED_KEYS.some((key) => key in changes)) retry();
  };

  browser.storage.onChanged.addListener(onStorageChanged);

  const destroy = () => {
    browser.storage.onChanged.removeListener(onStorageChanged);
    window.removeEventListener("keydown", onKeyDown, true);
    host.remove();
  };

  void render(scroller, retry);

  document.body.append(host);
  closeButton.focus();

  return { destroy };
}

/* -------------------------------------------------------------------------- */
/* Opening and closing                                                        */
/* -------------------------------------------------------------------------- */

let opener: Element | null = null;

export async function openPanel(): Promise<void> {
  if (open) return;

  opener = document.activeElement;

  open = await build();
}

export function closePanel(): void {
  if (!open) return;

  open.destroy();
  open = null;

  if (opener instanceof HTMLElement && opener.isConnected) opener.focus();

  opener = null;
}
