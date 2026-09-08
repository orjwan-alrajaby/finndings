import type { PinnedFinnCar } from "@/lib/types";
import { FinnLink } from "@/components/FinnLink";
import { challengeFileName } from "@/lib/advice-pdf";

import { AdviceSidebar } from "./components/AdviceSidebar";
import { ChallengePicker } from "./components/ChallengePicker";
import { CostAnalysis } from "./components/CostAnalysis";
import { EnergyUse } from "./components/EnergyUse";
import { HotSeatComparison } from "./components/HotSeatComparison";
import { ExportButton, usePdfExport } from "./usePdfExport";
import { useRecommendation } from "./useRecommendation";

/**
 * One alternative, weighed against the recommendation.
 *
 * This was the bottom half of the advice page, and it did not belong there.
 * A single page that recommends a car and then argues for a different one has
 * no answer to "what is this page about" — the subject moved with a control
 * halfway down it, so the cost section could be describing either car
 * depending on where the reader had last clicked. The PDF made it plain: the
 * export flattened both halves into one document, and a reader sending it on
 * could not say which car it was for.
 *
 * Split out, each side has one subject. The recommendation tab is the winner
 * throughout; this one is the comparison throughout, exports its own file
 * named for both cars, and can say "instead" in every sentence without
 * ambiguity.
 *
 * The recommendation is fixed. Nothing on this tab changes what is
 * recommended — only what is being held up against it.
 *
 * The reader's choice of challenger lives in the compare store rather than in
 * this component, so leaving for the recommendation and coming back finds the
 * hot seat as they left it.
 */
export function Challenge({
    cars,
    onAdjust,
}: {
    cars: PinnedFinnCar[];
    /** Opens the drawer, which is where every input to this page lives. */
    onAdjust: () => void;
}) {
    const advice = useRecommendation(cars);

    const { printable, exporting, start } = usePdfExport(
        advice?.challenger
            ? challengeFileName(advice.challenger.name, advice.winner.name)
            : null,
    );

    if (!advice) {
        return (
            <Empty title="Nothing to compare yet">
                Pin a few cars on <FinnLink /> and Finn Lens will weigh them
                against each other here.
            </Empty>
        );
    }

    const {
        context,
        winner,
        challenger,
        challengerNarrative,
        challengeReasoning,
        options,
        setChallengerId,
    } = advice;

    /*
     * One pinned car is a recommendation with nothing to challenge it. Said
     * here rather than by hiding the tab: a tab that appears and disappears as
     * cars are pinned is harder to trust than one that explains itself.
     */
    if (!options.length) {
        return (
            <Empty title="Only one car to go on">
                There is nothing to hold up against{" "}
                <span className="font-black">{winner.name}</span> yet. Pin
                another car on <FinnLink /> and it can be weighed against the
                recommendation here.
            </Empty>
        );
    }

    return (
        <div
            ref={printable}
            data-exporting={exporting || undefined}
            className="w-full"
        >
            <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-finn-accent-blue">
                        Finn Lens · Challenge
                    </p>

                    <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                        Would another one suit you better?
                    </h1>

                    <p className="mt-2 text-sm text-finn-iron">
                        Pick a car to hold up against{" "}
                        {winner.name}. Nothing here changes the
                        recommendation — it only shows what swapping would gain
                        you and what it would cost.
                    </p>
                </div>

                {/*
                  * Only once there is a comparison to save. A file of an empty
                  * picker is a page of furniture.
                  */}
                {challenger && (
                    <ExportButton exporting={exporting} onExport={start} />
                )}
            </header>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-6">
                    {/*
                      * Screen only: it is the control that chooses what the hot
                      * seat holds, and a page of buttons in a PDF is furniture.
                      * Whatever it was pointing at when the reader pressed save
                      * is kept, though — that comparison is below it, and it is
                      * what they are taking away.
                      */}
                    <div className="finn-lens-screen-only">
                        <ChallengePicker
                            options={options}
                            winnerName={winner.name}
                            selectedId={challenger?.id ?? null}
                            onSelect={setChallengerId}
                        />
                    </div>

                    {challenger && challengeReasoning && challengerNarrative ? (
                        <>
                            <HotSeatComparison
                                reasoning={challengeReasoning}
                                challenger={challenger}
                            />

                            {/*
                              * Both sections describe the challenger and both
                              * carry the winner's figures beside them, which is
                              * the whole point of this tab: the question is not
                              * what this car costs but whether swapping to it
                              * costs more.
                              */}
                            <CostAnalysis
                                analysis={
                                    advice.challengerEvaluation?.cost ??
                                    advice.recommendation.evaluation.cost
                                }
                                reasoning={challengerNarrative.cost}
                                against={{
                                    name: winner.name,
                                    analysis:
                                        advice.recommendation.evaluation.cost,
                                }}
                            />

                            <EnergyUse
                                car={challenger}
                                against={{ name: winner.name, car: winner }}
                            />
                        </>
                    ) : (
                        <p className="rounded-[28px] bg-finn-snow p-6 text-sm leading-6 text-finn-iron sm:p-8">
                            Choose one of the cars above and Lens will set it
                            against {winner.name} — what you'd gain, what you'd
                            give up, and what the swap would do to the monthly
                            bill.
                        </p>
                    )}
                </div>

                <AdviceSidebar
                    weights={context.weights}
                    preferences={context.preferences}
                    onAdjust={onAdjust}
                    notice={null}
                />
            </div>
        </div>
    );
}

function Empty({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="px-4 py-12 text-center text-finn-black">
            <div className="mx-auto max-w-xl rounded-[28px] bg-finn-pale-blue p-8">
                <h1 className="text-2xl font-black">{title}</h1>

                <p className="mt-2 text-sm leading-6 text-finn-iron">
                    {children}
                </p>
            </div>
        </div>
    );
}
