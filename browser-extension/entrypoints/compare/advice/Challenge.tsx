import type { PinnedFinnCar } from "@/lib/types";
import { FinnLink } from "@/components/FinnLink";
import { challengeFileName } from "@/lib/advice-pdf";

import { AdviceSidebar } from "./components/AdviceSidebar";
import { ChallengeHero } from "./components/ChallengeHero";
import { ChallengePicker } from "./components/ChallengePicker";
import { CostAnalysis } from "./components/CostAnalysis";
import { EnergyUse } from "./components/EnergyUse";
import { HotSeatComparison } from "./components/HotSeatComparison";
import { Tradeoffs } from "./components/Tradeoffs";
import { WhyItWins } from "./components/WhyItWins";
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
                        {challenger
                            ? `Would ${challenger.name} suit you better?`
                            : "Would another one suit you better?"}
                    </h1>

                    {/*
                      * The subtitle changes with the state because the page
                      * does. Before a car is chosen this is an invitation;
                      * after, it is a report about one swap, and telling a
                      * reader to "pick a car" underneath a full comparison of
                      * the car they picked reads as though nothing registered.
                      */}
                    <p className="mt-2 text-sm text-finn-iron">
                        {challenger
                            ? `Everything below sets ${challenger.name} against ${winner.name} — judged on the same priorities, mileage, prices and budget. Nothing here changes the recommendation.`
                            : `Pick a car to hold up against ${winner.name}. Nothing here changes the recommendation — it only shows what swapping would gain you and what it would cost.`}
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

            {challenger && challengeReasoning && advice.challengerEvaluation && (
                <ChallengeHero
                    challenger={challenger}
                    winnerName={winner.name}
                    reasoning={challengeReasoning}
                    cost={advice.challengerEvaluation.cost}
                    against={advice.recommendation.evaluation.cost}
                />
            )}

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-6">
                    {/*
                      * Exported along with everything else, which it did not
                      * used to be. It looked like a control — a row of buttons
                      * is furniture in a file — but what it actually holds is
                      * the shortlist: every car close enough to the winner to
                      * be worth weighing, each with its own monthly figure and
                      * the gap to the recommendation, and one of them marked as
                      * the subject of the pages that follow. A report that
                      * compares two cars without saying what else was on the
                      * table has left out the part that makes it a comparison
                      * rather than a coincidence.
                      *
                      * The picker's own "Back to <winner>" control still hides
                      * itself for the file; see `ChallengePicker`.
                      */}
                    <ChallengePicker
                        options={options}
                        winnerName={winner.name}
                        selectedId={challenger?.id ?? null}
                        onSelect={setChallengerId}
                    />

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

                            {/*
                              * The challenger against the reader's own
                              * priorities, in the reader's own order — the
                              * same evidence the recommendation tab lays out
                              * for the winner, and the reason this tab is a
                              * report rather than a diff.
                              *
                              * Not a repeat of the hot seat table above it.
                              * That answers "which of the two is ahead on each
                              * priority", which is a claim about a pair; these
                              * answer "what does this car actually have", which
                              * is a claim about one car and is what a reader
                              * needs before deciding whether being ahead on
                              * something is worth anything.
                              */}
                            <WhyItWins
                                narrative={challengerNarrative}
                                subjectName={challenger.name}
                                isRecommendation={false}
                            />

                            <Tradeoffs
                                tradeoffs={challengerNarrative.tradeoffs}
                                isRecommendation={false}
                                subjectName={challenger.name}
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
