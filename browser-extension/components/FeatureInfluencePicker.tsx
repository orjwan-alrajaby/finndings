import * as Collapsible from "@radix-ui/react-collapsible";
import {
    ChevronDown,
    CircleQuestionMark,
    Layers,
    Lock,
    ShieldCheck,
    Sparkles,
    Undo2,
    type LucideIcon,
} from "lucide-react";

import { surfaceTone, type SurfaceTone } from "@/lib/priority-marks";
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
    /**
     * The priority's mark name, so the heading and the count wear its colour
     * inside a card that already does. Only those two — the rows keep their
     * influence colours, which are the whole point of them.
     */
    mark?: string;
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
    mark,
    features,
    availableFeatures,
    rank,
    pickedElsewhere,
    onToggleFeature,
    onImportanceChange,
    onResetAll,
    onResetToDefaults,
}: FeatureInfluencePickerProps) {
    const importanceOf = new Map(
        features.map((preference) => [preference.key, preference.importance]),
    );

    const atMax = features.length >= MAX_FEATURES_PER_CATEGORY;
    const tone = mark ? surfaceTone(mark) : null;

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
                    <p
                        className={[
                            "text-sm font-black",
                            tone ? tone.ink : "text-finn-highlight-navy",
                        ].join(" ")}
                    >
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
                        !features.length
                            ? "bg-finn-cotton text-finn-iron"
                            : tone
                              ? `ring-1 ${tone.ground} ${tone.edge} ${tone.ink}`
                              : "bg-finn-pale-blue text-finn-accent-blue",
                    ].join(" ")}
                >
                    {features.length} of {MAX_FEATURES_PER_CATEGORY} raised
                </span>
            </div>

            <Explainer tone={tone ?? surfaceTone("shield")} />

            <div className="flex flex-col gap-3">
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
                            <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
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
                            <Undo2 aria-hidden="true" className="h-3.5 w-3.5" />
                            Reset all
                        </button>
                    )}

                    <span className="text-[10px] leading-4 text-finn-iron/80">
                        {onResetToDefaults && onResetAll
                            ? "Defaults puts back what Lens ships with; all puts everything on standard."
                            : "This priority only."}
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
 *
 * Folded away, though, it has to be findable, and it was not: a line of small
 * type on `white/70` inside a white card has no edge at all, so the one place
 * the scale is explained read as a caption rather than something that opens.
 * It now sits on the priority's own tint with an edge, a marked tile, and a
 * pill that says what pressing it does — and what it opens leads with the
 * multipliers as four tiles, because "4×" is a number a reader should be able
 * to see rather than find in a sentence.
 */
function Explainer({ tone }: { tone: SurfaceTone }) {
    return (
        <Collapsible.Root
            /*
             * A wash rather than a flat tint: the feature rows under it are
             * flat pale cards in the influence colours, and on an orange
             * priority a flat orange panel above orange "Moderately" rows read
             * as one more row. The gradient, the edge and the solid tile make
             * it a different kind of thing.
             */
            className={[
                "overflow-hidden rounded-2xl bg-white bg-linear-to-r to-white to-70% ring-1 transition-shadow data-[state=open]:shadow-md",
                tone.wash,
                tone.edge,
            ].join(" ")}
        >
            <Collapsible.Trigger className="group flex w-full items-center gap-3 px-3 py-2.5 text-left">
                <span
                    className={[
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white shadow-sm",
                        tone.solid,
                    ].join(" ")}
                >
                    <CircleQuestionMark aria-hidden="true" className="h-4 w-4" />
                </span>

                <span className="min-w-0 flex-1">
                    <span className="block text-xs font-black text-finn-black">
                        How influence works
                    </span>

                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Scale />
                    </span>
                </span>

                <span
                    className={[
                        "inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-black shadow-sm ring-1 transition-colors",
                        tone.ink,
                        tone.edge,
                    ].join(" ")}
                >
                    <span className="group-data-[state=open]:hidden">Explain</span>
                    <span className="hidden group-data-[state=open]:inline">Hide</span>
                    <ChevronDown
                        aria-hidden="true"
                        className="h-3 w-3 transition-transform group-data-[state=open]:rotate-180"
                    />
                </span>
            </Collapsible.Trigger>

            <Collapsible.Content>
                <div className="space-y-3 border-t border-black/5 bg-white px-3 py-3">
                    <p className="text-[11px] leading-4 text-finn-iron">
                        Every feature in this priority counts toward its
                        score.{" "}
                        <strong className="font-black text-finn-black">
                            {STANDARD_INFLUENCE.label}
                        </strong>{" "}
                        is the baseline, and raising a feature multiplies its
                        influence:
                    </p>

                    <Multipliers />

                    <ul className="space-y-2">
                        <Rule icon={Layers} tone={tone}>
                            These levels only affect how features are weighed{" "}
                            <strong className="font-black text-finn-black">
                                within this priority
                            </strong>
                            . How much the priority itself matters compared
                            with your other priorities is set by your priority
                            order.
                        </Rule>

                        <Rule icon={ShieldCheck} tone={tone}>
                            Nothing here is a requirement. A car can miss a
                            raised feature and still be recommended — Lens will
                            explain the trade-off in your advice.
                        </Rule>

                        <Rule icon={Lock} tone={tone}>
                            Each feature can only be raised in one priority. If
                            it's already raised elsewhere, you'll see that on
                            its row. Set it back to Standard there if you want
                            to raise it here.
                        </Rule>
                    </ul>
                </div>
            </Collapsible.Content>
        </Collapsible.Root>
    );
}

/**
 * The four levels as four tiles: the dot, the name, the multiplier, and a bar
 * as long as the multiplier — so "Highly counts four times Standard" is a
 * shape before it is a sentence.
 */
function Multipliers() {
    const levels = [
        {
            key: "standard",
            label: STANDARD_INFLUENCE.label,
            weight: STANDARD_INFLUENCE.weight,
            dot: STANDARD_INFLUENCE.dotClass,
            text: "text-finn-black",
        },
        ...IMPORTANCE_SCALE.map((level) => ({
            key: level,
            label: FEATURE_IMPORTANCE[level].label,
            weight: FEATURE_IMPORTANCE[level].weight,
            dot: FEATURE_IMPORTANCE[level].dotClass,
            text: FEATURE_IMPORTANCE[level].accentTextClass,
        })),
    ];
    const strongest = Math.max(...levels.map((level) => level.weight));

    return (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {levels.map((level) => (
                <li
                    key={level.key}
                    className="rounded-xl bg-white px-2.5 py-2 shadow-sm ring-1 ring-black/5"
                >
                    <span className="flex items-center justify-between gap-2">
                        <span
                            className={[
                                "inline-flex items-center gap-1.5 text-[10px] font-black",
                                level.text,
                            ].join(" ")}
                        >
                            <span
                                aria-hidden="true"
                                className={["h-2 w-2 rounded-full", level.dot].join(" ")}
                            />
                            {level.label}
                        </span>

                        <span
                            className={[
                                "text-sm font-black tabular-nums",
                                level.text,
                            ].join(" ")}
                        >
                            {level.weight}×
                        </span>
                    </span>

                    <span
                        aria-hidden="true"
                        className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-finn-cotton"
                    >
                        <span
                            className={["block h-full rounded-full", level.dot].join(" ")}
                            style={{ width: `${(level.weight / strongest) * 100}%` }}
                        />
                    </span>
                </li>
            ))}
        </ul>
    );
}

/** One of the explainer's rules, with a mark in the priority's colour. */
function Rule({
    icon: Icon,
    tone,
    children,
}: {
    icon: LucideIcon;
    tone: SurfaceTone;
    children: React.ReactNode;
}) {
    return (
        <li className="flex gap-2.5 text-[11px] leading-4 text-finn-iron">
            <span
                aria-hidden="true"
                className={[
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                    tone.ground,
                ].join(" ")}
            >
                <Icon className={["h-3.5 w-3.5", tone.ink].join(" ")} />
            </span>
            <span className="pt-1">{children}</span>
        </li>
    );
}

/** The four rungs as four dots, small enough to sit in a header. */
function Scale() {
    return (
        <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
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
            Nothing is raised, so Lens judges this on the whole priority
            — all {catalogueSize} features it covers, each counting the same.
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
