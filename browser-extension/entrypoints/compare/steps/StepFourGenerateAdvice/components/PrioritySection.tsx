import type { PriorityBreakdown } from "@/lib/reasoning-engine/types";
import { explainPriority } from "@/lib/reasoning-engine";

/**
 * One priority, explained with the actual scores and features behind it.
 *
 * The prose comes from `explainPriority`, which builds every sentence from
 * the numbers on the breakdown — so nothing here can claim more than the
 * data supports.
 */
export function PrioritySection({
    breakdown,
    subjectName,
}: {
    breakdown: PriorityBreakdown;
    subjectName: string;
}) {
    const sentences = explainPriority(breakdown, subjectName);
    const versus = breakdown.versus;

    return (
        <section className="border-t border-finn-cotton pt-6">
            <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-finn-pale-blue text-sm font-black text-finn-accent-blue">
                    {breakdown.icon}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-finn-accent-blue">
                                Priority #{breakdown.rank} ·{" "}
                                {breakdown.weightPercent}% of the result
                            </p>

                            <h3 className="mt-1 text-lg font-black text-finn-black">
                                {breakdown.label}
                            </h3>
                        </div>

                        <ScoreBar breakdown={breakdown} subjectName={subjectName} />
                    </div>

                    <div className="mt-2 space-y-2">
                        {sentences.map((sentence) => (
                            <p
                                key={sentence}
                                className="text-sm leading-6 text-finn-iron"
                            >
                                {sentence}
                            </p>
                        ))}
                    </div>

                    {(breakdown.matchedLabels.length > 0 ||
                        breakdown.missingLabels.length > 0) && (
                        <dl className="mt-3 space-y-1.5">
                            {breakdown.matchedLabels.length > 0 && (
                                <FeatureRow
                                    label="Present"
                                    items={breakdown.matchedLabels}
                                    tone="text-finn-black"
                                />
                            )}

                            {breakdown.missingLabels.length > 0 && (
                                <FeatureRow
                                    label="Not present"
                                    items={breakdown.missingLabels}
                                    tone="text-finn-warning"
                                />
                            )}

                            {versus && versus.onlyOtherHas.length > 0 && (
                                <FeatureRow
                                    label={`Only ${versus.name} has`}
                                    items={versus.onlyOtherHas}
                                    tone="text-finn-iron"
                                />
                            )}
                        </dl>
                    )}
                </div>
            </div>
        </section>
    );
}

function ScoreBar({
    breakdown,
    subjectName,
}: {
    breakdown: PriorityBreakdown;
    subjectName: string;
}) {
    const versus = breakdown.versus;

    return (
        <div className="text-right">
            <p className="font-mono text-lg font-black text-finn-black">
                {breakdown.score}
                <span className="text-xs text-finn-iron">/100</span>
            </p>

            <p className="text-[10px] font-bold text-finn-iron">
                {versus
                    ? `${subjectName.split(" ")[0]} ${breakdown.score} · ${
                          versus.name.split(" ")[0]
                      } ${versus.score}`
                    : "no comparison available"}
            </p>
        </div>
    );
}

function FeatureRow({
    label,
    items,
    tone,
}: {
    label: string;
    items: string[];
    tone: string;
}) {
    return (
        <div className="flex flex-wrap gap-x-2 text-xs">
            <dt className="font-black text-finn-iron">{label}:</dt>
            <dd className={`font-semibold ${tone}`}>{items.join(", ")}</dd>
        </div>
    );
}
