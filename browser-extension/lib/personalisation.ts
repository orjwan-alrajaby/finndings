import { hasSavedLensSettings } from "@/lib/reasoning-engine";

/**
 * Telling Lens's opinion from the reader's.
 *
 * Lens ships defaults now — a priority order, and five features raised in
 * each priority, drawn from what large samples of car buyers say they want.
 * That is what lets the product answer a question on the first page load
 * instead of showing a form. It is also the thing most easily turned into a
 * lie: a verdict built from someone else's assumptions, presented as "how
 * this car fits *you*".
 *
 * So one rule, and this module exists to keep it in one place: **wherever a
 * verdict is shown before the reader has saved anything, it is labelled as
 * Lens's default and the way to change it is next to the label.** Never
 * hidden, never softened into "personalise for better results", and never
 * left to the reader to infer from a settings page they haven't opened.
 *
 * `hasSavedLensSettings` is the whole test. It reads absent storage keys, so
 * shipping defaults did not change what it answers: a fresh install is still
 * "they have told us nothing", which is exactly what it needs to mean.
 */

export const DEFAULTS_TITLE = "You're seeing Lens's defaults";

/**
 * Worded to own the pronoun, not just to precede it.
 *
 * The reasoning engine writes "you picked out adaptive cruise control" —
 * correctly, because it is reasoning about a selection and has no idea whose
 * it is. Read under a notice that only said "these are our defaults", that
 * sentence would contradict it. Read under one that says Lens assumed these
 * *on the reader's behalf* and that the reading calls them theirs, it doesn't.
 */
export const DEFAULTS_BODY =
    "You haven't told Lens what matters to you yet, so it has assumed for " +
    "you: a starting priority order, and the five features most drivers say " +
    "they care about inside each one. Everything below is really measured — " +
    "and calls those picks yours. Change them and they will be.";

/** Said where there is only room for one line. */
export const DEFAULTS_SHORT =
    "Measured against picks Lens assumed for you, not ones you gave it.";

export const DEFAULTS_ACTION = "Make it yours";

/**
 * Whether the reader has answered for themselves.
 *
 * False means the product is running on its own opinion, which is a fine
 * state to be in and a bad state to be quiet about.
 */
export async function isPersonalised(): Promise<boolean> {
    try {
        return await hasSavedLensSettings();
    } catch (error) {
        console.error("FINN Lens: could not read your settings", error);

        /*
         * Unreadable settings are settings we cannot claim are the reader's.
         * Saying "these are our defaults" when they were in fact personalised
         * is a much smaller wrong than the other way round.
         */
        return false;
    }
}
