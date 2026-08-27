import type { FeatureFact } from "@/lib/reasoning-engine/narrative";
import { FEATURE_IMPORTANCE } from "@/lib/reasoning-engine/constants";
import { InfoTip } from "./InfoTip";

/** What the chip is saying about this feature. */
export type FeatureChipTone = "present" | "missing" | "rivalOnly";

const TONE_CLASS: Record<FeatureChipTone, string> = {
    present: "bg-finn-pale-blue text-finn-highlight-navy",
    missing: "bg-finn-warning/10 text-finn-warning",
    rivalOnly: "bg-finn-cotton text-finn-iron",
};

/**
 * A named feature, with its explanation attached.
 *
 * Importance is shown only where the user actually set one — that is, only on
 * features they picked out — and only for high, which is the level that
 * changes how the reader should weigh a gap. Labelling every chip "medium"
 * would be noise, since medium is simply what a pick is until they say
 * otherwise.
 */
export function FeatureChip({
    fact,
    tone,
}: {
    fact: FeatureFact;
    tone: FeatureChipTone;
}) {
    const flagged = fact.importance === "high";

    return (
        <span
            className={[
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold",
                TONE_CLASS[tone],
            ].join(" ")}
        >
            <span className={tone === "missing" ? "line-through" : ""}>
                {fact.label}
            </span>

            {flagged && (
                <span
                    className="text-[9px] font-black uppercase tracking-wide opacity-70"
                    title={`You marked this ${FEATURE_IMPORTANCE.high.inSentence}`}
                >
                    High
                </span>
            )}

            {fact.explanation && (
                <InfoTip subject={fact.label}>{fact.explanation}</InfoTip>
            )}
        </span>
    );
}
