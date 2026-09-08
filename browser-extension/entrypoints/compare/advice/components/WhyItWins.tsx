import type { AdviceNarrative } from "@/lib/reasoning-engine/narrative";
import { PrioritySection } from "./PrioritySection";

/**
 * The "why", in the user's own priority order.
 *
 * The summary at the top is the argument; the sections below are the
 * evidence for it, one per thing the user ranked. Nothing here restates the
 * conclusion — the hero already gave it, and saying it a second time is what
 * made the old page read like a machine looping.
 */
export function WhyItWins({
    narrative,
    subjectName,
    isRecommendation = true,
}: {
    narrative: AdviceNarrative;
    subjectName: string;
    /**
     * False for a car in the hot seat, which has not won anything.
     *
     * Only the label changes. The blue ground and the white priority cards
     * stay, because the challenge tab is meant to read as the same kind of
     * report as the recommendation — one subject, examined the same way — and
     * these sections are the same evidence about the same priorities. What
     * they are not is an endorsement, and the label is what says so.
     */
    isRecommendation?: boolean;
}) {
    const { verdict, priorities } = narrative;

    return (
        /*
          * Blue, because this is the case *for* the car and blue is the
          * colour the page already argues in — the accent on every "why"
          * label, the hero it sits under. The priorities inside it are
          * white cards on that blue, which is the same alternation the
          * whole page runs on: a tinted field, and the evidence lifted off
          * it.
          */
        <section className="rounded-[28px] bg-finn-pale-blue p-6 sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-finn-accent-blue">
                {/*
                  * A budget-driven win didn't out-score anything, so calling
                  * the section "why it wins" would be the page arguing with
                  * the note directly above it.
                  */}
                {!isRecommendation
                    ? "How it measures up"
                    : verdict.budgetNote
                      ? "Why this one"
                      : "Why it wins"}
            </p>

            <h2 className="mt-2 text-2xl font-black">
                What you told us, and what {subjectName} does about it.
            </h2>

            {verdict.reasons.length > 0 && (
                <div className="mt-3 space-y-2">
                    {verdict.reasons.map((reason) => (
                        <p
                            key={reason}
                            className="text-sm font-semibold leading-6 text-finn-black"
                        >
                            {reason}
                        </p>
                    ))}
                </div>
            )}

            <div className="mt-6 space-y-3">
                {priorities.map((reasoning) => (
                    <PrioritySection
                        key={reasoning.priority}
                        reasoning={reasoning}
                    />
                ))}
            </div>
        </section>
    );
}
