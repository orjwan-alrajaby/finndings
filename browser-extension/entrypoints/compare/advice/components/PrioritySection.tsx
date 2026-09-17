import type {
    FeatureFact,
    MeasurementFact,
    PriorityReasoning,
    PriorityStanding,
} from "@/lib/reasoning-engine/narrative";

import { PriorityIcon } from "@/components/PriorityIcon";
import { FeatureTable } from "@/components/FeatureTable";
import {
    featureTableOf,
    ITEM_STATE,
    type FeatureTable as FeatureTableModel,
    type FeatureTableInput,
    type ItemState,
    type TableItem,
} from "@/lib/feature-copy";
import { EnvironmentalResult } from "@/components/EnvironmentalResult";
import { classifyFit } from "@/lib/reasoning-engine/fit";
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
     * The same table the fit panel draws: what was raised, what else counts,
     * and the standard kit, each chip coloured by what FINN lists.
     */
    const table = featureTableOf(adviceTableInput(features));

    return (
        /*
          * A card rather than a rule between rows. Five priorities separated
          * by a hairline read as one long column that has to be counted;
          * five white cards on the section's blue read as five answers, and
          * the reader can stop after the ones they ranked highest.
          */
        <section className="rounded-[22px] bg-white p-5 sm:p-6">
            <div className="flex items-start gap-3">
                {/*
                  * Hidden on a phone. At 390px this column cost every
                  * priority 48px of a card that is barely 300px wide, and
                  * the rank and name above the text say the same thing.
                  */}
                <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-finn-pale-blue text-finn-accent-blue sm:flex">
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
                    {reasoning.priority === "environmental" ? (
                        <EnvironmentalResult
                            assessment={reasoning.environmental}
                            band={classifyFit(
                                reasoning.score,
                                reasoning.hasEvidence,
                            )}
                            showHeadline
                            roomy
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
                      * The table on screen; in the exported file, where a tap
                      * reveals nothing, the same items laid out flat with what
                      * each one is — see components/ExportTable.
                      */}
                    <div className="finn-lens-screen-only mt-3">
                        <FeatureTable table={table} />
                    </div>

                    <ExportTable
                        caption={`Every item counted under ${reasoning.label}`}
                        subjectHeading="Item · where it stands"
                        detailHeading="What it is"
                        rows={tableRows(table)}
                    />
                </div>
            </div>
        </section>
    );
}

/** The advice narrative's evidence, as the feature table reads it. */
function adviceTableInput(features: PriorityReasoning["features"]): FeatureTableInput {
    const withState = (facts: FeatureFact[], state: ItemState): TableItem[] =>
        facts.map((fact) => ({ fact, state }));

    const { picked, coverage } = features;
    const pickedKeys = new Set(
        [...picked.present, ...picked.missing, ...picked.unknown].map((fact) => fact.key),
    );
    const rest = (facts: FeatureFact[]) => facts.filter((fact) => !pickedKeys.has(fact.key));

    return {
        picked: [
            ...withState(picked.present, "listed"),
            ...withState(picked.missing, "unlisted"),
            ...withState(picked.unknown, "unknown"),
        ],
        counted: [
            ...withState(rest(coverage.present), "listed"),
            ...withState(rest(coverage.missing), "unlisted"),
            ...withState(rest(coverage.unknown), "unknown"),
        ],
        standard: features.standard,
    };
}

const EXPORT_TONE: Record<ItemState, ExportRow["tone"]> = {
    listed: "positive",
    unlisted: "caution",
    unknown: "neutral",
};

/**
 * The table flattened for the exported file: every item with its state, the
 * row it sits in, the level it was raised to, and what it is — the things a
 * photograph of a chip with an "i" keeps none of.
 */
function tableRows(table: FeatureTableModel | null): ExportRow[] {
    return (table?.groups ?? []).flatMap((group) =>
        group.items.map((item) => {
            const level =
                group.id === "raised" && item.fact.importance
                    ? FEATURE_IMPORTANCE[item.fact.importance]
                    : null;

            return {
                key: `${group.id}-${item.fact.key}`,
                tone: EXPORT_TONE[item.state],
                subject: (
                    <>
                        {item.fact.label}

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
                standing: `${ITEM_STATE[item.state].label} · ${group.title}`,
                detail: item.fact.explanation,
            };
        }),
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
