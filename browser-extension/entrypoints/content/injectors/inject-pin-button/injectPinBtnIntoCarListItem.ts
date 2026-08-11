import { injectPinCarButtonIntoNode } from "./injectPinCarButtonIntoNode";

export function injectPinBtnIntoCarListItem(currentCarCardElement: HTMLElement) {
  if (currentCarCardElement.dataset.finnLensProcessed === "true") return;

  const button = injectPinCarButtonIntoNode(currentCarCardElement);

  if (button) {
    currentCarCardElement.dataset.finnLensProcessed = "true";
  }
}