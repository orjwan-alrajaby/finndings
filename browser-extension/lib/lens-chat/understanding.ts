import {
    CATEGORIES,
    CATEGORY_IDS,
    MAX_FEATURES_PER_CATEGORY,
    MAX_PRIORITIES,
    MIN_PRIORITIES,
} from "@/lib/reasoning-engine/constants";
import { isMonthString, MAX_RENTAL_MONTHS, monthsInclusive } from "@/lib/reasoning-engine/contract";
import type { CategoryId, FeatureImportance, SignalId } from "@/lib/reasoning-engine/types";
import type {
    NeedImportance,
    WireQuestion,
    WireUnderstanding,
} from "@/lib/lens-ai/contract";

import type { Answers } from "@/entrypoints/compare/store";
import type { FinnCar } from "@/lib/types";

import { coverage, EVIDENCE, isEvidenceId, type EvidenceId } from "./evidence";

/** Evidence on at least this share of the cars in scope can't tell them apart. */
const UNIVERSAL_SHARE = 0.9;

/**
 * A person's situation, as Lens can use it.
 *
 * The model reads what someone says into needs, constraints, context,
 * capabilities and open questions. This file is the other half: it checks
 * every part of that against what Lens really has — its priorities, the
 * evidence it can read on a car — keeps what the conversation already
 * established when a turn leaves it out, and turns the result into the
 * ordinary `Answers` the engine ranks cars with. The engine never sees a
 * need; it sees an order, raised features, a budget and a rental period.
 */

export interface Need {
    id: string;
    label: string;
    importance: NeedImportance;
    said: string;
    priorities: CategoryId[];
    evidence: { id: EvidenceId; use: string }[];
    notInData: string | null;
    status: "active" | "dropped";
}

export interface Understanding {
    budget: { kind: "hardMax" | "target"; monthly: number; said: string } | null;
    rental: { from: string; to: string; startDay: number | null; said: string } | null;
    monthlyKm: { value: number; said: string } | null;
    needs: Need[];
    context: { label: string; said: string }[];
    capabilities: { label: string; said: string; lessRelevant: EvidenceId[] }[];
    droppedPriorities: CategoryId[];
    /** Where the choice will really be made, in the reader's terms. */
    tension: string;
    notModelled: { said: string; explanation: string }[];
}

export const EMPTY_UNDERSTANDING: Understanding = {
    budget: null,
    rental: null,
    monthlyKm: null,
    needs: [],
    context: [],
    capabilities: [],
    droppedPriorities: [],
    tension: "",
    notModelled: [],
};

export const isEmptyUnderstanding = (u: Understanding): boolean =>
    !u.budget && !u.rental && !u.monthlyKm && !u.needs.some((need) => need.status === "active") && !u.droppedPriorities.length;

/* -------------------------------------------------------------------------- */
/* Checking what the model said                                               */
/* -------------------------------------------------------------------------- */

const text = (value: unknown, max: number): string =>
    typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";

const IMPORTANCE: NeedImportance[] = ["essential", "important", "niceToHave"];

const slug = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

/**
 * Where a need's evidence pulls its priority in — but only evidence a reader
 * could raise there. Equipment every car in a priority is expected to have
 * (air conditioning under climate) says nothing about what the person ranked:
 * counting it turned "not annoying to live with" into a winter priority.
 */
const scoredHome = (id: EvidenceId): CategoryId | null =>
    EVIDENCE[id].raisable ? EVIDENCE[id].scoredIn : null;

/**
 * The model's understanding, kept only where it holds up, merged over the
 * previous one.
 *
 * Merging is the guard against a turn that forgets: a need established earlier
 * and missing from this reply is carried over unchanged — a need is only ever
 * removed by being marked dropped. Budget, rental period and mileage carry over
 * unless the reply sets them or lists them as cleared.
 */
export function readUnderstanding(
    raw: unknown,
    previous: Understanding,
    enabled: CategoryId[] = CATEGORY_IDS,
    today = new Date().toISOString().slice(0, 7),
): Understanding {
    const wire = (raw ?? {}) as Partial<WireUnderstanding>;
    const cleared = new Set(Array.isArray(wire.cleared) ? wire.cleared : []);

    const category = (value: unknown): value is CategoryId =>
        typeof value === "string" && enabled.includes(value as CategoryId);

    /* -- Constraints ----------------------------------------------------- */

    let budget = cleared.has("budget") ? null : previous.budget;

    if (wire.budget && typeof wire.budget.monthly === "number") {
        const monthly = Math.round(wire.budget.monthly);

        if (monthly > 0 && monthly <= 10_000) {
            budget = {
                kind: wire.budget.kind === "target" ? "target" : "hardMax",
                monthly,
                said: text(wire.budget.said, 160),
            };
        }
    }

    let rental = cleared.has("rental") ? null : previous.rental;

    if (wire.rental && isMonthString(wire.rental.from) && isMonthString(wire.rental.to)) {
        const months = monthsInclusive(wire.rental.from, wire.rental.to);
        const day = Number(wire.rental.startDay);

        if (months >= 1 && months <= MAX_RENTAL_MONTHS && wire.rental.to >= today) {
            rental = {
                from: wire.rental.from,
                to: wire.rental.to,
                startDay: Number.isInteger(day) && day >= 1 && day <= 31 ? day : null,
                said: text(wire.rental.said, 160),
            };
        }
    }

    let monthlyKm = cleared.has("monthlyKm") ? null : previous.monthlyKm;

    if (wire.monthlyKm && typeof wire.monthlyKm.value === "number") {
        const value = Math.round(wire.monthlyKm.value);
        if (value > 0 && value <= 20_000) monthlyKm = { value, said: text(wire.monthlyKm.said, 160) };
    }

    /* -- Needs ----------------------------------------------------------- */

    /*
     * Evidence the person is already confident without doesn't serve their
     * needs — and mustn't pull its priority into the ranking either.
     */
    const lessRelevant = new Set<string>([
        ...(Array.isArray(wire.capabilities) ? wire.capabilities : []).flatMap((item) =>
            Array.isArray(item?.lessRelevant) ? item.lessRelevant : [],
        ),
        ...previous.capabilities.flatMap((item) => item.lessRelevant),
    ]);

    const needs: Need[] = [];

    for (const item of Array.isArray(wire.needs) ? wire.needs : []) {
        const label = text(item?.label, 48);
        if (!label) continue;

        const id = slug(text(item.id, 40) || label);
        if (!id || needs.some((need) => need.id === id)) continue;

        const evidence = (Array.isArray(item.evidence) ? item.evidence : [])
            .filter((entry) => isEvidenceId(entry?.id) && !lessRelevant.has(entry.id))
            .map((entry) => ({ id: entry.id as EvidenceId, use: text(entry.use, 120) }))
            .filter((entry, index, all) => all.findIndex((other) => other.id === entry.id) === index)
            .slice(0, 6);

        /* A need counts where its scored evidence is scored, as well as where the model placed it. */
        const priorities = [
            ...(Array.isArray(item.priorities) ? item.priorities : []).filter(category),
            ...evidence.map((entry) => scoredHome(entry.id)).filter(category),
        ].filter((value, index, all) => all.indexOf(value) === index);

        /*
         * A need whose evidence is all equipment nobody raises — ISOFIX, air
         * conditioning — and whose priorities the model left out would carry
         * no weight at all. Where it's scored is better than nowhere.
         */
        if (!priorities.length) {
            for (const entry of evidence) {
                const home = EVIDENCE[entry.id].scoredIn;

                if (category(home) && !priorities.includes(home)) priorities.push(home);
            }
        }

        needs.push({
            id,
            label,
            importance: IMPORTANCE.includes(item.importance) ? item.importance : "important",
            said: text(item.said, 200),
            priorities,
            evidence,
            notInData: text(item.notInData, 80) || null,
            status: item.status === "dropped" ? "dropped" : "active",
        });

        if (needs.length >= 8) break;
    }

    for (const earlier of previous.needs) {
        if (!needs.some((need) => need.id === earlier.id)) needs.push(earlier);
    }

    /* -- The rest -------------------------------------------------------- */

    const listOf = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

    const context = [
        ...listOf<{ label: string; said: string }>(wire.context)
            .map((item) => ({ label: text(item?.label, 60), said: text(item?.said, 200) }))
            .filter((item) => item.label),
        ...previous.context,
    ].filter((item, index, all) => all.findIndex((other) => other.label.toLowerCase() === item.label.toLowerCase()) === index);

    const capabilities = [
        ...listOf<{ label: string; said: string; lessRelevant: unknown[] }>(wire.capabilities)
            .map((item) => ({
                label: text(item?.label, 60),
                said: text(item?.said, 200),
                lessRelevant: listOf<unknown>(item?.lessRelevant).filter(isEvidenceId),
            }))
            .filter((item) => item.label),
        ...previous.capabilities,
    ].filter((item, index, all) => all.findIndex((other) => other.label.toLowerCase() === item.label.toLowerCase()) === index);

    const droppedPriorities = [
        ...listOf<unknown>(wire.droppedPriorities).filter(category),
        ...previous.droppedPriorities,
    ].filter((value, index, all) => all.indexOf(value) === index);

    /* Something now wanted again is no longer dropped. */
    const wanted = new Set(needs.filter((need) => need.status === "active").flatMap((need) => need.priorities));

    const notModelled = [
        ...listOf<{ said: string; stance?: string; explanation: string }>(wire.notModelled)
            /* Saying you don't care about speed isn't a wish Lens has to decline. */
            .filter((item) => item?.stance !== "doesntCare")
            .map((item) => ({ said: text(item?.said, 120), explanation: text(item?.explanation, 220) }))
            .filter((item) => item.said && item.explanation),
        ...previous.notModelled,
    ].filter((item, index, all) => all.findIndex((other) => other.said.toLowerCase() === item.said.toLowerCase()) === index)
        .slice(0, 5);

    return {
        budget,
        rental,
        monthlyKm,
        needs,
        context: context.slice(0, 8),
        capabilities: capabilities.slice(0, 5),
        droppedPriorities: droppedPriorities.filter((id) => !wanted.has(id)),
        tension: typeof wire.tension === "string" ? text(wire.tension, 200) : previous.tension,
        notModelled,
    };
}

/** A question worth asking, or null: well-formed, and not one already answered. */
export function readQuestion(
    raw: unknown,
    answered: { question: string; answer: string }[],
    cars: FinnCar[] = [],
): WireQuestion | null {
    const wire = raw as Partial<WireQuestion> | null;
    const ask = text(wire?.ask, 160);

    if (!ask) return null;

    const normalise = (value: string) => value.toLowerCase().replace(/[^a-z]+/g, " ").trim();

    if (answered.some((item) => normalise(item.question) === normalise(ask))) return null;

    const affects = (Array.isArray(wire?.affects) ? wire.affects : []).filter(isEvidenceId);

    /*
     * A question is only worth the reader's time if its answer could separate
     * the cars. When everything it would change is listed on nearly every car
     * here — ISOFIX on 22 of 24 — any answer leads to the same comparison.
     */
    if (affects.length && cars.length >= 2) {
        const separates = affects.some((id) => {
            const { listed, total } = coverage(cars, id);
            return listed / total < UNIVERSAL_SHARE;
        });

        if (!separates) return null;
    }

    return {
        ask,
        why: text(wire?.why, 200),
        options: (Array.isArray(wire?.options) ? wire.options : [])
            .map((option) => text(option, 40))
            .filter(Boolean)
            .slice(0, 4),
        blocking: Boolean(wire?.blocking),
        affects,
    };
}

/* -------------------------------------------------------------------------- */
/* Grounding                                                                  */
/* -------------------------------------------------------------------------- */

/** Every number in a text, without thousands separators: "€1,000 on the 8th" → 1000, 8. */
const numbersIn = (value: string): string[] =>
    (value.match(/\d(?:[\d.,]*\d)?/g) ?? []).map((number) => number.replace(/[.,]/g, "").replace(/^0+(?=\d)/, ""));

/**
 * What the model says back about someone has to come from what they said.
 * A model can fill a gap with a plausible detail — children "aged 1 and 4"
 * when nobody gave an age — and presenting that as understanding is worse
 * than saying less. Numbers are the checkable part: any sentence, context
 * line or paraphrase carrying a number the person never wrote, and Lens
 * didn't derive from what they wrote (the budget, the rental period), is
 * dropped.
 */
export function groundInWhatWasSaid(
    /* Whatever the model sent: a turn can come back with no reply at all. */
    raw: unknown,
    u: Understanding,
    said: string[],
    today = new Date(),
): { reply: string; understanding: Understanding } {
    const reply = text(raw, 400);

    const known = new Set([
        ...said.flatMap(numbersIn),
        String(today.getFullYear()),
        String(today.getFullYear() + 1),
    ]);
    if (u.budget) known.add(String(u.budget.monthly));
    if (u.monthlyKm) known.add(String(u.monthlyKm.value));
    if (u.rental) {
        for (const month of [u.rental.from, u.rental.to]) numbersIn(month.replace("-", " ")).forEach((n) => known.add(n));
        if (u.rental.startDay) known.add(String(u.rental.startDay));
    }

    const grounded = (value: string) => numbersIn(value).every((number) => known.has(number));

    const sentences = reply.match(/[^.!?]+(?:[.!?]+|$)/g) ?? [];
    const kept = sentences.filter(grounded).join("").trim();

    return {
        reply: kept || (sentences.length ? "Here's what I took from that." : reply),
        understanding: {
            ...u,
            tension: grounded(u.tension) ? u.tension : "",
            context: u.context.filter((item) => grounded(item.label) && grounded(item.said)),
            needs: u.needs.map((need) => (grounded(need.said) ? need : { ...need, said: "" })),
        },
    };
}

/** The understanding sent back to the model on the next turn. */
export const toWire = (u: Understanding): WireUnderstanding => ({ ...u, cleared: [] });

/* -------------------------------------------------------------------------- */
/* Into Lens's own answers                                                    */
/* -------------------------------------------------------------------------- */

const RANK: Record<NeedImportance, number> = { essential: 3, important: 2, niceToHave: 1 };

const RAISE: Record<NeedImportance, FeatureImportance> = {
    essential: "high",
    important: "medium",
    niceToHave: "low",
};

export interface Translation {
    answers: Answers;
    /** Priorities in the order Lens will weigh them, and which needs put each there. */
    order: { id: CategoryId; from: string[]; filler: boolean }[];
    /** Evidence the person made less relevant, removed from anything raised. */
    lessRelevant: EvidenceId[];
}

/**
 * What the engine is given.
 *
 * The order comes from the needs, strongest first — not from whatever the
 * reader's saved settings or a default profile happened to rank. Lens needs at
 * least three priorities; if the needs name fewer, the rest are taken from the
 * saved order, never from anything the person said they don't care about, and
 * marked as filler. Inside a priority the needs' own evidence is raised; a
 * priority no need speaks to keeps its saved emphasis. Evidence a capability
 * made less relevant is never raised.
 */
export function toAnswers(base: Answers, u: Understanding, enabled: CategoryId[] = CATEGORY_IDS): Translation {
    const active = u.needs.filter((need) => need.status === "active");
    const dropped = new Set(u.droppedPriorities);
    const lessRelevant = [...new Set(u.capabilities.flatMap((item) => item.lessRelevant))];

    const scores = new Map<CategoryId, { score: number; first: number; from: string[] }>();

    active.forEach((need, index) => {
        for (const id of need.priorities) {
            if (dropped.has(id) || !enabled.includes(id)) continue;

            const current = scores.get(id) ?? { score: 0, first: index, from: [] };
            current.score = Math.max(current.score, RANK[need.importance]);
            current.from.push(need.label);
            scores.set(id, current);
        }
    });

    const ranked = [...scores.entries()]
        .sort((a, b) => b[1].score - a[1].score || a[1].first - b[1].first)
        .slice(0, MAX_PRIORITIES)
        .map(([id, entry]) => ({ id, from: entry.from, filler: false }));

    const order = [...ranked];

    for (const id of [...base.priorities, ...CATEGORY_IDS]) {
        if (order.length >= MIN_PRIORITIES) break;
        if (order.some((item) => item.id === id) || dropped.has(id) || !enabled.includes(id)) continue;

        order.push({ id, from: [], filler: true });
    }

    /*
     * Only if dropping left too few does a dropped priority come back, as
     * filler — the ones dropped last-mentioned first, so an explicit "I don't
     * care about comfort" (usually named first) is the last to return.
     */
    for (const id of [...u.droppedPriorities].reverse()) {
        if (order.length >= MIN_PRIORITIES) break;
        if (order.some((item) => item.id === id)) continue;

        order.push({ id, from: [], filler: true });
    }

    const features = Object.fromEntries(
        CATEGORY_IDS.map((id) => [id, [...(base.features[id] ?? [])]]),
    ) as Answers["features"];

    for (const { id } of order) {
        const raised = new Map<SignalId, FeatureImportance>();

        for (const need of active) {
            for (const entry of need.evidence) {
                const def = EVIDENCE[entry.id];

                if (def.scoredIn !== id || !def.raisable || lessRelevant.includes(entry.id)) continue;

                const level = RAISE[need.importance];
                const existing = raised.get(entry.id as SignalId);

                if (!existing || RANK_FEATURE[level] > RANK_FEATURE[existing]) raised.set(entry.id as SignalId, level);
            }
        }

        if (raised.size) {
            features[id] = [...raised.entries()]
                .sort((a, b) => RANK_FEATURE[b[1]] - RANK_FEATURE[a[1]])
                .slice(0, MAX_FEATURES_PER_CATEGORY)
                .map(([key, importance]) => ({ key, importance, source: "user" as const }));
        }
    }

    for (const id of CATEGORY_IDS) {
        features[id] = (features[id] ?? []).filter((item) => !lessRelevant.includes(item.key));
    }

    const preferences = { ...base.preferences };

    if (u.budget) preferences.monthlyBudget = budgetCeiling(u.budget);
    if (u.rental) {
        preferences.rentalFrom = u.rental.from;
        preferences.rentalTo = u.rental.to;
    }
    if (u.monthlyKm) preferences.monthlyKm = u.monthlyKm.value;

    return {
        answers: {
            priorities: order.map((item) => item.id),
            preferences,
            features,
            basedOn: null,
        },
        order,
        lessRelevant,
    };
}

const RANK_FEATURE: Record<FeatureImportance, number> = { high: 3, medium: 2, low: 1 };

/* -------------------------------------------------------------------------- */
/* Describing a change of understanding                                       */
/* -------------------------------------------------------------------------- */

const euros = (value: number) => `€${value.toLocaleString("en-GB")}`;

/**
 * How far above a soft figure Lens will still look.
 *
 * "Around €600, a bit more for a good reason" is not "no limit": ignoring it
 * put a €1,353 car in front of someone who said €600. A target is held to a
 * little headroom instead, and the fit story says where the line was drawn.
 */
export const TARGET_HEADROOM = 1.15;

/** The most Lens will let a car cost, given what the person said about money. */
export const budgetCeiling = (budget: NonNullable<Understanding["budget"]>): number =>
    budget.kind === "hardMax" ? budget.monthly : Math.round(budget.monthly * TARGET_HEADROOM);

export function budgetText(budget: Understanding["budget"]): string {
    if (!budget) return "No limit";
    return budget.kind === "hardMax" ? `${euros(budget.monthly)}/month maximum` : `Around ${euros(budget.monthly)}/month`;
}

/** What a what-if changes, as plain before-and-after lines. */
export function diffUnderstanding(before: Understanding, after: Understanding): { label: string; from: string; to: string }[] {
    const lines: { label: string; from: string; to: string }[] = [];

    if (budgetText(before.budget) !== budgetText(after.budget)) {
        lines.push({ label: "Budget", from: budgetText(before.budget), to: budgetText(after.budget) });
    }

    const period = (rental: Understanding["rental"]) => (rental ? `${rental.from} → ${rental.to}` : "Not set");

    if (period(before.rental) !== period(after.rental)) {
        lines.push({ label: "Rental period", from: period(before.rental), to: period(after.rental) });
    }

    const importanceText: Record<NeedImportance, string> = {
        essential: "Must have",
        important: "Important",
        niceToHave: "Nice to have",
    };

    for (const need of after.needs) {
        const was = before.needs.find((item) => item.id === need.id);
        const now = need.status === "dropped" ? "Doesn't matter" : importanceText[need.importance];
        const then = !was ? "—" : was.status === "dropped" ? "Doesn't matter" : importanceText[was.importance];

        if (now !== then) lines.push({ label: need.label, from: then, to: now });
    }

    for (const id of after.droppedPriorities) {
        if (!before.droppedPriorities.includes(id)) {
            lines.push({ label: CATEGORIES[id].label, from: "Weighed", to: "Not weighed" });
        }
    }

    return lines;
}
