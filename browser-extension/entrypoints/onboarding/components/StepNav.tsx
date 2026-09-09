import { ArrowLeft, ArrowRight, Lock } from "lucide-react";

/**
 * Where you can go from here, on a stripe that never leaves.
 *
 * These controls used to sit at the bottom of each screen, under whatever
 * that screen was made of — which on the tour meant a browser mock, three
 * cards and two paragraphs between the reader and the way forward. On a
 * laptop the button was simply not on screen, so the answer to "what do I do
 * now" was "scroll and find out".
 *
 * They are still at the bottom, but pinned to the window rather than to the
 * end of the page: a white stripe across the foot of the screen, holding back
 * on the left and the ways on at the right, present on every screen and never
 * further than a glance away. It is not the page's footer — that is a line of
 * small print further down, and it scrolls like everything else.
 *
 * Every screen has it, the welcome included. That screen kept its own hero
 * button for a while, on the theory that a landing page wants its invitation
 * in the body — but the effect was that the way on moved between the first
 * screen and the second, so the one thing a reader had just learned to find
 * was the one thing that had gone. The only difference the welcome gets now
 * is that it has no way back, because there is nothing behind it.
 */

/** How much room the stripe needs under a page, so nothing hides behind it. */
export const ACTION_BAR_CLEARANCE = "pb-40 md:pb-32";

export function ActionBar({
    onBack,
    onSkip,
    next,
}: {
    /** Null on the first screen, which has nothing behind it. */
    onBack: (() => void) | null;
    onSkip: () => void;
    /** Absent where a screen offers no way on of its own. */
    next?: NextAction;
}) {
    return (
        <div className="fixed inset-x-0 bottom-0 z-60 border-t border-finn-cotton bg-white shadow-[0_-10px_30px_-18px_rgba(0,0,0,0.35)]">
            {next?.blockedBecause && (
                <StepNavBlock reason={next.blockedBecause} />
            )}

            <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 max-[560px]:gap-x-2 sm:px-6 lg:px-8">
                {onBack ? (
                    <NavBack onBack={onBack} />
                ) : (
                    /* Holds the stripe's shape between the first screen and
                       the second, rather than letting everything on it slide
                       left by the width of a button. */
                    <span aria-hidden="true" className="h-10 w-10 shrink-0" />
                )}

                <div className="ml-auto flex flex-wrap items-center justify-end gap-2 max-[560px]:gap-1.5">
                    <button
                        type="button"
                        onClick={onSkip}
                        className="rounded-full px-3 py-2 text-xs font-bold text-finn-iron underline-offset-2 transition hover:text-finn-black hover:underline max-[560px]:px-1.5 max-[560px]:text-[11px]"
                    >
                        Skip setup
                    </button>

                    {next && <NavForward next={next} />}
                </div>
            </div>
        </div>
    );
}

export interface NextAction {
    label: string;
    onClick: () => void;
    /** Set while a screen is doing something and cannot be left yet. */
    busy?: boolean;
    /** Why the way forward is shut, when it is. Also shuts it. */
    blockedBecause?: string;
    /** A quieter way on, offered beside the main one. */
    secondary?: { label: string; onClick: () => void };
    /**
     * Whether this should go on asking.
     *
     * Set only where a door has just been unlocked and the reader was last
     * looking somewhere else entirely — see the tour. Everywhere else the way
     * on is simply available, and a button that pulses for being available is
     * a button that pulses always.
     */
    urging?: boolean;
}

/** The way back, at the left of the stripe. */
function NavBack({ onBack }: { onBack: () => void }) {
    return (
        <button
            type="button"
            onClick={onBack}
            aria-label="Back a step"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-finn-cotton bg-white text-finn-iron transition hover:border-finn-iron hover:text-finn-black"
        >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        </button>
    );
}

/** The ways on, at the right of the stripe. */
function NavForward({ next }: { next: NextAction }) {
    const blocked = Boolean(next.blockedBecause);

    return (
        <>
            {next.secondary && (
                <button
                    type="button"
                    onClick={next.secondary.onClick}
                    disabled={next.busy}
                    /* Not hidden on a narrow screen. It was, and that took
                       the only way to open Lens instead of finn.com off the
                       last screen of the flow for anybody on a phone — a
                       whole ending, removed to save a line of wrapping. */
                    className="rounded-full px-3 py-2 text-xs font-bold text-finn-iron underline-offset-2 transition hover:text-finn-black hover:underline disabled:cursor-wait max-[560px]:px-1.5 max-[560px]:text-[11px]"
                >
                    {next.secondary.label}
                </button>
            )}

            <button
                type="button"
                onClick={next.onClick}
                disabled={blocked || next.busy}
                /*
                 * Named for a screen reader whatever the width, because on the
                 * narrowest screens the words come off — see below. The label
                 * is the only thing that says which way on this is on the last
                 * screen, where there are two.
                 */
                aria-label={next.label}
                /*
                 * The reason travels with the button rather than being left
                 * for the reader to deduce. A disabled control with no account
                 * of itself is the most common way a flow loses somebody.
                 */
                aria-describedby={blocked ? "finn-lens-nav-block" : undefined}
                className={[
                    "inline-flex h-10 items-center justify-center gap-2 rounded-full",
                    "px-5 text-xs font-black shadow-sm transition-colors",
                    /* A circle once the words are gone, rather than a pill
                       with an arrow rattling around in it. */
                    "max-[560px]:w-10 max-[560px]:gap-0 max-[560px]:px-0",
                    blocked
                        ? "cursor-not-allowed bg-finn-cotton text-finn-iron shadow-none"
                        : "bg-finn-accent-blue text-white hover:bg-finn-highlight-navy",
                    next.busy ? "cursor-wait" : "",
                    !blocked && !next.busy && next.urging
                        ? "finn-lens-beckon"
                        : "",
                ].join(" ")}
            >
                {blocked && <Lock aria-hidden="true" className="h-3.5 w-3.5" />}

                {/*
                  * The words come off on a narrow window, leaving the
                  * arrow.
                  *
                  * "Go pin some real cars" beside "Open Finn Lens instead"
                  * beside "Skip setup" is 442px of text, and the last screen
                  * offers all three — so under about 550px the row wrapped to
                  * three lines and the stripe grew to 153px of chrome. The
                  * breakpoint is measured rather than chosen: 560 is the first
                  * round number at which the full labels fit on one line, and
                  * the compact row then holds down to about 365.
                  *
                  * The arrow alone is unambiguous in the corner it sits in,
                  * the screen above it has just said what comes next, and
                  * `aria-label` keeps the whole sentence for anyone who needs
                  * it read out.
                  *
                  * "Go pin some real cars" beside "Open Finn Lens instead"
                  * beside "Skip setup" is most of a 375px screen spent on one
                  * row of chrome, and the row wrapped to three lines to hold
                  * it. The arrow alone is unambiguous in the corner it sits
                  * in, the screen above it has just said what comes next, and
                  * `aria-label` keeps the full sentence for anyone who needs
                  * it read out.
                  */}
                <span className="truncate max-[560px]:hidden">
                    {next.busy ? "Saving…" : next.label}
                </span>

                {!blocked && (
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                )}
            </button>
        </>
    );
}

/**
 * The line above the stripe saying why the way on is shut.
 *
 * A row of its own rather than a tooltip, because it has to be readable
 * without being hunted for — and because it changes as the reader makes
 * progress, which a tooltip nobody opens cannot show them.
 */
function StepNavBlock({ reason }: { reason: string }) {
    return (
        <p
            id="finn-lens-nav-block"
            aria-live="polite"
            className="border-b border-finn-cotton/70 bg-finn-pale-blue/60 px-4 py-2 text-center text-[11px] font-bold leading-4 text-finn-highlight-navy"
        >
            {reason}
        </p>
    );
}
