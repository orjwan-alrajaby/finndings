import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon } from "@hugeicons/core-free-icons";
import type {
    CostAnalysis as CostAnalysisData,
    CostFactSource,
    CostLine,
} from "@/lib/reasoning-engine/types";
import type { CostReasoning } from "@/lib/reasoning-engine/narrative";
import { formatEUR } from "@/lib/reasoning-engine";

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
}: {
    analysis: CostAnalysisData;
    /**
     * The comparative half of the cost story — what this car costs *next to*
     * the alternatives the user pinned, which is the question a monthly
     * figure on its own can't answer.
     */
    reasoning: CostReasoning;
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

            {analysis.caveats.length > 0 && (
                <ul className="mt-4 space-y-2">
                    {analysis.caveats.map((caveat) => (
                        <li
                            key={caveat}
                            className="flex gap-2 rounded-2xl bg-finn-warning-lift p-3"
                        >
                            <HugeiconsIcon icon={Alert02Icon} className="h-4 w-4 shrink-0 text-finn-warning-deep" />
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
