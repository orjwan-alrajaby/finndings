import type { FitAnalysis } from "@/lib/reasoning-engine/fit";
import { EFFICIENCY_TONE, readUsage } from "@/lib/usage-copy";

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
 * when it is on their bill every month either way.
 */
export function UsageSection({ analysis }: { analysis: FitAnalysis }) {
    /*
     * The environmental priority already covers this ground in full, with
     * emissions beside it. Saying it twice on one card would read as a bug.
     */
    if (analysis.priorities.some((priority) => priority.impact)) return null;

    const reading = readUsage(analysis.vehicle);

    return (
        <Section title="How much it uses">
            <div className="mt-2 flex flex-wrap items-center gap-2">
                {/*
                  * What it runs on, first and loudest: it decides which cohort
                  * the figure is measured against, what "typical" means, and
                  * whether it can be graded at all.
                  */}
                {reading.fuel && (
                    <Chip
                        label={reading.fuel}
                        tone="bg-finn-highlight-navy text-white"
                    />
                )}

                <Chip
                    label={
                        reading.kind === "graded"
                            ? reading.efficiency.label
                            : reading.verdict
                    }
                    tone={
                        reading.kind === "graded"
                            ? EFFICIENCY_TONE[reading.efficiency.level]
                            : "bg-finn-cotton text-finn-iron"
                    }
                />
            </div>

            {reading.kind === "graded" ? (
                <>
                    <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2.5">
                        <Readout
                            label="This car"
                            value={reading.efficiency.display}
                        />

                        <Readout
                            label="Typical for its kind"
                            value={reading.efficiency.typical.replace(
                                " is typical",
                                "",
                            )}
                        />
                    </div>

                    <p className="mt-3 text-[12px] leading-[18px] text-finn-black">
                        {reading.efficiency.reasoning}
                    </p>

                    {/* After the answer, not in front of it. */}
                    <p className="mt-2 text-[11px] leading-4 text-finn-iron">
                        {reading.efficiency.caveat}
                    </p>
                </>
            ) : (
                <p className="mt-3 text-[12px] leading-[18px] text-finn-black">
                    {reading.body}
                </p>
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

function Readout({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-finn-iron">
                {label}
            </p>

            <p className="mt-0.5 text-[13px] font-black leading-5 text-finn-black">
                {value}
            </p>
        </div>
    );
}
