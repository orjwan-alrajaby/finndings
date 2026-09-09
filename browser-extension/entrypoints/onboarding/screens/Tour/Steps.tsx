import type { ReactNode } from "react";
import { Check } from "lucide-react";

import { stepToneClasses, type StepStatus } from "./parts";

export type { StepStatus };

/**
 * The three controls as a progress track rather than three cards in a row.
 *
 * They were three equal panels, and equal is the wrong shape for them: they
 * are numbered, they are meant to be done, and nothing said which one the
 * reader was on or which they had already tried. Worse, the card being read
 * about grew a blue border — which on a page full of pressable things reads
 * as "this card is a button", and it isn't. The card was never the control.
 *
 * So the numbers came out of the cards and onto a rail above them, joined to
 * each card by a stub, which is the ordinary way a stepper says *these three
 * are one sequence and you are here*. The rail carries all the state the
 * border was trying to carry and more of it: filled behind what is done,
 * accented on what is next, hollow on what is untouched. The card itself is
 * now quiet furniture, which is what it always was.
 *
 * On a narrow screen there is no rail. A vertical stack of three cards is
 * already a sequence — the connector would be drawing a line to say what the
 * layout says for free — so the number goes back inside the card, carrying
 * the same colours.
 */

/**
 * How a length of rail looks, run through or not yet reached.
 *
 * Run in the accent, because that is what the nodes it joins are filled with
 * — see `stepToneClasses`. The unrun length is `finn-iron` at a quarter
 * rather than `finn-cotton`, which is the token this reached for first and
 * which sits at 1.04:1 against the page it is drawn on: a rail nobody can see
 * joins nothing to anything.
 */
function railClass(filled: boolean): string {
    return filled ? "bg-finn-accent-blue" : "bg-finn-iron/25";
}

/**
 * The gutter between two columns, spanned.
 *
 * The rail lives in the same three-column grid as the cards so each node
 * lands over its own card without any arithmetic — which leaves the grid's
 * own `gap-3` as a 12px break in the middle of every join. The segment
 * running *out* of a cell reaches a gutter's width past it and meets the next
 * cell's flush left edge. Only one side reaches, deliberately: both did at
 * first, and two translucent bars stacked across the same 12px drew a visibly
 * darker notch at every join.
 */
const HALF_AND_GUTTER = "w-[calc(50%+0.75rem)]";

/**
 * The track, on screens wide enough to lay the three side by side.
 *
 * Hidden from screen readers on purpose. Every fact it draws — the number,
 * the position, whether the step is done — is said in words inside the card
 * it hangs over; announcing it twice would make a reader walk the sequence
 * twice.
 */
export function StepRail({
    statuses,
    focused,
    at,
    onGoTo,
}: {
    /** One per step, in order. */
    statuses: StepStatus[];
    /** The step whose card is being hovered, so its node can answer. */
    focused: number | null;
    /** Where the guided tour is standing, when it is running. */
    at: number | null;
    /**
     * Sends the tour to a step. Omitted where there is no tour to send —
     * a narrow screen, where the bubbles have nowhere to hang.
     */
    onGoTo?: (index: number) => void;
}) {
    return (
        <ol
            aria-hidden="true"
            className="hidden gap-3 md:grid md:grid-cols-3"
        >
            {statuses.map((status, index) => {
                const before = statuses[index - 1];
                const done = status === "done";

                return (
                    <li key={index} className="relative flex h-10">
                        {/* The run in from the step before. */}
                        {index > 0 && (
                            <span
                                className={[
                                    "absolute top-[13px] left-0 h-0.5 w-1/2",
                                    railClass(before === "done"),
                                ].join(" ")}
                            />
                        )}

                        {/* The run out towards the next one. */}
                        {index < statuses.length - 1 && (
                            <span
                                className={[
                                    "absolute top-[13px] -right-3 h-0.5",
                                    HALF_AND_GUTTER,
                                    railClass(done),
                                ].join(" ")}
                            />
                        )}

                        {/*
                          * The stub down to the card, which is the whole
                          * reason the rail sits in its own row: it ends
                          * exactly on the card's top edge, in the same grid
                          * with the same gaps, so the node is attached to its
                          * card rather than floating above three of them.
                          */}
                        <span
                            className={[
                                "absolute top-7 bottom-0 left-1/2 w-0.5 -translate-x-1/2",
                                done
                                    ? "bg-finn-accent-blue"
                                    : status === "current"
                                        ? "bg-finn-highlight-navy"
                                        : "bg-finn-iron/25",
                            ].join(" ")}
                        />

                        {/*
                          * The node is the tour's own back button as much as
                          * it is a progress mark: a reader who wants step one
                          * again should be able to point at step one. It stays
                          * a `span` when there is no tour to send anywhere.
                          */}
                        <NodeTag
                            onGoTo={onGoTo && (() => onGoTo(index))}
                            className={[
                                "absolute top-0 left-1/2 flex h-7 w-7 -translate-x-1/2",
                                "items-center justify-center rounded-full",
                                "text-xs font-black transition-transform",
                                stepToneClasses(status),
                                status === "upcoming"
                                    ? "ring-2 ring-finn-accent-blue/25"
                                    : "",
                                /* While the tour is up it is the bubble that
                                   asks; the rail only says where you are. */
                                at === index
                                    ? "ring-4 ring-finn-highlight-navy/25"
                                    : status === "current" && at == null
                                        ? "finn-lens-beckon"
                                        : "",
                                focused === index ? "scale-110" : "",
                            ].join(" ")}
                        >
                            {done ? (
                                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                            ) : (
                                index + 1
                            )}
                        </NodeTag>
                    </li>
                );
            })}
        </ol>
    );
}

/**
 * One step, explained.
 *
 * Hovering or focusing it rings the control it is about, up on the mock, and
 * lifts its own node on the rail — so the connection can be made from either
 * end, by a reader who points at the page and by one tabbing through it. What
 * it deliberately does *not* do any more is change its own border: the card
 * is not a button and must not offer to be pressed.
 */
export function StepCard({
    index,
    status,
    title,
    where,
    aside,
    sample,
    children,
    onFocus,
    onBlur,
    action,
    asking,
}: {
    index: number;
    status: StepStatus;
    title: string;
    /** Where on the page it is, in words, because that is the actual lesson. */
    where: string;
    /** What sits next to it that isn't ours, where confusing the two is easy. */
    aside?: string;
    /** A live copy of the control itself, at legend size. */
    sample: ReactNode;
    children: ReactNode;
    onFocus: () => void;
    onBlur: () => void;
    action: { label: string; onClick: () => void };
    /**
     * Whether this card is allowed to be the thing asking.
     *
     * False while the guided tour is up, because the tour's bubble is asking
     * for the same press a few inches away and two glowing buttons for one
     * action is a page asking for nothing. The card goes back to asking the
     * moment the tour is skipped or finished.
     */
    asking: boolean;
}) {
    const done = status === "done";
    const ask = asking && status === "current";

    return (
        <li
            onMouseEnter={onFocus}
            onMouseLeave={onBlur}
            className={[
                /*
                 * A finished card stays a card.
                 *
                 * It used to recede onto `finn-snow`, which is the colour this
                 * design uses for something switched off — so three tried
                 * steps read as three steps that had been disabled rather than
                 * three the reader had done. Done is an achievement here, not
                 * a reason to be quieter: it keeps its white ground and takes
                 * an accent edge, which is the same accent as its tick and its
                 * node on the rail.
                 */
                "flex flex-col rounded-[24px] bg-white p-5 ring-1 transition",
                done
                    ? "shadow-sm ring-finn-accent-blue/40"
                    : status === "current"
                        ? "shadow-md ring-black/[0.06]"
                        : "shadow-sm ring-black/[0.06]",
            ].join(" ")}
        >
            <span className="sr-only">
                {`Step ${index + 1} of 3. ${
                    done
                        ? "Done."
                        : status === "current"
                            ? "This one next."
                            : "Not tried yet."
                }`}
            </span>

            <div className="flex items-center gap-2">
                {/* The rail carries the number where there is room for a rail. */}
                <span
                    aria-hidden="true"
                    className={[
                        "flex h-6 w-6 shrink-0 items-center justify-center",
                        "rounded-full text-[11px] font-black md:hidden",
                        stepToneClasses(status),
                        status === "upcoming"
                            ? "ring-2 ring-finn-accent-blue/25"
                            : "",
                    ].join(" ")}
                >
                    {done ? (
                        <Check className="h-3 w-3" strokeWidth={3} />
                    ) : (
                        index + 1
                    )}
                </span>

                <p className="min-w-0 flex-1 text-sm font-black text-finn-black">
                    {title}
                </p>

                {done && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-finn-accent-blue px-2 py-0.5 text-[10px] font-black text-white">
                        <Check aria-hidden="true" className="h-3 w-3" />
                        Done
                    </span>
                )}
            </div>

            <p className="mt-2 text-[11px] font-bold leading-4 text-finn-accent-blue">
                {where}
            </p>

            {aside && (
                <p className="mt-1 text-[11px] leading-4 text-finn-iron">
                    {aside}
                </p>
            )}

            <div className="mt-3 flex min-h-9 items-center">{sample}</div>

            <p className="mt-3 flex-1 text-xs leading-5 text-finn-iron">
                {children}
            </p>

            {/*
              * The one button on the page asking to be pressed.
              *
              * `finn-lens-beckon` rather than `SaveControl`'s two-beat
              * `finn-lens-attention`: this is an instruction rather than a
              * status, and a reader who reads it, thinks, and looks back
              * should still find it asking. It stops when the step is done,
              * and it never starts at all while the tour's bubble is asking
              * for the same press.
              */}
            <button
                type="button"
                onClick={action.onClick}
                onFocus={onFocus}
                onBlur={onBlur}
                className={[
                    "mt-4 inline-flex h-9 items-center justify-center self-start",
                    "rounded-full px-4 text-[11px] font-black transition-colors",
                    ask
                        ? "finn-lens-beckon bg-finn-accent-blue text-white shadow-sm hover:bg-finn-highlight-navy"
                        : done
                            ? "bg-finn-pale-blue text-finn-accent-blue hover:bg-finn-accent-blue hover:text-white"
                            : "bg-finn-snow text-finn-accent-blue hover:bg-finn-pale-blue",
                ].join(" ")}
            >
                {action.label}
            </button>
        </li>
    );
}

/** A node the tour can be sent to, or a plain mark where it cannot. */
function NodeTag({
    onGoTo,
    className,
    children,
}: {
    onGoTo?: () => void;
    className: string;
    children: ReactNode;
}) {
    if (!onGoTo) return <span className={className}>{children}</span>;

    return (
        <button
            type="button"
            onClick={onGoTo}
            /* The rail is `aria-hidden`, so this must not be a tab stop: a
               keyboard reader would land on a control their screen reader has
               been told does not exist. Everything it does is also on the
               card below, which is reachable. */
            tabIndex={-1}
            className={`${className} cursor-pointer`}
        >
            {children}
        </button>
    );
}
