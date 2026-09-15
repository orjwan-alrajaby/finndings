import { Wallet } from "lucide-react";

import { FactRow } from "@/components/FactTable";
import { PriorityIcon } from "@/components/PriorityIcon";
import { ROW_TONE } from "@/lib/row-tone";
import { readTradeoff } from "@/lib/tradeoff-copy";
import type { Tradeoff } from "@/lib/reasoning-engine/narrative/types";

/**
 * One compromise, as a row of the tradeoff table.
 *
 * Marked with the priority it costs — the shield for safety, the leaf for the
 * environment, the wallet for a budget the reader set directly — and edged in
 * how loudly the engine decided to say it: orange where the loss lands on
 * something near the top of their order, amber further down. Red, edge and pill, for
 * equipment the reader gave extra influence and the car doesn't have, matching
 * that group in the feature table.
 *
 * The panel's twin is `tradeoffRow` in `lens-panel/sections.ts`.
 */
export function TradeoffRow({ tradeoff }: { tradeoff: Tradeoff }) {
    const reading = readTradeoff(tradeoff);

    return (
        <FactRow tone={reading.tone} data-tradeoff={tradeoff.kind}>
            <div className="flex items-start gap-2.5">
                <span
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-finn-iron"
                >
                    {tradeoff.priority ? (
                        <PriorityIcon
                            name={reading.icon}
                            className="h-4 w-4"
                        />
                    ) : (
                        <Wallet className="h-4 w-4" />
                    )}
                </span>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <p className="text-[12px] font-black leading-[18px] text-finn-black">
                            {tradeoff.headline}
                        </p>

                        {/*
                          * Which part of their answer this costs, and where
                          * they put it. A compromise on the thing they ranked
                          * first is a different piece of news from the same
                          * compromise on their fifth, and the row said so only
                          * in the last of its three lines.
                          */}
                        <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black leading-4 ${ROW_TONE[reading.tone].pill}`}
                        >
                            {reading.pill}
                        </span>
                    </div>

                    <p className="mt-0.5 text-[11px] leading-4 text-finn-iron">
                        {tradeoff.evidence}
                    </p>

                    {/*
                      * Why this reader should care, which is always the
                      * priority they ranked or the budget they set — never a
                      * generic "worth weighing".
                      */}
                    <p className="mt-1 text-[11px] leading-4 text-finn-iron">
                        {tradeoff.relevance}
                    </p>
                </div>
            </div>
        </FactRow>
    );
}
