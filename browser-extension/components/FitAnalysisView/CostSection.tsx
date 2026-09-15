import { Receipt, Route, Fuel, Zap, Wallet, TriangleAlert, CircleCheck } from "lucide-react";

import { formatEUR } from "@/lib/reasoning-engine";
import type { FitAnalysis } from "@/lib/reasoning-engine/fit";
import type { CostBreakdown, CostLine } from "@/lib/reasoning-engine/types";
import type { FuelType } from "@/lib/types";
import {
    advertisedGap,
    contractTag,
    costIcon,
    costLead,
    COST_SOURCE_LABEL,
    COST_SOURCE_TONE,
} from "@/lib/cost-copy";

import { Section } from "./parts";

/**
 * What this car costs the reader, and how much of that FINN's page doesn't say.
 *
 * The twin of `costSection` in the in-page panel, reading the same sentences
 * out of `cost-copy` so a reader who meets a car in the panel and again here
 * is told the same thing about it in the same words — and drawn in the same
 * shapes, down to the mark on each line of the bill.
 *
 * The advertised price is quoted only to be contrasted with. What is news is
 * that the reader's own mileage and energy prices turn it into a bigger
 * number, and that gap leads the section.
 */

/** Lucide shapes for the marks `cost-copy` names. */
const LINE_ICON = { receipt: Receipt, route: Route, fuel: Fuel, zap: Zap } as const;

export function CostSection({ analysis }: { analysis: FitAnalysis }) {
    const { cost } = analysis;

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
              *
              * The wallet is solid navy, the way the fuel chip in "How much it
              * uses" is: it names the subject of the section rather than
              * passing a verdict on it. The verdicts are the amber gap chip
              * and the budget line, and both are coloured for what they mean.
              */}
            <div className="mt-2 flex items-center gap-3">
                <span
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-finn-highlight-navy text-white"
                >
                    <Wallet className="h-5 w-5" />
                </span>

                <div className="min-w-0">
                    <p className="text-2xl font-black leading-7 text-finn-black tabular-nums">
                        {formatEUR(cost.breakdown.totalMonthly)}
                    </p>

                    <p className="text-[11px] leading-4 text-finn-iron">
                        {cost.breakdown.complete
                            ? "estimated per month"
                            : "per month, and incomplete"}
                    </p>
                </div>
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
                <BudgetLine
                    sentence={cost.budgetSentence}
                    status={cost.breakdown.budgetStatus}
                />
            )}

            <div className="mt-3 flex flex-col gap-2">
                {cost.lines.map((line) => (
                    <CostRow
                        key={line.id}
                        line={line}
                        breakdown={cost.breakdown}
                        fuelType={analysis.vehicle.fuelType ?? null}
                    />
                ))}
            </div>

            {/* Each caveat marked as one, rather than greyed out with the small print. */}
            {cost.caveats.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1.5">
                    {cost.caveats.map((caveat) => (
                        <li
                            key={caveat}
                            className="flex items-start gap-2 text-[11px] leading-4 text-finn-iron"
                        >
                            <TriangleAlert
                                aria-hidden="true"
                                className="mt-px h-3.5 w-3.5 shrink-0 text-finn-warning-deep"
                            />

                            <span>{caveat}</span>
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

/**
 * The budget verdict, marked as well as coloured.
 *
 * Over a budget the reader set is the one outcome worth a warning, and it gets
 * the same triangle the caveats use. Within it gets a tick rather than nothing,
 * because a reader who set a budget asked this question and the sentence is the
 * answer. Unknown is not a verdict, so it keeps the grey prose and no mark.
 */
function BudgetLine({
    sentence,
    status,
}: {
    sentence: string;
    status: FitAnalysis["cost"]["breakdown"]["budgetStatus"];
}) {
    const tone =
        status === "over"
            ? "text-finn-influence-red"
            : status === "unknown"
              ? "text-finn-iron"
              : "text-finn-influence-emerald";

    const Mark =
        status === "over"
            ? TriangleAlert
            : status === "unknown"
              ? null
              : CircleCheck;

    return (
        <p
            className={`mt-2 flex items-start gap-2 text-[12px] font-bold leading-[18px] ${tone}`}
        >
            {Mark && (
                <Mark aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            )}

            <span>{sentence}</span>
        </p>
    );
}

/**
 * One line of the bill: its mark, what it is, where the number came from, and
 * the number.
 *
 * The mark sits in a circle tinted by that last question, so the three kinds of
 * figure are told apart at a glance and the colour agrees with the words under
 * the label rather than replacing them.
 */
function CostRow({
    line,
    breakdown,
    fuelType,
}: {
    line: CostLine;
    breakdown: CostBreakdown;
    fuelType: FuelType | null;
}) {
    const Icon = LINE_ICON[costIcon(line, fuelType)];
    const contract = contractTag(line, breakdown.contractType);

    return (
        <div className="flex items-start gap-3 rounded-2xl bg-finn-snow px-3.5 py-2.5">
            <span
                aria-hidden="true"
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${COST_SOURCE_TONE[line.source]}`}
            >
                <Icon className="h-4 w-4" />
            </span>

            <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                    <p className="flex min-w-0 flex-wrap items-center gap-1.5 text-[12px] font-bold text-finn-black">
                        {line.label}

                        {/*
                          * Which of FINN's two prices this is, in the tint that
                          * means "you chose this" everywhere else in the bill.
                          */}
                        {contract && (
                            <span
                                data-contract=""
                                className={`rounded-full px-2 py-0.5 text-[10px] font-black leading-4 ${COST_SOURCE_TONE.user}`}
                            >
                                {contract}
                            </span>
                        )}
                    </p>

                    <p
                        className={[
                            "shrink-0 text-[12px] font-black tabular-nums",
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

                <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-finn-iron">
                    {COST_SOURCE_LABEL[line.source]}
                </p>

                <p className="mt-1 text-[11px] leading-4 text-finn-iron">
                    {line.explanation}
                </p>
            </div>
        </div>
    );
}
