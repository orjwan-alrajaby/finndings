import { injectPinCarButtonIntoNode } from "./injectPinCarButtonIntoNode";

export function injectPinBtnIntoDetailsPage() {
  const root = document.body.querySelector<HTMLDivElement>(
    'div[data-appid="product-details"]'
  );
  if (!root || root.dataset.finnLensInjected === "true") return;

  const anchorElement = Array.from(root.querySelectorAll("div")).find((div) =>
    Array.from(div.children).some((child) => child.nodeName.toLowerCase() === "h1")
  );

  if (!anchorElement) return;

  const button = injectPinCarButtonIntoNode(anchorElement);

  if (button) {
    root.dataset.finnLensInjected = "true";
  }
}