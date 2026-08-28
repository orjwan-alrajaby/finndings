import { useState } from "react";
import {
    FEATURE_IMPORTANCE,
    IMPORTANCE_SCALE,
    MAX_FEATURES_PER_CATEGORY,
    SUGGESTED_CATEGORY_FEATURES,
} from "@/lib/reasoning-engine/constants";
import type {
    CategoryId,
    FeatureId,
    FeatureImportance,
    FeatureSelection,
} from "@/lib/reasoning-engine/types";
import { FeatureOption } from "@/components/FeatureOption";

interface FeatureInfluencePickerProps {
    categoryId: CategoryId;
    /** What this priority is called, for the nothing-picked line. */
    categoryLabel: string;
    /** What the user has picked out. May legitimately be empty. */
    features: FeatureSelection;
    /** Everything this priority offers, most relevant first. */
    availableFeatures: FeatureId[];
    /**
     * Where this priority sits in the user's order, when the caller knows.
     * Only used to say the nothing-picked line a little louder at the top.
     */
    rank?: number;
    onToggleFeature: (feature: FeatureId) => void;
    onImportanceChange: (
        feature: FeatureId,
        importance: FeatureImportance,
    ) => void;
}

/**
 * The two questions this step actually asks, in order.
 *
 * One: which features do you want us to pay extra attention to? Two: how much
 * should each of them count? The second only ever appears on rows that
 * answered the first, which is what keeps this from being the old tier matrix
 * — there, every feature in a catalogue of up to fifteen carried three radio
 * buttons whether the reader cared about it or not.
 *
 * The framing everything here has to protect: a pick is extra influence, not
 * a requirement, and the features nobody picked still count. The category's
 * whole catalogue is what a car is judged against either way; picking is the
 * user leaning on part of it. Every line of copy below is written so that a
 * reader who picks five safety features cannot come away thinking Lens has
 * stopped looking at the rest.
 *
 * Shared by step 3 and the settings priority editor so the two never drift
 * into explaining the same model two different ways.
 */
export function FeatureInfluencePicker({
    categoryId,
    categoryLabel,
    features,
    availableFeatures,
    rank,
    onToggleFeature,
    onImportanceChange,
}: FeatureInfluencePickerProps) {
    /*
     * Whether the user has moved an influence level yet, which is the moment
     * the second half of the model becomes worth explaining. Local because it
     * is about this reader's progress through the control, not about their
     * preferences — nothing here belongs in saved state.
     */
    const [hasGraded, setHasGraded] = useState(false);

    const importanceOf = new Map(
        features.map((preference) => [preference.key, preference.importance]),
    );

    const suggested = new Set(SUGGESTED_CATEGORY_FEATURES[categoryId] ?? []);
    const atMax = features.length >= MAX_FEATURES_PER_CATEGORY;
    const remaining = MAX_FEATURES_PER_CATEGORY - features.length;

    /*
     * The teaching line rides on the first thing the user ever picks here,
     * and only while it is the only thing they have picked. One sentence, in
     * the place where the question just came up, and gone before it can
     * become wallpaper.
     */
    const firstPick =
        features.length === 1 ? (features[0]?.key ?? null) : null;

    const hintFor = (feature: FeatureId): string | undefined => {
        if (feature !== firstPick) return undefined;

        return hasGraded
            ? "The more important you mark it, the more influence it has on the recommendation."
            : "We'll give this feature extra influence when comparing your cars.";
    };

    return (
        <div className="space-y-4">
            <div>
                <div className="min-w-0">
                    <p className="text-sm font-black text-finn-highlight-navy">
                        What should influence your decision?
                    </p>

                    <p className="mt-1 text-xs leading-5 text-finn-iron">
                        Pick up to {MAX_FEATURES_PER_CATEGORY} features you
                        care about most. We'll still judge the car on{" "}
                        {categoryLabel.toLowerCase()} as a whole, but your
                        picks get extra influence in the recommendation. Tap
                        the ⓘ if a name means nothing to you.
                    </p>

                    <p className="mt-2 inline-flex rounded-full bg-finn-influence-red-pale px-3 py-1.5 text-[11px] font-bold leading-4 text-finn-influence-red">
                        Think of these as your strongest signals — not
                        requirements.
                    </p>
                </div>

                <SelectionCounter count={features.length} />
            </div>

            {features.length > 0 && <InfluenceLegend />}

            <div className="grid gap-2">
                {availableFeatures.map((feature) => (
                    <FeatureOption
                        key={feature}
                        feature={feature}
                        importance={importanceOf.get(feature) ?? null}
                        disabled={!importanceOf.has(feature) && atMax}
                        disabledReason={`You've picked ${MAX_FEATURES_PER_CATEGORY} already — unpick one to swap`}
                        suggested={suggested.has(feature)}
                        hint={hintFor(feature)}
                        onToggle={() => onToggleFeature(feature)}
                        onImportanceChange={(importance) => {
                            setHasGraded(true);
                            onImportanceChange(feature, importance);
                        }}
                    />
                ))}
            </div>

            {/*
              * At the cap, and below it, the same point: five is what we
              * asked for, not a budget the user overspent.
              */}
            {atMax ? (
                <p className="text-[11px] leading-4 text-finn-iron">
                    That's your {MAX_FEATURES_PER_CATEGORY} strongest signals.
                    Want a different one? Unpick something to swap it in.
                </p>
            ) : features.length > 0 ? (
                <p className="text-[11px] leading-4 text-finn-iron">
                    Room for {remaining} more, if anything else here matters
                    this much to you.
                </p>
            ) : null}

            {features.length === 0 && (
                <NothingPickedHint
                    label={categoryLabel}
                    rank={rank}
                    catalogueSize={availableFeatures.length}
                />
            )}
        </div>
    );
}

/**
 * How many of the five are spoken for, and what that means.
 *
 * The number alone invites the wrong reading — a form with five blanks in it.
 * The line under it says what the count is for, and at the cap says plainly
 * what those five will do, because that is the sentence a reader most needs
 * to have right.
 */
function SelectionCounter({ count }: { count: number }) {
    const full = count >= MAX_FEATURES_PER_CATEGORY;

    return (
        <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span
                className={[
                    "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black",
                    count
                        ? "bg-finn-pale-blue text-finn-accent-blue"
                        : "bg-finn-cotton text-finn-iron",
                ].join(" ")}
            >
                {count} / {MAX_FEATURES_PER_CATEGORY} features selected
            </span>

            <p className="text-[11px] leading-4 text-finn-iron">
                {full
                    ? "These are the features we'll give extra influence."
                    : `Choose the ${MAX_FEATURES_PER_CATEGORY} things that matter most to you.`}
            </p>
        </div>
    );
}

/**
 * What the three colours mean, said once per priority.
 *
 * It appears with the first pick, which is the first time an influence
 * control is on screen — before that there is nothing to decode, and a legend
 * for controls the reader cannot see is just more to read. The words carry
 * the meaning and the swatches carry the hierarchy; neither is doing the
 * job alone.
 */
function InfluenceLegend() {
    return (
        <div className="rounded-2xl bg-white/70 px-3.5 py-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-finn-iron">
                How much should this feature influence your decision?
            </p>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
                {IMPORTANCE_SCALE.map((level) => {
                    const meta = FEATURE_IMPORTANCE[level];

                    return (
                        <span
                            key={level}
                            className="inline-flex items-center gap-1.5"
                        >
                            <span
                                className={[
                                    "h-2.5 w-2.5 rounded-full",
                                    meta.dotClass,
                                ].join(" ")}
                            />

                            <span
                                className={[
                                    "text-[11px] font-bold",
                                    meta.accentTextClass,
                                ].join(" ")}
                            >
                                {meta.label}
                            </span>
                        </span>
                    );
                })}

                <span className="text-[11px] leading-4 text-finn-iron">
                    More influence as you go up. None of them rules a car out.
                </span>
            </div>
        </div>
    );
}

/**
 * What happens when the user picks nothing.
 *
 * Deliberately not a warning. "I want the safest car, I just don't have
 * opinions about which systems it has" is a complete preference, and the only
 * thing the reader needs to know is what Lens does with it — which is the
 * whole catalogue, the same denominator a car with five picks is judged
 * against. Said slightly more prominently for a top-ranked priority, where
 * the question is most likely to occur to them.
 */
function NothingPickedHint({
    label,
    rank,
    catalogueSize,
}: {
    label: string;
    rank?: number;
    catalogueSize: number;
}) {
    return (
        <div className="rounded-2xl bg-finn-snow px-3.5 py-3">
            <p className="text-[11px] font-black text-finn-black">
                No specific features selected
            </p>

            <p className="mt-1 text-[11px] leading-5 text-finn-iron">
                {rank === 1 ? (
                    <>
                        {label} is your top priority, and we'll judge it on the
                        category as a whole — all {catalogueSize} systems this
                        priority covers. Pick a few out if you want some of
                        them to count for more.
                    </>
                ) : (
                    <>
                        We'll judge this priority on the category as a whole —
                        all {catalogueSize} systems it covers. Pick a few out
                        if you want some of them to count for more.
                    </>
                )}
            </p>
        </div>
    );
}
