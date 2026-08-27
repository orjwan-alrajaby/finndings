import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import type { PinnedFinnCar } from "@/lib/types";
import type { ChallengeLine, ChallengeReasoning } from "@/lib/reasoning-engine/narrative";

/**
 * One alternative, weighed against the recommendation.
 *
 * The heading is deliberately "challenger vs winner" and never the other way
 * round: once a recommendation exists, the only decision on the table is
 * whether to swap, and every sentence here answers that.
 *
 * All prose is composed by the narrative layer from established facts. This
 * component lays it out and does no reasoning of its own.
 */
export function HotSeatComparison({
    reasoning,
    challenger,
}: {
    reasoning: ChallengeReasoning;
    challenger: PinnedFinnCar;
}) {
    const { challengerName, winnerName, gains, losses } = reasoning;

    return (
        <section className="rounded-[28px] bg-white p-6 shadow-sm sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-finn-accent-blue">
                In the hot seat
            </p>

            <h2 className="mt-2 text-2xl font-black">
                {challengerName} vs {winnerName}
            </h2>

            <p className="mt-2 text-sm leading-6 text-finn-iron">
                What you'd gain and lose by taking {challengerName} instead.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <LineColumn
                    title={`What you'd gain`}
                    empty={`${challengerName} doesn't beat ${winnerName} on anything you ranked.`}
                    lines={gains}
                    tone="gain"
                />

                <LineColumn
                    title={`What you'd give up`}
                    empty={`${winnerName} doesn't beat ${challengerName} on anything you ranked.`}
                    lines={losses}
                    tone="loss"
                />
            </div>

            {(reasoning.cost || reasoning.budget) && (
                <div className="mt-4 space-y-2 rounded-[22px] bg-finn-snow p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-finn-iron">
                        What it costs
                    </p>

                    {reasoning.cost && (
                        <p className="text-sm leading-6 text-finn-black">
                            {reasoning.cost}
                        </p>
                    )}

                    {reasoning.budget && (
                        <p className="text-sm leading-6 text-finn-iron">
                            {reasoning.budget}
                        </p>
                    )}
                </div>
            )}

            <div className="mt-4 rounded-[22px] bg-finn-pale-blue p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-finn-accent-blue">
                    Why {winnerName} is still the recommendation
                </p>

                <p className="mt-1.5 text-sm leading-6 text-finn-highlight-navy">
                    {reasoning.verdict}
                </p>
            </div>

            <a
                href={challenger.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-full border-2 border-finn-cotton px-5 py-3 text-xs font-black text-finn-black transition hover:border-finn-iron/40"
            >
                View {challengerName} on FINN
                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </a>
        </section>
    );
}

function LineColumn({
    title,
    empty,
    lines,
    tone,
}: {
    title: string;
    empty: string;
    lines: ChallengeLine[];
    tone: "gain" | "loss";
}) {
    return (
        <div
            className={[
                "rounded-[22px] p-5",
                tone === "gain" ? "bg-finn-pale-blue/60" : "bg-finn-warning/10",
            ].join(" ")}
        >
            <p
                className={[
                    "text-[10px] font-black uppercase tracking-[0.14em]",
                    tone === "gain"
                        ? "text-finn-accent-blue"
                        : "text-finn-warning",
                ].join(" ")}
            >
                {title}
            </p>

            {lines.length === 0 ? (
                <p className="mt-2 text-sm leading-6 text-finn-iron">{empty}</p>
            ) : (
                <ul className="mt-3 space-y-3">
                    {lines.map((line) => (
                        <li key={line.priority}>
                            <p className="text-[11px] font-black uppercase tracking-wide text-finn-iron">
                                {line.label} · your #{line.rank}
                            </p>

                            <p className="mt-0.5 text-sm leading-6 text-finn-black">
                                {line.evidence}
                            </p>

                            <p className="mt-0.5 text-xs leading-5 text-finn-iron">
                                {line.relevance}
                            </p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
