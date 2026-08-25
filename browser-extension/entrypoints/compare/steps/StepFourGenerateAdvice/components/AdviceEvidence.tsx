import {
    ChevronDownIcon,
    ChevronUpIcon,
} from "@heroicons/react/24/outline";
import type {
    ReasoningContext,
    VehicleEvaluation,
} from "@/lib/reasoning-engine/types";
import type { AdviceNarrative } from "@/lib/reasoning-engine/narrative";
import { explainVerdict } from "@/lib/reasoning-engine";
import { PrioritySection } from "./PrioritySection";
import { Tradeoffs } from "./Tradeoffs";
import { HeadToHeadSummary } from "./HeadToHeadSummary";
import { RecommendationRanking } from "./RecommendationRanking";

interface AdviceEvidenceProps {
    evaluation: VehicleEvaluation;
    narrative: AdviceNarrative;
    context: ReasoningContext;
    recommendedId: number;
    expanded: boolean;
    onToggleExpanded: () => void;
}

/**
 * The evidence panel for whichever car is currently in the hot seat.
 *
 * The order is the argument: what this car gives the reader for each thing
 * they ranked, then what they're giving up to take it, then the arithmetic
 * for anyone who wants to check it.
 *
 * It reads identically for the recommended car and for one the user picked —
 * the only thing that changes is the framing, which never claims a car won
 * unless it did.
 */
export function AdviceEvidence({
    evaluation,
    narrative,
    context,
    recommendedId,
    expanded,
    onToggleExpanded,
}: AdviceEvidenceProps) {
    const subjectName = evaluation.vehicle.name;

    return (
        <div className="rounded-[28px] bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-finn-accent-blue">
                    {evaluation.isRecommendation
                        ? "Why it wins"
                        : "In the hot seat"}
                </p>

                <h2 className="mt-2 text-2xl font-black">
                    {evaluation.isRecommendation
                        ? "What you told us, and what this car does about it."
                        : `How ${subjectName} measures up.`}
                </h2>

                <p className="mt-2 text-sm font-semibold leading-6 text-finn-black">
                    {explainVerdict(evaluation)}
                </p>

                <div className="mt-2 space-y-2">
                    {narrative.verdict.sentences.map((sentence) => (
                        <p
                            key={sentence}
                            className="text-sm leading-6 text-finn-iron"
                        >
                            {sentence}
                        </p>
                    ))}
                </div>
            </div>

            <div className="space-y-6">
                {narrative.priorities.map((reasoning) => (
                    <PrioritySection
                        key={reasoning.priority}
                        reasoning={reasoning}
                    />
                ))}
            </div>

            <Tradeoffs
                tradeoffs={narrative.tradeoffs}
                isRecommendation={evaluation.isRecommendation}
            />

            {evaluation.comparison && (
                <HeadToHeadSummary comparison={evaluation.comparison} />
            )}

            <section className="mt-8 border-t border-finn-cotton pt-6">
                <button
                    type="button"
                    onClick={onToggleExpanded}
                    className="flex w-full items-center justify-between text-left"
                >
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-finn-iron">
                            Behind the recommendation
                        </p>

                        <p className="mt-1 text-sm font-black">
                            See how every car compared
                        </p>
                    </div>

                    {expanded ? (
                        <ChevronUpIcon className="h-5 w-5 text-finn-iron" />
                    ) : (
                        <ChevronDownIcon className="h-5 w-5 text-finn-iron" />
                    )}
                </button>

                {expanded && (
                    <RecommendationRanking
                        context={context}
                        recommendedId={recommendedId}
                        selectedId={evaluation.vehicle.id}
                        margin={narrative.verdict.margin}
                    />
                )}
            </section>
        </div>
    );
}
