import type {
    FeatureFact,
    MeasurementFact,
    PriorityReasoning,
    PriorityStanding,
} from "@/lib/reasoning-engine/narrative";
import { FeatureChip, type FeatureChipTone } from "@/components/FeatureChip";

/**
 * One priority, answering one question: what does this car actually give me
 * for the thing I said mattered?
 *
 * The prose is composed by the narrative layer from established facts. This
 * component's only job is to lay it out and put the named features and
 * figures within reach of the sentence that mentions them.
 */

const STANDING_LABEL: Record<PriorityStanding, string> = {
    leads: "Best of your pinned cars",
    levelWithLeader: "Level with the best",
    closeToLeader: "Just behind the best",
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

    const hasChips =
        features.essentialPresent.length ||
        features.essentialMissing.length ||
        features.optionalPresent.length ||
        features.optionalMissing.length ||
        (reasoning.rival?.onlyRivalHas.length ?? 0);

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
                                Priority #{reasoning.rank} ·{" "}
                                {reasoning.weightPercent}% of the result
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

                    {Boolean(hasChips) && (
                        <div className="mt-3 space-y-2">
                            <ChipRow
                                label="You get"
                                facts={[
                                    ...features.essentialPresent,
                                    ...features.optionalPresent,
                                ]}
                                tone="present"
                            />

                            <ChipRow
                                label="You don't"
                                facts={[
                                    ...features.essentialMissing,
                                    ...features.optionalMissing,
                                ]}
                                tone="missing"
                            />

                            {reasoning.rival && (
                                <ChipRow
                                    label={`Only ${reasoning.rival.name} has`}
                                    facts={reasoning.rival.onlyRivalHas}
                                    tone="rivalOnly"
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

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

/**
 * The measured figures, side by side with the rival's.
 *
 * Marked when a number feeds the score and when it doesn't, so the reader can
 * tell the evidence apart from the context.
 */
function MeasurementTable({ facts }: { facts: MeasurementFact[] }) {
    return (
        <dl className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {facts.map((fact) => (
                <div
                    key={fact.label}
                    className="rounded-xl bg-finn-snow px-3 py-2"
                >
                    <dt className="flex items-baseline justify-between gap-2 text-[10px] font-black uppercase tracking-wide text-finn-iron">
                        {fact.label}

                        {!fact.scored && (
                            <span className="font-bold normal-case tracking-normal opacity-70">
                                context only
                            </span>
                        )}
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
