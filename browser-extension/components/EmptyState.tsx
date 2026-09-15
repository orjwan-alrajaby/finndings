import type { ReactNode } from "react";

/**
 * A page with nothing on it yet, in the one shape every page uses.
 *
 * There were four of these, written separately: two on the compare page, one
 * on each of its tabs, and the pinned-cars page's own. They had drifted into
 * two different cards — a white one with a shadow and a pale blue one without
 * — which meant a reader who pinned nothing and then opened the
 * recommendation was shown the same message twice by what looked like two
 * different products. An empty state is the first thing many readers will
 * ever see of a page, so it is the worst place to be inconsistent.
 *
 * This is the pinned-cars card, which was the one that had it right: white on
 * the page's snow ground, so the card reads as a thing set down on the page
 * rather than a panel painted into it.
 *
 * The heading is an `h1`. In every one of these states the card is the only
 * thing on the page — the page's real title lives in a summary that renders
 * only once there is something to summarise — so this *is* the page's
 * heading, and the `h2` the pinned-cars page used left it with none.
 */
export function EmptyState({
    icon,
    media,
    title,
    children,
}: {
    /** A glyph, set in a tile. For a state with nothing of the reader's in it. */
    icon?: ReactNode;
    /**
     * Shown in the tile's place when there *is* something of theirs to show —
     * the photograph of the single pinned car. A picture of their own car
     * says "this page found you" in a way a line drawing cannot.
     */
    media?: ReactNode;
    title: string;
    /** The explanation, and whatever the reader can usefully do about it. */
    children: ReactNode;
}) {
    return (
        <div className="mx-auto max-w-xl rounded-[28px] bg-white p-8 text-center shadow-sm">
            {media ??
                (icon && (
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-finn-pale-blue text-finn-accent-blue">
                        {icon}
                    </span>
                ))}

            <h1 className="mt-5 text-2xl font-black text-finn-black">{title}</h1>

            {children}
        </div>
    );
}
