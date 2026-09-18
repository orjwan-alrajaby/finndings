import { describeRentalProblem, formatEUR, monthLabel } from "@/lib/reasoning-engine";
import { bandForScore } from "@/lib/reasoning-engine/bands";
import { FIT_BANDS, type FitLevel } from "@/lib/reasoning-engine/fit";
import { totalFor } from "@/lib/reasoning-engine/scoring";
import type { WireQuestion } from "@/lib/lens-ai/contract";
import { carLabel } from "@/lib/lens-ai/outcome";
import type { PinnedFinnCar } from "@/lib/types";

import { EVIDENCE, measuredDisplay, readEvidence, type EvidenceId } from "./evidence";

/** How a measured figure is introduced, and what to say when FINN has none. */
const MEASURED_LEAD: Partial<Record<EvidenceId, string>> = {
    compactLength: "It's",
    compactWidth: "It's",
    bootVolume: "It has",
    electricRange: "It has",
};

/** Said next to the figure, because FINN's own field is ambiguous. */
const MEASURED_CAVEAT: Partial<Record<EvidenceId, string>> = {
    bootVolume: "FINN doesn't say whether that's with the rear seats up or folded.",
};

const MEASURED_UNKNOWN: Partial<Record<EvidenceId, string>> = {
    bootVolume: "FINN doesn't publish a boot figure for this car.",
    electricRange: "It isn't electric, so FINN publishes no range for it.",
};
import type { LensRun } from "./run";
import { budgetCeiling } from "./understanding";
import type { Need, Understanding } from "./understanding";

/**
 * "Why this car fits the situation you described", from the engine's result.
 *
 * Organised around what the person told Lens, not around priority weights:
 * their hard constraints first, then each of their needs with what FINN
 * actually lists on this car and what that could mean for them, then the one
 * compromise most worth knowing. Every fact is read off the car. The only
 * words a model contributed are a need's label and each evidence's `use` —
 * the implication — and those are only shown next to a fact that holds.
 */

export type Tone = "good" | "missing" | "unknown" | "note";

export interface StoryLine {
    tone: Tone;
    text: string;
}

export interface StorySection {
    key: string;
    title: string;
    /** The need or constraint in the person's terms, for "You needed". */
    short: string;
    kind: "budget" | "rental" | "need";
    importance: Need["importance"] | "constraint";
    lines: StoryLine[];
    /** One line for the compact "Lens found" summary. */
    summary: string;
    tone: Tone;
}

export interface FitStory {
    eyebrow: string;
    carName: string;
    band: FitLevel;
    bandLabel: string;
    /** What the band means, in human terms. */
    bandMeaning: string;
    sections: StorySection[];
    catch: { text: string; alternative: string | null } | null;
    /** What Lens still needs to know, if the conversation left something open. */
    stillToKnow: WireQuestion | null;
}

const BAND_MEANING: Record<FitLevel, string> = {
    strong: "it covers what Lens could check for you well",
    good: "it covers most of what Lens could check for you, with some gaps",
    partial: "it covers some of what Lens could check for you, with clear gaps",
    limited: "it misses much of what Lens could check for you",
    unknown: "FINN's data on it is too thin for Lens to judge it confidently",
};

/* "Blind spot warning" → "blind spot warning", but never "I" → "i" or "ISOFIX" → "iSOFIX". */
const lower = (value: string) =>
    /^(I\b|[A-Z]{2,})/.test(value) ? value : value.charAt(0).toLowerCase() + value.slice(1);

const sentence = (value: string) => {
    const trimmed = value.trim().replace(/[.;,]+$/, "");
    return trimmed ? `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}.` : "";
};

const dayLabel = (iso: string) => {
    const date = new Date(`${iso}T00:00:00Z`);
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
};

/** Within the reader's hard constraints, as far as Lens can confirm. */
function isValid(run: LensRun, car: PinnedFinnCar): boolean {
    const cost = run.recommendation.context.costs[car.id];
    if (!cost) return false;

    const budgetOk = cost.budget == null || cost.budgetStatus === "within";
    const rentalOk = cost.contract.status === "notSet" || cost.contract.status === "fits";

    return budgetOk && rentalOk;
}

function evidenceLine(car: PinnedFinnCar, entry: { id: EvidenceId; use: string }): StoryLine {
    const def = EVIDENCE[entry.id];
    const state = readEvidence(car, entry.id);
    const measured = measuredDisplay(car, entry.id);

    /*
     * A figure FINN publishes is worth quoting whichever way it falls: "4.68 m
     * long" is the honest answer for a car that isn't small, where "FINN
     * doesn't list compact length" would read as missing data.
     */
    if (measured) {
        return {
            tone: state === "listed" ? "good" : "note",
            text:
                sentence(`${MEASURED_LEAD[entry.id] ?? "It's"} ${measured}${state === "listed" && entry.use ? ` — ${entry.use}` : ""}`) +
                (MEASURED_CAVEAT[entry.id] ? ` ${MEASURED_CAVEAT[entry.id]}` : ""),
        };
    }

    if (state === "unknown" && MEASURED_LEAD[entry.id]) {
        return { tone: "unknown", text: MEASURED_UNKNOWN[entry.id]! };
    }

    if (state === "listed") {
        return { tone: "good", text: sentence(`${def.label} ${entry.use ? `— ${entry.use}` : "is listed"}`) };
    }

    if (state === "notListed") {
        return { tone: "missing", text: `FINN doesn't list ${lower(def.label)} for this car.` };
    }

    return { tone: "unknown", text: `FINN doesn't say whether it has ${lower(def.label)}.` };
}

export function tellFitStory(
    run: LensRun,
    u: Understanding,
    lessRelevant: EvidenceId[],
    stillToKnow: WireQuestion | null,
): FitStory {
    const { recommendation, narrative } = run;
    const { winner, context } = recommendation;
    const cars = context.vehicles;
    const name = (car: PinnedFinnCar) => carLabel(car, cars);
    const cost = context.costs[winner.id];
    const score = recommendation.scores.find((item) => item.vehicleId === winner.id);
    const total = totalFor(recommendation.scores, winner.id);
    const band: FitLevel = score?.judgeable ? bandForScore(total) : "unknown";
    const single = cars.length === 1;

    const sections: StorySection[] = [];

    /* -- The budget ------------------------------------------------------ */

    if (u.budget && cost) {
        const monthly = cost.totalMonthly;
        const lines: StoryLine[] = [];
        let tone: Tone = "good";
        let title: string;

        if (u.budget.kind === "hardMax") {
            if (cost.budgetStatus === "within") {
                title = `It stays within your ${formatEUR(u.budget.monthly)} limit`;
                lines.push({ tone: "good", text: `At about ${formatEUR(monthly)}/month, it respects the maximum you gave me.` });
            } else if (cost.budgetStatus === "unknown") {
                tone = "unknown";
                title = `It may fit your ${formatEUR(u.budget.monthly)} limit`;
                lines.push({ tone: "unknown", text: `What Lens can estimate comes to ${formatEUR(monthly)}/month, but part of the cost is missing, so it can't confirm the car stays under your maximum.` });
            } else {
                tone = "missing";
                title = `Nothing here stays within ${formatEUR(u.budget.monthly)}`;
                lines.push({ tone: "missing", text: `This is the closest match, at about ${formatEUR(monthly)}/month — ${formatEUR(monthly - u.budget.monthly)} over the maximum you gave me.` });
            }

            const top = recommendation.topScorer;
            const topCost = context.costs[top.id];

            if (recommendation.budgetChangedTheAnswer && top.id !== winner.id && topCost?.budgetStatus === "over") {
                lines.push({
                    tone: "note",
                    text: `${name(top)} scores higher overall, but at about ${formatEUR(topCost.totalMonthly)}/month it breaks your maximum, so I treated it as outside your options.`,
                });
            }
        } else {
            /*
             * A soft figure still draws a line — see `budgetCeiling`. Saying
             * where it was drawn is the difference between "you said around
             * €600" and a €1,353 car turning up as the answer.
             */
            const gap = monthly - u.budget.monthly;
            const ceiling = budgetCeiling(u.budget);
            const beyond = monthly > ceiling;

            tone = beyond ? "missing" : gap > 0 ? "note" : "good";
            title = beyond
                ? `Nothing here comes near the ${formatEUR(u.budget.monthly)} you mentioned`
                : gap > 0
                  ? `A little above the ${formatEUR(u.budget.monthly)} you mentioned`
                  : `Within the ${formatEUR(u.budget.monthly)} you mentioned`;
            lines.push({
                tone,
                text: beyond
                    ? `The closest match costs about ${formatEUR(monthly)}/month — ${formatEUR(gap)} above it. Lens stretched to ${formatEUR(ceiling)} for a figure you called a target, and nothing here fits even that.`
                    : `About ${formatEUR(monthly)}/month${Math.abs(gap) >= 1 ? ` — ${formatEUR(Math.abs(gap))} ${gap > 0 ? "above" : "below"} it` : ""}. You called it a figure to aim at rather than a limit, so Lens looked at cars up to about ${formatEUR(ceiling)} and no further.`,
            });
        }

        sections.push({
            key: "budget",
            title,
            short: u.budget.kind === "hardMax" ? `${formatEUR(u.budget.monthly)}/month maximum` : `Around ${formatEUR(u.budget.monthly)}/month`,
            kind: "budget",
            importance: "constraint",
            lines,
            summary: `About ${formatEUR(monthly)}/month`,
            tone,
        });
    }

    /* -- The rental period ----------------------------------------------- */

    if (u.rental && cost) {
        const contract = cost.contract;
        const problem = describeRentalProblem(contract);
        const lines: StoryLine[] = [];
        const period = `${monthLabel(u.rental.from)} to ${monthLabel(u.rental.to)}`;
        let tone: Tone = "good";

        if (problem) {
            tone = contract.status === "doesNotFit" ? "missing" : "unknown";
            lines.push({ tone, text: `It ${problem}.` });
        } else if (contract.term) {
            lines.push({
                tone: "good",
                text: `It can be rented for ${period}, on FINN's ${contract.term.months}-month term${contract.extraMonths ? ` — ${contract.extraMonths} month${contract.extraMonths === 1 ? "" : "s"} longer than you need, and FINN's data doesn't say you can end it early` : ""}.`,
            });

            if (u.rental.startDay && contract.term.deliveryFrom) {
                const start = `${u.rental.from}-${String(u.rental.startDay).padStart(2, "0")}`;
                const early = contract.term.deliveryFrom <= start;

                lines.push({
                    tone: early ? "good" : "note",
                    text: early
                        ? `FINN lists delivery from ${dayLabel(contract.term.deliveryFrom)}, before your ${dayLabel(start)} start.`
                        : `FINN's earliest delivery is ${dayLabel(contract.term.deliveryFrom)}, after the ${dayLabel(start)} you mentioned.`,
                });

                if (!early) tone = "note";
            }
        }

        sections.push({
            key: "rental",
            title: problem ? `It may not work for ${period}` : `It works for ${period}`,
            short: period,
            kind: "rental",
            importance: "constraint",
            lines,
            summary: problem ? "Doesn't fit your dates" : contract.term ? `${contract.term.months}-month term` : "Dates unconfirmed",
            tone,
        });
    }

    /* -- The needs ------------------------------------------------------- */

    const active = u.needs.filter((need) => need.status === "active");

    for (const need of active) {
        /*
         * Lead with what the car does, then what it doesn't, then what nobody
         * can tell — and within each, the evidence that sets this car apart
         * first. ISOFIX on 22 of 24 cars is true and worth saying, but rear USB
         * ports on 11 of 24 is what actually distinguishes a car for the kids.
         */
        const share = (id: EvidenceId) => cars.filter((car) => readEvidence(car, id) === "listed").length;
        const orderOf: Record<Tone, number> = { good: 0, note: 1, missing: 2, unknown: 3 };

        const evidence = need.evidence.filter((entry) => !lessRelevant.includes(entry.id));
        const lines = evidence
            .map((entry) => ({ line: evidenceLine(winner, entry), share: share(entry.id) }))
            .sort((a, b) => orderOf[a.line.tone] - orderOf[b.line.tone] || a.share - b.share)
            .map((item) => item.line);

        if (need.notInData) {
            const related = lines.some((line) => line.tone === "good");
            lines.push({
                tone: "unknown",
                text: related
                    ? `FINN doesn't publish ${need.notInData}, so Lens can't check that part — what's above is what it can.`
                    : `FINN doesn't publish ${need.notInData}, so Lens has no way to tell you about that part.`,
            });
        }

        if (!lines.length) {
            lines.push({ tone: "note", text: "Lens has nothing on this car it can check for this, so it didn't count toward the ranking." });
        }

        const good = evidence.filter((entry) => readEvidence(winner, entry.id) === "listed");
        const missing = evidence.filter((entry) => readEvidence(winner, entry.id) === "notListed");

        const tone: Tone = good.length && !missing.length ? "good" : good.length ? "note" : missing.length ? "missing" : "unknown";

        sections.push({
            key: need.id,
            title:
                tone === "good"
                    ? `It helps with ${lower(need.label)}`
                    : tone === "note"
                      ? `It partly covers ${lower(need.label)}`
                      : tone === "missing"
                        ? `It's weak on ${lower(need.label)}`
                        : `Lens can't tell much about ${lower(need.label)}`,
            short: need.label,
            kind: "need",
            importance: need.importance,
            lines,
            summary: good.length
                ? good.map((entry) => EVIDENCE[entry.id].label).join(", ")
                : missing.length
                  ? `No ${missing.map((entry) => lower(EVIDENCE[entry.id].label)).join(", ")}`
                  : "Nothing Lens can check",
            tone,
        });
    }

    /* -- The catch ------------------------------------------------------- */

    let catchNote: FitStory["catch"] = null;

    const hardMiss = sections.find((section) => section.kind !== "need" && section.tone === "missing");

    if (hardMiss) {
        catchNote = { text: hardMiss.lines[0]?.text ?? hardMiss.title, alternative: null };
    } else {
        /*
         * The catch worth leading with, among gaps in needs that matter:
         * first one another car within the limits actually solves, then the
         * more important need, then equipment most cars have — a missing
         * blind-spot warning on a car when most list one says more than
         * missing fog lights that few cars have at all.
         */
        const rank = { essential: 3, important: 2, niceToHave: 0 } as const;

        const gaps = active
            .filter((need) => need.importance !== "niceToHave")
            .flatMap((need) =>
                need.evidence
                    .filter((entry) => !lessRelevant.includes(entry.id) && readEvidence(winner, entry.id) === "notListed")
                    .map((entry) => {
                        const alternative =
                            recommendation.ranked.find(
                                (car) => car.id !== winner.id && isValid(run, car) && readEvidence(car, entry.id) === "listed",
                            ) ?? null;
                        const share = cars.filter((car) => readEvidence(car, entry.id) === "listed").length / Math.max(cars.length, 1);

                        return { need, entry, alternative, score: (alternative ? 10 : 0) + rank[need.importance] * 2 + share };
                    }),
            )
            .sort((a, b) => b.score - a.score);

        const gap = gaps[0];

        if (gap) {
            const altCost = gap.alternative ? context.costs[gap.alternative.id] : null;

            catchNote = {
                /* Named by the need's own label, so the sentence can't inherit a paraphrase's grammar. */
                text: `FINN doesn't list ${lower(EVIDENCE[gap.entry.id].label)} for this car — worth weighing for ${lower(gap.need.label)}.`,
                alternative: gap.alternative
                    ? `${name(gap.alternative)} has it${altCost ? `, at about ${formatEUR(altCost.totalMonthly)}/month` : ""}${u.budget?.kind === "hardMax" ? " — still within your maximum" : ""}.`
                    : single
                      ? null
                      : "None of the other cars that fit your constraints lists it either.",
            };
        }

        if (!catchNote && narrative.tradeoffs[0]) {
            catchNote = { text: narrative.tradeoffs[0].sentences[0] ?? narrative.tradeoffs[0].evidence, alternative: null };
        }
    }

    /* -- The label ------------------------------------------------------- */

    /* A target is a line too, so the eyebrow names it — in the words the reader used. */
    const hardBudget = u.budget?.kind === "hardMax" ? u.budget.monthly : null;
    const nearBudget = u.budget?.kind === "target" ? u.budget.monthly : null;

    const eyebrow = single
        ? "How this car fits what you described"
        : recommendation.gearboxFallback === "noneFit"
          ? "Closest match — nothing here is an automatic"
          : recommendation.rentalFallback === "noneFit"
          ? "Closest match — nothing here fits your dates"
          : recommendation.isFallback && hardBudget != null
            ? `Closest match — nothing here stays within ${formatEUR(hardBudget)}`
            : recommendation.isFallback && nearBudget != null
              ? `Closest match — nothing here comes near ${formatEUR(nearBudget)}`
              : hardBudget != null
                ? `Strongest match within your ${formatEUR(hardBudget)} limit`
                : nearBudget != null
                  ? `Strongest match near your ${formatEUR(nearBudget)}`
              : "Strongest match for what you described";

    return {
        eyebrow,
        carName: name(winner),
        band,
        bandLabel: FIT_BANDS[band].label,
        bandMeaning: `Lens rates it a ${FIT_BANDS[band].label.toLowerCase()}: ${BAND_MEANING[band]}.`,
        sections,
        catch: catchNote,
        stillToKnow,
    };
}

/** For the model: what each ranked car has for each of the person's needs. */
export function evidenceForNeeds(run: LensRun, u: Understanding) {
    const ids = [...new Set(u.needs.filter((need) => need.status === "active").flatMap((need) => need.evidence.map((entry) => entry.id)))];

    if (!ids.length) return null;

    return run.recommendation.ranked.slice(0, 12).map((car) => ({
        car: carLabel(car, run.recommendation.context.vehicles),
        withinYourConstraints: isValid(run, car),
        evidence: Object.fromEntries(ids.map((id) => [EVIDENCE[id].label, readEvidence(car, id)])),
    }));
}
