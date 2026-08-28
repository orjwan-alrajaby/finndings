import {
    FEATURE_IMPORTANCE,
    FEATURES,
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
    /** Features already picked under a different priority. */
    pickedElsewhere?: PickedElsewhere;
    onToggleFeature: (feature: FeatureId) => void;
    onImportanceChange: (
        feature: FeatureId,
        importance: FeatureImportance,
    ) => void;
}

/**
 * The whole priority as one list, with the same four-step scale on every
 * card.
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
 * cards visibly resting on "Standard" say what no sentence under a list of
 * checkboxes could.
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

    /* Picks that are already carrying influence somewhere else too. */
    const duplicates = features
        .map((preference) => ({
            key: preference.key,
            elsewhere: pickedElsewhere?.[preference.key] ?? [],
        }))
        .filter((item) => item.elsewhere.length > 0);

    return (
        <div className="space-y-3">
            <div>
                <p className="text-sm font-black text-finn-highlight-navy">
                    What should influence your decision?
                </p>

                {/*
                  * What "influence" actually does, in the order the reader
                  * needs it: what happens by default, what changes when they
                  * raise something, and what it does not do. The mechanism
                  * stated plainly is what stops "extra influence" reading as
                  * a filter — a phrase people otherwise fill in with
                  * "only show me cars that have these".
                  */}
                <p className="mt-1 text-xs leading-5 text-finn-iron">
                    Every feature below counts when we compare these cars on{" "}
                    {categoryLabel.toLowerCase()} — that's{" "}
                    <strong className="font-black text-finn-black">
                        standard
                    </strong>
                    . Raise up to {MAX_FEATURES_PER_CATEGORY} of them and
                    those count for more: a car that has them gains ground
                    here, and a car that's missing one gives a little up.
                </p>

                <p className="mt-1.5 text-xs leading-5 text-finn-iron">
                    How much this priority counts against your others is still
                    your order from step 2. And nothing here is a requirement
                    — a car can miss one of your picks and still come out as
                    the recommendation, with the gap named in your advice. Tap
                    the ⓘ if a name means nothing to you.
                </p>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    {/*
                      * Kept visually distinct rather than folded into the
                      * paragraph above: "not requirements" is the sentence
                      * most likely to be skimmed past, and the one that
                      * decides whether the reader understands the model.
                      */}
                    <p className="inline-flex rounded-full bg-white px-3 py-1.5 text-[11px] font-bold leading-4 text-finn-highlight-navy ring-1 ring-finn-highlight-navy/15">
                        Think of these as your strongest signals — not
                        requirements.
                    </p>

                    <span
                        className={[
                            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black",
                            features.length
                                ? "bg-finn-pale-blue text-finn-accent-blue"
                                : "bg-finn-cotton text-finn-iron",
                        ].join(" ")}
                    >
                        {features.length} / {MAX_FEATURES_PER_CATEGORY}{" "}
                        influential features
                    </span>
                </div>
            </div>

            <InfluenceLegend />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4">
                {availableFeatures.map((feature) => (
                    <FeatureOption
                        key={feature}
                        feature={feature}
                        importance={importanceOf.get(feature) ?? null}
                        disabled={!importanceOf.has(feature) && atMax}
                        alsoPickedIn={pickedElsewhere?.[feature]}
                        onSet={(importance) => set(feature, importance)}
                    />
                ))}
            </div>

            {/*
              * The standing answer to what the empty rows mean. It sits under
              * the list rather than above it because that is where the reader
              * is when the question occurs to them.
              */}
            <p className="text-[11px] leading-4 text-finn-iron">
                {features.length === 0
                    ? "Everything is on standard right now, so every feature above counts the same. Raise the few that matter most to you."
                    : "Raising a feature doesn't switch the others off — everything above still counts, those ones just count for more. Put one back to standard to free a slot."}
            </p>

            {duplicates.map((item) => (
                <DuplicateNotice
                    key={item.key}
                    label={FEATURES[item.key].label}
                    elsewhere={item.elsewhere}
                />
            ))}

            {features.length === 0 ? (
                <NothingPickedHint
                    label={categoryLabel}
                    rank={rank}
                    catalogueSize={availableFeatures.length}
                />
            ) : atMax ? (
                <p className="text-[11px] leading-4 text-finn-iron">
                    That's your {MAX_FEATURES_PER_CATEGORY} strongest signals.
                    Put one back to standard to raise another.
                </p>
            ) : null}
        </div>
    );
}

/**
 * The four rungs, named, before the reader meets them on a card.
 *
 * Standard is in the legend for the same reason it is in the control: it is
 * the rung fourteen of the fifteen features are on, and leaving it unnamed is
 * what turns "I didn't pick it" into "it doesn't count".
 */
function InfluenceLegend() {
    return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-0.5">
            <span className="inline-flex items-center gap-1.5">
                <span
                    className={[
                        "h-2 w-2 rounded-full",
                        STANDARD_INFLUENCE.dotClass,
                    ].join(" ")}
                />

                <span className="text-[11px] font-bold text-finn-iron">
                    {STANDARD_INFLUENCE.label}
                </span>
            </span>

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

            <span className="text-[11px] leading-4 text-finn-iron">
                Everything starts with standard influence on this category. More influence as you go up from standard to highly,
                and none of them rules a car out.
            </span>

            {/*
              * The one place the scale is quantified. "Twice as much" is the
              * arithmetic in words the reader can check against what they see
              * in the advice — where "more influence" on its own leaves them
              * to guess whether it means a nudge or a veto, and the guess
              * that costs us is the veto.
              */}
            <p className="basis-full text-[11px] leading-4 text-finn-iron">
                Next to a standard feature,{" "}
                <span className={FEATURE_IMPORTANCE.low.accentTextClass}>
                    {FEATURE_IMPORTANCE.low.label.toLowerCase()}
                </span>{" "}
                counts about twice as much,{" "}
                <span className={FEATURE_IMPORTANCE.medium.accentTextClass}>
                    {FEATURE_IMPORTANCE.medium.label.toLowerCase()}
                </span>{" "}
                three times, and{" "}
                <span className={FEATURE_IMPORTANCE.high.accentTextClass}>
                    {FEATURE_IMPORTANCE.high.label.toLowerCase()}
                </span>{" "}
                four times — within this priority only.
            </p>
        </div>
    );
}

/**
 * The same feature, already spoken for under another priority.
 *
 * Not an error, and not undone for them: a feature that sits in two
 * catalogues genuinely counts in both, so picking it twice does something
 * real. What it also does is spend two of ten picks on one signal, and that
 * is the part a reader can't see from inside one category.
 */
function DuplicateNotice({
    label,
    elsewhere,
}: {
    label: string;
    elsewhere: FeatureElsewhere[];
}) {
    const names = elsewhere.map((item) => item.label);

    const joined =
        names.length === 1
            ? names[0]
            : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

    return (
        <p className="text-[11px] leading-4 text-finn-iron">
            <span aria-hidden className="mr-1">
                {elsewhere.map((item) => item.icon).join("")}
            </span>
            You've also given {label.toLowerCase()} extra influence under{" "}
            <strong className="font-black text-finn-black">{joined}</strong>. It
            counts in both — or spend this pick on something else.
        </p>
    );
}

/**
 * What happens when the reader marks nothing.
 *
 * Deliberately not a warning. "I want the safest car, I just don't have
 * opinions about which systems it has" is a complete preference, and the only
 * thing they need to know is what Lens does with it — the whole catalogue,
 * the same denominator a car with five picks is judged against.
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
        <div className="rounded-xl bg-white/70 px-3 py-2.5">
            <p className="text-[11px] font-black text-finn-black">
                No specific features selected
            </p>

            <p className="mt-0.5 text-[11px] leading-4 text-finn-iron">
                {rank === 1 ? `${label} is your top priority. ` : ""}
                We'll judge it on the category as a whole — all{" "}
                {catalogueSize} systems it covers, each counting the same.
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
