import {
  buildFitAnalysis,
  type FitAnalysis,
} from "@/lib/reasoning-engine/fit";
import { hasSavedLensSettings, loadLensSettings } from "@/lib/reasoning-engine";

import { el, empty, fragment, panelStyles } from "./dom";
import { analysisBody, configurationsSection } from "./sections";
import { detailsPageRoot, resolvePageCars } from "./currentCar";

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
/**
 * What the reader has chosen inside the panel, kept across re-renders.
 *
 * A re-render is not a fresh start — settings changing in the options tab
 * redraws the analysis, and redrawing it for a different car than the one the
 * reader was reading would be its own small betrayal.
 */
interface Session {
  chosenId: number | null;
}

async function render(
  into: HTMLElement,
  retry: () => void,
  session: Session,
): Promise<void> {
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

  const page = await resolvePageCars(root);

  if (page.status === "unidentified") {
    empty(into);
    into.append(
      message(
        "We can't tell which car this is",
        "Nothing on this page says which car it's showing. Open one from FINN's list and Lens will pick it up — analysing the wrong car would be worse than not analysing one.",
        { label: "Try again", onClick: retry },
      ),
    );

    return;
  }

  if (page.status === "unavailable") {
    empty(into);
    into.append(
      message("We couldn't load this car", page.reason, {
        label: "Try again",
        onClick: retry,
      }),
    );

    return;
  }

  const settings = await loadLensSettings();

  /*
   * Every configuration is analysed, not only the one on screen. They are
   * already loaded, each analysis is arithmetic over one car, and having them
   * all is what lets the chooser show what each one would mean for this reader
   * before they commit to reading about it.
   */
  const analyses = new Map<number, FitAnalysis>(
    page.cars.map((car) => [
      car.id,
      buildFitAnalysis(
        car,
        settings.priorities,
        settings.preferences,
        settings.categoryFeatures,
      ),
    ]),
  );

  const [first] = page.cars;

  /*
   * With one configuration there is nothing to choose, so it is the subject.
   * With several, the URL decides — and where it says nothing, so does the
   * panel, until the reader picks.
   */
  const chosen =
    session.chosenId != null &&
    page.cars.some((car) => car.id === session.chosenId)
      ? session.chosenId
      : null;

  let subjectId: number | null =
    chosen ?? page.selectedId ?? (page.cars.length === 1 && first ? first.id : null);

  const paint = () => {
    const chooser = configurationsSection({
      cars: page.cars,
      bandOf: (id) => analyses.get(id)?.overall ?? null,
      selectedId: subjectId,
      onSelect: (id) => {
        subjectId = id;
        session.chosenId = id;
        paint();
      },
    });

    const analysis = subjectId == null ? null : analyses.get(subjectId);

    empty(into);

    into.append(
      analysis
        ? analysisBody(analysis, chooser)
        : fragment([chooseLead(page.cars.length), chooser]),
    );

    into.scrollTop = 0;
  };

  paint();
}

/** What the panel opens with when the reader hasn't chosen a car yet. */
function chooseLead(count: number): HTMLElement {
  return el("div", { class: "px-5 pb-1 pt-4" }, [
    el("p", {
      class: "text-base font-black leading-6 text-finn-black",
      text: "Which one are you looking at?",
    }),
    el("p", {
      class: "mt-1.5 text-[13px] leading-5 text-finn-iron",
      text: `This page is showing a model, not a car — FINN sells it in ${count} configurations, and they don't fit you equally. Pick one and Lens will explain it.`,
    }),
  ]);
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

  const session: Session = { chosenId: null };

  const retry = () => void render(scroller, retry, session);

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

  void render(scroller, retry, session);

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
