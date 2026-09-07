import type { Tradeoff } from "@/lib/reasoning-engine/narrative/types";

export function TradeoffRow({ tradeoff }: { tradeoff: Tradeoff }) {
    return (
        <div className="rounded-2xl bg-finn-snow px-3.5 py-2.5">
            <p className="text-[12px] font-black text-finn-black">
                {tradeoff.headline}
            </p>

            <p className="mt-0.5 text-[11px] leading-4 text-finn-iron">
                {tradeoff.evidence}
            </p>

            {/*
              * Why this reader should care, which is always the priority they
              * ranked or the budget they set — never a generic "worth
              * weighing".
              */}
            <p className="mt-1 text-[11px] leading-4 text-finn-iron">
                {tradeoff.relevance}
            </p>
        </div>
    );
}
