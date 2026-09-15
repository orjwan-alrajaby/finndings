import type { ReactNode } from "react";

import { ROW_TONE, type RowTone } from "@/lib/row-tone";

/**
 * The shape every section that reports a list of facts is drawn in.
 *
 * One white card with a hairline border and square corners, its rows divided,
 * each row edged in the colour of what it says, and an optional line of small
 * print closed off under the last of them. The environmental result was the first to use it;
 * "How much it uses" took the same table so a car's consumption wouldn't look
 * like a different kind of fact depending on which section a reader met it in;
 * the tradeoffs and the feature groups now use it too, having been five and
 * three soft grey boxes that said nothing by being grey.
 *
 * It carries no opinion about what goes in a row — `ComparisonTable` puts
 * figures against a benchmark in one, the feature groups put a title and a
 * cloud of chips in another. What it fixes is the frame and the meaning of the
 * edge, which is what makes the sections read as one page.
 *
 * The in-page panel's twin is `factTable` in `lens-panel/sections.ts`.
 */
export function FactTable({
    header,
    source,
    children,
}: {
    /** A row of column captions, for a table whose rows have columns. */
    header?: ReactNode;
    /** The small print under the last row: where the figures come from. */
    source?: string;
    children: ReactNode;
}) {
    return (
        /*
          * Square, not rounded. A 4px coloured edge running into a rounded
          * corner is bent by it on the first and last row, and the rows read
          * as a stack of tabs rather than a column of equal bars.
          */
        <div className="overflow-hidden border border-finn-cotton bg-white">
            {header}

            <div className="divide-y divide-finn-cotton">{children}</div>

            {source && (
                <p
                    data-disclaimer=""
                    className="border-t border-finn-cotton px-3.5 py-2 text-[11px] leading-4 text-finn-iron"
                >
                    {source}
                </p>
            )}
        </div>
    );
}

/** A row's coloured edge: 4px, in the tone of what the row says. */
export const rowEdge = (tone: RowTone) => `border-l-4 ${ROW_TONE[tone].edge}`;

/** A row with nothing to explain, which is most of them. */
export function FactRow({
    tone,
    className = "px-3.5 py-3",
    children,
    ...rest
}: {
    tone: RowTone;
    className?: string;
    children: ReactNode;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "className">) {
    return (
        <div className={`${rowEdge(tone)} ${className}`} {...rest}>
            {children}
        </div>
    );
}
