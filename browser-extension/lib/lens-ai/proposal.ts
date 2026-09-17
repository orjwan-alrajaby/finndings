import {
    CATEGORIES,
    CATEGORY_IDS,
    FEATURE_IMPORTANCE,
    MAX_FEATURES_PER_CATEGORY,
    MAX_PRIORITIES,
    MIN_PRIORITIES,
    PROFILES,
    SIGNALS,
} from "@/lib/reasoning-engine/constants";
import {
    applyProfile,
    formatEUR,
    formatKm,
    monthLabel,
    periodLabel,
    priorityWeights,
    rentalPeriodOf,
} from "@/lib/reasoning-engine";
import {
    isMonthString,
    MAX_RENTAL_MONTHS,
    monthsInclusive,
} from "@/lib/reasoning-engine/contract";
import type {
    CategoryId,
    ContractType,
    FeatureImportance,
    ProfileId,
    SignalId,
} from "@/lib/reasoning-engine/types";

import type { Answers } from "@/entrypoints/compare/store";
import type { ProposedChange } from "./contract";

/**
 * The guardrail between what a model said and what Lens will do.
 *
 * A `ProposedChange` is a claim. Everything in it is checked here against the
 * engine's own constants — a priority that doesn't exist, a feature raised
 * under a priority that isn't its home, a sixth raise, a budget of −€40 — and
 * what fails is dropped *with a note saying so*, never silently. What passes
 * becomes a `ValidatedChange`, which `applyChange` turns into ordinary
 * `Answers`: the same object the Adjust drawer saves, reasoned by the same
 * engine. There is no second path into the recommendation.
 */

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface ValidatedChange {
    profile: ProfileId | null;
    /**
     * The new order, or null to leave it alone. `kept` marks a slot Lens
     * filled from the reader's current order to reach the minimum, so the
     * review can say which ones the reader didn't mention.
     */
    priorities: { id: CategoryId; reason: string | null; kept: boolean }[] | null;
    raises: {
        category: CategoryId;
        feature: SignalId;
        /** Null puts the feature back to standard. */
        importance: FeatureImportance | null;
        reason: string;
    }[];
    budget: {
        action: "set" | "increaseBy" | "decreaseBy" | "remove";
        amount: number | null;
        reason: string;
    } | null;
    budgetWithoutFigure: string | null;
    monthlyKm: { value: number; reason: string } | null;
    contractType: { value: ContractType; reason: string } | null;
    /** A whole, ordered period, or `{ from: null, to: null }` to remove one. */
    rentalPeriod: { from: string | null; to: string | null; reason: string } | null;
    notRepresentable: { said: string; explanation: string }[];
    /** What the model proposed that Lens refused, in plain English. */
    ignored: string[];
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

const isCategory = (value: unknown, enabled: CategoryId[]): value is CategoryId =>
    typeof value === "string" && enabled.includes(value as CategoryId);

const isProfile = (value: unknown): value is ProfileId =>
    typeof value === "string" && value in PROFILES;

const text = (value: unknown, max = 280): string =>
    typeof value === "string" ? value.trim().slice(0, max) : "";

const MAX_BUDGET = 10_000;
const MAX_MONTHLY_KM = 20_000;

/** The home of a raisable feature — the only priority it may be raised under. */
function raisableHome(feature: string): CategoryId | null {
    return (
        CATEGORY_IDS.find((id) =>
            (CATEGORIES[id].features as readonly string[]).includes(feature),
        ) ?? null
    );
}

export function validateChange(
    raw: unknown,
    answers: Answers,
    enabled: CategoryId[] = CATEGORY_IDS,
): ValidatedChange {
    const change = (raw ?? {}) as Partial<ProposedChange>;
    const ignored: string[] = [];

    /* -- Profile ------------------------------------------------------- */

    let profile: ProfileId | null = null;

    if (change.startFromProfile != null) {
        if (isProfile(change.startFromProfile)) {
            profile = change.startFromProfile;
        } else {
            ignored.push(
                `A profile called "${text(change.startFromProfile, 40)}", which Lens doesn't have.`,
            );
        }
    }

    /* The order the edits below are checked against. */
    const baseOrder = profile
        ? applyProfile(profile).priorities
        : answers.priorities;

    /* -- Priority order ------------------------------------------------ */

    let priorities: ValidatedChange["priorities"] = null;

    if (Array.isArray(change.priorityOrder)) {
        const seen = new Set<CategoryId>();
        const valid: { id: CategoryId; reason: string | null; kept: boolean }[] = [];

        for (const entry of change.priorityOrder) {
            const id = entry?.category;

            if (!isCategory(id, enabled)) {
                ignored.push(
                    `A priority called "${text(id, 40)}", which isn't one of Lens's priorities.`,
                );
                continue;
            }

            if (seen.has(id)) continue;
            seen.add(id);

            if (valid.length >= MAX_PRIORITIES) {
                ignored.push(
                    `${CATEGORIES[id].label} as a sixth priority — Lens ranks at most ${MAX_PRIORITIES}.`,
                );
                continue;
            }

            valid.push({ id, reason: text(entry.reason) || null, kept: false });
        }

        /*
         * Too few to rank on: fill from the order the reader already has,
         * in its own sequence, and say those were kept rather than chosen.
         */
        for (const id of [...baseOrder, ...CATEGORY_IDS]) {
            if (valid.length >= MIN_PRIORITIES) break;
            if (seen.has(id) || !enabled.includes(id)) continue;

            seen.add(id);
            valid.push({ id, reason: null, kept: true });
        }

        priorities = valid.length ? valid : null;
    }

    /* -- Raised features ----------------------------------------------- */

    const raises: ValidatedChange["raises"] = [];

    for (const entry of Array.isArray(change.raise) ? change.raise : []) {
        const feature = entry?.feature;

        if (typeof feature !== "string" || !(feature in SIGNALS)) {
            ignored.push(
                `A feature called "${text(feature, 40)}", which isn't in FINN's data as Lens reads it.`,
            );
            continue;
        }

        const home = raisableHome(feature);

        if (!home) {
            ignored.push(
                `Raising ${SIGNALS[feature as SignalId].label}: it's standard equipment Lens checks, not something that can be raised.`,
            );
            continue;
        }

        if (!enabled.includes(home)) {
            ignored.push(
                `Raising ${SIGNALS[feature as SignalId].label}: its priority, ${CATEGORIES[home].label}, is switched off in Settings.`,
            );
            continue;
        }

        const importance =
            entry.importance === "standard"
                ? null
                : entry.importance in FEATURE_IMPORTANCE
                  ? (entry.importance as FeatureImportance)
                  : undefined;

        if (importance === undefined) {
            ignored.push(
                `An influence level of "${text(entry.importance, 20)}" for ${SIGNALS[feature as SignalId].label}.`,
            );
            continue;
        }

        /* A later mention of the same feature replaces an earlier one. */
        const existing = raises.findIndex((item) => item.feature === feature);
        const next = {
            category: home,
            feature: feature as SignalId,
            importance,
            reason: text(entry.reason),
        };

        if (existing >= 0) raises[existing] = next;
        else raises.push(next);
    }

    /* The cap is per priority, counted against what the result would hold. */
    const startingFeatures = profile
        ? applyProfile(profile).categoryFeatures
        : answers.features;

    for (const category of CATEGORY_IDS) {
        const held = new Set(
            (startingFeatures[category] ?? []).map((item) => item.key),
        );

        for (const raise of raises.filter((item) => item.category === category)) {
            if (raise.importance === null) held.delete(raise.feature);
            else held.add(raise.feature);
        }

        let excess = held.size - MAX_FEATURES_PER_CATEGORY;

        for (let index = raises.length - 1; index >= 0 && excess > 0; index -= 1) {
            const raise = raises[index]!;

            if (
                raise.category !== category ||
                raise.importance === null ||
                (startingFeatures[category] ?? []).some((item) => item.key === raise.feature)
            ) {
                continue;
            }

            ignored.push(
                `Raising ${SIGNALS[raise.feature].label}: ${CATEGORIES[category].label} already has the most features that can be raised (${MAX_FEATURES_PER_CATEGORY}).`,
            );
            raises.splice(index, 1);
            excess -= 1;
        }
    }

    /* -- Budget -------------------------------------------------------- */

    let budget: ValidatedChange["budget"] = null;
    const currentBudget = answers.preferences.monthlyBudget;

    if (change.budget) {
        const { action, amount } = change.budget;
        const reason = text(change.budget.reason);
        const figure = typeof amount === "number" && Number.isFinite(amount)
            ? Math.round(amount)
            : null;

        if (action === "remove") {
            budget = currentBudget > 0 ? { action, amount: null, reason } : null;
        } else if (!["set", "increaseBy", "decreaseBy"].includes(action)) {
            ignored.push(`A budget change Lens doesn't understand.`);
        } else if (figure == null || figure <= 0) {
            ignored.push(`A budget change without a usable amount.`);
        } else if (action !== "set" && currentBudget <= 0) {
            /*
             * "€150 more" than nothing is not a figure. Saying so is more
             * useful than inventing a baseline.
             */
            ignored.push(
                `${action === "increaseBy" ? "Adding" : "Taking"} ${formatEUR(figure)} ${action === "increaseBy" ? "to" : "off"} your budget: you haven't set one, so there's nothing to change it from. Try "what if my budget was €…".`,
            );
        } else {
            const result =
                action === "set"
                    ? figure
                    : action === "increaseBy"
                      ? currentBudget + figure
                      : currentBudget - figure;

            if (result <= 0 || result > MAX_BUDGET) {
                ignored.push(
                    `A monthly budget of ${formatEUR(result)}, which isn't a usable limit.`,
                );
            } else {
                budget = { action, amount: figure, reason };
            }
        }
    }

    /* -- Mileage and contract ------------------------------------------ */

    let monthlyKm: ValidatedChange["monthlyKm"] = null;

    if (change.monthlyKm) {
        const value = Math.round(Number(change.monthlyKm.value));

        if (Number.isFinite(value) && value > 0 && value <= MAX_MONTHLY_KM) {
            monthlyKm = { value, reason: text(change.monthlyKm.reason) };
        } else {
            ignored.push(`A monthly mileage of ${text(String(change.monthlyKm.value), 12)} km.`);
        }
    }

    let contractType: ValidatedChange["contractType"] = null;

    if (change.contractType) {
        if (["private", "business"].includes(change.contractType.value)) {
            contractType = {
                value: change.contractType.value,
                reason: text(change.contractType.reason),
            };
        } else {
            ignored.push(`A contract type Lens doesn't offer.`);
        }
    }

    /* -- Rental period ------------------------------------------------- */

    let rentalPeriod: ValidatedChange["rentalPeriod"] = null;

    if (change.rentalPeriod) {
        const { action, from, to } = change.rentalPeriod;
        const reason = text(change.rentalPeriod.reason);

        if (action === "remove") {
            rentalPeriod = answers.preferences.rentalFrom
                ? { from: null, to: null, reason }
                : null;
        } else if (!isMonthString(from) || !isMonthString(to)) {
            ignored.push("A rental period without a usable start and end month.");
        } else if (monthsInclusive(from, to) < 1) {
            ignored.push(`A rental period ending (${monthLabel(to)}) before it starts (${monthLabel(from)}).`);
        } else if (monthsInclusive(from, to) > MAX_RENTAL_MONTHS) {
            ignored.push(`A rental period of ${monthsInclusive(from, to)} months, longer than Lens handles.`);
        } else if (to < new Date().toISOString().slice(0, 7)) {
            ignored.push(`A rental period that has already ended (${monthLabel(to)}).`);
        } else {
            rentalPeriod = { from, to, reason };
        }
    }

    return {
        profile,
        priorities,
        raises,
        budget,
        budgetWithoutFigure: text(change.budgetWithoutFigure) || null,
        monthlyKm,
        contractType,
        rentalPeriod,
        notRepresentable: (Array.isArray(change.notRepresentable)
            ? change.notRepresentable
            : []
        )
            .map((item) => ({
                said: text(item?.said, 120),
                explanation: text(item?.explanation),
            }))
            .filter((item) => item.said && item.explanation)
            .slice(0, 4),
        ignored,
    };
}

/* -------------------------------------------------------------------------- */
/* Applying                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The answers with the change made. Pure: the caller decides whether the
 * result is only reasoned about (a what-if) or handed to the store.
 *
 * `budgetFigure` is a figure the reader typed themselves in the review, for
 * the case where they talked about cost without naming one.
 */
export function applyChange(
    answers: Answers,
    change: ValidatedChange,
    budgetFigure: number | null = null,
): Answers {
    let next: Answers = {
        ...answers,
        preferences: { ...answers.preferences },
        features: Object.fromEntries(
            Object.entries(answers.features).map(([key, value]) => [key, [...value]]),
        ) as Answers["features"],
    };

    if (change.profile) {
        const applied = applyProfile(change.profile);

        next = {
            ...next,
            priorities: applied.priorities,
            features: applied.categoryFeatures,
            basedOn: applied.basedOn,
        };
    }

    if (change.priorities) {
        next.priorities = change.priorities.map((item) => item.id);
    }

    for (const raise of change.raises) {
        const current = next.features[raise.category] ?? [];
        const without = current.filter((item) => item.key !== raise.feature);

        next.features[raise.category] =
            raise.importance === null
                ? without
                : current.some((item) => item.key === raise.feature)
                  ? current.map((item) =>
                        item.key === raise.feature
                            ? { ...item, importance: raise.importance!, source: "user" as const }
                            : item,
                    )
                  : [
                        ...current,
                        { key: raise.feature, importance: raise.importance, source: "user" as const },
                    ];
    }

    const budgetNow = answers.preferences.monthlyBudget;

    if (change.budget) {
        const { action, amount } = change.budget;

        next.preferences.monthlyBudget =
            action === "remove"
                ? 0
                : action === "set"
                  ? (amount ?? budgetNow)
                  : action === "increaseBy"
                    ? budgetNow + (amount ?? 0)
                    : budgetNow - (amount ?? 0);
    } else if (budgetFigure != null && budgetFigure > 0) {
        next.preferences.monthlyBudget = Math.round(budgetFigure);
    }

    if (change.monthlyKm) next.preferences.monthlyKm = change.monthlyKm.value;
    if (change.contractType) next.preferences.contractType = change.contractType.value;

    if (change.rentalPeriod) {
        next.preferences.rentalFrom = change.rentalPeriod.from;
        next.preferences.rentalTo = change.rentalPeriod.to;
    }

    return next;
}

/** Whether the change would alter anything Lens reasons from. */
export function isEmptyChange(change: ValidatedChange): boolean {
    return (
        !change.profile &&
        !change.priorities &&
        change.raises.length === 0 &&
        !change.budget &&
        !change.monthlyKm &&
        !change.contractType &&
        !change.rentalPeriod
    );
}

/* -------------------------------------------------------------------------- */
/* Describing                                                                 */
/* -------------------------------------------------------------------------- */

export interface PriorityRow {
    id: CategoryId;
    label: string;
    icon: string;
    rank: number;
    weightPercent: number;
    /** Where it was before, or null if it's new to the order. */
    previousRank: number | null;
    previousWeightPercent: number | null;
    reason: string | null;
    kept: boolean;
}

export interface ChangeDescription {
    profileLabel: string | null;
    /** Null when the order is unchanged. */
    order: PriorityRow[] | null;
    dropped: { id: CategoryId; label: string; icon: string; previousRank: number }[];
    raises: {
        category: CategoryId;
        categoryLabel: string;
        feature: SignalId;
        label: string;
        from: FeatureImportance | null;
        to: FeatureImportance | null;
        reason: string;
        /** Its priority isn't in the resulting order, so it won't count. */
        inactive: boolean;
    }[];
    /** Plain lines for budget, mileage and contract: "€600 → €750 a month". */
    assumptions: { label: string; from: string; to: string; reason: string }[];
}

const budgetText = (value: number) =>
    value > 0 ? `${formatEUR(value)}/month` : "No limit";

/**
 * What the change does, in Lens's words — written from the two sets of
 * answers, not from anything the model said except its reasons.
 */
export function describeChange(
    before: Answers,
    after: Answers,
    change: ValidatedChange,
): ChangeDescription {
    const beforeWeights = priorityWeights(before.priorities);
    const afterWeights = priorityWeights(after.priorities);

    const orderChanged =
        before.priorities.join() !== after.priorities.join() ||
        Boolean(change.priorities);

    const order: PriorityRow[] | null = orderChanged
        ? afterWeights.map((weight) => {
              const previous = beforeWeights.find(
                  (item) => item.priority === weight.priority,
              );
              const proposed = change.priorities?.find(
                  (item) => item.id === weight.priority,
              );

              return {
                  id: weight.priority,
                  label: CATEGORIES[weight.priority].label,
                  icon: CATEGORIES[weight.priority].icon,
                  rank: weight.rank,
                  weightPercent: weight.weightPercent,
                  previousRank: previous?.rank ?? null,
                  previousWeightPercent: previous?.weightPercent ?? null,
                  reason: proposed?.reason ?? null,
                  kept: proposed?.kept ?? false,
              };
          })
        : null;

    const dropped = beforeWeights
        .filter((weight) => !after.priorities.includes(weight.priority))
        .map((weight) => ({
            id: weight.priority,
            label: CATEGORIES[weight.priority].label,
            icon: CATEGORIES[weight.priority].icon,
            previousRank: weight.rank,
        }));

    const raises = change.raises
        .map((raise) => ({
            category: raise.category,
            categoryLabel: CATEGORIES[raise.category].label,
            feature: raise.feature,
            label: SIGNALS[raise.feature].label,
            from:
                before.features[raise.category]?.find((item) => item.key === raise.feature)
                    ?.importance ?? null,
            to: raise.importance,
            reason: raise.reason,
            inactive: !after.priorities.includes(raise.category),
        }))
        .filter((raise) => raise.from !== raise.to);

    const assumptions: ChangeDescription["assumptions"] = [];

    if (before.preferences.monthlyBudget !== after.preferences.monthlyBudget) {
        assumptions.push({
            label: "Monthly budget",
            from: budgetText(before.preferences.monthlyBudget),
            to: budgetText(after.preferences.monthlyBudget),
            reason: change.budget?.reason ?? "",
        });
    }

    if (before.preferences.monthlyKm !== after.preferences.monthlyKm) {
        assumptions.push({
            label: "Monthly mileage",
            from: `${formatKm(before.preferences.monthlyKm)}/month`,
            to: `${formatKm(after.preferences.monthlyKm)}/month`,
            reason: change.monthlyKm?.reason ?? "",
        });
    }

    if (before.preferences.contractType !== after.preferences.contractType) {
        const name = (value: ContractType) =>
            value === "business" ? "Business" : "Private";

        assumptions.push({
            label: "Contract",
            from: name(before.preferences.contractType),
            to: name(after.preferences.contractType),
            reason: change.contractType?.reason ?? "",
        });
    }

    const periodText = (preferences: Answers["preferences"]) => {
        const period = rentalPeriodOf(preferences);

        return period ? `${periodLabel(period)} (${period.months} months)` : "Not set";
    };

    if (periodText(before.preferences) !== periodText(after.preferences)) {
        assumptions.push({
            label: "Rental period",
            from: periodText(before.preferences),
            to: periodText(after.preferences),
            reason: change.rentalPeriod?.reason ?? "",
        });
    }

    return {
        profileLabel: change.profile ? PROFILES[change.profile].label : null,
        order,
        dropped,
        raises,
        assumptions,
    };
}
