import { useEffect, useMemo } from "react";
import type { PinnedFinnCar } from "@/lib/types";
import { FinnLink } from "@/components/FinnLink";
import {
    alternativeOptions,
    buildAdviceNarrative,
    buildRecommendation,
    evaluateChallenger,
    reasonAboutChallenge,
} from "@/lib/reasoning-engine";
import { AdviceHero } from "./components/AdviceHero";
import { AdviceSidebar } from "./components/AdviceSidebar";
import { BehindTheRecommendation } from "./components/BehindTheRecommendation";
import { BudgetNotice } from "./components/BudgetNotice";
import { ChallengePicker } from "./components/ChallengePicker";
import { CostAnalysis } from "./components/CostAnalysis";
import { HotSeatComparison } from "./components/HotSeatComparison";
import { Tradeoffs } from "./components/Tradeoffs";
import { WhyItWins } from "./components/WhyItWins";
import { markAdviceSeen } from "@/lib/onboarding";
import { useCompareStore } from "../store";

/**
 * The Advice page, which is now the whole of the compare page.
 *
 * There used to be three steps in front of this one — the priority order,
 * the feature picks, the driving assumptions — and a reader wanting to see
 * what Lens made of their pinned cars paid for them every time. They are all
 * in the drawer now, beside the answer they change, because none of them can
 * be judged before the answer exists.
 *
 * The order of the sections is the argument, and it follows the order a
 * reader asks the questions in:
 *
 *   1. Which car?                    — the hero
 *   2. Why that one?                 — why it wins, in their priority order
 *   3. What am I giving up?          — the tradeoffs
 *   4. What else could I have had?   — the four closest alternatives
 *   5. What does it cost, exactly?   — the cost breakdown
 *   6. Can I check the maths?        — behind the recommendation
 *
 * The recommendation is fixed. Putting a car in the hot seat changes what is
 * *examined* and never what is recommended.
 *
 * Everything here is a reading of the answers held in the compare store, so
 * a change made in the drawer re-reasons the page under the reader's hands.
 * The hot seat is emptied by any such change, because the comparison it was
 * describing no longer holds.
 */
export function Advice({
    cars,
    onAdjust,
}: {
    cars: PinnedFinnCar[];
    /** Opens the drawer, which is where every input to this page lives. */
    onAdjust: () => void;
}) {
    /*
     * Reaching this page is the moment the product actually happens, and the
     * getting-started checklist in the popup has nothing left to tell a
     * reader who has. Recorded here rather than on the button that leads
     * here, because there is more than one way in.
     */
    useEffect(() => {
        void markAdviceSeen();
    }, []);

    const priorities = useCompareStore((state) => state.priorities);
    const preferences = useCompareStore((state) => state.preferences);
    const categoryFeatures = useCompareStore((state) => state.features);

    /**
     * The challenger under examination. Null means the recommendation
     * itself. It lives in the store so that it survives a re-render;
     * changing any answer clears it, because the comparison it described no
     * longer holds.
     */
    const challengerId = useCompareStore((state) => state.challengerId);
    const setChallengerId = useCompareStore(
        (state) => state.setChallengerId,
    );

    const recommendation = useMemo(
        () =>
            buildRecommendation(
                cars,
                priorities,
                preferences,
                categoryFeatures,
            ),
        [cars, priorities, preferences, categoryFeatures],
    );

    /*
     * The pinned set can change under the page — a car unpinned in another
     * tab. If the hot seat was holding that car, empty it.
     */
    useEffect(() => {
        const stillOffered = recommendation?.alternatives.some(
            (car) => car.id === challengerId,
        );

        if (challengerId != null && !stillOffered) {
            setChallengerId(null);
        }
    }, [recommendation, challengerId, setChallengerId]);

    if (!recommendation) {
        return (
            <div className="px-4 py-12 text-center text-finn-black">
                <div className="mx-auto max-w-xl rounded-[28px] bg-white p-8 shadow-sm">
                    <h1 className="text-2xl font-black">
                        Nothing to evaluate yet
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-finn-iron">
                        Pin a few cars on <FinnLink /> and FINN Lens will compare
                        them here.
                    </p>
                </div>
            </div>
        );
    }

    const { context, winner, alternatives, isFallback, fallbackReason } =
        recommendation;

    const winnerNarrative = buildAdviceNarrative(
        recommendation.evaluation,
        context,
        alternatives,
    );

    const challenger =
        challengerId == null
            ? null
            : (alternatives.find((car) => car.id === challengerId) ?? null);

    /*
     * The challenger is evaluated inside the same comparison set as the
     * winner, so the two readings can never contradict each other about what
     * the data says.
     */
    const challengerEvaluation = challenger
        ? evaluateChallenger(challenger, recommendation)
        : null;

    const challengerNarrative = challengerEvaluation
        ? buildAdviceNarrative(challengerEvaluation, context, [
              winner,
              ...alternatives,
          ])
        : null;

    const challengeReasoning = challengerEvaluation
        ? reasonAboutChallenge(challengerEvaluation, context)
        : null;

    /* Whichever car the cost panel and the ranking are currently describing. */
    const subject = challengerEvaluation ?? recommendation.evaluation;
    const subjectNarrative = challengerNarrative ?? winnerNarrative;

    const options = alternativeOptions(
        context,
        alternatives,
        winner,
        challengerId ?? winner.id,
    );

    const winnerCost = context.costs[winner.id];

    return (
        <div className="w-full">
        <header className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-finn-accent-blue">
                FINN Lens · Advice
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Here's the car that fits you best.
            </h1>

            <p className="mt-2 text-sm text-finn-iron">
                Judged on your priorities, your driving assumptions
                and your budget, across all {cars.length} cars you
                pinned.
            </p>
        </header>

        {winnerCost && (
            <AdviceHero
                evaluation={recommendation.evaluation}
                narrative={winnerNarrative}
                cost={winnerCost}
                priorities={context.priorities}
                isFallback={isFallback}
                onAdjust={onAdjust}
            />
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
                <WhyItWins
                    narrative={winnerNarrative}
                    subjectName={winner.name}
                />

                <Tradeoffs
                    tradeoffs={winnerNarrative.tradeoffs}
                    isRecommendation
                    subjectName={winner.name}
                />

                <ChallengePicker
                    options={options}
                    winnerName={winner.name}
                    selectedId={challengerId}
                    onSelect={setChallengerId}
                />

                {challengeReasoning && challenger && (
                    <HotSeatComparison
                        reasoning={challengeReasoning}
                        challenger={challenger}
                    />
                )}

                <CostAnalysis
                    analysis={subject.cost}
                    reasoning={subjectNarrative.cost}
                />

                <BehindTheRecommendation
                    context={context}
                    recommendedId={winner.id}
                    selectedId={subject.vehicle.id}
                    margin={winnerNarrative.verdict.margin}
                    comparison={subject.comparison}
                    weights={context.weights}
                />
            </div>

            <AdviceSidebar
                weights={context.weights}
                preferences={preferences}
                onAdjust={onAdjust}
                notice={
                    isFallback && fallbackReason ? (
                        <BudgetNotice
                            winner={winner}
                            context={context}
                            reason={fallbackReason}
                            onAdjust={onAdjust}
                        />
                    ) : null
                }
            />
        </div>
    </div>
    );
}
