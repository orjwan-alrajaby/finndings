import {
  buildFitAnalysis,
  type FitAnalysis,
} from "@/lib/reasoning-engine/fit";
import { hasSavedLensSettings, loadLensSettings } from "@/lib/reasoning-engine";

import { el, empty, fragment, panelStyles } from "./dom";
import { canDock, dockPage, undockPage } from "./page-dock";
import {
  findInsetAnchor,
  insetGeometry,
  insetPage,
  uninsetPage,
} from "./page-inset";
import {
  analysisBody,
  backToConfigurations,
  configurationsSection,
} from "./sections";
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

/**
 * How wide the panel sits, and how much room the page gives up for it.
 *
 * One number, used twice: the host's width and the margin the page is
 * narrowed by. They have to be the same or the seam shows.
 */
const PANEL_WIDTH = 416;

/**
 * How tall the panel stands when it sits in the page rather than beside it.
 *
 * Tall enough that the answer starts rather than teases, short enough that
 * FINN's configurations stay visible below it — the reader should be able to
 * see the gap has an end. Capped against the viewport so it never becomes a
 * page of its own on a short screen.
 */
const PANEL_HEIGHT = 560;

const panelHeight = (): number =>
  Math.min(PANEL_HEIGHT, Math.round(window.innerHeight * 0.75));

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

/**
 * Told when the panel comes and goes, so the launcher can get out of its way.
 *
 * A callback rather than the launcher being imported here: it already imports
 * this module, and the dependency should keep pointing one way.
 */
let onVisibility: ((visible: boolean) => void) | null = null;

export function watchPanelVisibility(
  listener: (visible: boolean) => void,
): void {
  onVisibility = listener;
}

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
 * Where the reader has navigated inside the panel, kept across re-renders.
 *
 * A re-render is not a fresh start — settings changing in the options tab
 * redraws the analysis, and redrawing it for a different car than the one the
 * reader was reading would be its own small betrayal.
 *
 * Three states, not two. `undefined` means they haven't navigated at all and
 * the URL still decides; a number is the car they opened; and `null` is the
 * list, which they reached by deliberately going back. Collapsing that last
 * one into "nothing chosen" would send a reader who had just returned to the
 * list straight back into the car the URL names.
 */
interface Session {
  choice: number | null | undefined;
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
  /* A car they chose that the page no longer offers is no longer a choice. */
  const navigated =
    session.choice != null &&
    !page.cars.some((car) => car.id === session.choice)
      ? undefined
      : session.choice;

  let subjectId: number | null =
    navigated !== undefined
      ? navigated
      : (page.selectedId ??
        (page.cars.length === 1 && first ? first.id : null));

  /*
   * One screen at a time: the list, or one car. Choosing a configuration
   * replaces the list rather than sitting under it, and the way back is a
   * link at the top of the analysis.
   */
  const show = (id: number | null) => {
    subjectId = id;
    session.choice = id;
    paint();
  };

  const paint = () => {
    const analysis = subjectId == null ? null : analyses.get(subjectId);

    empty(into);

    into.append(
      analysis
        ? analysisBody(
            analysis,
            /* With one configuration there is no list to go back to. */
            page.cars.length > 1
              ? backToConfigurations(page.cars.length, () => show(null))
              : null,
          )
        : fragment([
            chooseLead(page.cars.length),
            configurationsSection({
              cars: page.cars,
              bandOf: (id) => analyses.get(id)?.overall ?? null,
              onSelect: show,
            }),
          ]),
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
   * Three placements, in order of how much the panel behaves like part of
   * the page:
   *
   *   inset  — a band in the page's own flow, in the gap between the car and
   *            the configurations it comes in. Scrolls with the page, because
   *            it is at a place on the page rather than a place on the screen.
   *   docked — a rail down the right, when there is no seam to sit in.
   *   over   — a sheet over the page, when there is no room for either.
   *
   * Nothing outside the panel's own box is ours to occupy in the first two:
   * the page around it stays clickable, scrollable and selectable, which is
   * the entire point of making room rather than covering.
   */
  const root = detailsPageRoot();
  const anchor = root ? findInsetAnchor(root) : null;

  const placement: "inset" | "docked" | "over" = anchor
    ? "inset"
    : canDock(PANEL_WIDTH)
      ? "docked"
      : "over";

  /** Puts the host where the placement says, in page or screen coordinates. */
  const position = () => {
    if (placement === "inset" && anchor) {
      const height = panelHeight();
      const { top, left, width } = insetGeometry(anchor, height);

      host.style.cssText =
        `position:absolute;top:${top}px;left:${left}px;` +
        `width:${width}px;height:${height}px;z-index:2147483000;`;

      return;
    }

    host.style.cssText =
      placement === "docked"
        ? `position:fixed;top:0;right:0;bottom:0;width:${PANEL_WIDTH}px;z-index:2147483000;`
        : "position:fixed;inset:0;z-index:2147483000;";
  };

  const shadow = host.attachShadow({ mode: "open" });

  shadow.append(el("style", { text: await panelStyles() }));

  /*
   * Laid out in columns when the panel is wide and stacked when it is narrow.
   * Same sections either way — a band the width of FINN's own container with
   * one 26rem column of text down the left would be mostly empty page.
   */
  const scroller = el("div", {
    class: [
      "min-h-0 flex-1 overflow-y-auto overscroll-contain",
      placement === "inset"
        ? "[column-gap:0px] md:columns-2 xl:columns-3"
        : "",
    ].join(" "),
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

  /*
   * A region beside the page, not a dialog over it.
   *
   * `aria-modal` would now be a lie, and a lie that costs something: it tells
   * a screen reader everything else on the page is inert, when in fact the
   * reader is meant to be reading FINN's page alongside this. A labelled
   * complementary region is what this actually is.
   */
  const drawer = el(
    "div",
    {
      class: [
        "absolute inset-0 flex flex-col overflow-hidden bg-white",
        "font-sans text-finn-black",
        placement === "inset"
          ? "rounded-2xl border border-finn-cotton shadow-[0_2px_16px_rgba(0,0,0,0.06)]"
          : "border-l border-finn-cotton shadow-[-8px_0_24px_rgba(0,0,0,0.08)]",
      ].join(" "),
      attrs: {
        role: "complementary",
        "aria-labelledby": "finn-lens-title",
      },
    },
    [bar, scroller],
  );

  shadow.append(drawer);

  if (placement === "inset" && anchor) insetPage(anchor, panelHeight());
  else if (placement === "docked") dockPage(PANEL_WIDTH);

  position();

  /**
   * Escape closes it, and Tab is left alone.
   *
   * The panel used to trap Tab, which is right for a modal and wrong for
   * this: the page beside it is meant to be reachable, and a reader who tabs
   * off the end of the panel should land on finn.com rather than being sent
   * back to the top of a region they have finished with.
   *
   * Escape is listened for on the window rather than on the host, because
   * focus may well be out in the page when the reader reaches for it.
   */
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;

    event.stopPropagation();
    close();
  };

  window.addEventListener("keydown", onKeyDown, true);

  /*
   * The gap is at a place on the page, and the page moves: images load, FINN
   * renders something above it, the window changes width and everything
   * reflows. An observer on the section the gap sits above catches all of
   * that, where a resize listener alone would catch only the last.
   */
  const onResize = () => {
    if (placement === "inset" && anchor) {
      insetPage(anchor, panelHeight());
      position();
      return;
    }

    const room = canDock(PANEL_WIDTH);

    if (room) dockPage(PANEL_WIDTH);
    else undockPage();

    position();
  };

  window.addEventListener("resize", onResize);

  const reflow =
    placement === "inset" && anchor && typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => position())
      : null;

  if (reflow && anchor) {
    reflow.observe(anchor);
    reflow.observe(document.body);
  }

  const session: Session = { choice: undefined };

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
    window.removeEventListener("resize", onResize);
    reflow?.disconnect();

    /* The page gets its room back before the panel that borrowed it goes. */
    uninsetPage();
    undockPage();

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

  onVisibility?.(true);
}

export function closePanel(): void {
  if (!open) return;

  open.destroy();
  open = null;

  if (opener instanceof HTMLElement && opener.isConnected) opener.focus();

  opener = null;

  onVisibility?.(false);
}
