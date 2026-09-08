import type { PinnedFinnCar } from "@/lib/types";

import { el, icon } from "./dom";
import { cardForCar } from "./currentCar";
import {
  getPinnedCars,
  updatePinnedCars,
} from "../injectors/inject-pin-button/injectPinCarButtonIntoNode/storage";
import { buildCarUrl } from "../injectors/inject-pin-button/injectPinCarButtonIntoNode/utils";
import { setPinButtonPinnedState } from "../creators/PinButton";

/**
 * Pinning the car the panel is about, from the panel.
 *
 * The two halves of Lens meet here. The panel answers "how does this car fit
 * me"; pinning is how a car joins the set the Compare page answers "which of
 * these fits me best" about. A reader who has just read why a car suits them
 * and has to go and find a small circle on a card to act on it has been made
 * to do the extension's filing.
 *
 * It writes through the same storage helper the card button uses — there is
 * one pinned set, not a panel one and a card one — and the two controls for
 * that one fact are kept from sitting on screen disagreeing about it, in both
 * directions: this button tells the card's directly, and anything that writes
 * the pinned set reaches this button through `storage.onChanged`.
 */

/**
 * Where this car lives on finn.com.
 *
 * A pinned car is one the reader will want to open again later, so the URL has
 * to be the car's rather than the page's. A car resolved from the pinned set
 * already knows; one resolved from a card is asked for the link the card
 * itself points at; and failing both, the current page with the configuration
 * named on it is the best available answer.
 */
function urlFor(car: PinnedFinnCar): string {
  if (car.url) return car.url;

  const link = cardForCar(car.id)?.querySelector<HTMLAnchorElement>(
    "a[href]",
  );

  return link?.href ?? buildCarUrl(window.location.href, car.id);
}

/** Keeps the card's own pin in step with what the panel just did. */
function syncCardButton(id: number, pinned: boolean): void {
  const button = cardForCar(id)?.querySelector<HTMLButtonElement>(
    ".finn-lens-add-car-btn",
  );

  if (button) setPinButtonPinnedState(button, pinned);
}

/**
 * The pin controls currently on screen, so a change made elsewhere reaches
 * them.
 *
 * There are two buttons for one fact — the circle on the card and this one in
 * the panel — and the panel sits *over* the card it is about, so both are
 * frequently visible at once. Pressing either used to leave the other saying
 * the opposite: the panel told the card what it had done (`syncCardButton`),
 * but nothing told the panel. Pinning from the card behind an open drawer left
 * the drawer still offering to pin a car that was already pinned, until it was
 * closed and reopened.
 *
 * Storage is what they now agree through, which is the same thing they already
 * agreed through for the *value* — `updatePinnedCars` is the one writer, and
 * `storage.onChanged` fires for every writer including the popup, the pins
 * page and a second tab. A control repaints from what was actually stored
 * rather than from what its own button did.
 *
 * Only the button's own state is repainted, deliberately. Adding `pinnedCars`
 * to the panel's `WATCHED_KEYS` would have been two lines, but a full
 * re-render resets the scroll position — so pinning a car from the panel would
 * throw the reader back to the top of the analysis they were part-way through
 * reading, as a side effect of agreeing with a button six inches away.
 */
interface LiveControl {
  /** The car this control speaks for. */
  id: number;
  /** Dropped once this is off the page — see the sweep in `listenOnce`. */
  button: HTMLElement;
  apply: (pinned: boolean) => void;
}

const live = new Set<LiveControl>();

let listening = false;

/**
 * Subscribed on first use rather than at import.
 *
 * The unit tests import this module to build a button and assert on it, in a
 * plain `node` environment with no extension APIs — see vitest.config.ts,
 * which allows a content-script module in a test exactly as long as it touches
 * no browser API at module level. Registering the listener here keeps that
 * true while still costing one registration for the life of the page.
 */
function listenOnce(): void {
  if (listening) return;

  listening = true;

  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;

    const change = changes.pinnedCars as
      | { newValue?: Record<number, unknown> }
      | undefined;

    if (!change) return;

    const stored = change.newValue ?? {};

    for (const control of live) {
      /*
       * The panel is thrown away and rebuilt on every render, so its buttons
       * are abandoned rather than removed one by one. Sweeping the ones that
       * have left the document here means no caller has to remember to
       * unsubscribe, and the set cannot grow for the life of the page.
       */
      if (!control.button.isConnected) {
        live.delete(control);
        continue;
      }

      control.apply(Boolean(stored[control.id]));
    }
  });
}

export function pinControl(car: PinnedFinnCar): HTMLElement {
  const label = el("span", {});

  const mark = el("span", {
    class: "flex items-center leading-none",
    attrs: { "aria-hidden": "true" },
  });

  const button = el(
    "button",
    {
      class: "",
      attrs: { type: "button" },
      on: {
        click: () => {
          void toggle();
        },
      },
    },
    [mark, label],
  );

  let pinned = false;
  let busy = false;

  /*
   * Loud when it is an offer, quiet once it is a state.
   *
   * Unpinned it is the only thing the panel asks the reader to do, so it looks
   * like it: full width, solid, FINN's own accent. Pinned it has nothing left
   * to ask, and a second solid blue button sitting under a blue verdict chip
   * would compete with the answer it is meant to follow — so it steps back to
   * a confirmation the reader can still press again to undo.
   */
  const paint = () => {
    button.className = [
      "mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full",
      "text-[13px] font-black transition-colors",
      pinned
        ? "bg-finn-pale-blue text-finn-highlight-navy hover:bg-finn-cotton"
        : "bg-finn-accent-blue text-white shadow-sm hover:bg-finn-highlight-navy",
    ].join(" ");

    button.setAttribute("aria-pressed", String(pinned));

    label.textContent = pinned
      ? "Pinned — compare it later"
      : "Pin this car for comparison";

    /*
     * One shape in two weights, rather than two shapes.
     *
     * A plus and a tick described the *mechanics* — add this, done — in a
     * product whose word for it everywhere else is "pin". The pin says what
     * the button is for, and filling it is what says the car is already on
     * the board: outline is the offer, solid is the state. `icon` draws with
     * `fill="none"`, so `fill-current` is what gives the mark an inside.
     */
    mark.replaceChildren(
      icon("pin", pinned ? "h-4 w-4 fill-current" : "h-4 w-4"),
    );
  };

  const toggle = async () => {
    /* Two clicks landing between a read and a write would toggle it twice. */
    if (busy) return;

    busy = true;

    try {
      const { wasPinned } = await updatePinnedCars(car.id, {
        ...car,
        url: urlFor(car),
      });

      pinned = !wasPinned;

      syncCardButton(car.id, pinned);
      paint();
    } catch (error) {
      console.error("[FinnLens] couldn't change what's pinned", error);
    } finally {
      busy = false;
    }
  };

  paint();

  /*
   * Repainted from what is stored, whoever stored it — this button, the
   * circle on the card behind the panel, the popup, another tab.
   *
   * Guarded on the value actually changing, so a write that says what the
   * button already shows costs nothing: pressing this button paints
   * optimistically, and the storage event that follows its own write would
   * otherwise repaint the same state a second time.
   */
  const apply = (next: boolean) => {
    if (next === pinned) return;

    pinned = next;
    paint();
  };

  listenOnce();
  live.add({ id: car.id, button, apply });

  /* The stored answer, once it arrives, replaces the assumed one. */
  void getPinnedCars()
    .then((cars) => {
      apply(Boolean(cars[car.id]));
    })
    .catch(() => {
      /* Left as unpinned: the button still works, it just starts wrong. */
    });

  return button;
}
