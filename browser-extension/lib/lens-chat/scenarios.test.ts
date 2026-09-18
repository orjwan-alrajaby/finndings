import { describe, expect, it } from "vitest";

import { copyFeatures, type Answers } from "@/entrypoints/compare/store";
import {
    DEFAULT_CATEGORY_FEATURES,
    DEFAULT_PREFERENCES,
    DEFAULT_PRIORITIES,
} from "@/lib/reasoning-engine/constants";
import { fleet } from "@/lib/reasoning-engine/test-data/fleet";
import type { PinnedFinnCar } from "@/lib/types";

import { evidenceMet, measuredDisplay, readEvidence } from "./evidence";
import { tellFitStory, type FitStory } from "./fit-story";
import { runLens } from "./run";
import { SCENARIOS, type Scenario } from "./scenarios.fixture";
import { EMPTY_UNDERSTANDING, readUnderstanding, toAnswers, type Translation, type Understanding } from "./understanding";

/*
 * Ten people, through everything that runs without a model.
 *
 * The fixtures are what a good reading of each message looks like; these are
 * the promises Lens makes about what happens to it — that nothing the person
 * said is quietly dropped between the model and the engine, that a limit is a
 * limit, that a need is answered with evidence rather than with a score, and
 * that what FINN doesn't publish is said out loud.
 */

const base = (): Answers => ({
    priorities: [...DEFAULT_PRIORITIES],
    preferences: { ...DEFAULT_PREFERENCES },
    features: copyFeatures(DEFAULT_CATEGORY_FEATURES),
    basedOn: null,
});

const cars: PinnedFinnCar[] = fleet().slice(0, 24);

interface Read {
    understanding: Understanding;
    translation: Translation;
    story: FitStory;
    winner: PinnedFinnCar;
    monthly: number;
}

function read(scenario: Scenario, previous = EMPTY_UNDERSTANDING): Read {
    const understanding = readUnderstanding(scenario.reading, previous, undefined, "2026-09");
    const translation = toAnswers(base(), understanding);
    const run = runLens(cars, translation.answers, "page", "Comparing 24 cars on this page")!;

    return {
        understanding,
        translation,
        story: tellFitStory(run, understanding, translation.lessRelevant, null),
        winner: run.recommendation.winner,
        monthly: run.recommendation.context.costs[run.recommendation.winner.id]!.totalMonthly,
    };
}

const scenario = (id: string): Scenario => SCENARIOS.find((item) => item.id === id)!;
const lines = (story: FitStory): string => story.sections.flatMap((section) => section.lines.map((line) => line.text)).join(" ");
const sectionFor = (story: FitStory, needId: string) => story.sections.find((section) => section.key === needId);

describe("every scenario, end to end", () => {
    for (const item of SCENARIOS) {
        describe(item.id, () => {
            const { understanding, translation, story } = read(item);

            it("keeps every piece of evidence the reading asked for", () => {
                const asked = item.reading.needs.flatMap((need) => need.evidence.map((entry) => entry.id));
                const kept = understanding.needs.flatMap((need) => need.evidence.map((entry) => entry.id));
                const capability = understanding.capabilities.flatMap((cap) => cap.lessRelevant);

                for (const id of asked) {
                    /* Evidence a capability made less relevant is meant to go; nothing else is. */
                    if (!capability.includes(id as never)) expect(kept).toContain(id);
                }
            });

            it("gives every need either evidence or a plain statement that FINN doesn't publish it", () => {
                for (const need of understanding.needs) {
                    expect(need.evidence.length > 0 || need.notInData).toBeTruthy();
                }
            });

            it("answers each need with what this car has, not with a score", () => {
                for (const need of understanding.needs.filter((item) => item.status === "active")) {
                    const section = sectionFor(story, need.id);

                    expect(section, need.id).toBeDefined();
                    expect(section!.lines.length).toBeGreaterThan(0);
                }

                expect(lines(story)).not.toMatch(/scored|points|weighting/i);
            });

            it("ranks only priorities the reading asked for, beyond the fillers Lens needs", () => {
                const asked = new Set(understanding.needs.flatMap((need) => need.priorities));

                for (const entry of translation.order) {
                    if (!entry.filler) expect([...asked]).toContain(entry.id);
                }
            });
        });
    }
});

describe("what the person said about money", () => {
    it("holds a hard maximum, and names the better car it ruled out", () => {
        const { story, monthly } = read(scenario("city-parent"));

        expect(monthly).toBeLessThanOrEqual(450);
        expect(story.eyebrow).toContain("within your €450");
        expect(lines(story)).toMatch(/scores higher overall, but .* breaks your maximum/);
    });

    it("keeps a soft figure from becoming no figure at all", () => {
        const { translation, story } = read(scenario("commuter"));

        /* "Around €600, a bit more for a good reason" — a line, with headroom. */
        expect(translation.answers.preferences.monthlyBudget).toBe(690);
        expect(story.sections[0]?.title).toMatch(/€600/);
    });

    it("picks a small car for someone who wants one, rather than a big one they could stretch to", () => {
        const { monthly, story } = read(scenario("small-car-long-trips"));

        expect(monthly).toBeLessThanOrEqual(518);
        expect(sectionFor(story, "town")?.lines[0]?.text).toMatch(/m long/);
    });
});

describe("what people say they don't want", () => {
    it("keeps 'no massive SUV' as something Lens checks, not as a dropped remark", () => {
        const { understanding, translation, story } = read(scenario("no-big-suv"));
        const need = understanding.needs.find((item) => item.id === "not-big")!;

        expect(need.evidence.map((entry) => entry.id)).toEqual(["suvBody", "compactLength", "compactWidth"]);
        expect(translation.order[0]?.id).toBe("cityParking");
        expect(sectionFor(story, "not-big")?.lines.map((line) => line.text).join(" ")).toMatch(/m long/);
    });

    it("drops what they said they don't care about instead of listing it as a limitation", () => {
        const { understanding } = read(scenario("city-parent"));

        expect(understanding.notModelled).toEqual([]);
    });

    it("keeps what they do want and Lens can't check", () => {
        const { understanding } = read(scenario("commuter"));

        expect(understanding.notModelled.map((item) => item.said)).toEqual(["sensitive to road noise"]);
    });
});

describe("what someone is already confident about", () => {
    it("leaves the gap-keeping assistance out and looks at what's beside them instead", () => {
        const { understanding, translation, story } = read(scenario("nervous-motorway"));
        const evidence = understanding.needs.flatMap((need) => need.evidence.map((entry) => entry.id));

        expect(evidence).not.toContain("hasAdaptiveCruiseControl");
        expect(evidence).not.toContain("driverAssistLevel2");
        expect(evidence).toContain("hasBlindSpotAssist");
        expect(translation.order[0]?.id).toBe("safetyAssistance");
        expect(sectionFor(story, "around-me")?.lines.map((line) => line.text).join(" ")).toMatch(/beside you|next lane/i);
    });
});

describe("what FINN does publish, and Lens used to guess at", () => {
    it("reads the body type FINN files rather than inferring it from length", () => {
        const { story } = read(scenario("no-big-suv"));
        const section = sectionFor(story, "not-big")!;
        const bodyLine = section.lines.find((line) => /files it as/.test(line.text))!;

        expect(bodyLine.text).toMatch(/files it as (a|an) /);
        /* The winner isn't an SUV, which is what the reader asked for. */
        expect(bodyLine.tone).toBe("good");
    });

    it("marks an SUV as the bad news for someone who didn't want one", () => {
        const suv = cars.find((car) => /suv/i.test(car.vehicleType))!;
        const notSuv = cars.find((car) => !/suv/i.test(car.vehicleType))!;

        expect(evidenceMet(suv, "suvBody")).toBe(false);
        expect(evidenceMet(notSuv, "suvBody")).toBe(true);
    });

    it("answers a winter need from FINN's tyre field, and says so when it's missing", () => {
        const car = cars[0]!;

        expect(readEvidence({ ...car, tyres: "allSeason" }, "winterReadyTyres")).toBe("listed");
        expect(measuredDisplay({ ...car, tyres: "summerAndWinter" }, "winterReadyTyres")).toMatch(/summer set and a winter set/);
        expect(readEvidence({ ...car, tyres: null }, "winterReadyTyres")).toBe("unknown");
    });
});

describe("what FINN doesn't publish", () => {
    it("says so for a rear-facing seat rather than implying Lens checked", () => {
        const { story } = read(scenario("rear-facing-parent"));
        const section = sectionFor(story, "seats-in")!;

        expect(section.lines.map((line) => line.text).join(" ")).toMatch(
            /FINN doesn't publish how much room there is behind the front seats/,
        );
    });

    it("quotes FINN's boot figure with the caveat its own field carries", () => {
        const { story } = read(scenario("winter-outdoors"));

        const boot = sectionFor(story, "muddy-kit")!.lines.map((line) => line.text).join(" ");

        expect(boot).toMatch(/L boot/);
        expect(boot).toMatch(/doesn't say whether that's with the rear seats up or folded/);
    });

    it("doesn't offer range as a fact about a car that isn't electric", () => {
        const { story } = read(scenario("commuter"));
        const range = sectionFor(story, "range")!.lines.map((line) => line.text).join(" ");

        expect(range).toMatch(/km of range|isn't electric/);
    });
});

describe("keeping context out of the ranking", () => {
    it("doesn't turn air conditioning into a winter priority", () => {
        const { translation } = read(scenario("knows-nothing"));

        expect(translation.order.map((entry) => entry.id)).not.toContain("climateSuitability");
    });

    it("keeps a town car and a motorway car as two different needs", () => {
        const { translation } = read(scenario("small-car-long-trips"));
        const ranked = translation.order.filter((entry) => !entry.filler).map((entry) => entry.id);

        expect(ranked).toEqual(["cityParking", "longDistance"]);
    });
});

describe("corrections, mid-conversation", () => {
    const correct = (id: string) => {
        const item = scenario(id);
        const first = read(item);
        const understanding = readUnderstanding(item.correction!.reading, first.understanding, undefined, "2026-09");

        return { first, understanding, translation: toAnswers(base(), understanding) };
    };

    it("tightens a budget when the person insists on it", () => {
        const { understanding, translation } = correct("rear-facing-parent");

        expect(understanding.budget).toMatchObject({ kind: "hardMax", monthly: 500 });
        expect(translation.answers.preferences.monthlyBudget).toBe(500);
        /* The needs from the first message are still there. */
        expect(understanding.needs.map((need) => need.id)).toContain("stroller");
    });

    it("re-ranks when something becomes more important, keeping what came before", () => {
        const { understanding, translation } = correct("city-parent");

        expect(translation.order[0]?.id).toBe("safetyAssistance");
        expect(understanding.needs.map((need) => need.id)).toEqual(
            expect.arrayContaining(["safety", "parking", "child-seat", "shopping"]),
        );
    });

    it("softens a need instead of forgetting it when the person changes their mind", () => {
        const { understanding, translation } = correct("no-big-suv");
        const stillSmall = understanding.needs.find((need) => need.id === "not-big")!;

        expect(stillSmall.importance).toBe("niceToHave");
        expect(stillSmall.status).toBe("active");
        expect(translation.order.map((entry) => entry.id)).toContain("longDistance");
    });

    it("carries a what-if budget without losing the needs behind it", () => {
        const { understanding } = correct("commuter");

        expect(understanding.budget).toMatchObject({ kind: "target", monthly: 650 });
        expect(understanding.needs.map((need) => need.id)).toEqual(expect.arrayContaining(["range", "comfort"]));
    });
});

describe("a need the model left unplaced", () => {
    it("still counts where its evidence is scored", () => {
        const understanding = readUnderstanding(
            {
                ...scenario("city-parent").reading,
                needs: [
                    {
                        id: "seats",
                        label: "Room for the child seat",
                        importance: "essential",
                        said: "your child is in a car seat",
                        priorities: [],
                        evidence: [{ id: "hasIsofix", use: "anchors the seat" }],
                        notInData: null,
                        status: "active",
                    },
                ],
            },
            EMPTY_UNDERSTANDING,
            undefined,
            "2026-09",
        );

        expect(understanding.needs[0]?.priorities).toEqual(["practicality"]);
        expect(toAnswers(base(), understanding).order[0]?.id).toBe("practicality");
    });
});

describe("what a use clause may claim", () => {
    it("drops a clause that puts a number on the evidence", () => {
        const understanding = readUnderstanding(
            {
                ...scenario("family-road-trip").reading,
                needs: [
                    {
                        id: "seats",
                        label: "Everyone in one car",
                        importance: "essential",
                        said: "there are five of you",
                        priorities: ["practicality"],
                        evidence: [
                            { id: "seatsFivePlus", use: "provides four seats so everyone travels together" },
                            { id: "rearDoors", use: "lets the children climb in themselves" },
                        ],
                        notInData: null,
                        status: "active",
                    },
                ],
            },
            EMPTY_UNDERSTANDING,
            undefined,
            "2026-09",
        );

        expect(understanding.needs[0]?.evidence).toEqual([
            { id: "seatsFivePlus", use: "" },
            { id: "rearDoors", use: "lets the children climb in themselves" },
        ]);
    });
});
