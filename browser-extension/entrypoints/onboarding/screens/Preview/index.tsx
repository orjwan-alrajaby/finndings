import { useMemo } from "react";
import { FlaskConical } from "lucide-react";

import { FinnLink } from "@/components/FinnLink";
import {
    buildAdviceNarrative,
    buildRecommendation,
} from "@/lib/reasoning-engine";
import { CATEGORIES } from "@/lib/reasoning-engine/constants";
import type {
    CategoryId,
    FeatureSelection,
    LensPreferences,
} from "@/lib/reasoning-engine/types";
import { demoCars } from "@/lib/demo-cars";

import { LineUp } from "./LineUp";
import { MiniAdvice } from "./MiniAdvice";

/**
 * The last screen: the advice page in miniature.
 *
 * Three attempts got this wrong in two opposite directions, and both
 * failures are worth naming because the fix is the line between them.
 *
 * First it was a summary in a shape of its own — the same facts, differently
 * arranged. A reader shown one layout here and another on their first real
 * comparison has been taught nothing, and the moment that should feel like
 * recognition feels like meeting a second product.
 *
 * Then it imported the advice page's own components wholesale, which made it
 * the advice page rather than a preview of one: a full hero with a photo
 * panel, every priority expanded with its equipment chips, a sidebar of
 * assumptions. Correct, recognisable, and far too much to meet before you
 * have pinned anything.
 *
 * Then it was cut too hard the other way — two bullet reasons and one
 * tradeoff — which is recognisable and says nothing. The panel it lost was
 * the priority-by-priority walk, and that is the one the whole product turns
 * on: a reader who cannot see Lens take their order apart, item by item, has
 * been shown a ranking with a caption.
 *
 * Where it landed: the real page's sections, in the real page's order, under
 * the real page's own eyebrows — "Why it wins", "The other side of it",
 * "Priority by priority" and "Cost analysis" — laid out two across, each
 * carrying enough of its content to argue rather than label. Recognition comes from the shape and the wording; the restraint is
 * in the depth of each panel, not in which of them survive. What is genuinely
 * not here — the equipment chips under each priority, the hot seat, the
 * weight table — is named at the end, so the preview reads as a subset and
 * the real page still has somewhere to go.
 *
 * Every sentence is `AdviceNarrative`. Nothing here is written for the demo.
 */
export function Preview({
    priorities,
    preferences,
    categoryFeatures,
    saveError,
    onEditPriorities,
}: {
    priorities: CategoryId[];
    preferences: LensPreferences;
    categoryFeatures: Record<CategoryId, FeatureSelection>;
    /** Set when that write failed, so the screen can stop claiming it worked. */
    saveError: boolean;
    /** The hero's own "Change priorities" has to go to the priorities. */
    onEditPriorities: () => void;
}) {
    const cars = useMemo(() => demoCars(), []);

    /*
     * Rebuilt whenever the answers change rather than once, so a reader who
     * steps back to swap their top priority and returns sees a different
     * result — which is the point being demonstrated.
     */
    const result = useMemo(() => {
        const recommendation = buildRecommendation(
            cars,
            priorities,
            preferences,
            categoryFeatures,
        );

        if (!recommendation) return null;

        return {
            recommendation,
            narrative: buildAdviceNarrative(
                recommendation.evaluation,
                recommendation.context,
                recommendation.alternatives,
            ),
        };
    }, [cars, priorities, preferences, categoryFeatures]);

    const topPriority = priorities[0];

    return (
        <div>
            <div className="text-center">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-finn-accent-blue">
                    You're set up
                </p>

                <h1 className="mx-auto mt-3 max-w-2xl text-3xl font-black leading-tight tracking-tight text-finn-black sm:text-4xl">
                    A preview of the advice you'll get
                </h1>

                <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-finn-iron">
                    The real engine, run over three example cars, judged
                    against the order you just set
                    {topPriority
                        ? ` — led by ${CATEGORIES[topPriority]?.label ?? topPriority}`
                        : ""}
                    . This is the shape of the page you'll get — the real one
                    goes deeper on every part of it.
                </p>
            </div>

            <div className="mt-6 flex items-start gap-2 rounded-[20px] bg-finn-warning/10 px-4 py-3 text-left">
                <FlaskConical aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-finn-warning" />

                <p className="text-xs leading-5 text-finn-black">
                    <strong className="font-black">
                        Aveline, Norvane and Halden are not real manufacturers.
                    </strong>{" "}
                    These three cars are examples: their prices, emissions and
                    equipment were written to demonstrate the reasoning, and
                    they are not FINN listings or offers. Nothing here is
                    pinned and nothing is saved to your comparisons.
                </p>
            </div>

            <LineUp cars={cars} winnerId={result?.recommendation.winner.id} />

            {result ? (
                <MiniAdvice
                    recommendation={result.recommendation}
                    narrative={result.narrative}
                    onEditPriorities={onEditPriorities}
                />
            ) : (
                <p className="mt-4 rounded-[28px] bg-white p-6 text-center text-sm text-finn-iron shadow-sm">
                    Choose at least one priority and Lens can show you a
                    worked example here.
                </p>
            )}

            {saveError && (
                <p className="mt-6 rounded-2xl bg-finn-error/10 px-4 py-3 text-center text-xs font-bold text-finn-error">
                    Your answers couldn't be saved to browser storage. Lens
                    will fall back to its defaults — try setting your
                    priorities again from Settings.
                </p>
            )}

            <p className="mx-auto mt-6 max-w-md text-center text-[11px] leading-4 text-finn-iron">
                Pin two or more cars on <FinnLink /> and you'll get this page
                about them. It won't ask you any of this again.
            </p>

        </div>
    );
}
