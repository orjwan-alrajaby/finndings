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
 * one pinned set, not a panel one and a card one — and then tells the card's
 * own button what happened, so the two controls for the same fact can't sit on
 * screen disagreeing about it.
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

    /* Redrawn rather than retyped: the mark is a shape now, not a glyph. */
    mark.replaceChildren(icon(pinned ? "check" : "plus", "h-4 w-4"));
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

  /* The stored answer, once it arrives, replaces the assumed one. */
  void getPinnedCars()
    .then((cars) => {
      pinned = Boolean(cars[car.id]);
      paint();
    })
    .catch(() => {
      /* Left as unpinned: the button still works, it just starts wrong. */
    });

  return button;
}
