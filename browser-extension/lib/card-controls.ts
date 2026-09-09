import { FIT_BANDS, type FitLevel } from "@/lib/reasoning-engine/fit";

/**
 * How the two controls Lens puts on a FINN card are dressed.
 *
 * They are drawn twice, by two things that cannot share code any other way.
 * On finn.com the content script builds them out of hand-written DOM — it
 * runs inside somebody else's page and carries no rendering library. In the
 * setup flow they are drawn again in React, on a mock listing page, so a
 * reader meets both controls before the first time one matters.
 *
 * Two drawings of one control is a thing that goes stale: the pin moved
 * corners once already, and a setup flow teaching last year's product is
 * worse than one teaching nothing, because the reader believes it. The class
 * strings therefore live here, and both drawings read them. Nothing in this
 * file touches the DOM or any browser API, so the content script and an
 * extension page can both import it.
 *
 * What is *not* here is the markup — the pin's icon, the pill's brand disc,
 * meter and "Why ›". Those are structure, each surface builds them its own
 * way, and pretending otherwise would mean a factory that returns strings of
 * HTML to two callers that both have something better.
 */

/** The class the panel and the popup find a card's pin button by. */
export const PIN_BUTTON_HOOK = "finn-lens-add-car-btn";

/**
 * The pin, in whichever state it is in.
 *
 * Outline is the offer and solid is the state — see `createAddButton`, which
 * fills the icon to match. The hook class is left to the caller: only the
 * control that is really on finn.com should be findable as one.
 */
export function pinButtonClasses(pinned: boolean): string {
    const base = [
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
        ? [
              ...base,
              "bg-finn-accent-blue",
              "border-finn-accent-blue",
              "text-white",
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

/** The class a card carrying a verdict pill is found by. */
export const FIT_BADGE_HOOK = "finn-lens-fit-badge";

/**
 * The pill's shape, without its colour.
 *
 * Kept apart from the state classes because the real badge is *edited* rather
 * than rebuilt when a verdict lands — `applyVerdict` swaps one set of colour
 * classes for another on a live element, so the two sets have to be separable
 * strings rather than one blob.
 *
 * Bottom-left because the top-right is the pin and the top-left is FINN's own
 * compare control.
 */
export const FIT_BADGE_BASE = [
    "absolute bottom-2 left-2 z-10 flex max-w-[calc(100%-1rem)]",
    "items-center gap-1.5 rounded-full py-1 pl-2 pr-2.5",
    "cursor-pointer border-0 text-left",
    /*
     * A hairline of white around it, whatever it lands on.
     *
     * The four band colours are pale by design, and one of them — `strong` —
     * is the same #eaf4ff as the ground the photograph now sits on, so the
     * pill's body disappeared and left its text floating. The ring is the fix
     * that holds everywhere rather than only against that one ground: on
     * finn.com this sits over a real photograph, where a pale pill can land on
     * a white car just as easily.
     */
    "ring-1 ring-white",
    "shadow-[0_1px_6px_rgba(0,0,0,0.14)] transition-all",
    "hover:shadow-[0_2px_10px_rgba(0,0,0,0.2)]",
    "focus-visible:outline-none focus-visible:ring-2",
    "focus-visible:ring-finn-accent-blue/50",
].join(" ");

/** How the pill looks before there is a verdict to put on it. */
export const FIT_BADGE_NEUTRAL_CLASS = "bg-white text-finn-accent-blue";

/**
 * What it says then.
 *
 * A question rather than a claim: at this point Lens has an opinion available
 * and has not worked it out yet, and inventing a band to fill the space is
 * the one thing the pill must never do.
 */
export const FIT_BADGE_NEUTRAL_LABEL = "How does it fit?";

/** The pill's colour, for a verdict or for the absence of one. */
export function fitBadgeStateClass(level: FitLevel | null): string {
    return level ? FIT_BANDS[level].chipClass : FIT_BADGE_NEUTRAL_CLASS;
}
