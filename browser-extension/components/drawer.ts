/**
 * The shell the right-hand drawers are built from.
 *
 * There are two in React — the compare page's Adjust panel, and the priority
 * panel that explains one row of it — and the setup tour draws a third as a
 * mock. They are the same object: a sheet anchored to the right edge of the
 * window, sliding in from it and back out the same way. They had drifted
 * anyway, and only one of them animated.
 *
 * A string rather than a component, deliberately. What they share is how they
 * look and how they move. What they do not share is a dialog configuration —
 * one is modal with a scrim over the page, the other non-modal so the list
 * behind it stays live — nor a width, a ground, a stacking level or a portal
 * target. A wrapper taking props for all of that would be a component whose
 * only real work is joining class names, and every caller would still own its
 * own `Dialog.Root`. This is the part that is genuinely one thing; the tour's
 * mock is an `aside` rather than a dialog and so borrows only the animation.
 *
 * `finn-lens-drawer` is what moves it, keyed on the `data-state` Radix stamps
 * on the content — see the DRAWER block in `assets/tailwind.css`, which also
 * carries the reduced-motion opt-out.
 *
 * Stacking is left to the caller because it is a fact about the page, not
 * about drawers: the setup flow pins a stripe of controls across the foot of
 * the window, and its panel passes underneath rather than over the top.
 */
export const DRAWER_SHELL = [
    "finn-lens-drawer",
    "fixed inset-y-0 right-0 flex w-full flex-col",
    "border-l border-finn-cotton shadow-2xl outline-none",
].join(" ");
