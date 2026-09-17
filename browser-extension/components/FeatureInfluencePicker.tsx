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
    CATEGORIES,
    FEATURE_IMPORTANCE,
    IMPORTANCE_SCALE,
    MAX_FEATURES_PER_CATEGORY,
    NICHE_INFLUENCE,
    STANDARD_INFLUENCE,
} from "@/lib/reasoning-engine/constants";
import { countedItems, homeOf } from "@/lib/reasoning-engine/evidence";
import type {
    CategoryId,
    FeatureImportance,
    FeatureSelection,
    SignalId,
} from "@/lib/reasoning-engine/types";
import { FeatureOption } from "@/components/FeatureOption";

interface FeatureInfluencePickerProps {
    /** What this priority is called, for the nothing-picked line. */
    categoryLabel: string;
    /**
     * The priority's mark name, so the heading and the count wear its colour
     * inside a card that already does. Only those two — the rows keep their
     * influence colours, which are the whole point of them.
     */
    mark?: string;
    /** The priority being edited; what it counts is read from the model. */
    category: CategoryId;
    /** What the user has picked out. May legitimately be empty. */
    features: FeatureSelection;
    /**
     * The profile these settings started from, so a raise it set and the
     * reader hasn't touched can say so on its row.
     */
    profileLabel?: string | null;
    /**
     * Where this priority sits in the user's order, when the caller knows.
     * Only used to say the nothing-picked line a little louder at the top.
     */
    rank?: number;
    onToggleFeature: (feature: SignalId) => void;
    onImportanceChange: (
        feature: SignalId,
        importance: FeatureImportance,
    ) => void;
    /** Put every feature here back to standard. Omitted where it makes no sense. */
    onResetAll?: () => void;
    /** Put this category back to what the starting profile raises. */
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
 * **Every row sits where the model puts it.** Each item has one home, the
 * only priority it can be raised in. Niche items — a towbar, a spare wheel —
 * rest on "Not counted" rather than Standard, because they count only once
 * raised. An item counted here from another home is shown locked, with the
 * home named. Standard equipment is an ordinary raisable row — how the engine
 * counts it isn't the reader's concern — and a limit such as electric range is
 * said once, as a figure rather than a row.
 *
 * Shared by the compare drawer and the settings priority editor so the two never
 * drift into explaining the same model two different ways.
 */
export function FeatureInfluencePicker({
    categoryLabel,
    mark,
    category,
    features,
    profileLabel,
    rank,
    onToggleFeature,
    onImportanceChange,
    onResetAll,
    onResetToDefaults,
}: FeatureInfluencePickerProps) {
    const importanceOf = new Map<SignalId, FeatureImportance>(
        features.map((preference) => [preference.key, preference.importance]),
    );
    const sourceOf = new Map(
        features.map((preference) => [preference.key, preference.source]),
    );
    const items = countedItems(category);
    const home = items.filter((item) => item.role === "home");
    const alsoCounted = items.filter((item) => item.role === "alsoCounts");
    const expected = items.filter((item) => item.role === "expected");
    const definition = CATEGORIES[category] as {
        measured?: string;
        limit?: string;
    };
    const countedWithoutRaising = items.filter(
        (item) => !item.niche && item.role !== "expected",
    ).length;
    const hasNiche = home.some((item) => item.niche);

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
        feature: SignalId,
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
                        {hasNiche
                            ? "Everything here counts except the items marked Not counted, which count only once you raise them."
                            : "Everything here already counts."}{" "}

                        Raise up to {MAX_FEATURES_PER_CATEGORY} so they count
                        for more — none of them rules a car out.
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
                {home.map((item) => (
                    <FeatureOption
                        key={item.key}
                        feature={item.key}
                        importance={importanceOf.get(item.key) ?? null}
                        atCap={!importanceOf.has(item.key) && atMax}
                        niche={item.niche}
                        measured={item.key === "compactLength"}
                        setBy={
                            profileLabel && sourceOf.get(item.key) === "profile"
                                ? profileLabel
                                : null
                        }
                        onSet={(importance) => set(item.key, importance)}
                    />
                ))}

                {expected.map((item) => (
                    <FeatureOption
                        key={item.key}
                        feature={item.key}
                        importance={importanceOf.get(item.key) ?? null}
                        atCap={!importanceOf.has(item.key) && atMax}
                        setBy={
                            profileLabel && sourceOf.get(item.key) === "profile"
                                ? profileLabel
                                : null
                        }
                        onSet={(importance) => set(item.key, importance)}
                    />
                ))}

                {alsoCounted.map((item) => {
                    const owner = homeOf(item.key);

                    return (
                        <FeatureOption
                            key={item.key}
                            feature={item.key}
                            importance={null}
                            atCap={false}
                            homeElsewhere={
                                owner
                                    ? {
                                          label: CATEGORIES[owner].label,
                                          icon: CATEGORIES[owner].icon,
                                      }
                                    : undefined
                            }
                            onSet={() => {}}
                        />
                    );
                })}
            </div>

            {definition.limit && definition.measured && (
                <LimitNote text={definition.measured} tone={tone ?? surfaceTone("shield")} />
            )}



            {features.length === 0 && (
                <NothingRaised
                    label={categoryLabel}
                    rank={rank}
                    catalogueSize={countedWithoutRaising}
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
                            ? "Defaults puts back what your starting profile raises here; all puts everything back at rest."
                            : "This priority only."}
                    </span>
                </div>
            )}
        </div>
    );
}

/**
 * A figure that can only hold this priority back, said once under the rows.
 *
 * Not a row: there is nothing to raise. Electric range under Long Distance
 * limits a short-range car and gives a long-range one nothing extra.
 */
function LimitNote({ text, tone }: { text: string; tone: SurfaceTone }) {
    return (
        <p
            className={[
                "rounded-xl px-3 py-2 text-[11px] leading-4 ring-1",
                tone.ground,
                tone.edge,
            ].join(" ")}
        >
            <strong className={["font-black", tone.ink].join(" ")}>
                Also limited by a figure.
            </strong>{" "}
            <span className="text-finn-iron">{text}.</span>
        </p>
    );
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
                        Every item in this priority counts toward its score,
                        except niche ones, which rest on{" "}
                        <strong className="font-black text-finn-black">
                            {NICHE_INFLUENCE.label}
                        </strong>{" "}
                        until you raise them.{" "}
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
                            Each item has one home, and that is the only
                            priority it can be raised in. Where an item also
                            counts somewhere else, it counts there at
                            Standard, and its row names the home.
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
 * thing they need to know is what Lens does with it: everything the priority
 * counts without being asked, each at Standard.
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
            Nothing is raised under {label}, so everything it checks counts
            the same — {catalogueSize}{" "}
            {catalogueSize === 1 ? "item" : "items"}. That is a real answer, not an unfinished one.
        </p>
    );
}

