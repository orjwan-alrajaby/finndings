import type { FeatureFact } from "@/lib/reasoning-engine/narrative";
import { FEATURE_IMPORTANCE } from "@/lib/reasoning-engine/constants";
import { FEATURE_CHIP_TONE, type FeatureChipTone } from "@/lib/feature-copy";
import { InfoTip } from "./InfoTip";

export type { FeatureChipTone };

/*
 * There used to be a fourth tone, `quiet`, which was cotton's twin in white:
 * cotton disappeared on the tinted group cards the fit panel drew, so that one
 * surface needed a chip of its own. The groups are rows of a white table now,
 * with the colour on the row's edge, and cotton is legible on all of them.
 */

/**
 * A named feature, with its explanation attached.
 *
 * A chip for something the user picked out carries a dot in the colour of
 * the level they gave it, so the scale they met in the picker still reads
 * here — without which "very important" and "important" would look identical
 * after the fact. Only the top level is also spelled out, because that is the
 * one that changes how a gap should be read; writing "very important" on
 * every chip would be noise, since that is simply what a pick is until they
 * say otherwise.
 *
 * Features the user never picked have no level and get no dot: they counted,
 * but the user said nothing about them.
 */
export function FeatureChip({
    fact,
    tone,
    struck,
    withLevel = true,
}: {
    fact: FeatureFact;
    tone: FeatureChipTone;
    /**
     * Whether the car lacks this. Defaults to the `missing` tone, which is
     * what a missing pick is — but a gap in something nobody asked for is
     * struck through without being coloured like a problem.
     */
    struck?: boolean;
    /**
     * Whether the chip has to say the level itself.
     *
     * False where the chips are already sorted under a heading naming it, and
     * tinted in its colour: a dot and a badge saying the same thing a third
     * time is noise, not emphasis.
     */
    withLevel?: boolean;
}) {
    const level =
        withLevel && fact.importance ? FEATURE_IMPORTANCE[fact.importance] : null;
    const lineThrough = struck ?? tone === "missing";

    return (
        <span
            className={[
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold",
                FEATURE_CHIP_TONE[tone],
            ].join(" ")}
        >
            {level && (
                <span
                    title={`You said this should count ${level.inSentence}`}
                    className={[
                        "h-2 w-2 shrink-0 rounded-full",
                        level.dotClass,
                    ].join(" ")}
                />
            )}

            <span className={lineThrough ? "line-through" : ""}>
                {fact.label}
            </span>

            {withLevel && fact.importance === "high" && (
                <span
                    className="text-[9px] font-black uppercase tracking-wide opacity-70"
                    title="You said this should have the most influence on your decision"
                >
                    {FEATURE_IMPORTANCE.high.badgeLabel}
                </span>
            )}

            {fact.explanation && (
                <InfoTip subject={fact.label}>{fact.explanation}</InfoTip>
            )}
        </span>
    );
}
