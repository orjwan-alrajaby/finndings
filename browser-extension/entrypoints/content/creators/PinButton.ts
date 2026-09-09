import { PIN_BUTTON_HOOK, pinButtonClasses } from "@/lib/card-controls";

import { icon } from "../lens-panel/dom";

/**
 * The circle on every card, and the one on the details page.
 *
 * It drew a plus, and a tick once the car was pinned — two shapes, hand-written
 * as SVG strings in this file, describing the mechanics of the action rather
 * than the action. Everything else in the product calls this pinning: the
 * label on this very button says "Pin this car for comparison", the panel's
 * control says it, the page of results is called Pinned cars. So it draws a
 * pin, from the same generated lucide set the panel uses, and fills it once
 * the car is on the board — outline is the offer, solid is the state.
 *
 * Sharing `icon` with the panel rather than keeping a second copy of the
 * markup is the other half of the change. These two controls are the same
 * fact on two surfaces and they used to be able to drift; `icons.test.ts`
 * now covers the shape they both draw.
 *
 * The class strings have since moved to `lib/card-controls.ts` for the same
 * reason one step further out: the setup flow draws this button too, in
 * React, on a mock listing page, and a reader who is taught a control has to
 * be taught the one that exists.
 */

function applyPinnedState(button: HTMLButtonElement, pinned: boolean) {
  button.dataset.pinned = String(pinned);
  button.replaceChildren(
    icon("pin", pinned ? "size-3.5 fill-current" : "size-3.5"),
  );
  button.className = `${PIN_BUTTON_HOOK} ${pinButtonClasses(pinned)}`;
  button.setAttribute(
    "aria-label",
    pinned ? "Remove this car from comparison" : "Pin this car for comparison"
  );
}

export function createAddButton(): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  applyPinnedState(button, false);
  return button;
}

export function setPinButtonPinnedState(button: HTMLButtonElement, pinned: boolean) {
  applyPinnedState(button, pinned);
}
