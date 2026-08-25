import "@/assets/tailwind.css";
import { useEffect, useMemo, useState } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import type { PinnedFinnCar } from "@/lib/types";
import type {
    CategoryId,
    FeatureWeight,
    LensPreferences,
} from "@/lib/reasoning-engine/types";
import {
    buildRecommendation,
    evaluateVehicle,
    hotSeatOptions,
} from "@/lib/reasoning-engine";
import { AdviceHero } from "./components/AdviceHero";
import { AdviceEvidence } from "./components/AdviceEvidence";
import { AdviceSidebar } from "./components/AdviceSidebar";
import { BudgetNotice } from "./components/BudgetNotice";
import { CostAnalysis } from "./components/CostAnalysis";
import { HotSeatPicker } from "./components/HotSeatPicker";

export function StepFourGenerateAdvice({
    cars,
    priorities,
    preferences,
    categoryFeatures,
    onBack,
    onSettings,
}: {
    cars: PinnedFinnCar[];
    priorities: CategoryId[];
    preferences: LensPreferences;
    categoryFeatures: Record<CategoryId, FeatureWeight[]>;
    onBack: () => void;
    onSettings: () => void;
}) {
    const [expanded, setExpanded] = useState(false);

    /*
     * The car currently under examination. This is deliberately separate from
     * the recommendation: selecting another car changes what we explain, never
     * what we recommend.
     */
    const [hotSeatId, setHotSeatId] = useState<number | null>(null);

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

    /* A new comparison run puts the recommendation back in the hot seat. */
    useEffect(() => {
        setHotSeatId(recommendation?.winner.id ?? null);
    }, [recommendation]);

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

    const { context, winner, isFallback, fallbackReason } = recommendation;

    const selected =
        context.ranked.find((car) => car.id === hotSeatId) ?? winner;

    /*
     * The winner's own evaluation is prebuilt on the recommendation, so we
     * only recompute when the user is examining a different car.
     */
    const evaluation =
        selected.id === winner.id
            ? recommendation.evaluation
            : evaluateVehicle(selected, context, {
                  recommendedId: winner.id,
              });

    const options = hotSeatOptions(context, selected.id, winner.id);
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
                            Based on your priorities, your driving assumptions
                            and all {cars.length} pinned cars.
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
                            cost={winnerCost}
                            priorities={context.priorities}
                            isFallback={isFallback}
                            onBack={onBack}
                        />
                    )}

                    <HotSeatPicker
                        options={options}
                        onSelect={setHotSeatId}
                    />

                    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                        <div className="space-y-6">
                            <AdviceEvidence
                                evaluation={evaluation}
                                context={context}
                                recommendedId={winner.id}
                                expanded={expanded}
                                onToggleExpanded={() =>
                                    setExpanded((value) => !value)
                                }
                            />

                            <CostAnalysis analysis={evaluation.cost} />
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
