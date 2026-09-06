import { useState } from "react";
import { ArrowDown, ArrowUp, CircleCheck, Menu, Plus, X } from "lucide-react";

import { PriorityIcon } from "@/components/PriorityIcon";
import { InfoButton } from "@/components/PriorityInfo";

import {
    MAX_PRIORITIES,
    MIN_PRIORITIES,
} from "@/lib/reasoning-engine/constants";
import type {
    CategoryId,
    FeatureSelection,
    PriorityDefinition,
    Profile,
} from "@/lib/reasoning-engine/types";

/**
 * The priority order, as one list.
 *
 * This started life in Settings, where an answer already existed and only
 * needed adjusting, and it is now the only way the question gets asked
 * anywhere. The compare flow used to split it in two — a screen to choose
 * priorities, then a screen to order them — which asked the reader to hold
 * a decision in their head across a page turn and gave them no way to see,
 * while choosing, what the order they were building actually looked like.
 * One list answers both halves at once: what you picked is what you see,
 * in the order it counts.
 *
 * Both callers get the same list. What differs is the framing around it —
 * Settings says "your priorities", the compare flow explains what a
 * priority is first — and how the profiles are offered.
 */

export const PRIORITY_ORDER_DESCRIPTION =
    `What matters to you about a car, in the order it matters. The first counts ` +
    `for the most and the last for the least, and this order is what every ` +
    `explanation FINN Lens gives you is measured against — on your pinned cars ` +
    `and on any car you open on finn.com. Lens starts you on an order of its ` +
    `own; changing anything here makes it yours. Between ${MIN_PRIORITIES} and ` +
    `${MAX_PRIORITIES}.`;

/* -------------------------------------------------------------------------- */
/* Profiles                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The profiles a reader can actually apply right now.
 *
 * A profile whose order names a priority the reader has switched off would
 * put that priority back the moment it was applied, so it is not offered.
 * Exported because the callers need to know whether there is anything to
 * offer before they write a heading above it.
 */
export function applicableProfiles(
    profiles: Profile[],
    priorityDefinitions: PriorityDefinition[],
): Profile[] {
    return profiles.filter(
        (profile) =>
            profile.enabled &&
            profile.priorities.every(
                (id) =>
                    priorityDefinitions.find(
                        (definition) => definition.id === id,
                    )?.enabled !== false,
            ),
    );
}

/**
 * The profile whose order is exactly the one in front of the reader, if any.
 *
 * Exported because more than one surface needs to say "you are on this
 * profile" and they must agree about when that is true — a chip in a panel
 * header claiming Family First while the preset card below says nothing is
 * worse than neither saying it.
 *
 * Exact and ordered: a profile's claim is its five priorities *in its order*,
 * so moving two of them means the reader is no longer on it. That is the
 * honest reading, and it is what makes the chip disappear the moment they
 * make the order their own.
 */
export function matchingProfile(
    profiles: Profile[],
    priorityDefinitions: PriorityDefinition[],
    priorities: CategoryId[],
): Profile | null {
    return (
        applicableProfiles(profiles, priorityDefinitions).find(
            (profile) =>
                profile.priorities.length === priorities.length &&
                profile.priorities.every(
                    (id, index) => priorities[index] === id,
                ),
        ) ?? null
    );
}

/**
 * The profiles offered as a starting point.
 *
 * `chips` is the compact form for a reader who already knows what a profile
 * is and wants to reach for one. `cards` is for the reader meeting them for
 * the first time: it spends the space to say who each profile is written
 * for and which five priorities it would put in the list, so choosing one
 * is a decision rather than a guess.
 */
export function ProfilePresets({
    profiles,
    priorityDefinitions,
    priorities,
    onApply,
    layout = "chips",
}: {
    profiles: Profile[];
    priorityDefinitions: PriorityDefinition[];
    priorities: CategoryId[];
    onApply: (priorities: CategoryId[]) => void;
    layout?: "chips" | "cards";
}) {
    const definitionOf = (id: CategoryId) =>
        priorityDefinitions.find((definition) => definition.id === id);

    const applicable = applicableProfiles(profiles, priorityDefinitions);

    if (applicable.length === 0) return null;

    const activeProfile = matchingProfile(
        profiles,
        priorityDefinitions,
        priorities,
    );

    if (layout === "chips") {
        return (
            <div className="flex flex-wrap gap-2">
                {applicable.map((profile) => {
                    const active = profile.id === activeProfile?.id;

                    /*
                     * The pill is two controls, so the ground moves to a
                     * wrapper: applying a profile and asking what it is are
                     * different decisions, and a button cannot contain
                     * another one.
                     */
                    return (
                        <span
                            key={profile.id}
                            className={[
                                "inline-flex items-center gap-1 rounded-full pr-1.5",
                                "text-[11px] font-bold transition-colors",
                                active
                                    ? "bg-finn-accent-blue text-white"
                                    : "bg-finn-snow text-finn-iron hover:bg-finn-cotton hover:text-finn-black",
                            ].join(" ")}
                        >
                            <button
                                type="button"
                                onClick={() => onApply([...profile.priorities])}
                                aria-pressed={active}
                                className="inline-flex items-center gap-1.5 rounded-full py-1.5 pl-3"
                            >
                                {/*
                                  * Untinted while selected: the chip goes
                                  * solid blue behind it, and a blue mark on
                                  * blue is not a mark.
                                  */}
                                <PriorityIcon
                                    name={profile.icon}
                                    className="h-3.5 w-3.5"
                                    tinted={!active}
                                />
                                {profile.label}
                                {active && (
                                    <span className="text-[10px] font-black opacity-80">
                                        · in use
                                    </span>
                                )}
                            </button>

                            <InfoButton
                                subject={{ kind: "profile", id: profile.id }}
                                label={profile.label}
                                profiles={profiles}
                                priorityDefinitions={priorityDefinitions}
                                tone={active ? "onDark" : "quiet"}
                            />
                        </span>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {applicable.map((profile) => {
                const active = profile.id === activeProfile?.id;

                return (
                    /*
                     * The card is one big target, so the "i" cannot live
                     * inside it. It sits over the corner instead, on the
                     * wrapper, where it is reachable without standing between
                     * the reader and the thing they came to click.
                     */
                    <div key={profile.id} className="relative">
                        <span className="absolute right-3 top-3 z-10">
                            <InfoButton
                                subject={{ kind: "profile", id: profile.id }}
                                label={profile.label}
                                profiles={profiles}
                                priorityDefinitions={priorityDefinitions}
                            />
                        </span>

                        <button
                            type="button"
                            onClick={() => onApply([...profile.priorities])}
                            aria-pressed={active}
                            className={[
                                "flex w-full h-full flex-col rounded-[22px] p-4 text-left transition-all",
                                active
                                    ? "bg-finn-pale-blue shadow-[0_0_0_2px] shadow-finn-accent-blue"
                                    : "bg-finn-snow drop-shadow-sm hover:bg-finn-pale-blue/70",
                            ].join(" ")}
                        >
                            <span className="flex items-start gap-3">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-finn-iron/20 bg-white text-finn-accent-blue">
                                    <PriorityIcon
                                        name={profile.icon}
                                        className="h-5 w-5"
                                    />
                                </span>

                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-1.5">
                                        <span
                                            className={[
                                                "text-sm font-black",
                                                active
                                                    ? "text-finn-accent-blue"
                                                    : "text-finn-black",
                                            ].join(" ")}
                                        >
                                            {profile.label}
                                        </span>

                                        {active && (
                                            <CircleCheck className="h-4 w-4 shrink-0 text-finn-accent-blue" />
                                        )}
                                    </span>

                                    <span className="mt-0.5 block text-[11px] font-bold text-finn-iron">
                                        {active ? "In use" : "Start from this"}
                                    </span>
                                </span>
                            </span>

                            <span className="mt-3 block text-xs leading-5 text-finn-iron">
                                {profile.forWhom}
                            </span>

                            {/* The order it would put in the list, so the label is never taken on trust. */}
                            <span className="mt-3 flex flex-wrap gap-1">
                                {profile.priorities.map((id, index) => (
                                    <span
                                        key={id}
                                        className="rounded-full border border-finn-iron/15 bg-white px-2 py-0.5 text-[10px] font-bold text-finn-black"
                                    >
                                        {index + 1} ·{" "}
                                        {definitionOf(id)?.label ?? id}
                                    </span>
                                ))}
                            </span>
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* The order                                                                  */
/* -------------------------------------------------------------------------- */

export function PriorityOrderList({
    priorities,
    priorityDefinitions,
    categoryFeatures,
    onChange,
}: {
    priorities: CategoryId[];
    priorityDefinitions: PriorityDefinition[];
    /** Only for the per-row count of features raised. */
    categoryFeatures: Record<CategoryId, FeatureSelection>;
    onChange: (next: CategoryId[]) => void;
}) {
    const [dragging, setDragging] = useState<CategoryId | null>(null);
    const [dragOver, setDragOver] = useState<CategoryId | null>(null);

    const definitionOf = (id: CategoryId) =>
        priorityDefinitions.find((definition) => definition.id === id);

    /* A priority switched off is not offered, but one already chosen stays. */
    const available = priorityDefinitions.filter(
        (definition) =>
            definition.enabled !== false && !priorities.includes(definition.id),
    );

    const atLimit = priorities.length >= MAX_PRIORITIES;
    const atFloor = priorities.length <= MIN_PRIORITIES;

    const move = (from: number, to: number) => {
        if (to < 0 || to >= priorities.length) return;

        const next = [...priorities];
        const [moved] = next.splice(from, 1);

        if (!moved) return;

        next.splice(to, 0, moved);
        onChange(next);
    };

    const moveByDrag = (target: CategoryId) => {
        if (!dragging || dragging === target) return;

        move(priorities.indexOf(dragging), priorities.indexOf(target));
    };

    return (
        <>
            <p className="text-xs font-black text-finn-black">
                Your order
                <span className="ml-1.5 font-bold text-finn-iron">
                    {priorities.length} of {MAX_PRIORITIES}
                </span>
            </p>

            <ol className="mt-2.5 flex flex-col gap-2">
                {priorities.map((id, index) => {
                    const definition = definitionOf(id);
                    const count = categoryFeatures[id]?.length ?? 0;

                    return (
                        <li
                            key={id}
                            draggable
                            onDragStart={(event) => {
                                event.dataTransfer.effectAllowed = "move";
                                setDragging(id);
                            }}
                            onDragOver={(event) => {
                                event.preventDefault();
                                event.dataTransfer.dropEffect = "move";
                                setDragOver(id);
                            }}
                            onDragEnd={() => {
                                setDragging(null);
                                setDragOver(null);
                            }}
                            onDrop={(event) => {
                                event.preventDefault();
                                moveByDrag(id);
                                setDragging(null);
                                setDragOver(null);
                            }}
                            className={[
                                "flex cursor-grab items-center gap-3 rounded-2xl border bg-white",
                                "px-3 py-2.5 transition-all active:cursor-grabbing",
                                dragOver === id && dragging !== id
                                    ? "border-finn-accent-blue shadow-[0_0_0_2px_rgba(0,114,234,0.15)]"
                                    : "border-finn-snow",
                                dragging === id ? "opacity-50" : "",
                            ].join(" ")}
                        >
                            <Menu
                                className="h-4 w-4 shrink-0 text-finn-iron/50"
                                aria-hidden="true"
                            />

                            <span
                                className={[
                                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                                    "text-xs font-black text-white",
                                    index === 0
                                        ? "bg-finn-accent-blue"
                                        : "bg-finn-accent-blue/70",
                                ].join(" ")}
                            >
                                {index + 1}
                            </span>

                            {/*
                              * The same framed mark the feature cards use, at
                              * the same size. These two lists are the same
                              * priorities seen from two angles — the order
                              * they sit in, and what counts inside each one —
                              * and a mark that changes size between them
                              * reads as a different kind of thing rather than
                              * the same one twice.
                              */}
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-finn-iron/20 bg-white">
                                <PriorityIcon
                                    name={definition?.icon ?? "car"}
                                    className="h-5 w-5"
                                />
                            </span>

                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-bold text-finn-black">
                                    {definition?.label ?? id}
                                </span>
                                <span className="block text-[11px] text-finn-iron">
                                    {count === 0
                                        ? "Judged on the whole category"
                                        : `${count} feature${count === 1 ? "" : "s"} raised`}
                                </span>
                            </span>

                            {/*
                              * Dragging is the quick way and the buttons are the
                              * only way for anyone not using a mouse. Both move
                              * the same list.
                              */}
                            <span className="flex shrink-0 items-center gap-0.5">
                                <InfoButton
                                    subject={{ kind: "priority", id }}
                                    label={definition?.label ?? id}
                                    priorityDefinitions={priorityDefinitions}
                                />

                                <IconButton
                                    label={`Move ${definition?.label ?? id} up`}
                                    disabled={index === 0}
                                    onClick={() => move(index, index - 1)}
                                >
                                    <ArrowUp className="h-3.5 w-3.5" />
                                </IconButton>

                                <IconButton
                                    label={`Move ${definition?.label ?? id} down`}
                                    disabled={index === priorities.length - 1}
                                    onClick={() => move(index, index + 1)}
                                >
                                    <ArrowDown className="h-3.5 w-3.5" />
                                </IconButton>

                                <IconButton
                                    label={
                                        atFloor
                                            ? `Keep ${definition?.label ?? id} — ${MIN_PRIORITIES} priorities is the minimum`
                                            : `Remove ${definition?.label ?? id}`
                                    }
                                    disabled={atFloor}
                                    danger
                                    onClick={() =>
                                        onChange(
                                            priorities.filter(
                                                (item) => item !== id,
                                            ),
                                        )
                                    }
                                >
                                    <X className="h-3.5 w-3.5" />
                                </IconButton>
                            </span>
                        </li>
                    );
                })}
            </ol>

            {available.length > 0 && (
                <div className="mt-5 border-t border-finn-cotton pt-4">
                    <p className="text-xs font-black text-finn-black">
                        Add a priority
                    </p>

                    <p className="mt-0.5 text-[11px] leading-4 text-finn-iron">
                        {atLimit
                            ? `You're at ${MAX_PRIORITIES}. Remove one to add another — past that, the ones at the bottom stop changing any answer.`
                            : "It joins the end of your order. Move it up if it matters more."}
                    </p>

                    <div className="mt-2.5 flex flex-wrap gap-2">
                        {available.map((definition) => (
                            <span
                                key={definition.id}
                                className={[
                                    "inline-flex items-center gap-1 rounded-full pr-1.5",
                                    "text-[11px] font-bold transition-colors",
                                    atLimit
                                        ? "bg-finn-snow text-finn-iron/40"
                                        : "bg-finn-pale-blue text-finn-accent-blue hover:bg-finn-accent-blue hover:text-white",
                                ].join(" ")}
                            >
                                <button
                                    type="button"
                                    disabled={atLimit}
                                    onClick={() =>
                                        onChange([...priorities, definition.id])
                                    }
                                    className={[
                                        "inline-flex items-center gap-1.5 rounded-full py-1.5 pl-3",
                                        atLimit ? "cursor-not-allowed" : "",
                                    ].join(" ")}
                                >
                                    <Plus className="h-3 w-3" />
                                    {/*
                                      * Inherits rather than tints: this chip
                                      * turns solid blue on hover and dims
                                      * when the limit is reached, and both
                                      * are states only the cascade knows
                                      * about.
                                      */}
                                    <PriorityIcon
                                        name={definition.icon}
                                        className="h-3 w-3"
                                        tinted={false}
                                    />
                                    {definition.label}
                                </button>

                                {/*
                                  * Still asks, even at the limit. Finding out
                                  * what a priority is is exactly what a
                                  * reader who has to drop one before adding
                                  * it needs to do first.
                                  */}
                                <InfoButton
                                    subject={{
                                        kind: "priority",
                                        id: definition.id,
                                    }}
                                    label={definition.label}
                                    priorityDefinitions={priorityDefinitions}
                                />
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}

function IconButton({
    label,
    disabled,
    danger,
    onClick,
    children,
}: {
    label: string;
    disabled?: boolean;
    danger?: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            title={label}
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            className={[
                "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                disabled
                    ? "cursor-not-allowed text-finn-iron/25"
                    : danger
                        ? "text-finn-iron hover:bg-finn-error/10 hover:text-finn-error"
                        : "text-finn-iron hover:bg-finn-snow hover:text-finn-black",
            ].join(" ")}
        >
            {children}
        </button>
    );
}
