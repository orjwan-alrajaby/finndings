import { CATEGORIES } from "@/lib/reasoning-engine/constants";

/**
 * A colour per mark, so a priority is the same colour wherever it appears.
 *
 * Seven of these are not chosen here. `CATEGORIES` has carried a `color` for
 * each priority since long before anything drew one, and reading it back is
 * what keeps the safety mark and the safety category from being two different
 * blues that nobody remembers to reconcile.
 *
 * The mark is keyed rather than the category, so the shield the Nervous Driver
 * profile shows is the same blue as the shield the safety priority shows —
 * they are the same mark, and a reader has no reason to think otherwise.
 *
 * The last three have no category to inherit from. Compass and scale belong to
 * profiles, which carry no colour of their own, and `car` is the fallback for
 * a custom priority; they are drawn from the same 600-weight family as the
 * seven so the set reads as one ramp rather than seven plus three.
 *
 * This lives apart from the React component that usually draws these, because
 * the panel injected into finn.com is not React and needs the same answer.
 */
export const MARK_COLOUR: Record<string, string> = {
    shield: CATEGORIES.safetyAssistance.color,
    users: CATEGORIES.familyFriendly.color,
    backpack: CATEGORIES.practicality.color,
    road: CATEGORIES.longDistance.color,
    snowflake: CATEGORIES.climateSuitability.color,
    leaf: CATEGORIES.environmental.color,
    sofa: CATEGORIES.comfort.color,

    compass: "#4F46E5",
    scale: "#7C3AED",
    car: "#475569",
};
