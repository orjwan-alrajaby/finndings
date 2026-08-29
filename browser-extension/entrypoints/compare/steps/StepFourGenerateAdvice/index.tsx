import "@/assets/tailwind.css";
import { useEffect, useMemo } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import type { PinnedFinnCar } from "@/lib/types";
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
import { useCompareStore } from "../../store";

/**
 * The Advice page.
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
 * The step is a reading of the answers held in the compare store, so
 * stepping back to change one and returning re-reads them — and the hot seat
 * is left where the reader had it, unless what it was comparing against has
 * changed underneath it.
 */
export function StepFourGenerateAdvice({
    cars,
    onSettings,
}: {
    cars: PinnedFinnCar[];
    onSettings: () => void;
}) {
    const priorities = useCompareStore((state) => state.priorities);
    const preferences = useCompareStore((state) => state.preferences);
    const categoryFeatures = useCompareStore((state) => state.features);

    /**
     * The challenger under examination. Null means the recommendation
     * itself. It lives in the store so that leaving the step and coming
     * back returns the reader to the comparison they were reading; changing
     * an answer anywhere in the flow clears it, because the comparison it
     * described no longer holds.
     */
    const challengerId = useCompareStore((state) => state.challengerId);
    const setChallengerId = useCompareStore(
        (state) => state.setChallengerId,
    );

    const onBack = useCompareStore((state) => state.back);

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
            <main className="min-h-screen bg-finn-snow px-4 py-12 text-center text-finn-black">
                <div className="mx-auto max-w-xl rounded-[28px] bg-white p-8 shadow-sm">
                    <h1 className="text-2xl font-black">
                        Nothing to evaluate yet
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-finn-iron">
                        Pin a few cars on finn.com and FINN Lens will compare
                        them here.
                    </p>
                </div>
            </main>
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
        <Tooltip.Provider delayDuration={350}>
            <main className="min-h-screen bg-finn-snow text-finn-black">
                <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
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

                    {isFallback && fallbackReason && (
                        <BudgetNotice
                            winner={winner}
                            context={context}
                            reason={fallbackReason}
                            onAdjustSettings={onSettings}
                        />
                    )}

                    {winnerCost && (
                        <AdviceHero
                            evaluation={recommendation.evaluation}
                            narrative={winnerNarrative}
                            cost={winnerCost}
                            priorities={context.priorities}
                            isFallback={isFallback}
                            onBack={onBack}
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
                            onAdjustSettings={onSettings}
                        />
                    </div>
                </div>
            </main>
        </Tooltip.Provider>
    );
}
