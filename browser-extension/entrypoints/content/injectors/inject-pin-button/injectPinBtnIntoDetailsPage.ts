import { injectPinCarButtonIntoNode } from "./injectPinCarButtonIntoNode";

export function injectPinBtnIntoDetailsPage() {
  const root = document.body.querySelector<HTMLDivElement>(
    'div[data-appid="product-details"]'
  );

  if (!root || root.dataset.finnLensProcessed === "true") return;

  const anchorElements = Array.from<HTMLDivElement>(
    root.querySelectorAll('[id^="product-"]')
  ).filter((el) => /^product-\d+$/.test(el.id)); // match to elements of id values of e.g product-32710
  const buttons = anchorElements.map(element => injectPinCarButtonIntoNode(element))

  if (buttons.length > 0) {
    anchorElements.forEach(element => element.dataset.finnLensProcessed = "true");
    const compareBtns = Array.from<HTMLButtonElement>(root.querySelectorAll('button[aria-label="Vergleichen"]'));
    compareBtns.forEach(btn => btn.classList.add("right-unset", "left-4"));
  }
}