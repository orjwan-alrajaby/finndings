import type {
    CategoryId,
    FeatureId,
    FeatureSelection,
} from "@/lib/reasoning-engine/types";
import {
    CATEGORIES,
    MAX_FEATURES_PER_CATEGORY,
} from "@/lib/reasoning-engine/constants";
import { CalculatedPriorityDetails } from "./CalculatedPriorityDetails";
import { FeatureOption } from "@/components/FeatureOption";

interface StepThreeFeatureEditorProps {
    categoryId: CategoryId;
    /** What the user has picked out for this run. May legitimately be empty. */
    features: FeatureSelection;
    /** Everything this priority offers, most relevant first. */
    availableFeatures: FeatureSelection;
    /** Where this priority sits in the user's order, for the empty-state hint. */
    rank: number;
    onToggleFeature: (feature: FeatureId) => void;
}

/**
 * Picking out what matters within one priority.
 *
 * One question, asked once: does this feature matter to you? The reader used
 * to be asked a second one — grade each feature Essential / Good to have /
 * Luxury extra — which is the same preference expressed twice in two units,
 * and which nobody has a reliable answer to in the abstract.
 *
 * Picking nothing is a supported answer, not an incomplete form.
 */
export function StepThreeFeatureEditor({
    categoryId,
    features,
    availableFeatures,
    rank,
    onToggleFeature,
}: StepThreeFeatureEditorProps) {
    const category = CATEGORIES[categoryId];

    if (category.numericOnly) {
        return (
            <div className="border-t border-white p-4">
                <CalculatedPriorityDetails categoryId={categoryId} />
            </div>
        );
    }

    const selected = new Set(features);
    const atMax = features.length >= MAX_FEATURES_PER_CATEGORY;

    return (
        <div className="space-y-4 border-t border-white p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-sm font-black text-finn-highlight-navy">
                        Pick up to {MAX_FEATURES_PER_CATEGORY} features that
                        matter most to you
                    </p>

                    <p className="mt-1 text-xs leading-5 text-finn-iron">
                        Optional — skip it and we'll judge this priority on the
                        equipment overall. Tap the ⓘ if a name means nothing to
                        you.
                    </p>
                </div>

                <span
                    className={[
                        "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black",
                        features.length
                            ? "bg-finn-pale-blue text-finn-accent-blue"
                            : "bg-finn-cotton text-finn-iron",
                    ].join(" ")}
                >
                    {features.length} / {MAX_FEATURES_PER_CATEGORY} selected
                </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
                {availableFeatures.map((feature) => (
                    <FeatureOption
                        key={feature}
                        feature={feature}
                        selected={selected.has(feature)}
                        disabled={!selected.has(feature) && atMax}
                        disabledReason={`You've picked ${MAX_FEATURES_PER_CATEGORY} already — unpick one to swap`}
                        onToggle={() => onToggleFeature(feature)}
                    />
                ))}
            </div>

            {atMax && (
                <p className="text-center text-[11px] leading-4 text-finn-iron">
                    That's {MAX_FEATURES_PER_CATEGORY} — unpick one to choose
                    something else.
                </p>
            )}

            {features.length === 0 && (
                <NothingPickedHint
                    label={category.label}
                    rank={rank}
                    catalogueSize={category.features.length}
                />
            )}
        </div>
    );
}

/**
 * What happens when the user picks nothing.
 *
 * Deliberately not a warning. "I want the safest car, I just don't have
 * opinions about which systems it has" is a complete preference, and the only
 * thing the reader needs to know is what Lens does with it. Said slightly
 * more prominently for a top-ranked priority, where the question is most
 * likely to occur to them.
 */
function NothingPickedHint({
    label,
    rank,
    catalogueSize,
}: {
    label: string;
    rank: number;
    catalogueSize: number;
}) {
    return (
        <p className="rounded-2xl bg-finn-snow px-3.5 py-3 text-[11px] leading-5 text-finn-iron">
            {rank === 1 ? (
                <>
                    <strong className="font-black text-finn-black">
                        {label} is your top priority.
                    </strong>{" "}
                    You haven't picked out any particular features, so we'll
                    compare cars across all {catalogueSize} systems this
                    priority covers.
                </>
            ) : (
                <>
                    Nothing picked out here, so we'll compare cars across all{" "}
                    {catalogueSize} systems this priority covers.
                </>
            )}
        </p>
    );
}
