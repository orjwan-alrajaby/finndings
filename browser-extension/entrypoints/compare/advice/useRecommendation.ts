import { useEffect, useMemo } from "react";

import type { PinnedFinnCar } from "@/lib/types";
import {
    alternativeOptions,
    buildAdviceNarrative,
    buildRecommendation,
    evaluateChallenger,
    reasonAboutChallenge,
} from "@/lib/reasoning-engine";

import { useCompareStore } from "../store";

/**
 * The reasoning both views of this page stand on.
 *
 * The recommendation and the challenge used to be one component, so this was
 * simply the top of it. Splitting them made it the thing they must not each
 * work out for themselves: two `buildRecommendation` calls over the same cars
 * would agree today and be free to disagree the moment either view acquired a
 * filter or a sort of its own — and a page that recommends one car under one
 * tab and challenges a different winner under the next is worse than either
 * mistake alone.
 *
 * The recommendation is fixed. Putting a car in the hot seat changes what is
 * *examined* and never what is recommended.
 */
export function useRecommendation(cars: PinnedFinnCar[]) {
    const priorities = useCompareStore((state) => state.priorities);
    const preferences = useCompareStore((state) => state.preferences);
    const categoryFeatures = useCompareStore((state) => state.features);

    /**
     * The challenger under examination. Null means the recommendation itself.
     * It lives in the store so that it survives a re-render — and now a tab
     * change too, which is the point: a reader who picked a challenger, went
     * back to read the recommendation and returned should find the hot seat as
     * they left it. Changing any answer clears it, because the comparison it
     * described no longer holds.
     */
    const challengerId = useCompareStore((state) => state.challengerId);
    const setChallengerId = useCompareStore((state) => state.setChallengerId);

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

    return useMemo(() => {
        if (!recommendation) return null;

        const { context, winner, alternatives } = recommendation;

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
         * winner, so the two readings can never contradict each other about
         * what the data says.
         */
        const challengerEvaluation = challenger
            ? evaluateChallenger(challenger, recommendation)
            : null;

        return {
            recommendation,
            context,
            winner,
            alternatives,
            winnerNarrative,
            winnerCost: context.costs[winner.id],
            isFallback: recommendation.isFallback,
            fallbackReason: recommendation.fallbackReason,

            challenger,
            challengerEvaluation,
            challengerNarrative: challengerEvaluation
                ? buildAdviceNarrative(challengerEvaluation, context, [
                      winner,
                      ...alternatives,
                  ])
                : null,
            challengeReasoning: challengerEvaluation
                ? reasonAboutChallenge(challengerEvaluation, context)
                : null,

            options: alternativeOptions(
                context,
                alternatives,
                winner,
                challengerId ?? winner.id,
            ),
            setChallengerId,
        };
    }, [recommendation, challengerId, setChallengerId]);
}
