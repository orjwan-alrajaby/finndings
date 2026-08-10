import { createAddButton, setPinButtonPinnedState, createToast } from "../../creators";

export function injectPinCarButtonIntoNode(
  anchorElement: HTMLElement
): HTMLButtonElement | null {
  const existingButton = anchorElement.querySelector<HTMLButtonElement>(
    ".finn-lens-add-car-btn"
  );
  if (existingButton) return null;

  anchorElement.classList.add("relative");

  const button = createAddButton();

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    // TODO: wire up real pin/unpin persistence here 
    // this only toggles the visual state for now.
    const isPinned = button.dataset.pinned === "true";
    setPinButtonPinnedState(button, !isPinned);

    const toast = createToast(
      isPinned ? "Removed from comparison" : "Pinned car for comparison",
      isPinned ? "info" : "success"
    );
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  });

  anchorElement.appendChild(button);
  return button;
}