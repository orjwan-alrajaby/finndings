import {
    alternativeOptions,
    buildAdviceNarrative,
    buildRecommendation,
    describeRentalProblem,
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
import { evidenceMet, type EvidenceId } from "./evidence";
import type { Rule } from "./understanding";

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
    /** What the reader ruled out, and what it cost the field. Null when nothing was. */
    ruledOut: {
        evidence: Rule[];
        setAside: number;
        /** True when every car was ruled out, so the ranking ignored the rule. */
        nothingLeft: boolean;
    } | null;
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
    /** Evidence the reader ruled out: those cars are set aside before ranking. */
    ruledOut: Rule[] = [],
): LensRun | null {
    if (!cars.length) return null;

    /*
     * Ruling a car out is not scoring it. Lens has no measure of body type
     * and shouldn't invent one — but someone who says they don't want an SUV
     * has given a constraint, and the honest answer is the best car that
     * isn't one. When nothing survives, everything comes back and the story
     * says so rather than pretending the constraint was met.
     */
    const allowed = ruledOut.length
        ? cars.filter((car) =>
              ruledOut.every((rule) =>
                  rule.mode === "without"
                      ? /* Unknown isn't proof the car has it, so it stays. */
                        evidenceMet(car, rule.id, true) !== false
                      : evidenceMet(car, rule.id, false) === true,
              ),
          )
        : cars;
    const setAside = cars.length - allowed.length;
    const nothingLeft = allowed.length === 0;

    const recommendation = buildRecommendation(
        nothingLeft ? cars : allowed,
        answers.priorities,
        answers.preferences,
        answers.features,
    );

    if (!recommendation) return null;

    return {
        scope,
        scopeHeadline,
        answers,
        ruledOut: ruledOut.length ? { evidence: ruledOut, setAside, nothingLeft } : null,
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
        : recommendation.gearboxFallback === "noneFit"
          ? "Closest match — nothing here is an automatic"
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

/**
 * Alternatives for someone with hard limits: the best-ranked cars that respect
 * them first, and only then the closest ones that don't, flagged as such. The
 * engine's own alternatives are chosen by closeness of score, which is right
 * for the advice page and wrong for "I can't spend more than €500".
 */
export function alternativesWithinLimits(run: LensRun, limit = 3): CarLine[] {
    const { ranked, winner, context } = run.recommendation;

    const within = (car: PinnedFinnCar) => {
        const cost = context.costs[car.id];
        return Boolean(cost) && (cost!.budget == null || cost!.budgetStatus === "within") &&
            (cost!.contract.status === "notSet" || cost!.contract.status === "fits");
    };

    const others = ranked.filter((car) => car.id !== winner.id);

    return [...others.filter(within), ...others.filter((car) => !within(car))]
        .slice(0, limit)
        .map((car) => carLine(run, car));
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
