import { describe, expect, it } from "vitest";

import { LENS_PANEL_ICONS } from "./icons";
import {
    PANEL_ICON_NAMES,
    buildTable,
} from "../../../scripts/generate-lens-panel-icons.mjs";

/**
 * The committed icon shapes against the installed lucide.
 *
 * `icons.ts` is a copy, because the panel is not React and lucide-react's raw
 * shape data lives in untyped internal modules. A copy that nothing checks is
 * a copy that quietly goes stale, so this re-runs the same derivation the
 * generator does and compares. An `npm update` that redraws an icon turns into
 * a failure here rather than into a panel that disagrees with the rest of the
 * app about what a leaf looks like.
 *
 * If this fails, the fix is to run the generator, not to edit either side:
 *   node scripts/generate-lens-panel-icons.mjs
 */
describe("lens panel icons", () => {
    it("match the installed lucide-react", () => {
        expect(LENS_PANEL_ICONS).toEqual(buildTable());
    });

    it("cover every icon the panel asks for", () => {
        expect(Object.keys(LENS_PANEL_ICONS).sort()).toEqual(
            [...PANEL_ICON_NAMES].sort(),
        );
    });

    it("carry no React keys", () => {
        for (const shapes of Object.values(LENS_PANEL_ICONS)) {
            for (const [, attrs] of shapes) {
                expect(attrs).not.toHaveProperty("key");
            }
        }
    });
});
