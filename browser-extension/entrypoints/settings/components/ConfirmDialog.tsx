import * as Dialog from "@radix-ui/react-dialog";
import { CircleHelp, TriangleAlert, X } from "lucide-react";
import { useRef, type ReactNode } from "react";

/**
 * The one modal in the product, and the only place it asks before acting.
 *
 * It used to be a plain white rounded box: a bold line, four grey lines under
 * it, two equal pills at the foot. It read as a browser `confirm()` with the
 * corners knocked off — which is the wrong impression for the three questions
 * it asks, since deleting stored data, resetting every setting and dropping
 * cars out of a comparison are the moments the product should look most like
 * itself, not least.
 *
 * So it is painted the way `AdviceHero` paints a recommendation: the tone
 * takes a full-bleed band across the top, carrying a ring-pill eyebrow, a
 * question at display size in white, and an oversized watermark of its own
 * icon bleeding off the corner. The colour is the point. A reader who has
 * just clicked "Delete everything" should know what kind of question this is
 * before reading a word of it, and a small tinted icon tile on white does not
 * do that. Underneath, white for the consequences and a snow footer for the
 * two answers, which is the band structure the drawers use.
 *
 * `tone` picks the hue and nothing else. It says how much the answer costs,
 * not whether it can be taken back: unpinning is `danger` and entirely
 * reversible, and the description is where that gets said.
 *
 * A `Dialog` rather than an `AlertDialog`, which is a deliberate reversal.
 * The alert variant refuses to close on a click outside, on the theory that a
 * consequential question should be answered rather than escaped — but every
 * other overlay in Lens dismisses that way, and a modal that eats the click
 * reads as broken long before it reads as careful. Cancel is a real answer
 * here, so the scrim, the ×, and Escape all give it.
 */

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** The question, asked as one. */
    title: string;
    /** What saying yes does — consequences, and what it doesn't touch. */
    description: ReactNode;
    confirmLabel: string;
    /**
     * Where in the product this lands: "Stored data", "Pinned cars". The
     * title asks the question; this says which part of Lens is answering it,
     * which matters most in the dialogs opened from a page full of controls.
     */
    eyebrow?: string;
    tone?: "danger" | "neutral";
    /** Overridable for a question whose "no" isn't quite a cancel. */
    cancelLabel?: string;
    onConfirm: () => void;
}

const TONES = {
    danger: {
        Icon: TriangleAlert,
        band: "bg-gradient-to-br from-finn-error to-finn-influence-red",
        confirm:
            "bg-finn-error hover:brightness-110 focus-visible:ring-finn-error/40",
    },
    neutral: {
        Icon: CircleHelp,
        band: "bg-gradient-to-br from-finn-accent-blue to-finn-highlight-navy",
        confirm:
            "bg-finn-highlight-navy hover:brightness-125 focus-visible:ring-finn-highlight-navy/40",
    },
} as const;

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel,
    eyebrow = "Confirm",
    tone = "danger",
    cancelLabel = "Cancel",
    onConfirm,
}: ConfirmDialogProps) {
    const { Icon, band, confirm } = TONES[tone];

    /*
     * Focus opens on Cancel, not on whatever happens to be first in the tree.
     * Radix would give it to the "×" — a ring drawn around the dismiss affordance
     * of a dialog asking about deletion, which reads as the dialog pointing at
     * the wrong thing. Cancel is the safe answer and the one a keyboard reader
     * should be able to take with Enter without looking.
     */
    const cancelRef = useRef<HTMLButtonElement>(null);

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="finn-lens-scrim fixed inset-0 z-40 bg-finn-black/60 backdrop-blur-[3px]" />

                {/*
                  * Centred by this wrapper rather than by a translate on the
                  * dialog itself. Tailwind v4 writes `-translate-x-1/2` to the
                  * `translate` property, which composes with `transform`
                  * instead of replacing it — so an entrance animating
                  * `transform` was shifting the modal by its own half-size
                  * twice, and it appeared up and to the left before snapping
                  * into place as the animation ended. Centring here leaves
                  * `transform` free for the animation alone.
                  *
                  * The wrapper covers the viewport, so it has to be
                  * transparent to the pointer or it would swallow the clicks
                  * on the scrim that are meant to dismiss this.
                  */}
                <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
                    <Dialog.Content
                        onOpenAutoFocus={(event) => {
                            event.preventDefault();
                            cancelRef.current?.focus();
                        }}
                        className={[
                            "finn-lens-modal pointer-events-auto",
                            "flex max-h-full w-full max-w-md flex-col",
                            "overflow-hidden rounded-[28px] bg-white outline-none",
                            "shadow-[0_24px_60px_-12px_rgba(25,25,25,0.45)]",
                        ].join(" ")}
                    >
                        <header
                            className={`relative shrink-0 overflow-hidden px-6 pb-7 pt-6 ${band}`}
                        >
                            {/*
                              * The icon at a size that reads as pattern rather
                              * than iconography — the band is already saying
                              * "this is serious", and a second, literal
                              * statement of it at 20px would be the same
                              * sentence twice.
                              */}
                            <Icon
                                aria-hidden="true"
                                className="pointer-events-none absolute -bottom-10 -right-8 h-40 w-40 text-white/10"
                                strokeWidth={1.5}
                            />

                            <Dialog.Close
                                aria-label="Close"
                                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                            >
                                <X aria-hidden="true" className="h-4.5 w-4.5" />
                            </Dialog.Close>

                            <div className="relative max-w-[85%]">
                                <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white ring-1 ring-white/20">
                                    <Icon
                                        aria-hidden="true"
                                        className="h-3.5 w-3.5"
                                    />
                                    {eyebrow}
                                </p>

                                <Dialog.Title className="mt-4 text-2xl font-black leading-[1.15] tracking-tight text-white">
                                    {title}
                                </Dialog.Title>
                            </div>
                        </header>

                        {/*
                          * Scrolls on its own so a long list of consequences —
                          * the data page can name six — never pushes the two
                          * answers off a short window.
                          */}
                        <Dialog.Description asChild>
                            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 text-sm leading-6 text-finn-iron">
                                {description}
                            </div>
                        </Dialog.Description>

                        {/*
                          * Confirm sits last in reading order and first when
                          * the dialog is narrow enough to stack, which puts
                          * the act nearest the thumb and the retreat nearest
                          * the reader's way back out.
                          */}
                        <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-finn-cotton bg-finn-snow px-6 py-4 sm:flex-row sm:justify-end">
                            <Dialog.Close asChild>
                                <button
                                    ref={cancelRef}
                                    type="button"
                                    className="inline-flex h-11 items-center justify-center rounded-full px-5 text-xs font-black text-finn-iron transition hover:bg-finn-cotton hover:text-finn-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finn-black/30"
                                >
                                    {cancelLabel}
                                </button>
                            </Dialog.Close>

                            <Dialog.Close asChild>
                                <button
                                    type="button"
                                    onClick={onConfirm}
                                    className={`inline-flex h-11 items-center justify-center rounded-full px-6 text-xs font-black text-white shadow-sm transition focus-visible:outline-none focus-visible:ring-2 ${confirm}`}
                                >
                                    {confirmLabel}
                                </button>
                            </Dialog.Close>
                        </footer>
                    </Dialog.Content>
                </div>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
