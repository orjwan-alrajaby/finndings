import { useState } from "react";
import { PlusSmallIcon } from "@heroicons/react/24/outline";
import {
    FEATURE_IMPORTANCE,
    FEATURES,
    IMPORTANCE_SCALE,
    MAX_FEATURES_PER_CATEGORY,
} from "@/lib/reasoning-engine/constants";
import type {
    CategoryId,
    FeatureId,
    FeatureImportance,
    FeatureSelection,
} from "@/lib/reasoning-engine/types";
import { InfoTip } from "@/components/InfoTip";
import {
    FeatureOption,
    type FeatureElsewhere,
} from "@/components/FeatureOption";

export type PickedElsewhere = Partial<Record<FeatureId, FeatureElsewhere[]>>;

interface FeatureInfluencePickerProps {
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
    /** Features already picked under a different priority. */
    pickedElsewhere?: PickedElsewhere;
    onToggleFeature: (feature: FeatureId) => void;
    onImportanceChange: (
        feature: FeatureId,
        importance: FeatureImportance,
    ) => void;
}

/**
 * The two questions this step asks, as two columns.
 *
 * Left is the category — everything Lens looks at here, all of it counting.
 * Right is the five slots the reader can speak into. Moving a feature across
 * is the whole interaction, and it is a literal picture of what the engine
 * does with it: the catalogue stays whole on the left, and the thing they
 * moved is now somewhere it can be given a voice.
 *
 * A single mixed list could never show that. There, a picked feature and an
 * unpicked one sit in the same column looking like two states of one
 * checkbox, and "I ticked five things" is the only story available. Two
 * columns say the rest of it: the left column doesn't empty as you pick, it
 * just gets shorter, and it is still labelled as counting.
 *
 * Shared by step 3 and the settings priority editor so the two never drift
 * into explaining the same model two different ways.
 */
export function FeatureInfluencePicker({
    categoryLabel,
    features,
    availableFeatures,
    rank,
    pickedElsewhere,
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

    const atMax = features.length >= MAX_FEATURES_PER_CATEGORY;

    /*
     * Picks strongest first, so the right column reads as the ranking the
     * reader just built. Ties keep catalogue order, which is stable — a card
     * only ever moves because they moved it.
     */
    const picked = availableFeatures
        .filter((feature) => importanceOf.has(feature))
        .sort(
            (a, b) =>
                FEATURE_IMPORTANCE[importanceOf.get(b)!].weight -
                FEATURE_IMPORTANCE[importanceOf.get(a)!].weight,
        );

    const unpicked = availableFeatures.filter(
        (feature) => !importanceOf.has(feature),
    );

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
            ? "The more influence you give it, the more it counts towards the recommendation."
            : "We'll give this feature extra influence when comparing your cars.";
    };

    return (
        <div className="space-y-3.5">
            <div>
                <p className="text-sm font-black text-finn-highlight-navy">
                    What should influence your decision?
                </p>

                <p className="mt-1 text-xs leading-5 text-finn-iron">
                    Pick up to {MAX_FEATURES_PER_CATEGORY} features you care
                    about most. We'll still judge the car on{" "}
                    {categoryLabel.toLowerCase()} as a whole, but your picks
                    get extra influence in the recommendation. Tap the ⓘ if a
                    name means nothing to you.
                </p>

                {/*
                  * Kept visually distinct rather than folded into the
                  * paragraph above: "not requirements" is the sentence most
                  * likely to be skimmed past, and the one that decides
                  * whether the reader understands the model at all.
                  */}
                <p className="mt-2 inline-flex rounded-full bg-white px-3 py-1.5 text-[11px] font-bold leading-4 text-finn-highlight-navy ring-1 ring-finn-highlight-navy/15">
                    Think of these as your strongest signals — not
                    requirements.
                </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <section className="rounded-2xl bg-white/70 p-3">
                    <div className="flex items-baseline justify-between gap-2">
                        <p className="text-[10px] font-black uppercase tracking-wide text-finn-iron">
                            Everything in {categoryLabel}
                        </p>

                        <span className="text-[10px] font-bold text-finn-iron">
                            all {availableFeatures.length} count
                        </span>
                    </div>

                    {/*
                      * Scrolls rather than truncating. A reader looking for
                      * one feature they have in mind should not have to find
                      * a "show more" first, and the column staying a fixed
                      * height is what keeps the two sides side by side.
                      */}
                    <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto pr-1">
                        {unpicked.map((feature) => (
                            <CatalogueRow
                                key={feature}
                                feature={feature}
                                disabled={atMax}
                                alsoPickedIn={pickedElsewhere?.[feature]}
                                onAdd={() => onToggleFeature(feature)}
                            />
                        ))}

                        {unpicked.length === 0 && (
                            <li className="px-1 py-2 text-[11px] leading-4 text-finn-iron">
                                Everything here is in your picks. They all
                                still count either way.
                            </li>
                        )}
                    </ul>
                </section>

                <section className="rounded-2xl bg-white/70 p-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-[10px] font-black uppercase tracking-wide text-finn-iron">
                            Getting extra influence
                        </p>

                        <span
                            className={[
                                "rounded-full px-2 py-0.5 text-[10px] font-black",
                                features.length
                                    ? "bg-finn-pale-blue text-finn-accent-blue"
                                    : "bg-finn-cotton text-finn-iron",
                            ].join(" ")}
                        >
                            {features.length} / {MAX_FEATURES_PER_CATEGORY}{" "}
                            features selected
                        </span>
                    </div>

                    <p className="mt-1 text-[11px] leading-4 text-finn-iron">
                        {atMax
                            ? "These are the features we'll give extra influence."
                            : `Choose the ${MAX_FEATURES_PER_CATEGORY} things that matter most to you.`}
                    </p>

                    {picked.length > 0 ? (
                        <div className="mt-2.5 space-y-2">
                            <InfluenceLegend />

                            {picked.map((feature) => (
                                <FeatureOption
                                    key={feature}
                                    feature={feature}
                                    importance={importanceOf.get(feature)!}
                                    hint={hintFor(feature)}
                                    alsoPickedIn={pickedElsewhere?.[feature]}
                                    onToggle={() => onToggleFeature(feature)}
                                    onImportanceChange={(importance) => {
                                        setHasGraded(true);
                                        onImportanceChange(
                                            feature,
                                            importance,
                                        );
                                    }}
                                />
                            ))}
                        </div>
                    ) : (
                        <NothingPickedHint
                            label={categoryLabel}
                            rank={rank}
                            catalogueSize={availableFeatures.length}
                        />
                    )}
                </section>
            </div>
        </div>
    );
}

/**
 * One feature on the catalogue side, waiting to be moved across.
 *
 * The row is not a checkbox: an unpicked feature is not "off", it is simply
 * one of the many things this priority is judged on, and the only question it
 * has an answer to is whether the reader wants to lean on it.
 *
 * The tap target and the explanation are separate elements — a tooltip
 * trigger nested inside a button is neither valid nor operable.
 */
function CatalogueRow({
    feature,
    disabled,
    alsoPickedIn,
    onAdd,
}: {
    feature: FeatureId;
    disabled: boolean;
    alsoPickedIn?: FeatureElsewhere[];
    onAdd: () => void;
}) {
    const { label, explanation } = FEATURES[feature];

    const elsewhereNames = alsoPickedIn?.map((item) => item.label).join(", ");

    return (
        <li
            className={[
                "flex items-center gap-1 rounded-xl px-1.5 py-1 transition",
                disabled ? "opacity-60" : "hover:bg-finn-pale-blue",
            ].join(" ")}
        >
            <button
                type="button"
                onClick={onAdd}
                disabled={disabled}
                title={
                    disabled
                        ? `You've picked ${MAX_FEATURES_PER_CATEGORY} already — release one to swap`
                        : elsewhereNames
                          ? `Already getting extra influence under ${elsewhereNames}`
                          : `Give ${label} extra influence`
                }
                className={[
                    "flex min-w-0 flex-1 items-center gap-1.5 text-left text-[11px] font-bold leading-4 transition",
                    disabled
                        ? "cursor-not-allowed text-finn-iron"
                        : "cursor-pointer text-finn-black hover:text-finn-accent-blue",
                ].join(" ")}
            >
                <span
                    className={[
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                        disabled
                            ? "bg-finn-cotton text-finn-iron"
                            : "bg-finn-pale-blue text-finn-accent-blue",
                    ].join(" ")}
                >
                    <PlusSmallIcon className="h-3 w-3" />
                </span>

                <span className="min-w-0 truncate">{label}</span>

                {/*
                  * The other priority's own icon, which is how it is labelled
                  * everywhere else in Lens. It says "you have met this
                  * elsewhere" at row size; the full sentence appears on the
                  * card if they pick it anyway.
                  */}
                {alsoPickedIn && alsoPickedIn.length > 0 && (
                    <span aria-hidden className="shrink-0 opacity-70">
                        {alsoPickedIn.map((item) => item.icon).join("")}
                    </span>
                )}

                {elsewhereNames && (
                    <span className="sr-only">
                        already getting extra influence under {elsewhereNames}
                    </span>
                )}
            </button>

            {explanation && (
                <InfoTip subject={label}>{explanation}</InfoTip>
            )}
        </li>
    );
}

/**
 * What the three colours mean, said once per priority.
 *
 * It appears with the first pick, which is the first time an influence
 * control is on screen — before that there is nothing to decode. The words
 * carry the meaning and the swatches carry the hierarchy; neither is doing
 * the job alone.
 */
function InfluenceLegend() {
    return (
        <div className="px-0.5">
            <p className="text-[10px] font-black uppercase tracking-wide text-finn-iron">
                How much should this feature influence your decision?
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                {IMPORTANCE_SCALE.map((level) => {
                    const meta = FEATURE_IMPORTANCE[level];

                    return (
                        <span
                            key={level}
                            className="inline-flex items-center gap-1.5"
                        >
                            <span
                                className={[
                                    "h-2 w-2 rounded-full",
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
            </div>

            <p className="mt-1 text-[11px] leading-4 text-finn-iron">
                More influence as you go up. None of them rules a car out.
            </p>
        </div>
    );
}

/**
 * What happens when the user picks nothing.
 *
 * Deliberately not a warning. "I want the safest car, I just don't have
 * opinions about which systems it has" is a complete preference, and the only
 * thing the reader needs to know is what Lens does with it — the whole
 * catalogue, the same denominator a car with five picks is judged against.
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
        <div className="mt-2.5 rounded-xl bg-finn-snow px-3 py-3">
            <p className="text-[11px] font-black text-finn-black">
                No specific features selected
            </p>

            <p className="mt-1 text-[11px] leading-4 text-finn-iron">
                {rank === 1 ? `${label} is your top priority. ` : ""}
                We'll judge this priority based on the category as a whole —
                all {catalogueSize} systems it covers. Move a few across if
                you want some of them to count for more.
            </p>
        </div>
    );
}

/**
 * Which of these features the reader has already spoken for elsewhere.
 *
 * Twenty-two of the catalogue's features sit in more than one category —
 * heated seats is in three — so without this a reader can spend two of their
 * picks saying the same thing and never see it. Computed by the callers,
 * which are the only place that knows about more than one priority at a time.
 */
export function buildPickedElsewhere(
    current: CategoryId,
    selections: Partial<Record<CategoryId, FeatureSelection>>,
    meta: Partial<Record<CategoryId, FeatureElsewhere>>,
): PickedElsewhere {
    const result: PickedElsewhere = {};

    for (const [categoryId, features] of Object.entries(selections)) {
        if (categoryId === current || !features) continue;

        const owner = meta[categoryId as CategoryId];
        if (!owner) continue;

        for (const preference of features) {
            (result[preference.key] ??= []).push(owner);
        }
    }

    return result;
}
