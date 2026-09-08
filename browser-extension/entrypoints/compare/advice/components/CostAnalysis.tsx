import { TriangleAlert } from "lucide-react";
import type {
    CostAnalysis as CostAnalysisData,
    CostFactSource,
    CostLine,
} from "@/lib/reasoning-engine/types";
import type { CostReasoning } from "@/lib/reasoning-engine/narrative";
import { formatEUR } from "@/lib/reasoning-engine";
import { compareCosts, type CostComparisonRow } from "@/lib/cost-copy";

/**
 * Renders the cost breakdown the engine calculated.
 *
 * Every number and sentence here comes from `buildCostAnalysis`. This
 * component only decides how the facts are laid out — it never does
 * arithmetic of its own.
 */

const SOURCE_LABEL: Record<CostFactSource, string> = {
    finn: "From FINN",
    user: "Your assumption",
    estimate: "Lens estimate",
};

const SOURCE_CLASS: Record<CostFactSource, string> = {
    finn: "bg-finn-pale-blue text-finn-accent-blue",
    user: "bg-finn-cotton text-finn-black",
    estimate: "bg-finn-highlight-navy/10 text-finn-highlight-navy",
};

function SourceTag({ source }: { source: CostFactSource }) {
    return (
        <span
            className={[
                "rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider",
                SOURCE_CLASS[source],
            ].join(" ")}
        >
            {SOURCE_LABEL[source]}
        </span>
    );
}

function Line({ line }: { line: CostLine }) {
    return (
        <div className="border-finn-cotton pt-4 not-first:border-t">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p
                    className={[
                        "text-lg font-black",
                        line.available
                            ? "text-finn-black"
                            : "text-finn-warning-deep",
                    ].join(" ")}
                >
                    {line.available && line.amount != null
                        ? `${formatEUR(line.amount)}/month`
                        : "Can't estimate"}
                </p>

                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-finn-iron">
                        {line.label}
                    </span>
                    <SourceTag source={line.source} />
                </div>
            </div>

            <p className="mt-1.5 text-sm leading-6 text-finn-iron">
                {line.explanation}
            </p>

            {line.facts.length > 0 && (
                <ul className="mt-2.5 flex flex-wrap gap-1.5">
                    {line.facts.map((fact) => (
                        <li
                            key={`${line.id}-${fact.label}`}
                            className="flex items-center gap-1.5 rounded-full bg-finn-cotton px-2.5 py-1"
                        >
                            <span className="text-[10px] font-bold text-finn-iron">
                                {fact.label}
                            </span>
                            <span className="text-[10px] font-black text-finn-black">
                                {fact.value}
                            </span>
                            <SourceTag source={fact.source} />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export function CostAnalysis({
    analysis,
    reasoning,
    against,
}: {
    analysis: CostAnalysisData;
    /**
     * The comparative half of the cost story — what this car costs *next to*
     * the alternatives the user pinned, which is the question a monthly
     * figure on its own can't answer.
     */
    reasoning: CostReasoning;
    /**
     * The recommendation, when somebody else is in the hot seat.
     *
     * Null when this section is already about the winner, because a car
     * compared with itself is a table of zeroes.
     */
    against?: { name: string; analysis: CostAnalysisData } | null;
}) {
    const { breakdown } = analysis;
    const overBudget = breakdown.budgetStatus === "over";

    return (
        /*
          * Green, for the one section that is entirely about money. It is
          * the page's only use of `finn-success`, so it collides with
          * neither the influence scale nor the fit bands — and it is naming
          * the subject, not passing a verdict: an over-budget total still
          * turns amber inside it.
          */
        <section className="rounded-[28px] bg-finn-success/10 p-6 sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-finn-accent-blue">
                Cost analysis
            </p>

            <h2 className="mt-2 text-2xl font-black">
                What {analysis.vehicleName} costs you
            </h2>

            <div className="mt-2 space-y-2">
                {reasoning.sentences.map((sentence) => (
                    <p
                        key={sentence}
                        className="text-sm leading-6 text-finn-iron"
                    >
                        {sentence}
                    </p>
                ))}
            </div>

            <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-finn-iron">
                Here's how we got there
            </p>

            <div className="mt-3 space-y-4 rounded-[22px] bg-white p-5 sm:p-6">
                {analysis.lines.map((line) => (
                    <Line key={line.id} line={line} />
                ))}
            </div>

            <div
                className={[
                    "mt-6 rounded-[22px] p-5",
                    /*
                      * Opaque gold, not a translucent amber. This section's
                      * ground is green, and a see-through warning laid over
                      * it composites to olive — which reads as neither
                      * colour and as no warning at all.
                      */
                    overBudget ? "bg-finn-warning-lift" : "bg-white",
                ].join(" ")}
            >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-black text-finn-black">
                        {breakdown.complete
                            ? "Estimated total"
                            : "Estimated total so far"}
                    </p>

                    <p
                        className={[
                            "text-2xl font-black",
                            overBudget
                                ? "text-finn-warning-deep"
                                : "text-finn-black",
                        ].join(" ")}
                    >
                        {formatEUR(breakdown.totalMonthly)}/month
                    </p>
                </div>

                {analysis.budgetSentence && (
                    <p className="mt-2 text-sm leading-6 text-finn-iron">
                        {analysis.budgetSentence}
                    </p>
                )}
            </div>

            {against && (
                <CostVersus
                    rows={compareCosts(analysis, against.analysis)}
                    subjectName={analysis.vehicleName}
                    againstName={against.name}
                />
            )}

            {analysis.caveats.length > 0 && (
                <ul className="mt-4 space-y-2">
                    {analysis.caveats.map((caveat) => (
                        <li
                            key={caveat}
                            className="flex gap-2 rounded-2xl bg-finn-warning-lift p-3"
                        >
                            <TriangleAlert aria-hidden="true" className="h-4 w-4 shrink-0 text-finn-warning-deep" />
                            <span className="text-xs leading-5 text-finn-black">
                                {caveat}
                            </span>
                        </li>
                    ))}
                </ul>
            )}

            <p className="mt-4 text-xs leading-5 text-finn-iron">
                {analysis.vatNote}
            </p>

            <p className="mt-2 text-xs leading-5 text-finn-iron">
                {analysis.disclaimer}
            </p>
        </section>
    );
}

/**
 * The bill, next to the bill for the car this one is challenging.
 *
 * The page already answers "what would you gain, what would you give up" for
 * every priority the reader ranked, and then dropped that framing for the one
 * thing every reader cares about: putting a car in the hot seat swapped the
 * cost section over to its figures, so the recommendation's disappeared and
 * the comparison had to be held in the reader's head.
 *
 * Line by line rather than on the total alone. Two cars a few euros apart in
 * the end can be a cheaper subscription paying for a thirstier engine, and
 * that is worth seeing — one of those numbers moves when the reader's mileage
 * changes and the other does not.
 *
 * Blue for a saving and amber for the extra, the same two sides the hot seat's
 * own table uses, so a reader crossing from one to the other reads the same
 * colours to mean the same thing. Nothing here is calculated in this file;
 * `compareCosts` does the subtraction.
 */
function CostVersus({
    rows,
    subjectName,
    againstName,
}: {
    rows: CostComparisonRow[];
    subjectName: string;
    againstName: string;
}) {
    return (
        <div className="mt-6 rounded-[22px] bg-white p-5 sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-finn-iron">
                Against {againstName}
            </p>

            <p className="mt-2 text-sm leading-6 text-finn-iron">
                What the monthly bill would do if you took {subjectName}{" "}
                instead.
            </p>

            <ul className="mt-4 space-y-2">
                {rows.map((row) => (
                    <VersusRow key={row.id} row={row} />
                ))}
            </ul>
        </div>
    );
}

function VersusRow({ row }: { row: CostComparisonRow }) {
    const total = row.id === "total";

    /*
     * A line neither car can be priced on is kept and marked rather than
     * dropped. A table showing only the differences invites the reader to
     * assume everything absent was checked and found equal — which is the one
     * thing an unpriceable line is not.
     */
    const tone =
        row.favours === "subject"
            ? "bg-finn-pale-blue"
            : row.favours === "against"
              ? "bg-finn-warning/15"
              : "bg-finn-snow";

    const verdict =
        row.favours === "unknown"
            ? "Can't compare"
            : row.favours === "level"
              ? "About the same"
              : `${formatEUR(Math.abs(row.difference ?? 0))} ${
                    row.favours === "subject" ? "less" : "more"
                }`;

    const verdictTone =
        row.favours === "subject"
            ? "text-finn-accent-blue"
            : row.favours === "against"
              ? "text-finn-warning-deep"
              : "text-finn-iron";

    return (
        <li
            className={[
                "flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1",
                "rounded-2xl px-4 py-3",
                tone,
                total ? "font-black" : "",
            ].join(" ")}
        >
            <span
                className={[
                    "text-sm",
                    total ? "font-black text-finn-black" : "text-finn-black",
                ].join(" ")}
            >
                {row.label}
            </span>

            <span className="flex items-baseline gap-3">
                {/*
                  * Both figures, not just the gap. The difference answers
                  * "which is cheaper"; the amounts answer "cheaper than
                  * what", and a reader deciding whether €30 matters needs to
                  * know whether it is against €90 or €900.
                  */}
                <span className="text-xs text-finn-iron tabular-nums">
                    {row.subject != null ? formatEUR(row.subject) : "—"}
                    {" vs "}
                    {row.against != null ? formatEUR(row.against) : "—"}
                </span>

                <span
                    className={[
                        "text-sm font-black tabular-nums",
                        verdictTone,
                    ].join(" ")}
                >
                    {verdict}
                </span>
            </span>
        </li>
    );
}
