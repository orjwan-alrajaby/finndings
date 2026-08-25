import type { HeadToHead, PriorityBreakdown } from "@/lib/reasoning-engine/types";

/**
 * The direct comparison between the car being examined and its closest rival.
 *
 * The concession card is the important half: it names where the *other* car
 * is genuinely better and shows what that advantage was worth, rather than
 * quietly deciding the user shouldn't care about it.
 */
export function HeadToHeadSummary({ comparison }: { comparison: HeadToHead }) {
    const { decidingAdvantage, biggestConcession } = comparison;

    return (
        <section className="mt-8 border-t border-finn-cotton pt-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-finn-accent-blue">
                {comparison.subject.name} vs {comparison.other.name}
            </p>

            <h2 className="mt-2 text-2xl font-black">
                What actually separates them.
            </h2>

            <p className="mt-2 text-sm leading-6 text-finn-iron">
                {comparison.summary}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {decidingAdvantage?.versus && (
                    <SwingCard
                        breakdown={decidingAdvantage}
                        subjectName={comparison.subject.name}
                        otherName={comparison.other.name}
                        kind="advantage"
                    />
                )}

                {biggestConcession?.versus && (
                    <SwingCard
                        breakdown={biggestConcession}
                        subjectName={comparison.subject.name}
                        otherName={comparison.other.name}
                        kind="concession"
                    />
                )}
            </div>

            <ContributionTable comparison={comparison} />
        </section>
    );
}

function SwingCard({
    breakdown,
    subjectName,
    otherName,
    kind,
}: {
    breakdown: PriorityBreakdown;
    subjectName: string;
    otherName: string;
    kind: "advantage" | "concession";
}) {
    const versus = breakdown.versus;
    if (!versus) return null;

    const advantage = kind === "advantage";

    return (
        <div
            className={[
                "rounded-[22px] p-5",
                advantage ? "bg-finn-pale-blue" : "bg-finn-cotton/80",
            ].join(" ")}
        >
            <p
                className={[
                    "text-[10px] font-bold uppercase tracking-[0.14em]",
                    advantage ? "text-finn-accent-blue" : "text-finn-warning",
                ].join(" ")}
            >
                {advantage
                    ? `Where ${subjectName} pulls ahead`
                    : `Where ${otherName} is better`}
            </p>

            <h3 className="mt-1 text-base font-black text-finn-black">
                {breakdown.label} · priority #{breakdown.rank}
            </h3>

            <p className="mt-2 text-sm leading-6 text-finn-iron">
                {subjectName} {breakdown.score}/100 versus {otherName}{" "}
                {versus.score}/100 — a {Math.abs(versus.difference)}-point gap.
                At {breakdown.weightPercent}% of the overall result, that's
                worth about {Math.abs(versus.weightedDifference).toFixed(1)}{" "}
                points in the final score.
            </p>

            {versus.numeric && breakdown.numeric && (
                <p className="mt-2 text-xs font-semibold text-finn-black">
                    {breakdown.numeric.label}: {breakdown.numeric.display} vs{" "}
                    {versus.numeric.display}
                </p>
            )}
        </div>
    );
}

/**
 * The full weighted arithmetic, for anyone who wants to check the result
 * rather than take it on trust.
 */
function ContributionTable({ comparison }: { comparison: HeadToHead }) {
    return (
        <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-xs">
                <thead>
                    <tr className="text-finn-iron">
                        <th className="pb-2 font-black">Priority</th>
                        <th className="pb-2 text-right font-black">Weight</th>
                        <th className="pb-2 text-right font-black">
                            {comparison.subject.name.split(" ")[0]}
                        </th>
                        <th className="pb-2 text-right font-black">
                            {comparison.other.name.split(" ")[0]}
                        </th>
                        <th className="pb-2 text-right font-black">Swing</th>
                    </tr>
                </thead>

                <tbody>
                    {comparison.categories.map((item) => {
                        const swing = item.versus?.weightedDifference ?? 0;

                        return (
                            <tr
                                key={item.priority}
                                className="border-t border-finn-cotton"
                            >
                                <td className="py-2 font-bold text-finn-black">
                                    #{item.rank} {item.label}
                                </td>
                                <td className="py-2 text-right text-finn-iron">
                                    {item.weightPercent}%
                                </td>
                                <td className="py-2 text-right font-mono font-bold text-finn-black">
                                    {item.score}
                                </td>
                                <td className="py-2 text-right font-mono text-finn-iron">
                                    {item.versus?.score ?? "—"}
                                </td>
                                <td
                                    className={[
                                        "py-2 text-right font-mono font-black",
                                        swing > 0
                                            ? "text-finn-accent-blue"
                                            : swing < 0
                                              ? "text-finn-warning"
                                              : "text-finn-iron",
                                    ].join(" ")}
                                >
                                    {swing > 0 ? "+" : ""}
                                    {swing.toFixed(1)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>

                <tfoot>
                    <tr className="border-t-2 border-finn-cotton">
                        <td className="py-2 font-black text-finn-black" colSpan={2}>
                            Overall
                        </td>
                        <td className="py-2 text-right font-mono font-black text-finn-black">
                            {comparison.subject.total}
                        </td>
                        <td className="py-2 text-right font-mono font-black text-finn-iron">
                            {comparison.other.total}
                        </td>
                        <td className="py-2 text-right font-mono font-black text-finn-black">
                            {comparison.totalDifference > 0 ? "+" : ""}
                            {comparison.totalDifference}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}
