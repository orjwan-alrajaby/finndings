import { useEffect, useMemo, useRef, useState } from "react";
import { Download, RotateCw } from "lucide-react";
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
import { BudgetNotice } from "./components/BudgetNotice";
import { ChallengePicker } from "./components/ChallengePicker";
import { CostAnalysis } from "./components/CostAnalysis";
import { HotSeatComparison } from "./components/HotSeatComparison";
import { Tradeoffs } from "./components/Tradeoffs";
import { WhyItWins } from "./components/WhyItWins";
import {
    adviceFileName,
    advicePdfOptions,
    PDF_MARGIN_MM,
    placeLinks,
    type LinkRect,
} from "@/lib/advice-pdf";
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

    /*
     * Saving the page as a file.
     *
     * The work is done in an effect rather than in the click handler,
     * because the capture has to happen *after* React has drawn the export
     * version of the page — the controls hidden, the picker gone. Setting
     * the flag and reading the DOM in the same tick would photograph the
     * screen version and put a row of dead buttons in the PDF.
     *
     * The library is imported at that moment too. It brings html2canvas and
     * jsPDF with it, which together are larger than the rest of this page;
     * loading them when a reader actually asks for a file keeps them out of
     * the cost of opening it.
     */
    const printable = useRef<HTMLDivElement>(null);
    const [exporting, setExporting] = useState(false);

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

    const winnerName = recommendation?.winner.name;

    useEffect(() => {
        if (!exporting || !winnerName) return;

        let alive = true;

        void (async () => {
            try {
                const { default: generatePDF } = await import("react-to-pdf");

                const filename = adviceFileName(winnerName);
                const pdf = await generatePDF(
                    printable,
                    advicePdfOptions(filename),
                );

                if (!pdf) return;

                addLinks(pdf, printable.current);

                await pdf.save(filename, { returnPromise: true });
            } catch (error) {
                console.error("FINN Lens: could not export the PDF", error);
            } finally {
                if (alive) setExporting(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [exporting, winnerName]);

    if (!recommendation) {
        return (
            <div className="px-4 py-12 text-center text-finn-black">
                <div className="mx-auto max-w-xl rounded-[28px] bg-finn-pale-blue p-8">
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
        <div
            ref={printable}
            data-exporting={exporting || undefined}
            className="w-full"
        >
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
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
            </div>

            <button
                type="button"
                onClick={() => setExporting(true)}
                disabled={exporting}
                className="finn-lens-screen-only inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-finn-cotton px-4 text-xs font-black text-finn-black transition-colors hover:bg-finn-pale-blue hover:text-finn-accent-blue disabled:cursor-wait disabled:text-finn-iron"
            >
                {exporting ? (
                    <>
                        <RotateCw className="h-4 w-4 animate-spin" />
                        Building your PDF…
                    </>
                ) : (
                    <>
                        <Download className="h-4 w-4" />
                        Save as PDF
                    </>
                )}
            </button>
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

                {/*
                  * Screen only: it is the control that chooses what the hot
                  * seat holds, and a page of buttons in a PDF is furniture.
                  * Whatever it was pointing at when the reader pressed save
                  * is kept, though — that comparison is below, and it is
                  * part of what they are taking away.
                  */}
                <div className="finn-lens-screen-only">
                    <ChallengePicker
                        options={options}
                        winnerName={winner.name}
                        selectedId={challengerId}
                        onSelect={setChallengerId}
                    />
                </div>

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

/**
 * Re-attaching the page's links to the picture of the page.
 *
 * html2canvas produces pixels, so every anchor in the capture arrives as a
 * button that cannot be pressed. PDF carries link annotations separately
 * from what is drawn, which means the hotspots can simply be laid back over
 * the image where the anchors were.
 *
 * Measured after the capture, while the page is still in its export state:
 * anything hidden for the file reports a zero-sized rect and is dropped on
 * that basis rather than by knowing which elements were hidden and why.
 */
function addLinks(
    pdf: { setPage: (page: number) => void; link: LinkTarget; internal: PdfInternals },
    element: HTMLElement | null,
): void {
    if (!element) return;

    const base = element.getBoundingClientRect();

    const links: LinkRect[] = [
        ...element.querySelectorAll<HTMLAnchorElement>("a[href]"),
    ].map((anchor) => {
        const rect = anchor.getBoundingClientRect();

        return {
            /* `.href` rather than the attribute: already absolute. */
            url: anchor.href,
            x: rect.left - base.left,
            y: rect.top - base.top,
            width: rect.width,
            height: rect.height,
        };
    });

    const placements = placeLinks(links, {
        elementWidth: base.width,
        pageWidth: pdf.internal.pageSize.width,
        pageHeight: pdf.internal.pageSize.height,
        margin: PDF_MARGIN_MM,
    });

    for (const placement of placements) {
        pdf.setPage(placement.page);
        pdf.link(placement.x, placement.y, placement.width, placement.height, {
            url: placement.url,
        });
    }
}

/** Only the parts of jsPDF this file touches. */
type LinkTarget = (
    x: number,
    y: number,
    width: number,
    height: number,
    options: { url: string },
) => void;

interface PdfInternals {
    pageSize: { width: number; height: number };
}
