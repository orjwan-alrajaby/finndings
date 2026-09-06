import type {
    FeatureFact,
    MeasurementFact,
    PriorityReasoning,
    PriorityStanding,
} from "@/lib/reasoning-engine/narrative";
import { FeatureChip, type FeatureChipTone } from "@/components/FeatureChip";

import { PriorityIcon } from "@/components/PriorityIcon";
import { EnvironmentalResult } from "@/components/EnvironmentalResult";
import { ExportTable, type ExportRow } from "@/components/ExportTable";
import { FEATURE_IMPORTANCE } from "@/lib/reasoning-engine/constants";

/**
 * One priority, answering one question: what does this car give me for the
 * thing I said mattered?
 *
 * The heading carries the user's rank and nothing else. The category score
 * and its share of the weighting are deliberately absent — "practicality:
 * 48/100" asks the reader to interpret an abstraction, where "491 L of boot
 * space against 1,726 L" tells them what they'd actually notice.
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
    /* Deep amber: the signal hue reads 1.9:1 on its own tint. */
    behindLeader: "bg-finn-warning/15 text-finn-warning-deep",
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

    /*
     * A feature the reader singled out is already stated above as a pick, so
     * the coverage list below it drops the duplicate rather than saying the
     * same thing twice under a weaker label.
     */
    const alsoCounted = hasPicks
        ? features.coverage.present.filter(
              (fact) =>
                  !picked.present.some((item) => item.key === fact.key),
          )
        : features.coverage.present;

    return (
        /*
          * A card rather than a rule between rows. Five priorities separated
          * by a hairline read as one long column that has to be counted;
          * five white cards on the section's blue read as five answers, and
          * the reader can stop after the ones they ranked highest.
          */
        <section className="rounded-[22px] bg-white p-5 sm:p-6">
            <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-finn-pale-blue text-finn-accent-blue">
                    <PriorityIcon name={reasoning.icon} className="h-5 w-5" />
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

                    {/*
                      * Environmental impact renders itself. Its figures need
                      * an interpretation attached to each one — "140 g/km" in
                      * a generic measurement row asks the reader to already
                      * know what 140 means — and its caveats have to land
                      * after the answer rather than in front of it. Every
                      * other priority is explained by the feature lists
                      * below, so the generic path is right for them.
                      */}
                    {reasoning.environmental ? (
                        <EnvironmentalResult
                            assessment={reasoning.environmental}
                            variant="concise"
                        />
                    ) : (
                        <>
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
                                <MeasurementTable
                                    facts={reasoning.measurements}
                                />
                            )}
                        </>
                    )}

                    {/*
                      * The same three lists, twice. On screen they are chips
                      * with their explanations a tap away, which is what a
                      * reader wants when only one word in twenty puzzles
                      * them. In the exported file a tap reveals nothing, so
                      * everything behind one is laid out flat instead — see
                      * components/ExportTable.
                      */}
                    <div className="finn-lens-screen-only mt-3 space-y-2">
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
                            facts={alsoCounted}
                            tone="rivalOnly"
                        />
                    </div>

                    <ExportTable
                        caption={`Every feature counted under ${reasoning.label}`}
                        subjectHeading="Feature · where it stands"
                        detailHeading="What it is"
                        rows={featureRows(picked, alsoCounted, hasPicks)}
                    />
                </div>
            </div>
        </section>
    );
}

/**
 * The same features as the chip rows, flattened for the exported file.
 *
 * Three things that are one tap away on screen are simply present here: what
 * the feature is, whether the car has it, and — for anything the reader gave
 * extra influence to — how much they said it should count. On a chip the
 * first sits behind an "i" and the last behind a coloured dot with a
 * tooltip, and a photograph of the page keeps neither.
 *
 * The order is the chips' own: what the reader asked for and got, what they
 * asked for and didn't, then what counted anyway. That is the order of
 * interest, and it also puts the amber rows where a reader scanning the
 * left edge will find them together.
 */
function featureRows(
    picked: { present: FeatureFact[]; missing: FeatureFact[] },
    alsoCounted: FeatureFact[],
    hasPicks: boolean,
): ExportRow[] {
    return [
        ...picked.present.map((fact) =>
            featureRow(fact, "positive", "Has it · you asked for it"),
        ),
        ...picked.missing.map((fact) =>
            featureRow(fact, "caution", "Doesn't have it · you asked for it"),
        ),
        ...alsoCounted.map((fact) =>
            featureRow(
                fact,
                "neutral",
                hasPicks ? "Has it · counted anyway" : "Has it",
            ),
        ),
    ];
}

function featureRow(
    fact: FeatureFact,
    tone: ExportRow["tone"],
    standing: string,
): ExportRow {
    const level = fact.importance ? FEATURE_IMPORTANCE[fact.importance] : null;

    return {
        /*
         * A feature can appear in at most one of the three lists, so its own
         * id is unique across the table.
         */
        key: fact.key,
        tone,
        subject: (
            <>
                {fact.label}

                {level && (
                    <span
                        className={[
                            "ml-1.5 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide",
                            level.chipClass,
                        ].join(" ")}
                    >
                        {level.badgeLabel}
                    </span>
                )}
            </>
        ),
        standing,
        detail: fact.explanation,
    };
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
                    className="rounded-xl bg-finn-pale-blue/60 px-3 py-2"
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
