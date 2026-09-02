import {
  buildFitAnalysis,
  type FitAnalysis,
} from "@/lib/reasoning-engine/fit";
import { hasSavedLensSettings, loadLensSettings } from "@/lib/reasoning-engine";

import { el, empty, fragment, panelStyles } from "./dom";
import { canDock, dockPage, undockPage } from "./page-dock";
import { clearHighlight, highlightConfiguration } from "./highlight";
import {
  analysisBody,
  backToConfigurations,
  configurationsSection,
} from "./sections";
import { detailsPageRoot, resolveCar, resolvePageCars } from "./currentCar";

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

/** The stored settings that change what an analysis says. */
const WATCHED_KEYS = [
  "finnLensPreferences",
  "finnLensPriorities",
  "finnLensCategoryFeatures",
];

interface Panel {
  /** Point an already-open panel at a different car. */
  show: (request: PanelRequest) => void;
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

/*
 * A reader who has configured nothing is sent to the setup flow rather than
 * to Settings. Settings is a page of controls for someone who knows what
 * they control; this reader has just met the product on a car listing and
 * needs the explanation that comes with the questions.
 */
const openSetup = () => {
  void browser.runtime.sendMessage({ type: "OPEN_ONBOARDING_PAGE" });
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

/**
 * The car the panel was opened about, when it was opened about one.
 *
 * Undefined means "whatever this page is showing", which is how the launcher
 * on a detail page asks. A card badge asks the other way: it names the car,
 * and the page it was clicked on may be a list of forty others.
 */
export interface PanelRequest {
  carId?: number;
}

async function render(
  into: HTMLElement,
  retry: () => void,
  session: Session,
  request: PanelRequest,
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
        { label: "Set up FINN Lens", onClick: openSetup },
      ),
    );

    return;
  }

  /*
   * Asked about one particular car, so the page it was asked from doesn't
   * come into it. No chooser either — the reader already chose, by clicking
   * the card they were looking at.
   */
  if (request.carId != null) {
    const car = await resolveCar(request.carId);

    if (!car) {
      empty(into);
      into.append(
        message("We couldn't load this car", "FINN's data for it isn't in hand any more.", {
          label: "Try again",
          onClick: retry,
        }),
      );

      return;
    }

    const settings = await loadLensSettings();

    /* Marked, not scrolled to: the card is already under the reader's cursor. */
    highlightConfiguration(car.id);

    empty(into);
    into.append(
      analysisBody(
        buildFitAnalysis(
          car,
          settings.priorities,
          settings.preferences,
          settings.categoryFeatures,
        ),
      ),
    );

    into.scrollTop = 0;

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

    /*
     * Choosing in the panel is a request to be shown the car, so FINN's own
     * page goes to it. Going back to the list is a request for the opposite,
     * and clears the mark rather than leaving one car singled out on a page
     * the panel has stopped talking about.
     */
    highlightConfiguration(id, { scroll: true });

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

  /*
   * Marked on arrival but not scrolled to. A reader who opened a car FINN
   * already had selected hasn't asked to be moved anywhere.
   */
  highlightConfiguration(subjectId);

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

async function build(request: PanelRequest): Promise<Panel> {
  const host = el("div", { attrs: { id: HOST_ID } });

  /*
   * A strip down the right, not a sheet over everything.
   *
   * The host used to cover the viewport so a backdrop could fill it. Nothing
   * outside the panel's own width is ours to occupy now: the page beside it
   * stays clickable, scrollable and selectable, which is the entire point of
   * docking rather than overlaying.
   *
   * On a narrow viewport there is no room to sit beside anything, so it
   * covers the page instead and the page is not narrowed at all.
   */
  const docked = canDock(PANEL_WIDTH);

  host.style.cssText = docked
    ? `position:fixed;top:0;right:0;bottom:0;width:${PANEL_WIDTH}px;z-index:2147483000;`
    : "position:fixed;inset:0;z-index:2147483000;";

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
        "absolute inset-0 flex flex-col",
        "bg-white shadow-[-8px_0_24px_rgba(0,0,0,0.08)]",
        "border-l border-finn-cotton",
        "font-sans text-finn-black",
      ].join(" "),
      attrs: {
        role: "complementary",
        "aria-labelledby": "finn-lens-title",
      },
    },
    [bar, scroller],
  );

  shadow.append(drawer);

  if (docked) dockPage(PANEL_WIDTH);

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
   * A window narrow enough to dock into can stop being one — a resize, or
   * devtools opening beside the page. Docking is re-decided rather than
   * decided once, so a squeezed page isn't left squeezed.
   */
  const onResize = () => {
    const room = canDock(PANEL_WIDTH);

    host.style.cssText = room
      ? `position:fixed;top:0;right:0;bottom:0;width:${PANEL_WIDTH}px;z-index:2147483000;`
      : "position:fixed;inset:0;z-index:2147483000;";

    if (room) dockPage(PANEL_WIDTH);
    else undockPage();
  };

  window.addEventListener("resize", onResize);

  const session: Session = { choice: undefined };

  /*
   * Which car the panel is currently about. It changes without the panel
   * being rebuilt: a reader clicking through the verdicts on a list is asking
   * the same question of one car after another, and tearing the panel down
   * and building it again between each would throw away the scroll position,
   * the styles and the room the page has already made.
   */
  let current = request;

  const retry = () => void render(scroller, retry, session, current);

  const show = (next: PanelRequest) => {
    current = next;

    /* A different car is a different question, so nothing carries over. */
    session.choice = undefined;

    retry();
  };

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

    /* The page gets its width and its unmarked cards back. */
    clearHighlight();
    undockPage();

    host.remove();
  };

  void render(scroller, retry, session, current);

  document.body.append(host);
  closeButton.focus();

  return { show, destroy };
}

/* -------------------------------------------------------------------------- */
/* Opening and closing                                                        */
/* -------------------------------------------------------------------------- */

let opener: Element | null = null;

export async function openPanel(request: PanelRequest = {}): Promise<void> {
  /*
   * An open panel is pointed at the new car rather than left showing the old
   * one. Returning early here was a bug the badges made obvious: every card
   * on a list has a button, and clicking the second one did nothing at all.
   */
  if (open) {
    open.show(request);
    return;
  }

  opener = document.activeElement;

  open = await build(request);

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
