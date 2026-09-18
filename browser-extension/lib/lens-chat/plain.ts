import { formatEUR, monthLabel } from "@/lib/reasoning-engine";
import { CATEGORIES } from "@/lib/reasoning-engine/constants";

import { asPhrase } from "./evidence";
import type { FitStory } from "./fit-story";
import { budgetCeiling, ruledOut, type Understanding } from "./understanding";

/**
 * What Lens understood, and what it found, in sentences.
 *
 * The chat used to answer a person with the shape of its own thinking:
 * labelled sections for limits, needs, evidence, gaps, weights. All of it true
 * and none of it how anyone describes their own life. This turns the same
 * structures into a handful of plain lines — the detail stays one tap away for
 * anyone who wants to check it.
 *
 * Deterministic, and deliberately so: these sentences are what the reader
 * checks Lens against, so they are built from the understanding rather than
 * asked of a model that might flatter it.
 */

const join = (parts: string[]): string => {
    const kept = parts.filter(Boolean);

    if (kept.length <= 1) return kept[0] ?? "";
    if (kept.length === 2) return `${kept[0]} and ${kept[1]}`;

    return `${kept.slice(0, -1).join(", ")} and ${kept.at(-1)}`;
};

const lower = (value: string): string =>
    /^[A-Z]{2,}/.test(value) || value.startsWith("I ") ? value : `${value.charAt(0).toLowerCase()}${value.slice(1)}`;

export interface HeardLines {
    /** Their life, as they described it. */
    situation: string;
    /** The rules a car has to meet. */
    limits: string;
    /** What Lens will look for on each car. */
    lookingFor: string;
    /** What they said not to bother with. */
    notChasing: string;
    /** What they asked about that FINN's data can't settle. */
    cantJudge: string;
}

/** The whole understanding as at most five sentences a person would recognise. */
export function heardLines(u: Understanding): HeardLines {
    const active = u.needs.filter((need) => need.status === "active");

    const limits: string[] = [];

    if (u.budget) {
        const ceiling = budgetCeiling(u.budget);

        limits.push(
            u.budget.kind === "hardMax"
                ? `up to ${formatEUR(u.budget.monthly)} a month, all in`
                : u.budget.stretchTo
                  ? `around ${formatEUR(u.budget.monthly)} a month, ${formatEUR(u.budget.stretchTo)} at a stretch`
                  : `around ${formatEUR(u.budget.monthly)} a month, and no further than ${formatEUR(ceiling)}`,
        );
    }

    if (u.rental) limits.push(`from ${monthLabel(u.rental.from)} to ${monthLabel(u.rental.to)}`);
    if (u.monthlyKm) limits.push(`about ${u.monthlyKm.value.toLocaleString("en-GB")} km a month`);

    for (const rule of ruledOut(u)) {
        limits.push(rule.mode === "without" ? `nothing FINN files as ${asPhrase(rule.id)}` : `only ${asPhrase(rule.id)}`);
    }

    const notChasing = [
        ...u.droppedPriorities.map((id) => lower(CATEGORIES[id].label)),
        ...u.needs.filter((need) => need.status === "dropped").map((need) => lower(need.label)),
        ...u.notModelled.filter((item) => item.stance === "doesntCare").map((item) => lower(item.said)),
    ].filter((item, index, all) => all.indexOf(item) === index);

    return {
        situation: join(u.context.map((item) => lower(item.label))),
        limits: join(limits),
        lookingFor: join(active.map((need) => lower(need.label))),
        notChasing: join(notChasing),
        cantJudge: join(u.notModelled.filter((item) => item.stance !== "doesntCare").map((item) => lower(item.said))),
    };
}

/**
 * Why this car, in one sentence.
 *
 * The result used to open with Lens's own headings — "It stays within your
 * €650 limit", "It partly covers parking without the stress" — which is the
 * shape of the check, not an answer to "why this one?". This says what the car
 * does for them, and leaves the checking to the detail below it.
 */
export function matchSentence(story: FitStory): string {
    const covered = story.sections.filter((section) => section.kind === "need" && section.tone === "good");
    const partly = story.sections.filter((section) => section.kind === "need" && section.tone === "note");
    const money = story.sections.find((section) => section.kind === "budget");

    const needs = join([...covered, ...partly].slice(0, 3).map((section) => lower(section.short)));
    const opening = needs ? `Covers ${needs}` : "The closest Lens can get to what you described";

    if (!money) return `${opening}.`;

    return money.tone === "good" ? `${opening}, within what you wanted to spend.` : `${opening} — but not what you wanted to spend.`;
}
