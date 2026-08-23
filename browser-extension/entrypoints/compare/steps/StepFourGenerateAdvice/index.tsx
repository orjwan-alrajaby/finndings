import "@/assets/tailwind.css";
import { useMemo, useState } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import type { PinnedFinnCar } from "@/lib/types";
import type {
    CategoryId,
    FeatureWeight,
    LensPreferences,
} from "@/lib/reasoning-engine/types";
import { buildRecommendation, filterByBudget } from "@/lib/reasoning-engine";
import { AdviceHero } from "./components/AdviceHero";
import { AdviceEvidence } from "./components/AdviceEvidence";
import { AdviceSidebar } from "./components/AdviceSidebar";
import { NothingFitsBudget } from "./components/NothingFitsBudget";

export function StepFourGenerateAdvice({
    cars,
    priorities,
    preferences,
    categoryFeatures,
    onBack,
}: {
    cars: PinnedFinnCar[];
    priorities: CategoryId[];
    preferences: LensPreferences;
    categoryFeatures: Record<CategoryId, FeatureWeight[]>;
    onBack: () => void;
}) {
    const [expanded, setExpanded] = useState(false);

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

    if (!recommendation) {
        const { overBudget } = filterByBudget(cars, preferences);

        return (
            <NothingFitsBudget
                overBudget={overBudget}
                preferences={preferences}
                onBack={onBack}
            />
        );
    }

    return (
        <Tooltip.Provider delayDuration={350}>
            <main className="min-h-screen bg-finn-snow text-finn-black">
                <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
                    <header className="mb-6">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-finn-accent-blue">
                            FINN Lens · Advice
                        </p>

                        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                            Here’s the car that fits you best.
                        </h1>

                        <p className="mt-2 text-sm text-finn-iron">
                            Based on your priorities, your driving assumptions
                            and all {cars.length} pinned cars.
                        </p>
                    </header>

                    <AdviceHero
                        winner={recommendation.winner}
                        score={recommendation.score}
                        priorities={priorities}
                        preferences={preferences}
                        onBack={onBack}
                    />

                    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                        <AdviceEvidence
                            reasons={recommendation.reasons}
                            tradeoffs={recommendation.tradeoffs}
                            ranked={recommendation.ranked}
                            scores={recommendation.scores}
                            preferences={preferences}
                            expanded={expanded}
                            onToggleExpanded={() =>
                                setExpanded((value) => !value)
                            }
                        />

                        <AdviceSidebar priorities={priorities} />
                    </div>
                </div>
            </main>
        </Tooltip.Provider>
    );
}
