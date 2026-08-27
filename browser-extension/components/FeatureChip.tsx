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

/** How much the user said this one mattered, as a colour rather than a word. */
const TIER_DOT: Record<keyof typeof TIERS, string> = {
    essential: "bg-finn-accent-blue",
    good: "bg-[#14B8A6]",
    luxury: "bg-[#8B5CF6]",
};

/**
 * A named feature, carrying both things the reader needs: what it is, and how
 * much they said it mattered.
 *
 * The tier is a coloured dot rather than the word "Essential" repeated down
 * every row — the label is the information, and printing the same three words
 * fifteen times is what makes a list unreadable. The word is still one hover
 * away, and a missing luxury extra still can't be mistaken for a missing
 * essential.
 */
export function FeatureChip({
    fact,
    tone,
}: {
    fact: FeatureFact;
    tone: FeatureChipTone;
}) {
    const tier = TIERS[fact.tier];

    return (
        <span
            className={[
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold",
                TONE_CLASS[tone],
            ].join(" ")}
        >
            <span
                className={[
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    TIER_DOT[fact.tier],
                    tone === "missing" ? "opacity-50" : "",
                ].join(" ")}
                title={`You marked this ${tier.inSentence}`}
                aria-label={`You marked this ${tier.inSentence}`}
            />

            <span className={tone === "missing" ? "line-through" : ""}>
                {fact.label}
            </span>

            {fact.explanation && (
                <InfoTip subject={fact.label}>{fact.explanation}</InfoTip>
            )}
        </span>
    );
}
