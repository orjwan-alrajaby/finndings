import type { FitAnalysis } from "@/lib/reasoning-engine/fit";
import type { EfficiencyLevel } from "@/lib/reasoning-engine/environmental";

import { Section } from "./parts";

/**
 * How much energy this car uses, for every car and every reader.
 *
 * The twin of `efficiencySection` in the in-page panel, and it exists on this
 * page for the same reason it exists there: the reading used to be written
 * only inside the environmental-impact priority, so whether a reader was told
 * a car drinks 9 L/100km depended on whether they had ranked the environment.
 * That is two different questions sharing one figure — one about emissions,
 * one about money leaving an account every month — and the second is owed to
 * everybody.
 *
 * Every case says something. A plug-in hybrid is shown its figure and told
 * plainly that it cannot be graded fairly; a car FINN publishes no consumption
 * for is told that, rather than the section vanishing and leaving the reader to
 * wonder whether it failed to load.
 *
 * Nothing here is written by this file. The verdict, the figures, the reasoning
 * and the caveat all come off `EfficiencyAssessment`, which is what keeps this
 * page and the panel saying the same words about the same car.
 */

/** How a level colours its chip. Efficiency is good news, not a warning. */
const EFFICIENCY_CLASS: Record<EfficiencyLevel, string> = {
    high: "bg-finn-influence-emerald-pale text-finn-influence-emerald",
    moderate: "bg-finn-pale-blue text-finn-accent-blue",
    low: "bg-finn-warning-lift text-finn-warning-deep",
};

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

/**
 * What the car runs on, said loudly, at the head of the section it governs.
 *
 * It is the single fact that decides everything below — which cohort the
 * consumption is measured against, what "typical" means, and whether the
 * figure can be graded at all. Solid rather than tinted, so it reads as the
 * subject of the section rather than as a second verdict competing with the
 * efficiency chip beside it.
 */
function FuelChip({ fuel }: { fuel: string | null | undefined }) {
    if (!fuel) return null;

    return <Chip label={fuel} tone="bg-finn-highlight-navy text-white" />;
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

export function UsageSection({ analysis }: { analysis: FitAnalysis }) {
    const impact = analysis.environment;
    const efficiency = impact?.efficiency;
    const fuel = analysis.vehicle.fuelType;

    /*
     * The environmental priority already covers this ground in full, with
     * emissions beside it. Saying it twice on one page would read as a bug.
     */
    if (analysis.priorities.some((priority) => priority.impact)) return null;

    if (efficiency) {
        return (
            <Section title="How much it uses">
                <div className="mt-2 flex flex-wrap items-center gap-2">
                    <FuelChip fuel={fuel} />

                    <Chip
                        label={efficiency.label}
                        tone={EFFICIENCY_CLASS[efficiency.level]}
                    />
                </div>

                <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2.5">
                    <Readout label="This car" value={efficiency.display} />

                    <Readout
                        label="Typical for its kind"
                        value={efficiency.typical.replace(" is typical", "")}
                    />
                </div>

                <p className="mt-3 text-[12px] leading-[18px] text-finn-black">
                    {efficiency.reasoning}
                </p>

                <p className="mt-2 text-[11px] leading-4 text-finn-iron">
                    {efficiency.caveat}
                </p>
            </Section>
        );
    }

    if (impact?.powertrain === "Plug-in Hybrid") {
        return (
            <Section title="How much it uses">
                <div className="mt-2 flex flex-wrap items-center gap-2">
                    <FuelChip fuel={fuel} />

                    <Chip
                        label="Can't be graded fairly"
                        tone="bg-finn-cotton text-finn-iron"
                    />
                </div>

                <p className="mt-3 text-[12px] leading-[18px] text-finn-black">
                    FINN publishes one combined figure for plug-in hybrids,
                    covering both the petrol it burns and the electricity it
                    charges on, over an assumed pattern of charging. There is no
                    petrol car or electric car it can fairly be measured
                    against, so we would rather say that than invent a
                    comparison. What it actually costs you comes down to how
                    often you plug it in.
                </p>
            </Section>
        );
    }

    return (
        <Section title="How much it uses">
            <div className="mt-2 flex flex-wrap items-center gap-2">
                <FuelChip fuel={fuel} />

                <Chip
                    label="Not published"
                    tone="bg-finn-cotton text-finn-iron"
                />
            </div>

            <p className="mt-3 text-[12px] leading-[18px] text-finn-black">
                FINN doesn't publish a consumption figure for this car, so there
                is nothing to measure it against and we won't guess. Everything
                else on this page still stands — this is the one thing we can't
                tell you.
            </p>
        </Section>
    );
}
