import type { FeatureFact } from "@/lib/reasoning-engine/narrative";
import { TIERS } from "@/lib/reasoning-engine/constants";
import { InfoTip } from "./InfoTip";

/** What the chip is saying about this feature. */
export type FeatureChipTone = "present" | "missing" | "rivalOnly";

const TONE_CLASS: Record<FeatureChipTone, string> = {
    present: "bg-finn-pale-blue text-finn-highlight-navy",
    missing: "bg-finn-warning/10 text-finn-warning",
    rivalOnly: "bg-finn-cotton text-finn-iron",
};

/**
 * A named feature, with the explanation attached to it.
 *
 * The tier is shown because "essential" and "luxury extra" are the user's own
 * words for how much they cared, and a missing luxury extra should not look
 * like a missing essential.
 */
export function FeatureChip({
    fact,
    tone,
}: {
    fact: FeatureFact;
    tone: FeatureChipTone;
}) {
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

            <span className="text-[9px] font-black uppercase tracking-wide opacity-60">
                {TIERS[fact.tier].label}
            </span>

            {fact.explanation && (
                <InfoTip subject={fact.label}>{fact.explanation}</InfoTip>
            )}
        </span>
    );
}
