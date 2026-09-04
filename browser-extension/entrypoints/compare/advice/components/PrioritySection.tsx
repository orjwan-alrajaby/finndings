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
 * The feature rows keep the two halves of the model apart on purpose. What
 * the reader singled out for extra influence comes first, present and missing
 * both; what the category covers anyway comes second, under a label that says
 * it still counted. A reader who picked five safety features has to be able
 * to see here that Lens looked at more than five.
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
     * Two questions, shown separately.
     *
     * The reader's own picks come first and carry both halves, present and
     * missing, because a gap in something they singled out is the point. The
     * category coverage below it shows only what the car has — fifteen
     * struck-through chips of equipment nobody asked about is a dump, not
     * evidence — but it is labelled as counting, because it did.
     */
    const picked = features.picked;
    const hasPicks = picked.present.length + picked.missing.length > 0;

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

                    <div className="mt-3 space-y-2">
                        {hasPicks && (
                            <>
                                <ChipRow
                                    label="You gave extra influence, and it has"
                                    facts={picked.present}
                                    tone="present"
                                />

                                <ChipRow
                                    label="You gave extra influence, but it doesn't have"
                                    facts={picked.missing}
                                    tone="missing"
                                />
                            </>
                        )}

                        <ChipRow
                            label={
                                hasPicks
                                    ? "Also counted here, and it has"
                                    : "It has"
                            }
                            facts={
                                hasPicks
                                    ? features.coverage.present.filter(
                                          (fact) =>
                                              !picked.present.some(
                                                  (item) =>
                                                      item.key === fact.key,
                                              ),
                                      )
                                    : features.coverage.present
                            }
                            tone="rivalOnly"
                        />
                    </div>
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
