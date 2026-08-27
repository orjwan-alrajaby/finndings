import type {
    FeatureFact,
    MeasurementFact,
    PriorityReasoning,
    PriorityStanding,
} from "@/lib/reasoning-engine/narrative";
import { FeatureChip, type FeatureChipTone } from "@/components/FeatureChip";

/**
 * One priority, answering one question: what does this car give me for the
 * thing I said mattered?
 *
 * The heading carries the user's rank and nothing else. The category score
 * and its share of the weighting are deliberately absent — "practicality:
 * 48/100" asks the reader to interpret an abstraction, where "491 L of boot
 * space against 1,726 L" tells them what they'd actually notice. The
 * arithmetic is still on the page, under *Behind the recommendation*, where a
 * number is what the reader came for.
 *
 * Features carry no importance marking either. The reader was never asked to
 * grade one, so there is nothing to show beyond whether they asked for it and
 * whether the car has it.
 */

const STANDING_LABEL: Record<PriorityStanding, string> = {
    leads: "Best of the close alternatives",
    levelWithLeader: "Level with the best",
    closeToLeader: "Close to the best",
    behindLeader: "Another car is stronger",
    unsupported: "Not enough data",
};

const STANDING_CLASS: Record<PriorityStanding, string> = {
    leads: "bg-finn-pale-blue text-finn-accent-blue",
    levelWithLeader: "bg-finn-pale-blue text-finn-accent-blue",
    closeToLeader: "bg-finn-cotton text-finn-iron",
    behindLeader: "bg-finn-warning/10 text-finn-warning",
    unsupported: "bg-finn-cotton text-finn-iron",
};

export function PrioritySection({
    reasoning,
}: {
    reasoning: PriorityReasoning;
}) {
    const { features } = reasoning;

    /*
     * When the user singled features out, both lists are theirs and both are
     * worth showing. When they didn't, the lists are the whole category
     * catalogue — showing fifteen struck-through chips of equipment nobody
     * asked about would be a dump, so only what the car actually has is shown.
     */
    const fromSelection = features.basis === "selected";

    const present = features.present;
    const missing = fromSelection ? features.missing : [];

    return (
        <section className="border-t border-finn-cotton pt-6">
            <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-finn-pale-blue text-sm font-black text-finn-accent-blue">
                    {reasoning.icon}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-finn-accent-blue">
                                Your priority #{reasoning.rank}
                            </p>

                            <h3 className="mt-1 text-lg font-black text-finn-black">
                                {reasoning.label}
                            </h3>
                        </div>

                        <span
                            className={[
                                "rounded-full px-2.5 py-1 text-[10px] font-black",
                                STANDING_CLASS[reasoning.standing],
                            ].join(" ")}
                        >
                            {STANDING_LABEL[reasoning.standing]}
                        </span>
                    </div>

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

                    {reasoning.measurements.length > 0 && (
                        <MeasurementTable facts={reasoning.measurements} />
                    )}

                    {(present.length > 0 || missing.length > 0) && (
                        <div className="mt-3 space-y-2">
                            <ChipRow
                                label={
                                    fromSelection
                                        ? "You picked out, and it has"
                                        : "It has"
                                }
                                facts={present}
                                tone="present"
                            />

                            <ChipRow
                                label="You picked out, but it doesn't have"
                                facts={missing}
                                tone="missing"
                            />
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

/**
 * The named features, each carrying its own explanation.
 *
 * The `i` is the answer to the reader's actual next question — "what is
 * adaptive cruise control?" — asked and answered without leaving the page.
 */
function ChipRow({
    label,
    facts,
    tone,
}: {
    label: string;
    facts: FeatureFact[];
    tone: FeatureChipTone;
}) {
    if (!facts.length) return null;

    return (
        <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wide text-finn-iron">
                {label}
            </span>

            {facts.map((fact) => (
                <FeatureChip key={fact.key} fact={fact} tone={tone} />
            ))}
        </div>
    );
}

/** The measured figures, side by side with the rival's where there is one. */
function MeasurementTable({ facts }: { facts: MeasurementFact[] }) {
    return (
        <dl className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {facts.map((fact) => (
                <div
                    key={fact.label}
                    className="rounded-xl bg-finn-snow px-3 py-2"
                >
                    <dt className="text-[10px] font-black uppercase tracking-wide text-finn-iron">
                        {fact.label}
                    </dt>

                    <dd className="mt-0.5 text-sm font-black text-finn-black">
                        {fact.display}

                        {fact.rival && (
                            <span className="ml-2 text-xs font-bold text-finn-iron">
                                vs {fact.rival.display} ({fact.rival.name})
                            </span>
                        )}
                    </dd>
                </div>
            ))}
        </dl>
    );
}
