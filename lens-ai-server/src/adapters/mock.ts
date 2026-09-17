import type {
    AskRequest,
    AskResult,
    InterpretRequest,
    InterpretResult,
    ProposedChange,
} from "../../../browser-extension/lib/lens-ai/contract.ts";
import type { LensAiAdapter } from "./types.ts";

/**
 * A keyword matcher standing in for a model, so the whole experience can be
 * clicked through with no API key and no network.
 *
 * It is deliberately crude and says so in its answers. What it does exercise
 * faithfully is everything around the model: the review card, validation, the
 * what-if re-run, the error and empty states. Its output has the same shape a
 * model's must, so anything that works here works against the real thing.
 */

const CONCERNS: {
    category: string;
    pattern: RegExp;
    reason: string;
    raise?: { feature: string; importance: "high" | "medium" | "low"; pattern?: RegExp };
}[] = [
    {
        category: "safetyAssistance",
        pattern: /\b(safe|safety|confident|nervous|anxious|accident|blind spot)/i,
        reason: "you want the car helping you avoid a collision",
        raise: { feature: "hasBlindSpotAssist", importance: "high", pattern: /confident|nervous|anxious|blind spot/i },
    },
    {
        category: "practicality",
        pattern: /\b(kids?|child|children|family|baby|babies|dog|luggage|bikes?|tow)/i,
        reason: "you're carrying family and their things",
        raise: { feature: "rearDoors", importance: "high", pattern: /kids?|child|children|baby|family/i },
    },
    {
        category: "climateSuitability",
        pattern: /\b(hot|heat|summer|cold|winter|snow|rain|fog|freez)/i,
        reason: "the weather where you live matters",
        raise: { feature: "hasSeatCooling", importance: "medium", pattern: /hot|heat|summer/i },
    },
    {
        category: "longDistance",
        pattern: /\b(road ?trips?|long (drives?|distance|journeys?)|motorway|highway|autobahn)/i,
        reason: "you do long drives",
    },
    {
        category: "cityParking",
        pattern: /\b(park|parking|city|town|narrow|garage|small car)/i,
        reason: "parking and town driving matter to you",
        raise: { feature: "hasOneEightyDegreesReversingCamera", importance: "medium" },
    },
    {
        category: "environmental",
        pattern: /\b(eco|environment|emissions?|co2|green|planet)/i,
        reason: "you care about emissions",
    },
    {
        category: "comfort",
        pattern: /\b(comfort|comfortable|quiet|luxur|pleasant)/i,
        reason: "you want it pleasant to sit in",
    },
];

const GAPS: { pattern: RegExp; said: string; explanation: string }[] = [
    { pattern: /\b(boot|trunk)\b/i, said: "boot space", explanation: "Lens doesn't score boot space: FINN's figure doesn't say whether the seats are up or folded." },
    { pattern: /reliab/i, said: "reliability", explanation: "Reliability isn't in FINN's data, so Lens can't weigh it." },
    { pattern: /handl|sporty|fast|accelerat/i, said: "how it drives", explanation: "Lens only sees FINN's equipment list and figures, not how a car drives." },
    { pattern: /charg/i, said: "charging", explanation: "Lens doesn't score charging speed or access. Long Distance Travel does account for an electric car's range." },
];

function emptyChange(): ProposedChange {
    return {
        startFromProfile: null,
        priorityOrder: null,
        removePriorities: [],
        raise: [],
        budget: null,
        budgetWithoutFigure: null,
        monthlyKm: null,
        contractType: null,
        rentalPeriod: null,
        notRepresentable: [],
    };
}

function euros(text: string): number | null {
    const match = text.match(/€\s?(\d[\d.,]*)|(\d[\d.,]*)\s?(?:€|eur|euros?)\b/i);
    const figure = match?.[1] ?? match?.[2];

    return figure ? Number(figure.replace(/[.,](?=\d{3}\b)/g, "").replace(",", ".")) : null;
}

function interpretText(text: string): InterpretResult {
    const change = emptyChange();

    const found = CONCERNS
        .map((concern) => ({ concern, at: text.search(concern.pattern) }))
        .filter((item) => item.at >= 0)
        .sort((a, b) => a.at - b.at);

    if (found.length) {
        change.priorityOrder = found.slice(0, 5).map(({ concern }) => ({
            category: concern.category,
            reason: concern.reason,
        }));

        for (const { concern } of found) {
            if (concern.raise && (!concern.raise.pattern || concern.raise.pattern.test(text))) {
                change.raise.push({
                    category: concern.category,
                    feature: concern.raise.feature,
                    importance: concern.raise.importance,
                    reason: concern.reason,
                });
            }
        }
    }

    const figure = euros(text);

    if (figure) {
        change.budget = { action: "set", amount: figure, reason: "the figure you gave" };
    } else if (/\b(cheap|afford|reasonable|budget|cost|price|expensive)/i.test(text)) {
        change.budgetWithoutFigure = "you'd like to keep the monthly cost reasonable";
    }

    const km = text.match(/(\d[\d.,]*)\s?km\s*(?:a|per|each|\/)\s*(month|year)/i);

    if (km?.[1]) {
        const value = Number(km[1].replace(/[.,]/g, ""));
        change.monthlyKm = { value: km[2]?.toLowerCase() === "year" ? Math.round(value / 12) : value, reason: "the distance you gave" };
    }

    change.notRepresentable = GAPS.filter((gap) => gap.pattern.test(text)).map(({ said, explanation }) => ({ said, explanation }));

    const summary = found.length
        ? `(Mock interpreter) I matched ${found.length} of Lens's priorities from keywords in what you wrote.`
        : "(Mock interpreter) I couldn't match anything you wrote to a Lens priority by keyword.";

    return { summary, change };
}

type Facts = {
    recommendation?: { car?: string; headline?: string; reasons?: string[] };
    ranking?: { car: string; estimatedMonthly: number | null }[];
    alternativesVersusRecommendation?: { car: string; lensSummary: string | null }[];
    whatYouGiveUp?: { headline: string; carThatHasIt: string | null }[];
    cars?: { car: string; priorities: { priority: string; listed: string[]; notListed: string[] }[] }[];
};

function askQuestion(request: AskRequest): AskResult {
    const question = request.question;
    const facts = request.facts as Facts;
    const scope = /\bmy (pinned )?cars\b/i.test(question)
        ? "pinned"
        : /\bthis car\b/i.test(question)
          ? "thisCar"
          : /\b(these|this page)\b/i.test(question)
            ? "page"
            : null;

    if (scope && scope !== request.scope?.current && request.scope?.available.some((item) => item.kind === scope && item.count > 0)) {
        return { kind: "answer", answer: "(Mock) I'll switch to those cars.", change: null, scope };
    }

    const whatIf = /\b(what if|if i|if my|suppose|would .* if|imagine)\b/i.test(question);

    if (whatIf) {
        const concern = CONCERNS.find((item) => item.pattern.test(question));
        const figure = euros(question);
        const change = emptyChange();

        if (figure && /\b(more|extra|increase|additional|another)\b/i.test(question)) {
            change.budget = { action: "increaseBy", amount: figure, reason: `you could spend €${figure} more` };
            return { kind: "whatIf", answer: `I'll add €${figure} to your monthly budget and run Lens again.`, change };
        }

        if (figure) {
            change.budget = { action: "set", amount: figure, reason: "the budget you asked about" };
            return { kind: "whatIf", answer: `I'll set your budget to €${figure} a month and run Lens again.`, change };
        }

        if (concern) {
            const rest = request.current.priorities.map((item) => item.id).filter((id) => id !== concern.category);
            change.priorityOrder = [concern.category, ...rest].slice(0, 5).map((category) => ({
                category,
                reason: category === concern.category ? "you asked what happens if it comes first" : "",
            }));
            const label = request.vocabulary.categories.find((item) => item.id === concern.category)?.label ?? concern.category;
            return { kind: "whatIf", answer: `I'll move ${label} to #1 and run Lens again.`, change };
        }

        return { kind: "answer", answer: "(Mock) I couldn't turn that into a Lens setting by keyword.", change: null };
    }

    const winner = facts.recommendation?.car ?? "The recommendation";

    if (/other|didn.?t you|instead|not the/i.test(question)) {
        const alt = facts.alternativesVersusRecommendation?.[0];
        return { kind: "answer", answer: alt?.lensSummary ? `(Mock) ${alt.lensSummary}` : "(Mock) There's no close alternative in the facts.", change: null };
    }

    if (/cheap/i.test(question)) {
        const cheapest = [...(facts.ranking ?? [])]
            .filter((item) => item.estimatedMonthly != null)
            .sort((a, b) => (a.estimatedMonthly ?? 0) - (b.estimatedMonthly ?? 0))[0];
        const giveUps = (facts.whatYouGiveUp ?? []).map((item) => item.headline);
        return {
            kind: "answer",
            answer: `(Mock) The cheapest fully-costed car is ${cheapest?.car ?? "unknown"} at about €${cheapest?.estimatedMonthly ?? "?"} a month.${giveUps.length ? ` Lens lists these compromises for ${winner}: ${giveUps.join("; ")}.` : ""}`,
            change: null,
        };
    }

    if (/road ?trip|long/i.test(question)) {
        const long = facts.cars?.[0]?.priorities.find((item) => /long/i.test(item.priority));
        return {
            kind: "answer",
            answer: long
                ? `(Mock) For Long Distance Travel, ${winner} lists: ${long.listed.join(", ") || "nothing Lens counts"}. Not listed: ${long.notListed.join(", ") || "none"}.`
                : "(Mock) The facts don't cover long-distance driving.",
            change: null,
        };
    }

    return {
        kind: "answer",
        answer: `(Mock) ${facts.recommendation?.headline ?? winner} ${(facts.recommendation?.reasons ?? []).join(" ")}`.trim(),
        change: null,
    };
}

export function createMockAdapter(): LensAiAdapter {
    const pause = () => new Promise((resolve) => setTimeout(resolve, 450));

    return {
        name: "mock",
        model: null,
        async interpret(request: InterpretRequest) {
            await pause();
            return { result: interpretText(request.text), model: null };
        },
        async ask(request: AskRequest) {
            await pause();
            return { result: askQuestion(request), model: null };
        },
    };
}
