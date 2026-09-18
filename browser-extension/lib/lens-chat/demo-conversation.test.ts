import { describe, expect, it } from "vitest";

import { DEFAULT_CATEGORY_FEATURES, DEFAULT_PREFERENCES, DEFAULT_PRIORITIES } from "@/lib/reasoning-engine/constants";
import { copyFeatures } from "@/entrypoints/compare/store";

import { DEMO_MESSAGE, DEMO_REPLY, demoConversation } from "./demo-conversation";

/*
 * The setup flow's example conversation. Its reading is scripted, so these
 * hold the script to the rules the live chat enforces, and hold the story the
 * screen tells — a limit that rules out the top scorer — to what the engine
 * actually does with the demo cars on Lens's defaults.
 */
describe("the setup flow's Lens AI example", () => {
    const demo = demoConversation({
        priorities: [...DEFAULT_PRIORITIES],
        preferences: { ...DEFAULT_PREFERENCES },
        features: copyFeatures(DEFAULT_CATEGORY_FEATURES),
        basedOn: null,
    });

    it("reads the example into limits and needs Lens can check", () => {
        expect(demo.understanding.budget).toMatchObject({ kind: "hardMax", monthly: 650 });
        expect(demo.understanding.needs.map((need) => need.id)).toEqual(["parking", "toddler"]);
        expect(demo.understanding.needs.every((need) => need.evidence.length > 0)).toBe(true);
    });

    it("says back only what the example message said", () => {
        for (const figure of DEMO_REPLY.match(/\d+/g) ?? []) {
            expect(DEMO_MESSAGE).toContain(figure);
        }
    });

    it("picks a car within the limit, and names the higher scorer that breaks it", () => {
        expect(demo.story?.eyebrow).toBe("Best match");
        expect(demo.alternatives[0]?.budget).toBe("over");
        expect(demo.story?.sections[0]?.lines.map((line) => line.text).join(" ")).toMatch(/scores higher overall, but .* breaks your maximum/);
        expect(demo.story?.catch).not.toBeNull();
    });
});
