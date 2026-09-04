import type { FeatureFact } from "@/lib/reasoning-engine/narrative";
import { FEATURE_IMPORTANCE } from "@/lib/reasoning-engine/constants";
import { InfoTip } from "./InfoTip";

/**
 * What the chip is saying about this feature.
 *
 * `rivalOnly` and `quiet` say the same thing — this counted, but the reader
 * never singled it out — and differ only in what they are drawn on. Cotton
 * disappears on the tinted group cards the fit panel uses, so that surface
 * gets the white one. Same meaning, same weight, legible on both grounds.
 */
export type FeatureChipTone =
    | "present"
    | "missing"
    | "rivalOnly"
    | "quiet";

const TONE_CLASS: Record<FeatureChipTone, string> = {
    present: "bg-finn-pale-blue text-finn-highlight-navy",
    missing: "bg-finn-warning/10 text-finn-warning",
    rivalOnly: "bg-finn-cotton text-finn-iron",
    quiet: "bg-white text-finn-iron",
};

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
}: {
    fact: FeatureFact;
    tone: FeatureChipTone;
    /**
     * Whether the car lacks this. Defaults to the `missing` tone, which is
     * what a missing pick is — but a gap in something nobody asked for is
     * struck through without being coloured like a problem.
     */
    struck?: boolean;
}) {
    const level = fact.importance ? FEATURE_IMPORTANCE[fact.importance] : null;
    const lineThrough = struck ?? tone === "missing";

    return (
        <span
            className={[
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold",
                TONE_CLASS[tone],
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

            {fact.importance === "high" && (
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
