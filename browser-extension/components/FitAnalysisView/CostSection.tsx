import { formatEUR } from "@/lib/reasoning-engine";
import type { FitAnalysis } from "@/lib/reasoning-engine/fit";
import type { CostLine } from "@/lib/reasoning-engine/types";

import { Section } from "./parts";

export function CostSection({ analysis }: { analysis: FitAnalysis }) {
    const { cost } = analysis;

    return (
        <Section title="What it costs you">
            <p className="mt-2 text-[13px] font-black leading-5 text-finn-black">
                {cost.headline}
            </p>

            {cost.budgetSentence && (
                <p className="mt-1 text-[12px] leading-[18px] text-finn-iron">
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
