import { Check, X } from "lucide-react";

/**
 * The bubble that hangs off the control being talked about.
 *
 * This is the coach mark every guided product tour is built out of, and it is
 * here for the reason those exist: three paragraphs sitting in a row below a
 * picture ask the reader to do the matching themselves, three times, while
 * the thing being matched is 400 pixels away. Attaching the words to the
 * control removes that job — the sentence and its subject are the same object
 * on screen, joined by an arrow.
 *
 * It stays deliberately short. The card below still carries the full
 * explanation, the sample control and the caveats; this says which step this
 * is, what to press, and how to get on. A coach mark that reprints the
 * paragraph it is pointing at has stopped pointing and started competing.
 *
 * Placement is the caller's business, because only the caller knows where its
 * own control sits. It passes the position as classes and the arrow as a
 * side; this draws the bubble.
 *
 * **It is navy, and that is the whole point of it.** It began white, which is
 * what a tooltip usually is — and it hangs over a listing page made of white
 * cards, so its edges dissolved into whatever card it happened to land on and
 * the reader had to work out where the guide stopped and the mock started.
 * The theme's `highlight-navy` is the darkest thing Lens owns, so the bubble
 * reads as a layer above the page rather than a piece of it, its tail is
 * unmistakably a tail, and the one thing it is asking for can be a white
 * button — the highest contrast this palette can make, on the one surface
 * that has earned it.
 */

/** Which edge the little tail sits on, and therefore what it points at. */
export type CalloutArrow =
    | "left"
    | "top-left"
    | "top-right"
    | "bottom-right";

const ARROW_POSITION: Record<CalloutArrow, string> = {
    /* Pointing left, at something immediately beside it. */
    left: "top-7 -left-2",
    "top-left": "-top-2 left-7",
    "top-right": "-top-2 right-7",
    /* Pointing down, at something below it — the toolbar button, from a
       bubble that sits clear above the whole browser. */
    "bottom-right": "-bottom-2 right-7",
};

export function Callout({
    index,
    total,
    title,
    prompt,
    arrow,
    className,
    action,
    done,
    onSkip,
    onBack,
}: {
    index: number;
    total: number;
    title: string;
    /** One line telling the reader what to do, not what the thing is. */
    prompt: string;
    arrow: CalloutArrow;
    /** Where the caller wants it, relative to the control it belongs to. */
    className: string;
    action: { label: string; onClick: () => void };
    /** True once this step's control has been worked at least once. */
    done: boolean;
    onSkip: () => void;
    onBack?: () => void;
}) {
    return (
        <div
            role="group"
            aria-label={`Tour, step ${index + 1} of ${total}`}
            className={[
                "z-50 w-[290px] rounded-[20px] p-4 text-left",
                "bg-finn-highlight-navy text-white",
                /* A ring of the page's own ground, so the bubble keeps a
                   visible edge even where it lands on something dark. */
                "ring-4 ring-white/25",
                "shadow-[0_20px_45px_-12px_rgba(0,48,135,0.65)]",
                className,
            ].join(" ")}
        >
            {/* The tail. A rotated square, so it takes the bubble's own
                background and ring and needs no second colour to keep in
                step with it. */}
            <span
                aria-hidden="true"
                className={[
                    "absolute h-4 w-4 rotate-45 rounded-[3px]",
                    "bg-finn-highlight-navy ring-4 ring-white/25",
                    ARROW_POSITION[arrow],
                ].join(" ")}
            />

            <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-finn-pale-blue">
                    Step {index + 1} of {total}
                </p>

                <button
                    type="button"
                    onClick={onSkip}
                    className="-mt-1 -mr-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                    <X aria-hidden="true" className="h-3 w-3" />
                    Skip the tour
                </button>
            </div>

            <p className="mt-1.5 text-sm font-black leading-5 text-white">
                {title}
            </p>

            <p className="mt-1 text-xs leading-5 text-white/75">{prompt}</p>

            {/*
              * The one thing being asked for, and it goes on asking.
              *
              * `finn-lens-beckon` rather than `finn-lens-attention`: a tour
              * step is an instruction the reader may read, look away from and
              * come back to, and a prompt that has already stopped by the time
              * they look back has failed at the only job it had.
              *
              * Once the control has been worked the button is spent: it stops
              * asking, says so, and goes dead. It used to flip to the reverse
              * action — "Pin the first car" becoming "Unpin it again" — which
              * offered to undo the thing the reader had just been congratulated
              * for, on a button that was about to disappear underneath them as
              * the tour moved on. A step that is done needs no further
              * prompting of any kind.
              */}
            <button
                type="button"
                onClick={action.onClick}
                disabled={done}
                className={[
                    "mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5",
                    "rounded-full px-4 text-[11px] font-black transition-colors",
                    done
                        ? "cursor-default bg-white/15 text-finn-pale-blue"
                        : "finn-lens-beckon-light bg-white text-finn-highlight-navy hover:bg-finn-pale-blue",
                ].join(" ")}
            >
                {done ? (
                    <>
                        <Check aria-hidden="true" className="h-3.5 w-3.5" />
                        Done
                    </>
                ) : (
                    action.label
                )}
            </button>

            {/*
              * Back, and nothing else. There is no Next: the way on is the
              * button above, and the step is only over once the control it
              * points at has actually been worked — see the tour's own
              * advance. A forward control beside it would be a way to walk
              * the whole tour without touching anything it is about.
              */}
            {onBack && (
                <div className="mt-3 border-t border-white/15 pt-3">
                    <button
                        type="button"
                        onClick={onBack}
                        className="rounded-full px-2 py-1 text-[11px] font-bold text-white/70 transition hover:text-white"
                    >
                        ‹ Back, and let me try that again
                    </button>
                </div>
            )}

        </div>
    );
}
