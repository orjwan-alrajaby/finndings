import type { Answers } from "@/entrypoints/compare/store";
import type { WireQuestion } from "@/lib/lens-ai/contract";
import { demoCars } from "@/lib/demo-cars";
import type { PinnedFinnCar } from "@/lib/types";

import { tellFitStory, type FitStory } from "./fit-story";
import type { EvidenceId } from "./evidence";
import { alternativesWithinLimits, runLens, summariseMatch, type CarLine, type LensRun, type MatchSummary } from "./run";
import { EMPTY_UNDERSTANDING, readUnderstanding, toAnswers, type Translation, type Understanding } from "./understanding";

/**
 * One Ask Lens conversation, for the setup flow to show before anyone has a key.
 *
 * Only the model's half is scripted: the message, the reply and the reading
 * of it into needs and limits — which is what a model would return. That
 * reading then goes through the same `readUnderstanding` the live chat uses,
 * and everything after it is real: the engine ranks the demo cars against
 * the reader's own settings, and the fit story is told from that run. So the
 * pick shown during setup is the pick Lens would actually make.
 */

export const DEMO_MESSAGE =
    "I mostly drive in the city and I'm honestly bad at parking. I've got a toddler in the back, and I can't go over €650 a month, all in.";

export const DEMO_REPLY = "City driving, a toddler in the back and parking you'd rather not think about — with €650 as a hard limit.";

const DEMO_READING = {
    tension: "Something easy to park that still makes getting a child seat in and out easy.",
    budget: { kind: "hardMax", monthly: 650, said: "you can't go over €650 a month" },
    rental: null,
    monthlyKm: null,
    needs: [
        {
            id: "parking",
            label: "Parking without the stress",
            importance: "essential",
            said: "you're bad at parking",
            priorities: ["cityParking"],
            evidence: [
                { id: "hasThreeSixtyDegreesCamera", use: "shows everything around the car while you park" },
                { id: "hasParkingAssistant", use: "can steer into the space for you" },
                { id: "hasOneEightyDegreesReversingCamera", use: "shows what's behind you" },
                { id: "hasParkingSensors", use: "warn you before you touch anything" },
                { id: "compactLength", use: "fits more spaces" },
            ],
            notInData: null,
            status: "active",
        },
        {
            id: "toddler",
            label: "A toddler in the back",
            importance: "important",
            said: "you've got a toddler in the back",
            priorities: ["practicality"],
            evidence: [
                { id: "hasIsofix", use: "anchors the child seat" },
                { id: "rearDoors", use: "make lifting them in easier" },
                { id: "hasBackUSBPorts", use: "could keep a tablet charged" },
            ],
            notInData: null,
            status: "active",
        },
    ],
    context: [{ label: "Mostly city driving", said: "you mostly drive in the city" }],
    capabilities: [],
    droppedPriorities: [],
    notModelled: [],
    cleared: [],
};

export const DEMO_QUESTION: WireQuestion = {
    ask: "Where do you usually park?",
    why: "tight garages and street parking call for different help",
    options: ["On the street", "A tight garage", "A car park"],
    blocking: false,
    affects: ["hasThreeSixtyDegreesCamera", "hasParkingAssistant"],
};

/** One thing Lens offers to check, so setup shows that it teaches rather than assumes. */
export const DEMO_SUGGESTIONS: { id: EvidenceId; why: string; needId: string }[] = [
    { id: "hasThreeSixtyDegreesCamera", why: "it shows the kerb and the car's corners while you park", needId: "parking" },
];

export interface DemoConversation {
    cars: PinnedFinnCar[];
    understanding: Understanding;
    translation: Translation;
    run: LensRun | null;
    story: FitStory | null;
    match: MatchSummary | null;
    alternatives: CarLine[];
}

/** The scripted reading, run for real over the demo cars against `base`. */
export function demoConversation(base: Answers): DemoConversation {
    const cars = demoCars();
    const understanding = readUnderstanding(DEMO_READING, EMPTY_UNDERSTANDING);
    const translation = toAnswers(base, understanding);
    const run = runLens(cars, translation.answers, "page", "Comparing 3 cars on this page");

    return {
        cars,
        understanding,
        translation,
        run,
        story: run ? tellFitStory(run, understanding, translation.lessRelevant, null) : null,
        match: run ? summariseMatch(run) : null,
        alternatives: run ? alternativesWithinLimits(run) : [],
    };
}
