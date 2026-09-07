import {
    FEATURE_IMPORTANCE,
    STANDARD_INFLUENCE,
} from "@/lib/reasoning-engine/constants";
import type { FeatureImportance } from "@/lib/reasoning-engine/types";

import { Tip } from "./InfoTip";

/**
 * The level a feature is carrying, said in its own colour.
 *
 * One pill, drawn the same way everywhere a level is named — the picker in
 * the compare drawer, the priority editor in Settings, the chips in the
 * advice. It was three different things before: an outlined chip here, a
 * filled one there, uppercase in one place and not the other, which left the
 * reader learning the same scale three times over.
 *
 * Filled, in the level's own pale tint, because that is what the rest of the
 * product already uses for a stated level and the picker's own cards are
 * tinted the same way — the pill and the card it sits on now agree.
 *
 * The dot stays, and the label loses its capitals. The dot is the fast read
 * and the one a reader picks up from the control below it; all-caps was
 * costing legibility at 11px for emphasis the colour was already carrying,
 * and "Highly influential" is a phrase rather than a category header.
 */
export function InfluencePill({
    importance,
}: {
    /** Null means standard — the rung every feature starts on. */
    importance: FeatureImportance | null;
}) {
    const level = importance ? FEATURE_IMPORTANCE[importance] : null;

    /* Standard has a pill too: the question above it deserves an answer
       rather than a blank. */
    const badge = level ?? STANDARD_INFLUENCE;

    return (
        <Tip
            subject={badge.badgeLabel}
            trigger={
                <button
                    type="button"
                    aria-label={`${badge.badgeLabel} — what does this mean?`}
                    className={[
                        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1",
                        "text-[11px] font-black leading-4 transition",
                        "data-[state=open]:ring-2 data-[state=open]:ring-current/30",
                        level
                            ? level.chipClass
                            : "bg-finn-cotton text-finn-iron",
                    ].join(" ")}
                >
                    <span
                        aria-hidden="true"
                        className={[
                            "h-2 w-2 shrink-0 rounded-full",
                            badge.dotClass,
                        ].join(" ")}
                    />

                    {badge.badgeLabel}
                </button>
            }
        >
            {badge.meaning}
        </Tip>
    );
}
