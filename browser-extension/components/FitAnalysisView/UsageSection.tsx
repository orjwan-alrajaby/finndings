import type { FitAnalysis } from "@/lib/reasoning-engine/fit";
import { readUsage } from "@/lib/usage-copy";
import { USAGE_SECTION } from "@/lib/usage-anchor";
import { ComparisonTable } from "@/components/ComparisonTable";

import { Section } from "./parts";

/**
 * How much energy this car uses, for every car and every reader.
 *
 * One of three renderings of `readUsage` — the in-page panel, this card, and
 * the advice page's `EnergyUse`. Which of the three answers a car gets, and
 * the words it gets them in, are decided there; this file only lays them out.
 *
 * It exists on every car rather than only inside the environmental-impact
 * priority, which is where the reading used to live: whether a reader was told
 * a car drinks 9 L/100km depended on whether they had ranked the environment,
 * when it is on their bill every month either way. It is always here now,
 * straight after the cost, whether or not the environment is ranked: the
 * environmental result carries only CO₂, and says in one line where fuel use
 * meets it.
 */
export function UsageSection({ analysis }: { analysis: FitAnalysis }) {
    const reading = readUsage(analysis.vehicle);

    return (
        <Section title="How much it uses" anchor={USAGE_SECTION}>
            {reading.kind === "graded" ? (
                <>
                    <p className="mt-2 text-[12px] leading-[18px] text-finn-black">
                        {reading.efficiency.reasoning}
                    </p>

                    {/*
                      * The environmental result's own table, with the one row
                      * this section has: the figure, the FINN Lens benchmark
                      * beside it, the verdict in its colour, what it runs on
                      * as the pill beside the row's name, and the test
                      * disclaimer under it. What each number means opens from
                      * the row's "i".
                      */}
                    <div className="@container mt-3">
                        <ComparisonTable reading={reading.table} />
                    </div>
                </>
            ) : (
                <>
                    {/*
                      * No table to carry what it runs on, so it leads here,
                      * beside the chip standing in for a verdict.
                      */}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        {reading.fuel && (
                            <Chip
                                label={reading.fuel}
                                tone="bg-finn-highlight-navy text-white"
                            />
                        )}

                        <Chip
                            label={reading.verdict}
                            tone="bg-finn-cotton text-finn-iron"
                        />
                    </div>

                    <p className="mt-3 text-[12px] leading-[18px] text-finn-black">
                        {reading.body}
                    </p>
                </>
            )}
        </Section>
    );
}

function Chip({ label, tone }: { label: string; tone: string }) {
    return (
        <span
            className={[
                "inline-flex shrink-0 items-center rounded-full px-2.5 py-1",
                "text-[11px] font-black",
                tone,
            ].join(" ")}
        >
            {label}
        </span>
    );
}
