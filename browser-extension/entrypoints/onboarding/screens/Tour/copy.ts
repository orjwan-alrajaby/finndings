/**
 * Where the setup flow tells a reader to look.
 *
 * Held apart from the screen so it can be checked. These two sentences are
 * the most load-bearing copy in the product: a reader who has just been told
 * the pin is at the top right of the photo will go and look at the top right
 * of the photo, and if it has moved they will conclude the extension is not
 * working rather than that the sentence is stale. `copy.test.ts` reads the
 * classes the real controls are actually dressed in and fails if either of
 * these stops being true.
 */

export const PIN_WHERE = "The circle at the top right of every photo.";

export const BADGE_WHERE = "The pill at the bottom left of every photo.";

/**
 * What the corner each sentence names is, in Tailwind's words.
 *
 * The test compares these against `lib/card-controls.ts` rather than against
 * a hard-coded string, so moving a control fails the sentence about it.
 */
export const PIN_CORNER = ["top-4", "right-4"];

export const BADGE_CORNER = ["bottom-2", "left-2"];
