import {
    FIT_BANDS,
    FIT_METER_SEGMENTS,
    FIT_SEGMENTS,
    type FitLevel,
} from "@/lib/reasoning-engine/fit";

/**
 * The parts every section of the reading is built from.
 *
 * A titled block and the band indicator, kept together because they are the
 * two things that appear in more than one section — and the band appears
 * outside this view entirely, on the rows of the pinned-cars list.
 */

export function Section({
    title,
    children,
    anchor,
}: {
    title: string;
    children: React.ReactNode;
    /** `data-section`, for a link elsewhere on the card to scroll to. */
    anchor?: string;
}) {
    return (
        <section
            data-section={anchor}
            /*
              * Clear of the pins page's two sticky bars when scrolled to; see
              * `STUCK` in `pins/App.tsx`.
              */
            className={`border-t border-finn-cotton px-5 py-4 ${anchor ? "scroll-mt-38 outline-none" : ""}`}
        >
            <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-finn-iron">
                {title}
            </h3>

            {children}
        </section>
    );
}

/**
 * The band, as four segments.
 *
 * A band summarises a score the reader is deliberately never shown, so the
 * indicator has to read as "how much of this" without reading as a mark out
 * of ten. Coloured per band rather than in one accent, so four of them in a
 * list are told apart before they are read.
 */
export function BandChip({
    level,
    label,
    compact,
}: {
    level: FitLevel;
    label: string;
    /** Drops the meter, for a chip that has to sit inside a list row. */
    compact?: boolean;
}) {
    const band = FIT_BANDS[level];
    const filled = FIT_SEGMENTS[level];

    return (
        <span
            className={[
                "inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5",
                "text-[11px] font-black",
                /*
                 * A hairline of white, the same one the badge on finn.com
                 * carries and for the same reason: `finn-fit-strong-pale` is
                 * the identical #eaf4ff as `finn-pale-blue`, which is the
                 * ground every photograph in this product now sits on. Without
                 * an edge the strong band's chip loses its body and leaves its
                 * label floating. See `FIT_BADGE_BASE`.
                 */
                "ring-1 ring-white",
                band.chipClass,
            ].join(" ")}
        >
            {!compact && (
                <span className="flex items-center gap-0.5" aria-hidden="true">
                    {Array.from(
                        { length: FIT_METER_SEGMENTS },
                        (_, segment) => segment,
                    ).map((segment) => (
                        <span
                            key={segment}
                            className={[
                                "block h-1.5 w-1.5 rounded-full",
                                segment < filled
                                    ? band.barClass
                                    : band.emptyBarClass,
                            ].join(" ")}
                        />
                    ))}
                </span>
            )}

            {label}
        </span>
    );
}
