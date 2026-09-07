import { Scale } from "lucide-react";
import type { Tradeoff } from "@/lib/reasoning-engine/narrative";

/**
 * What the reader is accepting in exchange.
 *
 * This is the other half of the recommendation, not a disclaimer at the
 * bottom of the page: "why it wins" says what the choice bought, and this
 * says what it cost. It sits directly under that reasoning and is written in
 * the same voice.
 *
 * Every item is already relevance-filtered by the narrative layer — each one
 * traces back to a priority the user ranked or the budget they set. Nothing
 * is listed merely because it is true.
 */
export function Tradeoffs({
    tradeoffs,
    isRecommendation,
    subjectName,
}: {
    tradeoffs: Tradeoff[];
    isRecommendation: boolean;
    subjectName: string;
}) {
    return (
        /*
          * Amber, the hue this section's own label already carries, so "the
          * other side of it" is told apart from the case for it before a
          * word is read. The deep shade for the label: the brand's signal
          * amber manages 1.9:1 on its own tint.
          */
        <section className="rounded-[28px] bg-finn-warning/10 p-6 sm:p-8">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-finn-warning-deep">
                <Scale aria-hidden="true" className="h-3.5 w-3.5" />
                The other side of it
            </p>

            <h2 className="mt-2 text-2xl font-black">
                {isRecommendation
                    ? "What you're giving up to take this one."
                    : `What ${subjectName} would cost you.`}
            </h2>

            {tradeoffs.length === 0 ? (
                <p className="mt-3 text-sm leading-6 text-finn-iron">
                    Nothing you ranked comes out meaningfully worse on this car
                    than on the alternatives closest to it, and it fits the
                    budget you set. Change your priority order and that may
                    stop being true.
                </p>
            ) : (
                <>
                    <p className="mt-2 text-sm leading-6 text-finn-iron">
                        Only the compromises that answer to something you told
                        us — a priority you ranked, a feature you gave extra
                        influence, or the budget you set. A feature you picked
                        and this car lacks was never a requirement; it's here
                        so you can weigh it yourself.
                    </p>

                    <div className="mt-4 space-y-3">
                        {tradeoffs.map((tradeoff) => (
                            <article
                                key={`${tradeoff.kind}-${tradeoff.priority ?? "budget"}`}
                                className={[
                                    "rounded-[22px] p-5",
                                    /*
                                      * On an amber field the severe ones are
                                      * the coloured ones: gold sits heavier
                                      * than the ground, white lifts off it.
                                      * Before the inversion this was the
                                      * other way round and both read as
                                      * panels.
                                      */
                                    tradeoff.severity === "high"
                                        ? "bg-finn-warning-lift/70"
                                        : "bg-white",
                                ].join(" ")}
                            >
                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                    <h3 className="text-base font-black text-finn-black">
                                        {tradeoff.headline}
                                    </h3>

                                    {tradeoff.priorityLabel && tradeoff.rank && (
                                        <span className="text-[10px] font-black uppercase tracking-wide text-finn-iron">
                                            {tradeoff.priorityLabel} · your #
                                            {tradeoff.rank}
                                        </span>
                                    )}
                                </div>

                                <div className="mt-2 space-y-2">
                                    {tradeoff.sentences.map((sentence) => (
                                        <p
                                            key={sentence}
                                            className="text-sm leading-6 text-finn-iron"
                                        >
                                            {sentence}
                                        </p>
                                    ))}
                                </div>
                            </article>
                        ))}
                    </div>
                </>
            )}
        </section>
    );
}
