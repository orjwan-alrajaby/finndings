import { formatEUR } from "@/lib/reasoning-engine";
import type { FitAnalysis } from "@/lib/reasoning-engine/fit";
import type { CostLine } from "@/lib/reasoning-engine/types";
import { advertisedGap, costLead } from "@/lib/cost-copy";

import { Section } from "./parts";

/**
 * What this car costs the reader, and how much of that FINN's page doesn't say.
 *
 * The twin of `costSection` in the in-page panel, reading the same sentences
 * out of `cost-copy` so a reader who meets a car in the panel and again here
 * is told the same thing about it in the same words.
 *
 * The advertised price is quoted only to be contrasted with. What is news is
 * that the reader's own mileage and energy prices turn it into a bigger
 * number, and that gap leads the section.
 */
export function CostSection({ analysis }: { analysis: FitAnalysis }) {
    const { cost } = analysis;

    /*
     * Over budget is the one case worth colouring red. Within budget is the
     * ordinary outcome and does not need congratulating every time; unknown is
     * not a verdict at all.
     */
    const budgetTone =
        cost.breakdown.budgetStatus === "over"
            ? "text-finn-influence-red"
            : cost.breakdown.budgetStatus === "unknown"
              ? "text-finn-iron"
              : "text-finn-influence-emerald";

    const gap = advertisedGap(analysis);

    return (
        <Section title="What it costs you">
            {/*
              * The figure, then the gap, then the sentence — the panel's
              * shape. `cost.headline` used to open this section and now
              * doesn't: "At your mileage we estimate €651/month in total" is
              * the same claim `costLead` makes two lines below, in more words
              * and without naming what makes up the difference.
              *
              * That leaves `CostAnalysis.headline` rendered by nothing. It is
              * left on the type rather than removed here: it is engine output
              * with its own tests, and pulling a field out of the analysis is
              * a change to the engine's contract rather than to this card.
              */}
            <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black leading-7 text-finn-black tabular-nums">
                    {formatEUR(cost.breakdown.totalMonthly)}
                </span>

                <span className="text-[11px] text-finn-iron">
                    {cost.breakdown.complete
                        ? "estimated per month"
                        : "per month, and incomplete"}
                </span>
            </div>

            {/*
              * Amber, not red. Going past the included allowance is not a
              * fault — it is the ordinary consequence of driving more than the
              * base contract assumes, and most readers will. Red belongs to
              * the budget line, where the reader set a limit and this car has
              * passed it.
              */}
            {gap != null && (
                <p className="mt-2 inline-flex items-center rounded-full bg-finn-warning-lift px-2.5 py-1 text-[11px] font-black text-finn-warning-deep">
                    {formatEUR(gap)} a month more than the advertised price
                </p>
            )}

            <p className="mt-2 text-[12px] leading-[18px] text-finn-black">
                {costLead(analysis)}
            </p>

            {cost.budgetSentence && (
                <p
                    className={`mt-2 text-[12px] font-bold leading-[18px] ${budgetTone}`}
                >
                    {cost.budgetSentence}
                </p>
            )}

            <div className="mt-3 flex flex-col gap-2">
                {cost.lines.map((line) => (
                    <CostRow key={line.id} line={line} />
                ))}
            </div>

            {cost.caveats.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1">
                    {cost.caveats.map((caveat) => (
                        <li
                            key={caveat}
                            className="text-[11px] leading-4 text-finn-iron"
                        >
                            {caveat}
                        </li>
                    ))}
                </ul>
            )}

            {/*
              * The estimate disclaimer, with the estimates. It used to close
              * the whole card, several sections below the only numbers it
              * qualifies — so a reader who finished with the cost and moved on
              * never met it, and one who reached it had long since stopped
              * looking at the figures it was about.
              */}
            <p className="mt-3 border-t border-finn-cotton pt-3 text-[11px] leading-4 text-finn-iron">
                {cost.disclaimer}
            </p>
        </Section>
    );
}

function CostRow({ line }: { line: CostLine }) {
    return (
        <div className="rounded-2xl bg-finn-snow px-3.5 py-2.5">
            <div className="flex items-baseline justify-between gap-3">
                <p className="text-[12px] font-bold text-finn-black">
                    {line.label}
                </p>

                <p
                    className={[
                        "shrink-0 text-[12px] font-black",
                        line.available
                            ? "text-finn-black"
                            : "text-finn-iron",
                    ].join(" ")}
                >
                    {line.available && line.amount != null
                        ? `${formatEUR(line.amount)}/mo`
                        : "Not known"}
                </p>
            </div>

            <p className="mt-0.5 text-[11px] leading-4 text-finn-iron">
                {line.explanation}
            </p>
        </div>
    );
}
