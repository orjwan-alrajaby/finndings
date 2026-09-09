import { describe, expect, it } from "vitest";

import { FIT_BADGE_BASE, pinButtonClasses } from "@/lib/card-controls";

import {
    BADGE_CORNER,
    BADGE_WHERE,
    PIN_CORNER,
    PIN_WHERE,
} from "./copy";

/**
 * The setup flow's directions against the controls they direct to.
 *
 * The mock on the tour screen cannot go stale — it reads its classes from the
 * same module the real controls do — but the *sentences* beside it can, and
 * they are the part a reader acts on. "The circle at the top right of every
 * photo" is a claim about `top-4 right-4`, and nothing but this connects the
 * two.
 *
 * If one of these fails, the control moved: fix the sentence and the corner
 * constant together, not the assertion.
 */
describe("the tour's directions", () => {
    it("send the reader to the corner the pin is really in", () => {
        const classes = pinButtonClasses(false).split(" ");

        for (const corner of PIN_CORNER) {
            expect(classes).toContain(corner);
        }

        expect(PIN_WHERE).toContain("top right");
    });

    it("send the reader to the corner the verdict pill is really in", () => {
        const classes = FIT_BADGE_BASE.split(" ");

        for (const corner of BADGE_CORNER) {
            expect(classes).toContain(corner);
        }

        expect(BADGE_WHERE).toContain("bottom left");
    });

    it("keeps the two controls in different corners", () => {
        expect(PIN_CORNER).not.toEqual(BADGE_CORNER);
    });
});
