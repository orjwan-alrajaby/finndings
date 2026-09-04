import { useState } from "react";
import {
    ArrowUturnLeftIcon,
    ChevronDownIcon,
    SparklesIcon,
} from "@heroicons/react/24/outline";

import {
    FEATURE_IMPORTANCE,
    IMPORTANCE_SCALE,
    MAX_FEATURES_PER_CATEGORY,
    STANDARD_INFLUENCE,
} from "@/lib/reasoning-engine/constants";
import type {
    CategoryId,
    FeatureId,
    FeatureImportance,
    FeatureSelection,
} from "@/lib/reasoning-engine/types";
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
    /** Features already raised under a different priority, and where. */
    pickedElsewhere?: PickedElsewhere;
    onToggleFeature: (feature: FeatureId) => void;
    onImportanceChange: (
        feature: FeatureId,
        importance: FeatureImportance,
    ) => void;
    /** Put every feature here back to standard. Omitted where it makes no sense. */
    onResetAll?: () => void;
    /** Put this category back to the picks Lens ships with. */
    onResetToDefaults?: () => void;
}

/**
 * The whole priority as one list, with the same four-step scale on every row.
 *
 * One tap does both jobs. Everywhere else in this app's history, picking a
 * feature and saying how much it counts were two moves — tick then grade,
 * move then grade, tap then tap again — and each needed something to appear,
 * move, or be learned. Here every feature is already on the scale, sitting on
 * *standard*, and the reader raises the few they care about.
 *
 * Naming the resting state is what makes this work. "Nothing selected" is an
 * absence, and an absence is what a reader mistakes for "doesn't count" —
 * which is the single misreading this whole screen exists to prevent. Ten
 * rows visibly resting on "Standard" say what no sentence under a list of
 * checkboxes could.
 *
 * **The explanation is folded away, and that is the redesign.** This screen
 * used to open with three paragraphs, a pull-quote, a legend, and a
 * four-times-as-much arithmetic note — every one of them true, and together a
 * wall a reader had to get past to reach the list they came for. The model
 * still has to be explained, so nothing was deleted; it moved behind one
 * line and a disclosure, where a reader who wants it can have it and a reader
 * who already knows it is not made to scroll past it every time.
 *
 * Shared by the compare drawer and the settings priority editor so the two never
 * drift into explaining the same model two different ways.
 */
export function FeatureInfluencePicker({
    categoryLabel,
    features,
    availableFeatures,
    rank,
    pickedElsewhere,
    onToggleFeature,
    onImportanceChange,
    onResetAll,
    onResetToDefaults,
}: FeatureInfluencePickerProps) {
    const [explaining, setExplaining] = useState(false);

    const importanceOf = new Map(
        features.map((preference) => [preference.key, preference.importance]),
    );

    const atMax = features.length >= MAX_FEATURES_PER_CATEGORY;

    /**
     * Move a feature along the scale, in either direction.
     *
     * Raising something that was standard adds it to the selection; putting
     * it back to standard removes it. The reader is doing one thing — saying
     * how much it counts — and never has to think about which of those two
     * operations they are performing.
     */
    const set = (
        feature: FeatureId,
        importance: FeatureImportance | null,
    ) => {
        const current = importanceOf.get(feature) ?? null;

        if (importance == null) {
            if (current != null) onToggleFeature(feature);
            return;
        }

        if (current == null) onToggleFeature(feature);

        onImportanceChange(feature, importance);
    };

    /*
     * A feature already raised somewhere else is spoken for. Sorting those to
     * the bottom keeps the rows the reader can actually act on together at
     * the top, rather than interleaved with ones that will not respond.
     */
    const rows = [...availableFeatures].sort((a, b) => {
        const lockedA = isLocked(a, importanceOf, pickedElsewhere) ? 1 : 0;
        const lockedB = isLocked(b, importanceOf, pickedElsewhere) ? 1 : 0;

        return lockedA - lockedB;
    });

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-finn-highlight-navy">
                        What should count for more?
                    </p>

                    <p className="mt-0.5 text-xs leading-5 text-finn-iron">
                        Everything here already counts. Raise up to{" "}
                        {MAX_FEATURES_PER_CATEGORY} so they count for more —
                        none of them rules a car out.
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
                    {features.length} of {MAX_FEATURES_PER_CATEGORY} raised
                </span>
            </div>

            <Explainer
                open={explaining}
                onToggle={() => setExplaining((value) => !value)}
                categoryLabel={categoryLabel}
            />

            <div className="flex flex-col gap-1.5">
                {rows.map((feature) => (
                    <FeatureOption
                        key={feature}
                        feature={feature}
                        importance={importanceOf.get(feature) ?? null}
                        atCap={!importanceOf.has(feature) && atMax}
                        raisedElsewhere={
                            importanceOf.has(feature)
                                ? undefined
                                : pickedElsewhere?.[feature]
                        }
                        onSet={(importance) => set(feature, importance)}
                    />
                ))}
            </div>

            {features.length === 0 && (
                <NothingRaised
                    label={categoryLabel}
                    rank={rank}
                    catalogueSize={availableFeatures.length}
                />
            )}

            {(onResetAll || onResetToDefaults) && (
                <div className="flex flex-wrap items-center gap-2 border-t border-white pt-3">
                    {onResetToDefaults && (
                        <button
                            type="button"
                            onClick={onResetToDefaults}
                            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-finn-iron shadow-sm transition hover:text-finn-black"
                        >
                            <SparklesIcon className="h-3.5 w-3.5" />
                            Reset to defaults
                        </button>
                    )}

                    {onResetAll && (
                        <button
                            type="button"
                            onClick={onResetAll}
                            disabled={features.length === 0}
                            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-finn-iron shadow-sm transition hover:text-finn-black disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-finn-iron"
                        >
                            <ArrowUturnLeftIcon className="h-3.5 w-3.5" />
                            Reset all
                        </button>
                    )}

                    <span className="text-[10px] leading-4 text-finn-iron/80">
                        {onResetToDefaults && onResetAll
                            ? "Defaults puts back what Lens ships with; all puts everything on standard."
                            : "This category only."}
                    </span>
                </div>
            )}
        </div>
    );
}

/** Whether a row can be raised at all, or is spoken for elsewhere. */
function isLocked(
    feature: FeatureId,
    importanceOf: Map<FeatureId, FeatureImportance>,
    pickedElsewhere: PickedElsewhere | undefined,
): boolean {
    if (importanceOf.has(feature)) return false;

    return (pickedElsewhere?.[feature]?.length ?? 0) > 0;
}

/**
 * The model, in full, for a reader who asks for it.
 *
 * Everything in here used to be on the screen at all times. It is all still
 * true and still worth saying once — what changed is that saying it every
 * time, above the control, made the control hard to find.
 */
function Explainer({
    open,
    onToggle,
    categoryLabel,
}: {
    open: boolean;
    onToggle: () => void;
    categoryLabel: string;
}) {
    return (
        <div className="overflow-hidden rounded-xl bg-white/70">
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={open}
                className="flex w-full items-center gap-2 px-3 py-2 text-left"
            >
                <span className="flex flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[11px] font-black text-finn-black">
                        How influence works
                    </span>

                    <Scale />
                </span>

                <ChevronDownIcon
                    className={[
                        "h-3.5 w-3.5 shrink-0 text-finn-iron transition-transform",
                        open ? "rotate-180" : "",
                    ].join(" ")}
                />
            </button>

            {open && (
                <div className="space-y-2 border-t border-finn-snow px-3 py-2.5">
                    <p className="text-[11px] leading-4 text-finn-iron">
                        Every feature listed counts when Lens compares cars on{" "}
                        {categoryLabel.toLowerCase()} — that is{" "}
                        <strong className="font-black text-finn-black">
                            standard
                        </strong>
                        . Raising one means a car that has it gains ground
                        here and a car missing it gives a little up. Next to a
                        standard feature,{" "}
                        <span className={FEATURE_IMPORTANCE.low.accentTextClass}>
                            {FEATURE_IMPORTANCE.low.label.toLowerCase()}
                        </span>{" "}
                        counts about twice as much,{" "}
                        <span
                            className={FEATURE_IMPORTANCE.medium.accentTextClass}
                        >
                            {FEATURE_IMPORTANCE.medium.label.toLowerCase()}
                        </span>{" "}
                        three times and{" "}
                        <span className={FEATURE_IMPORTANCE.high.accentTextClass}>
                            {FEATURE_IMPORTANCE.high.label.toLowerCase()}
                        </span>{" "}
                        four times — within this priority only.
                    </p>

                    <p className="text-[11px] leading-4 text-finn-iron">
                        How much this priority counts against your others is
                        your priority order, not this. And nothing here is a
                        requirement: a car can miss one of your raised
                        features and still be the recommendation, with the gap
                        named in your advice.
                    </p>

                    <p className="text-[11px] leading-4 text-finn-iron">
                        A feature can only be raised in one priority. If it is
                        already raised somewhere else, its row says so — put
                        it back to standard there to move it here.
                    </p>
                </div>
            )}
        </div>
    );
}

/** The four rungs as four dots, small enough to sit in a header. */
function Scale() {
    return (
        <span className="inline-flex items-center gap-2">
            <span className="inline-flex items-center gap-1">
                <span
                    className={[
                        "h-1.5 w-1.5 rounded-full",
                        STANDARD_INFLUENCE.dotClass,
                    ].join(" ")}
                />
                <span className="text-[10px] font-bold text-finn-iron">
                    {STANDARD_INFLUENCE.label}
                </span>
            </span>

            {IMPORTANCE_SCALE.map((level) => {
                const meta = FEATURE_IMPORTANCE[level];

                return (
                    <span
                        key={level}
                        className="inline-flex items-center gap-1"
                    >
                        <span
                            className={[
                                "h-1.5 w-1.5 rounded-full",
                                meta.dotClass,
                            ].join(" ")}
                        />
                        <span
                            className={[
                                "text-[10px] font-bold",
                                meta.accentTextClass,
                            ].join(" ")}
                        >
                            {meta.label}
                        </span>
                    </span>
                );
            })}
        </span>
    );
}

/**
 * What happens when the reader raises nothing.
 *
 * Deliberately not a warning. "I want the safest car, I just don't have
 * opinions about which systems it has" is a complete preference, and the only
 * thing they need to know is what Lens does with it — the whole catalogue,
 * the same denominator a car with five raised features is judged against.
 */
function NothingRaised({
    label,
    rank,
    catalogueSize,
}: {
    label: string;
    rank?: number;
    catalogueSize: number;
}) {
    return (
        <p className="rounded-xl bg-white/70 px-3 py-2 text-[11px] leading-4 text-finn-iron">
            {rank === 1 ? `${label} is your top priority. ` : ""}
            Nothing is raised, so Lens judges this on the category as a whole
            — all {catalogueSize} systems it covers, each counting the same.
            That is a real answer, not an unfinished one.
        </p>
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
