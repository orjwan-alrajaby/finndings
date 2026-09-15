import type { ReactNode } from "react";

/**
 * The tables that only exist in the file.
 *
 * A PDF is a photograph of the page, and a photograph catches a fold rather
 * than what is behind it. Several places here keep their evidence one tap
 * away — the "i" on a feature chip, the environmental tag that opens its own
 * footnote — which is right on screen, where tapping is free and the reader
 * asks for an explanation only when a word puzzles them, and useless in a
 * file, where the explanation is simply gone.
 *
 * So those places render twice: the chips for the screen, and this for the
 * capture, laid flat so that everything a tap would have revealed is already
 * on the sheet. The `.finn-lens-export-only` class does the swapping — see
 * the rule in assets/tailwind.css — and the two renderings are built from
 * the same facts by the same component, which is the only reason they can't
 * drift into two different claims.
 *
 * The shape is the hot seat's comparison table, because that table is
 * already the page's answer to "several things, each with a side and a
 * reason": the tone runs down the left edge as a bar, the middle column says
 * in words what the bar says in colour, and the reading sits on the right.
 * A reader who has met one of these tables can read the rest without
 * learning anything new.
 */

/**
 * What a row is saying — the same three-way distinction the chips make.
 *
 * `positive` is the car doing what the reader asked, `caution` is a gap they
 * should weigh, `neutral` is something that counted but that they never
 * singled out.
 */
export type ExportTone = "positive" | "caution" | "neutral";

/**
 * Amber text is drawn in the deep shade rather than the brand's signal
 * amber: this is 11px of bold sitting on a pale ground, where the signal
 * hue manages 1.9:1 — and a PDF is printed, photocopied and read on worse
 * screens than the one it was made on.
 */
const TONE_CLASS: Record<ExportTone, { edge: string; ground: string; chip: string }> = {
    positive: {
        edge: "border-l-finn-accent-blue",
        ground: "bg-finn-pale-blue",
        chip: "bg-white text-finn-accent-blue",
    },
    caution: {
        edge: "border-l-finn-warning",
        ground: "bg-finn-warning/15",
        chip: "bg-white text-finn-warning-deep",
    },
    neutral: {
        /*
         * Not cotton: the bar would be the same value as the snow ground it
         * sits on and vanish, and a table scanned down its left edge cannot
         * have one of its three states show no edge at all.
         */
        edge: "border-l-finn-iron/40",
        ground: "bg-finn-cotton",
        chip: "bg-white text-finn-iron",
    },
};

export interface ExportRow {
    key: string;
    tone: ExportTone;
    /** The thing being described — a feature's name, a tag's label. */
    subject: ReactNode;
    /** Which side it falls on, said in words and not only in colour. */
    standing: string;
    /** The prose that was behind the tap. */
    detail: ReactNode;
}

/**
 * One table, headed by the label its chip row carried.
 *
 * Two columns rather than three: the subject and its standing belong
 * together — they are one statement about one thing — and splitting them
 * gives the explanation a column too narrow to read at A4.
 */
export function ExportTable({
    caption,
    subjectHeading,
    detailHeading,
    rows,
}: {
    /** The sentence the chips sat under, kept verbatim. */
    caption?: string;
    subjectHeading: string;
    detailHeading: string;
    rows: ExportRow[];
}) {
    if (rows.length === 0) return null;

    return (
        <div className="finn-lens-export-only mt-3">
            {caption && (
                <p className="text-[10px] font-black uppercase tracking-wide text-finn-iron">
                    {caption}
                </p>
            )}

            <div className="mt-2 grid grid-cols-[minmax(0,12rem)_minmax(0,1fr)] gap-4 border-b border-finn-cotton pb-2 pl-3 text-[10px] font-black uppercase tracking-[0.14em] text-finn-iron">
                <span>{subjectHeading}</span>
                <span>{detailHeading}</span>
            </div>

            <div className="space-y-1">
                {rows.map((row) => {
                    const tone = TONE_CLASS[row.tone];

                    return (
                        <div
                            key={row.key}
                            className={[
                                "grid grid-cols-[minmax(0,12rem)_minmax(0,1fr)] gap-x-4 border-l-4 py-2.5 pl-3 pr-3",
                                tone.edge,
                                tone.ground,
                            ].join(" ")}
                        >
                            <div>
                                <p className="text-xs font-black text-finn-black">
                                    {row.subject}
                                </p>

                                <p className="mt-1">
                                    <span
                                        className={[
                                            "inline-block rounded-full px-2 py-0.5 text-[10px] font-black leading-4",
                                            tone.chip,
                                        ].join(" ")}
                                    >
                                        {row.standing}
                                    </span>
                                </p>
                            </div>

                            <div className="text-[11px] leading-5 text-finn-black">
                                {row.detail}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
