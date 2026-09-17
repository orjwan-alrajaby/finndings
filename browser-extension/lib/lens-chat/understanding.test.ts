import { describe, expect, it } from "vitest";

import { DEFAULT_CATEGORY_FEATURES, DEFAULT_PREFERENCES, DEFAULT_PRIORITIES } from "@/lib/reasoning-engine/constants";
import { garageCar } from "@/lib/reasoning-engine/test-garage";
import type { WireUnderstanding } from "@/lib/lens-ai/contract";
import { copyFeatures, type Answers } from "@/entrypoints/compare/store";

import { readEvidence } from "./evidence";
import { evidenceForNeeds, tellFitStory } from "./fit-story";
import { alternativesWithinLimits, runLens } from "./run";
import {
    groundInWhatWasSaid,
    diffUnderstanding,
    EMPTY_UNDERSTANDING,
    type Understanding,
    readQuestion,
    readUnderstanding,
    toAnswers,
} from "./understanding";

/*
 * Lens listening: what a person said, kept as needs, constraints and context,
 * checked against what Lens can really use, and turned into the answers the
 * engine ranks with. No model runs here — these are the guarantees around one.
 */

const base = (): Answers => ({
    priorities: [...DEFAULT_PRIORITIES],
    preferences: { ...DEFAULT_PREFERENCES },
    features: copyFeatures(DEFAULT_CATEGORY_FEATURES),
    basedOn: "balanced",
});

const wire = (overrides: Partial<WireUnderstanding>): WireUnderstanding => ({
    budget: null,
    rental: null,
    monthlyKm: null,
    needs: [],
    context: [],
    capabilities: [],
    droppedPriorities: [],
    tension: "",
    notModelled: [],
    cleared: [],
    ...overrides,
});

const familyAndNerves = wire({
    budget: { kind: "hardMax", monthly: 500, said: "a total of 500 euros per month and I can't spend any more" },
    rental: { from: "2099-10", to: "2100-04", startDay: 8, said: "from the 8th of October until April" },
    needs: [
        {
            id: "kids-safe",
            label: "Keeping the kids safe",
            importance: "important",
            said: "you have two young children",
            priorities: ["practicality"],
            evidence: [
                { id: "hasIsofix", use: "could anchor their child seats" },
                { id: "rearDoors", use: "make getting them in and out easier" },
            ],
            notInData: null,
            status: "active",
        },
        {
            id: "kids-entertained",
            label: "Keeping the kids occupied",
            importance: "niceToHave",
            said: "you'd like something to keep them entertained",
            priorities: [],
            evidence: [
                { id: "hasBackUSBPorts", use: "could keep their tablets charged on long drives" },
                { id: "hasTeleporter", use: "nonsense" },
            ],
            notInData: "a built-in rear entertainment system",
            status: "active",
        },
        {
            id: "confidence",
            label: "Feeling safer on the road",
            importance: "important",
            said: "you're a pretty nervous driver",
            priorities: ["safetyAssistance"],
            evidence: [
                { id: "hasBlindSpotAssist", use: "could warn you about cars you can't see" },
                { id: "hasAdaptiveCruiseControl", use: "keeps your distance" },
            ],
            notInData: null,
            status: "active",
        },
    ],
    capabilities: [
        {
            label: "Keeping a safe following distance",
            said: "you're confident maintaining distance",
            lessRelevant: ["hasAdaptiveCruiseControl", "driverAssistLevel2"],
        },
    ],
});

describe("reading an understanding", () => {
    it("keeps only evidence Lens can check, and counts a need where its evidence is scored", () => {
        const u = readUnderstanding(familyAndNerves, EMPTY_UNDERSTANDING, undefined, "2026-09");
        const kids = u.needs.find((need) => need.id === "kids-entertained")!;

        expect(kids.evidence.map((item) => item.id)).toEqual(["hasBackUSBPorts"]);
        /* Made less relevant by what they're confident with, so it serves no need. */
        expect(u.needs.find((need) => need.id === "confidence")?.evidence.map((item) => item.id)).toEqual(["hasBlindSpotAssist"]);
        expect(kids.notInData).toBe("a built-in rear entertainment system");

        /* Blind spot warning is scored under Safety & Driver Assistance. */
        expect(u.needs.find((need) => need.id === "confidence")?.priorities).toContain("safetyAssistance");
        expect(u.rental).toEqual({ from: "2099-10", to: "2100-04", startDay: 8, said: "from the 8th of October until April" });
        expect(u.budget?.kind).toBe("hardMax");
    });

    it("carries what earlier turns established when a reply leaves it out", () => {
        const first = readUnderstanding(familyAndNerves, EMPTY_UNDERSTANDING, undefined, "2026-09");
        const second = readUnderstanding(
            wire({
                needs: [{ ...familyAndNerves.needs[1]!, importance: "important", evidence: [{ id: "hasBackUSBPorts", use: "could keep them busy on long drives" }] }],
            }),
            first,
            undefined,
            "2026-09",
        );

        expect(second.needs.map((need) => need.id).sort()).toEqual(["confidence", "kids-entertained", "kids-safe"]);
        expect(second.needs.find((need) => need.id === "kids-entertained")?.importance).toBe("important");
        expect(second.budget?.monthly).toBe(500);
        expect(second.rental?.from).toBe("2099-10");

        expect(readUnderstanding(wire({ cleared: ["budget"] }), second).budget).toBeNull();
    });

    it("keeps what they want and Lens can't check, not what they don't care about", () => {
        const u = readUnderstanding(
            wire({
                notModelled: [
                    { said: "a fast car", stance: "doesntCare", explanation: "Lens doesn't consider speed." },
                    { said: "feels luxurious", stance: "wants", explanation: "Lens has no measure of luxury." },
                ],
            }),
            EMPTY_UNDERSTANDING,
        );

        expect(u.notModelled.map((item) => item.said)).toEqual(["feels luxurious"]);
    });

    it("refuses constraints that don't make sense", () => {
        const u = readUnderstanding(
            wire({
                budget: { kind: "hardMax", monthly: -50, said: "" },
                rental: { from: "April", to: "May", startDay: null, said: "" },
            }),
            EMPTY_UNDERSTANDING,
        );

        expect(u.budget).toBeNull();
        expect(u.rental).toBeNull();
    });

    it("never asks a question that was already answered", () => {
        const answered = [{ question: "How old are your children?", answer: "1 and 4" }];

        expect(readQuestion({ ask: "How old are your children?", why: "", options: [], blocking: true }, answered)).toBeNull();
        expect(readQuestion({ ask: "What part of driving makes you most nervous?", why: "", options: ["Parking"], blocking: false }, answered)?.options).toEqual(["Parking"]);
    });

    it("doesn't ask what no answer could change: evidence every car here has", () => {
        const cars = [
            garageCar({ id: 1, extra: ["hasIsofix"] }),
            garageCar({ id: 2, extra: ["hasIsofix", "hasBlindSpotAssist"] }),
            garageCar({ id: 3, extra: ["hasIsofix"] }),
        ];
        const ages = { ask: "How old is your child?", why: "", options: [], blocking: false, affects: ["hasIsofix"] };
        const nerves = { ask: "What makes you nervous?", why: "", options: [], blocking: false, affects: ["hasIsofix", "hasBlindSpotAssist"] };

        expect(readQuestion(ages, [], cars)).toBeNull();
        expect(readQuestion(nerves, [], cars)?.ask).toBe("What makes you nervous?");
        expect(readQuestion({ ...ages, affects: [] }, [], cars)?.ask).toBe("How old is your child?");
    });
});

describe("turning an understanding into Lens's answers", () => {
    it("ranks what the person needs, not what the saved profile ranked", () => {
        const u = readUnderstanding(familyAndNerves, EMPTY_UNDERSTANDING, undefined, "2026-09");
        const { answers, order, lessRelevant } = toAnswers(base(), u);

        expect(answers.priorities.slice(0, 2).sort()).toEqual(["practicality", "safetyAssistance"]);
        expect(order.filter((item) => !item.filler).map((item) => item.id).sort()).toEqual(["practicality", "safetyAssistance"]);
        expect(answers.preferences.monthlyBudget).toBe(500);
        expect(answers.preferences).toMatchObject({ rentalFrom: "2099-10", rentalTo: "2100-04" });
        expect(answers.features.safetyAssistance.map((item) => item.key)).toEqual(["hasBlindSpotAssist"]);
        expect(lessRelevant).toContain("hasAdaptiveCruiseControl");
    });

    it("doesn't keep Comfort just because the default profile had it", () => {
        const u = readUnderstanding(
            wire({
                budget: { kind: "hardMax", monthly: 500, said: "under €500" },
                needs: [
                    {
                        id: "safety",
                        label: "Good safety features",
                        importance: "essential",
                        said: "you only care about good safety features",
                        priorities: ["safetyAssistance"],
                        evidence: [{ id: "hasBlindSpotAssist", use: "could warn you" }],
                        notInData: null,
                        status: "active",
                    },
                ],
                droppedPriorities: ["comfort"],
            }),
            EMPTY_UNDERSTANDING,
        );

        const { answers, order } = toAnswers(base(), u);

        expect(answers.priorities[0]).toBe("safetyAssistance");
        expect(answers.priorities).not.toContain("comfort");
        expect(answers.priorities).toHaveLength(3);
        expect(order.filter((item) => item.filler)).toHaveLength(2);
    });

    it("keeps an explicitly rejected priority out even when too much else was dropped", () => {
        const u = readUnderstanding(
            wire({
                needs: [
                    {
                        id: "safety",
                        label: "Good safety features",
                        importance: "essential",
                        said: "you only care about safety",
                        priorities: ["safetyAssistance"],
                        evidence: [],
                        notInData: null,
                        status: "active",
                    },
                ],
                droppedPriorities: ["comfort", "cityParking", "practicality", "longDistance", "climateSuitability", "environmental"],
            }),
            EMPTY_UNDERSTANDING,
        );

        expect(toAnswers(base(), u).answers.priorities).toEqual(["safetyAssistance", "environmental", "climateSuitability"]);
    });

    it("treats a target as information, and only a hard maximum as a rule", () => {
        const target = readUnderstanding(wire({ budget: { kind: "target", monthly: 500, said: "around 500" } }), EMPTY_UNDERSTANDING);

        expect(toAnswers(base(), target).answers.preferences.monthlyBudget).toBe(DEFAULT_PREFERENCES.monthlyBudget);
    });

    it("describes a what-if as the change it makes", () => {
        const before = readUnderstanding(familyAndNerves, EMPTY_UNDERSTANDING, undefined, "2026-09");
        const after = readUnderstanding(wire({ budget: { kind: "hardMax", monthly: 600, said: "€100 more" } }), before, undefined, "2026-09");

        expect(diffUnderstanding(before, after)).toEqual([
            { label: "Budget", from: "€500/month maximum", to: "€600/month maximum" },
        ]);
    });
});

describe("explaining a match in the person's terms", () => {
    /* Two affordable cars, one with rear USB ports and no blind-spot warning. */
    const usbNoBlindSpot = garageCar({ id: 201, name: "Usb Hatch", customerMonthly: 420, extra: ["hasBackUSBPorts", "hasSplitFoldingRearSeats", "hasElectricTailgate"] });
    const blindSpotNoUsb = garageCar({ id: 202, name: "Watchful Estate", customerMonthly: 440, extra: ["hasBlindSpotAssist"] });
    const pricey = garageCar({
        id: 203,
        name: "Everything Suv",
        customerMonthly: 900,
        extra: ["hasBackUSBPorts", "hasBlindSpotAssist", "hasRearCrosswalkWarning", "hasSplitFoldingRearSeats", "hasElectricTailgate"],
    });

    const cars = [usbNoBlindSpot, blindSpotNoUsb, pricey];
    const u = readUnderstanding({ ...familyAndNerves, rental: null }, EMPTY_UNDERSTANDING, undefined, "2026-09");
    const translation = toAnswers(base(), u);
    const run = runLens(
        cars,
        { ...translation.answers, preferences: { ...translation.answers.preferences, monthlyKm: 500 } },
        "page",
        "",
    )!;

    it("stays inside the hard maximum, and says why the top scorer isn't the answer", () => {
        const story = tellFitStory(run, u, translation.lessRelevant, null);
        const budget = story.sections.find((section) => section.kind === "budget")!;

        expect(run.recommendation.winner.id).not.toBe(203);
        expect(story.eyebrow).toBe("Strongest match within your €500 limit");
        expect(budget.title).toBe("It stays within your €500 limit");
        expect(budget.lines.map((line) => line.text).join(" ")).toMatch(/Everything Suv scores higher overall.*breaks your maximum/);
    });

    it("connects needs to what FINN lists, and never assumes what it doesn't", () => {
        const story = tellFitStory(run, u, translation.lessRelevant, null);
        const winner = run.recommendation.winner;
        const kids = story.sections.find((section) => section.key === "kids-entertained")!;
        const lines = kids.lines.map((line) => line.text);

        expect(winner.id).toBe(201);
        expect(readEvidence(winner, "hasBackUSBPorts")).toBe("listed");
        expect(lines).toContain("Rear USB ports — could keep their tablets charged on long drives.");
        expect(lines.join(" ")).toMatch(/no information on a built-in rear entertainment system, so I'm not assuming it has one/);

        /* Adaptive cruise control was made less relevant by what the person is confident with. */
        const confidence = story.sections.find((section) => section.key === "confidence")!;
        expect(confidence.lines.map((line) => line.text).join(" ")).not.toMatch(/adaptive cruise/i);
    });

    it("names the catch, and a car within the limits that avoids it", () => {
        const story = tellFitStory(run, u, translation.lessRelevant, null);
        expect(readEvidence(run.recommendation.winner, "hasBlindSpotAssist")).toBe("notListed");
        expect(story.catch?.text).toBe("FINN doesn't list blind spot warning for this car — worth weighing for feeling safer on the road.");
        expect(story.catch?.alternative).toMatch(/^Watchful Estate has it, at about €\d+\/month — still within your maximum\.$/);
    });

    it("offers alternatives within the person's limits before ones that break them", () => {
        const alternatives = alternativesWithinLimits(run);

        expect(alternatives.map((car) => car.id)).toEqual([202, 203]);
        expect(alternatives[1]?.budget).toBe("over");
    });

    it("gives the model each car's evidence for the needs, and whether it's within limits", () => {
        const facts = evidenceForNeeds(run, u)!;
        const suv = facts.find((row) => row.car === "Everything Suv")!;

        expect(suv.withinYourConstraints).toBe(false);
        expect(suv.evidence["Rear USB ports"]).toBe("listed");
    });
});

describe("saying back only what the person said", () => {
    const told =
        "I have 2 young children. From the 8th of October until April. I have a total of 500 euros per month and I can't spend any more.";

    const understood = (): Understanding => ({
        ...EMPTY_UNDERSTANDING,
        budget: { kind: "hardMax", monthly: 500, said: "€500 and no more" },
        rental: { from: "2026-10", to: "2027-04", startDay: 8, said: "8 October until April" },
        context: [
            { label: "Two young children", said: "you have 2 young children" },
            { label: "Children aged 1 and 4", said: "they're 1 and 4" },
        ],
        needs: [
            {
                id: "kids",
                label: "Keeping children safe",
                importance: "essential",
                said: "your children are 1 and 4",
                priorities: ["safetyAssistance"],
                evidence: [],
                notInData: null,
                status: "active",
            },
        ],
    });

    it("drops a detail the model filled in, like children's ages nobody gave", () => {
        const { reply, understanding } = groundInWhatWasSaid(
            "Two young children and €500 as a firm ceiling. Since they're 1 and 4, I'll look at ISOFIX.",
            understood(),
            [told],
            new Date("2026-09-17"),
        );

        expect(reply).toBe("Two young children and €500 as a firm ceiling.");
        expect(understanding.context.map((item) => item.label)).toEqual(["Two young children"]);
        expect(understanding.needs[0]?.said).toBe("");
    });

    it("keeps numbers that came from them, or from the limits Lens read out of what they said", () => {
        const reply = "From 8 October 2026 to April 2027, with €500 as your maximum. Since they're 1 and 4, ISOFIX matters.";
        const later = [told, "One is 1 and the other is 4."];

        expect(groundInWhatWasSaid(reply, understood(), later, new Date("2026-09-17")).reply).toBe(reply);
    });
});
