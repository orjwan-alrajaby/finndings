import {
    alternativeOptions,
    buildAdviceNarrative,
    buildRecommendation,
    describeRentalProblem,
    getCategory,
} from "@/lib/reasoning-engine";
import { bandForScore } from "@/lib/reasoning-engine/bands";
import { FIT_BANDS, type FitLevel } from "@/lib/reasoning-engine/fit";
import type { AdviceNarrative } from "@/lib/reasoning-engine/narrative";
import { totalFor } from "@/lib/reasoning-engine/scoring";
import type { Recommendation } from "@/lib/reasoning-engine/types";
import type { ScopeKind } from "@/lib/lens-ai/contract";
import { carLabel } from "@/lib/lens-ai/outcome";
import { configurationName } from "@/lib/car-labels";
import type { PinnedFinnCar } from "@/lib/types";

import type { Answers } from "@/entrypoints/compare/store";

/**
 * One run of the real Lens engine over a chat's candidate set, and the
 * readings the chat shows of it.
 *
 * Everything the chat says about a result — the match, the alternatives, "why
 * this car", the comparison — is read off the `Recommendation` and the
 * `AdviceNarrative` the advice page already renders. No model is involved in
 * any of it; a model only ever adds a sentence on top.
 */

export interface LensRun {
    scope: ScopeKind;
    /** "Comparing 12 cars on this page". */
    scopeHeadline: string;
    answers: Answers;
    recommendation: Recommendation;
    narrative: AdviceNarrative;
}

export function runLens(
    cars: PinnedFinnCar[],
    answers: Answers,
    scope: ScopeKind,
    scopeHeadline: string,
): LensRun | null {
    if (!cars.length) return null;

    const recommendation = buildRecommendation(
        cars,
        answers.priorities,
        answers.preferences,
        answers.features,
    );

    if (!recommendation) return null;

    return {
        scope,
        scopeHeadline,
        answers,
        recommendation,
        narrative: buildAdviceNarrative(
            recommendation.evaluation,
            recommendation.context,
            recommendation.alternatives,
        ),
    };
}

/* -------------------------------------------------------------------------- */
/* The match                                                                  */
/* -------------------------------------------------------------------------- */

export interface CarLine {
    id: number;
    name: string;
    configuration: string;
    image: string | null;
    total: number;
    band: FitLevel;
    bandLabel: string;
    monthly: number;
    costComplete: boolean;
    budget: "within" | "over" | "unknown" | "notSet";
    rental: "fits" | "doesNotFit" | "unknown" | "notSet";
    /** Why it doesn't fit the rental period, when it doesn't. */
    rentalProblem: string | null;
}

function carLine(run: LensRun, car: PinnedFinnCar): CarLine {
    const { context, scores } = run.recommendation;
    const score = scores.find((item) => item.vehicleId === car.id);
    const cost = context.costs[car.id];
    const total = totalFor(scores, car.id);
    const band: FitLevel = score?.judgeable ? bandForScore(total) : "unknown";

    return {
        id: car.id,
        name: carLabel(car, context.vehicles),
        configuration: configurationName(car),
        image: car.images?.thumbnail || null,
        total,
        band,
        bandLabel: FIT_BANDS[band].label,
        monthly: cost?.totalMonthly ?? 0,
        costComplete: cost?.complete ?? false,
        budget: cost?.budget == null ? "notSet" : cost.budgetStatus,
        rental: cost?.contract.status ?? "notSet",
        rentalProblem: cost ? describeRentalProblem(cost.contract) : null,
    };
}

export interface MatchSummary {
    eyebrow: string;
    car: CarLine;
    /** The engine's first reason, in the words the advice page uses. */
    reason: string | null;
    /** The one note that qualifies the verdict: budget, closeness, missing data. */
    note: string | null;
    tradeoff: { headline: string; text: string } | null;
    /** The FINN term the price is on, and months past the reader's period. */
    term: { months: number; extraMonths: number | null } | null;
    alternatives: (CarLine & { hook: string | null; costDifference: number | null })[];
    candidateCount: number;
    singleCar: boolean;
}

export function summariseMatch(run: LensRun): MatchSummary {
    const { recommendation, narrative } = run;
    const { winner, alternatives, context } = recommendation;
    const singleCar = context.vehicles.length === 1;
    const contract = context.costs[winner.id]?.contract;

    const eyebrow = singleCar
        ? "How this car fits you"
        : recommendation.rentalFallback === "noneFit"
          ? "Closest match — nothing here fits your rental period"
          : recommendation.isFallback
            ? "Closest match — nothing here fits your budget"
            : "Your Lens match";

    const [tradeoff] = narrative.tradeoffs;

    return {
        eyebrow,
        car: carLine(run, winner),
        reason: narrative.verdict.reasons[0] ?? null,
        note:
            narrative.verdict.budgetNote ??
            narrative.verdict.marginNote ??
            narrative.verdict.dependsNote ??
            null,
        tradeoff: tradeoff
            ? { headline: tradeoff.headline, text: tradeoff.sentences[0] ?? tradeoff.evidence }
            : null,
        term: contract?.term
            ? { months: contract.term.months, extraMonths: contract.extraMonths }
            : null,
        alternatives: alternativeOptions(context, alternatives, winner, winner.id)
            .slice(0, 3)
            .map((option) => ({
                ...carLine(run, option.vehicle),
                hook: option.hook,
                costDifference: option.costDifference,
            })),
        candidateCount: context.vehicles.length,
        singleCar,
    };
}

/* -------------------------------------------------------------------------- */
/* Why                                                                        */
/* -------------------------------------------------------------------------- */

export interface WhyExplanation {
    carName: string;
    /** What the reader said in this conversation, oldest first. */
    toldMe: string[];
    /** What Lens understood from it, when an interpretation was used. */
    understood: string | null;
    prioritised: { rank: number; label: string; percent: number; icon: string }[];
    matched: string[];
    tradeoffs: string[];
    caveats: string[];
}

/**
 * "Why this car?" as the chain the product is built on: what the reader said,
 * what Lens took from it, the order it weighed, what this car did about each,
 * and what taking it costs.
 */
export function explainWhy(
    run: LensRun,
    story: { toldMe: string[]; understood: string | null },
): WhyExplanation {
    const { recommendation, narrative } = run;
    const { context } = recommendation;
    const winner = recommendation.winner;

    /*
     * The verdict's reasons already summarise the top priorities — one each —
     * so the per-priority sentences only add the ones those don't cover.
     * Taking both repeated the same equipment twice in different words.
     */
    const matched = [
        ...narrative.verdict.reasons,
        ...narrative.priorities
            .slice(narrative.verdict.reasons.length, 3)
            .map((priority) => priority.sentences[0])
            .filter((sentence): sentence is string => Boolean(sentence)),
    ];

    const tradeoffs = narrative.tradeoffs.length
        ? narrative.tradeoffs.slice(0, 2).map((item) => item.sentences.join(" ") || item.evidence)
        : context.vehicles.length === 1
          ? ["There's nothing to weigh it against here — switch to the cars on this page or your pinned cars to see what you'd give up."]
          : ["Nothing you ranked comes out meaningfully worse on this car than on the alternatives closest to it."];

    const contract = context.costs[winner.id]?.contract;
    const rentalProblem = contract ? describeRentalProblem(contract) : null;

    const caveats = [
        narrative.verdict.budgetNote,
        narrative.verdict.marginNote,
        narrative.verdict.dependsNote,
        rentalProblem ? `${winner.name} ${rentalProblem}.` : null,
        ...narrative.unsupported.map(
            (priority) => `FINN's data doesn't say enough to judge ${priority.label} for this car.`,
        ),
    ].filter((item): item is string => Boolean(item));

    return {
        carName: carLabel(winner, context.vehicles),
        toldMe: story.toldMe,
        understood: story.understood,
        prioritised: context.weights.map((weight) => ({
            rank: weight.rank,
            label: getCategory(weight.priority)?.label ?? weight.priority,
            percent: weight.weightPercent,
            icon: getCategory(weight.priority)?.icon ?? "car",
        })),
        matched: [...new Set(matched)].slice(0, 4),
        tradeoffs,
        caveats,
    };
}

/* -------------------------------------------------------------------------- */
/* Comparison                                                                 */
/* -------------------------------------------------------------------------- */

/** The ranked candidates, best first, as far as a compact table has room for. */
export function compareRows(run: LensRun, limit = 8): (CarLine & { isMatch: boolean; rank: number })[] {
    const { ranked, winner } = run.recommendation;

    /* The match first, whatever its raw rank — the budget or rental period may have moved it. */
    const ordered = [winner, ...ranked.filter((car) => car.id !== winner.id)];

    return ordered.slice(0, limit).map((car) => ({
        ...carLine(run, car),
        isMatch: car.id === winner.id,
        rank: ranked.findIndex((item) => item.id === car.id) + 1,
    }));
}
