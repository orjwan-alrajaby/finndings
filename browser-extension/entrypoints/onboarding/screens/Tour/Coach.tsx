import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

import {
    TourArrow,
    isElementVisible,
    useKeyboardNavigation,
    useTour,
} from "@tour-kit/react";
/* The one import that has to come from the engine rather than from the
   components package: `@tour-kit/react` re-exports most of core, but not the
   target resolver. */
import { resolveTarget } from "@tour-kit/core";
import {
    TourCardHeadless,
    TourOverlayHeadless,
} from "@tour-kit/react/headless";

/**
 * The guide's two pieces of furniture: the dimmed page and the bubble on it.
 *
 * Everything that used to be hand-rolled here — where a bubble sits relative
 * to the control it is about, which way its tail points, how it gets out of
 * the way of a menu that drops into the same corner, what to dim and what to
 * leave lit, how to keep any of it upright when the window is resized — is
 * `@tour-kit/react`'s job now. It resolves each step's target, tracks that
 * element's rectangle through scroll and resize, and hands this file two
 * things: a set of positioning styles for the bubble, and the hole to cut in
 * the scrim. This file draws Lens's own bubble into them and nothing else.
 *
 * The headless entry rather than the styled `TourCard`, because the shipped
 * card is shadcn-shaped — `bg-popover`, `text-muted-foreground` — and this
 * product is not. The bubble below is the one this flow already had, kept
 * deliberately: it is navy because it hangs over a listing page made of white
 * cards, and a white tooltip on that ground dissolves into whatever card it
 * happens to land on.
 */

/**
 * How much room the ring leaves around whatever it is circling.
 *
 * Read by the steps rather than by the drawing: `spotlightPadding` is a
 * per-step field, so this is the value they all pass.
 */
export const SPOTLIGHT_PADDING = 8;

export function Coach({
    /** Shown on the last step's forward button. */
    finishLabel = "Done",
}: {
    finishLabel?: string;
}) {
    /*
     * Arrow keys and Escape, which the headless entry does not wire itself —
     * the styled card calls this hook too. Escape is the same out as the ×
     * in the corner, so a reader who wants the guide gone has the gesture
     * every other overlay in the browser has taught them.
     */
    useKeyboardNavigation({
        enabled: true,
        nextKeys: ["ArrowRight"],
        prevKeys: ["ArrowLeft"],
        exitKeys: ["Escape"],
    });

    return (
        <>
            <Spotlight />

            <TourCardHeadless
                render={({
                    currentStep,
                    currentStepIndex,
                    totalSteps,
                    isFirstStep,
                    isLastStep,
                    next,
                    prev,
                    skip,
                    floatingStyles,
                    refs,
                    arrowRef,
                    context,
                }) => (
                    <div
                        ref={refs.setFloating}
                        style={{
                            ...floatingStyles,
                            zIndex: 9999,
                            /*
                             * `TourArrow` paints itself from these two, which
                             * is the whole reason it can be reused rather than
                             * redrawn: custom properties inherit, so setting
                             * them on the bubble dresses the tail in the
                             * bubble's own colours.
                             */
                            ["--color-popover" as string]: "#003087",
                            ["--color-border" as string]: "rgba(255,255,255,0.25)",
                        }}
                        role="dialog"
                        aria-label={`Step ${currentStepIndex + 1} of ${totalSteps}`}
                        className={[
                            "w-[290px] max-w-[calc(100vw-2rem)] rounded-[20px] p-4 text-left",
                            "bg-finn-highlight-navy text-white ring-4 ring-white/25",
                            "shadow-[0_20px_45px_-12px_rgba(0,48,135,0.65)]",
                        ].join(" ")}
                    >
                        <TourArrow ref={arrowRef} context={context} size={8} />

                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-finn-pale-blue">
                                Step {currentStepIndex + 1} of {totalSteps}
                            </p>

                            <button
                                type="button"
                                onClick={skip}
                                aria-label="Close the guide"
                                className="-mt-1 -mr-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
                            >
                                <X aria-hidden="true" className="h-3 w-3" />
                                Close
                            </button>
                        </div>

                        <p className="mt-1.5 text-sm font-black leading-5">
                            {currentStep?.title as string}
                        </p>

                        {/* `TourNode` is the engine's own structural stand-in
                            for a React element, so that it can describe a step
                            without depending on React. Every step in this file
                            passes real JSX. */}
                        <div className="mt-1 text-xs leading-5 text-white/80">
                            {currentStep?.content as ReactNode}
                        </div>

                        {/*
                          * Back and Next, always, on every step.
                          *
                          * The guide this replaced had no forward control at
                          * all: the only way on was to work the control the
                          * bubble pointed at, and on two of the three steps
                          * "working it" secretly meant opening the thing *and
                          * closing it again*. A reader who did not guess that
                          * was simply stuck. Nothing here is a gate now — the
                          * mock underneath stays live the whole time, so the
                          * reader can press the real control if they want to
                          * and press Next if they don't.
                          */}
                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/15 pt-3">
                            <button
                                type="button"
                                onClick={prev}
                                disabled={isFirstStep}
                                className="rounded-full px-2 py-1 text-[11px] font-bold text-white/70 transition hover:text-white disabled:invisible"
                            >
                                ‹ Back
                            </button>

                            <button
                                type="button"
                                onClick={next}
                                /* No `finn-lens-beckon-light` on it. That
                                   halo belonged to a button that was the one
                                   thing the step was asking for; this is
                                   ordinary navigation, and a Next that pulses
                                   without stopping for three steps running is
                                   nagging rather than pointing. The ring on
                                   the control is what points here. */
                                className="inline-flex h-8 items-center justify-center rounded-full bg-white px-4 text-[11px] font-black text-finn-highlight-navy transition-colors hover:bg-finn-pale-blue"
                            >
                                {isLastStep ? finishLabel : "Next ›"}
                            </button>
                        </div>
                    </div>
                )}
            />
        </>
    );
}

/**
 * The dim, with a hole in it where the step's control is.
 *
 * **Nothing here takes a click.** The library's default overlay is a full
 * screen sheet with `pointer-events: auto` on it, which is right for a tour
 * that wants the page frozen while it talks — and wrong for this one, whose
 * entire argument is "these controls do the same thing here as they do on the
 * real site, press them". So both layers are inert and the scrim is purely
 * something to look at: the ring says where to look, and the page underneath
 * stays as pressable as it was before the guide started.
 */
function Spotlight() {
    return (
        <TourOverlayHeadless
            render={({ overlayStyle, cutoutStyle, targetRect }) =>
                targetRect ? (
                    <div
                        aria-hidden="true"
                        style={{
                            ...overlayStyle,
                            pointerEvents: "none",
                            zIndex: 9998,
                        }}
                    >
                        <div
                            style={{
                                ...cutoutStyle,
                                pointerEvents: "none",
                                /* The library's own cutout is the dim and
                                   nothing else. The accent ring on the front
                                   of it is what makes the hole read as a
                                   pointer rather than as a gap. */
                                boxShadow: [
                                    "0 0 0 3px #0072ea",
                                    "0 0 0 9999px rgba(25,25,25,0.55)",
                                ].join(", "),
                            }}
                        />
                    </div>
                ) : null
            }
        />
    );
}

/**
 * Bring the step's control into view when it is not already.
 *
 * The engine positions a bubble against an element wherever that element
 * happens to be, including off the bottom of the window — it has no opinion
 * about scrolling, and `scrollIntoView` ships as a utility rather than as
 * behaviour. Which is the right default for a tour that walks a whole
 * application; this one walks three controls inside a single mock, so the
 * scroll is nearly always a no-op and the guard is what keeps it that way.
 * Moving the page under a reader who is already looking at the right thing is
 * worse than not moving it at all.
 */
export function useScrollToStep(): void {
    const { currentStep, isActive } = useTour();

    useEffect(() => {
        if (!isActive || !currentStep || currentStep.kind === "hidden") return;

        const element = currentStep.target
            ? resolveTarget(currentStep.target)
            : null;

        if (!element || isElementVisible(element)) return;

        element.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                .matches
                ? "auto"
                : "smooth",
            block: "center",
        });
    }, [isActive, currentStep]);
}
