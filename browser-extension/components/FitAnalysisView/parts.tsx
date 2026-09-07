import { FIT_BANDS, FIT_SEGMENTS, type FitLevel } from "@/lib/reasoning-engine/fit";

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
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="border-t border-finn-cotton px-5 py-4">
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
                band.chipClass,
            ].join(" ")}
        >
            {!compact && (
                <span className="flex items-center gap-0.5" aria-hidden="true">
                    {[0, 1, 2, 3].map((segment) => (
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
