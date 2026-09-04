import type { FeatureSelection } from "./reasoning-engine/types";

/**
 * Whether two feature selections say the same thing.
 *
 * Used by the priority editor to know whether it is holding work the reader
 * would lose. Order matters here and that is deliberate rather than lazy: the
 * list is stored as written and rendered in that order, so a reader who has
 * reordered their picks has changed something even though the set is
 * identical.
 */
export function sameFeatureSelection(
    a: FeatureSelection,
    b: FeatureSelection,
): boolean {
    return (
        a.length === b.length &&
        a.every(
            (pick, index) =>
                b[index]?.key === pick.key &&
                b[index]?.importance === pick.importance,
        )
    );
}
