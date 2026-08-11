const PLUS_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
    stroke-width="2" stroke="currentColor" class="size-3.5">
    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
  </svg>
`;

const CHECK_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
    stroke-width="2" stroke="currentColor" class="size-3.5">
    <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/>
  </svg>
`;

function getButtonClasses(pinned: boolean): string {
  const base = [
    "finn-lens-add-car-btn",
    "flex items-center justify-center",
    "h-8 w-8 rounded-full",
    "absolute top-4 right-4 z-10",
    "border",
    "cursor-pointer",
    "transition-all duration-150",
    "shadow-[0_1px_6px_rgba(0,0,0,0.18)]",
    "hover:scale-110 active:scale-95",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finn-accent-blue/50 focus-visible:ring-offset-2",
  ];

  return pinned
    ? [...base,
      "bg-finn-accent-blue",
      "border-finn-accent-blue",
      "text-white"
    ].join(" ")
    : [
        ...base,
      "bg-white",
      "border-finn-iron",
      "text-finn-iron",
      "hover:border-finn-accent-blue",
      "hover:text-finn-accent-blue",
      ].join(" ");
}

function applyPinnedState(button: HTMLButtonElement, pinned: boolean) {
  button.dataset.pinned = String(pinned);
  button.innerHTML = pinned ? CHECK_ICON : PLUS_ICON;
  button.className = getButtonClasses(pinned);
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
