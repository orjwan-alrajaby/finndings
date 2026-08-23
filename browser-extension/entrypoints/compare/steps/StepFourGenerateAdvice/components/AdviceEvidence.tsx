import {
    ChevronDownIcon,
    ChevronUpIcon,
} from "@heroicons/react/24/outline";
import type { PinnedFinnCar } from "@/lib/types";
import type {
    LensPreferences,
    PriorityReason,
    Tradeoff,
    VehicleScore,
} from "@/lib/reasoning-engine/types";
import { PrioritySection } from "./PrioritySection";
import { TradeoffCard } from "./TradeoffCard";
import { RecommendationRanking } from "./RecommendationRanking";

interface AdviceEvidenceProps {
    reasons: PriorityReason[];
    tradeoffs: Tradeoff[];
    ranked: PinnedFinnCar[];
    scores: VehicleScore[];
    preferences: LensPreferences;
    expanded: boolean;
    onToggleExpanded: () => void;
}

export function AdviceEvidence({
    reasons,
    tradeoffs,
    ranked,
    scores,
    preferences,
    expanded,
    onToggleExpanded,
}: AdviceEvidenceProps) {
    return (
        <div className="rounded-[28px] bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-finn-accent-blue">
                    Why it wins
                </p>

                <h2 className="mt-2 text-2xl font-black">
                    The evidence, in your order.
                </h2>
            </div>

            <div className="space-y-6">
                {reasons.map((reason, index) => (
                    <PrioritySection
                        key={reason.priority}
                        priority={reason.priority}
                        index={index}
                        text={reason.text}
                        evidence={reason.evidence}
                    />
                ))}
            </div>

            {tradeoffs.length > 0 && (
                <section className="mt-8 border-t border-finn-cotton pt-6">
                    <div className="mb-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-finn-warning">
                            Worth knowing
                        </p>

                        <h2 className="mt-2 text-2xl font-black">
                            The compromises that actually matter to you.
                        </h2>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-finn-iron">
                            These are limited to your first three priorities.
                            We deliberately leave unrelated weaknesses out.
                        </p>
                    </div>

                    <div className="space-y-3">
                        {tradeoffs.map((tradeoff) => (
                            <TradeoffCard
                                key={`${tradeoff.priority}-${tradeoff.title}`}
                                title={tradeoff.title}
                                text={tradeoff.text}
                                priority={tradeoff.priority}
                            />
                        ))}
                    </div>
                </section>
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
                            See how the other cars compared
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
                        ranked={ranked}
                        scores={scores}
                        preferences={preferences}
                    />
                )}
            </section>
        </div>
    );
}