import { useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, Plus, X } from "lucide-react";

import { PriorityIcon } from "@/components/PriorityIcon";
import { InfoButton } from "@/components/PriorityInfo";
import { surfaceTone } from "@/lib/priority-marks";
import { priorityWeights } from "@/lib/reasoning-engine";
import {
    MAX_PRIORITIES,
    MIN_PRIORITIES,
} from "@/lib/reasoning-engine/constants";
import type {
    CategoryId,
    FeatureSelection,
    PriorityDefinition,
} from "@/lib/reasoning-engine/types";

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

    /*
     * The engine's own weights, not a picture of them. "The top one carries
     * the most" is a sentence a reader has to take on trust; a bar that
     * shrinks as a priority moves down, labelled with the share the scoring
     * actually gives it, shows what moving one costs before they do it.
     */
    const weights = priorityWeights(priorities);
    const topWeight = weights[0]?.weight ?? 1;

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
            <p className="flex items-baseline justify-between gap-3 text-xs font-black text-finn-black">
                <span>
                    Your order
                    <span className="ml-1.5 font-bold text-finn-iron">
                        {priorities.length} of {MAX_PRIORITIES}
                    </span>
                </span>

                <span className="text-[11px] font-bold text-finn-iron">
                    % = share of the result
                </span>
            </p>

            <ol className="mt-2.5 flex flex-col gap-2">
                {priorities.map((id, index) => {
                    const definition = definitionOf(id);
                    const count = categoryFeatures[id]?.length ?? 0;
                    const tone = surfaceTone(definition?.icon);
                    const weight = weights[index];

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
                                "flex cursor-grab items-center gap-3 rounded-2xl bg-white",
                                "px-3 py-2.5 shadow-sm ring-1 transition-all active:cursor-grabbing",
                                dragOver === id && dragging !== id
                                    ? "ring-2 ring-finn-accent-blue"
                                    : tone.edge,
                                dragging === id ? "opacity-50" : "",
                            ].join(" ")}
                        >
                            <GripVertical
                                className="hidden h-4 w-4 shrink-0 text-finn-iron/50 sm:block"
                                aria-hidden="true"
                            />

                            <span
                                className={[
                                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                                    "text-xs font-black text-white",
                                    tone.solid,
                                ].join(" ")}
                            >
                                {index + 1}
                            </span>

                            {/*
                              * The same size of mark the feature cards use.
                              * These two lists are the same priorities seen
                              * from two angles — the order they sit in, and
                              * what counts inside each one — and a mark that
                              * changes size between them reads as a different
                              * kind of thing rather than the same one twice.
                              */}
                            <span
                                className={[
                                    "hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 sm:flex",
                                    tone.ground,
                                    tone.edge,
                                ].join(" ")}
                            >
                                <PriorityIcon
                                    name={definition?.icon ?? "car"}
                                    className="h-5 w-5"
                                />
                            </span>

                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-bold leading-5 text-finn-black sm:truncate">
                                    {definition?.label ?? id}
                                </span>

                                <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                    {weight && (
                                        <span className="flex items-center gap-2">
                                            <span
                                                aria-hidden="true"
                                                className={[
                                                    "h-1.5 w-16 overflow-hidden rounded-full sm:w-24",
                                                    tone.track,
                                                ].join(" ")}
                                            >
                                                <span
                                                    className={[
                                                        "block h-full rounded-full transition-[width] duration-300",
                                                        tone.bar,
                                                    ].join(" ")}
                                                    style={{
                                                        width: `${(weight.weight / topWeight) * 100}%`,
                                                    }}
                                                />
                                            </span>

                                            <span
                                                className={[
                                                    "text-[11px] font-black tabular-nums",
                                                    tone.ink,
                                                ].join(" ")}
                                            >
                                                {weight.weightPercent}%
                                                <span className="sr-only">
                                                    {" "}
                                                    of the result
                                                </span>
                                            </span>
                                        </span>
                                    )}

                                    <span className="text-[11px] text-finn-iron">
                                        {weight && (
                                            <span aria-hidden="true" className="hidden sm:inline">· </span>
                                        )}
                                        {count === 0
                                            ? "Judged on the whole priority"
                                            : `${count} feature${count === 1 ? "" : "s"} raised`}
                                    </span>
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
                                    <ArrowUp aria-hidden="true" className="h-3.5 w-3.5" />
                                </IconButton>

                                <IconButton
                                    label={`Move ${definition?.label ?? id} down`}
                                    disabled={index === priorities.length - 1}
                                    onClick={() => move(index, index + 1)}
                                >
                                    <ArrowDown aria-hidden="true" className="h-3.5 w-3.5" />
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
                                    <X aria-hidden="true" className="h-3.5 w-3.5" />
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
                            ? `You're at ${MAX_PRIORITIES}, the most Lens will weigh. Remove one to add another — anything below fifth place counts for so little it would barely move the answer.`
                            : "It joins the end of your order. Move it up if it matters more."}
                    </p>

                    <div className="mt-2.5 flex flex-wrap gap-2">
                        {available.map((definition) => {
                            const tone = surfaceTone(definition.icon);

                            return (
                                <span
                                    key={definition.id}
                                    className={[
                                        /* `group` so the "i" inside can follow the chip's own hover
                                       colours — see `InfoButton`. */
                                    "group inline-flex items-center gap-1 rounded-full pr-1.5",
                                        "text-[11px] font-bold transition-colors",
                                        /*
                                         * A chip that cannot be pressed has to
                                         * look like one, and this one did not:
                                         * `finn-snow` on the panel's white is a
                                         * 1.04:1 ground and `finn-iron/40` is
                                         * barely ink, so at the limit — which is
                                         * the state a reader arrives in, since
                                         * the defaults fill all five slots — the
                                         * row read as a set of chips that had
                                         * failed to render rather than a set that
                                         * was closed.
                                         *
                                         * A filled grey ground and the label at
                                         * full strength instead. Solid `finn-iron`
                                         * was the other candidate and is too
                                         * heavy: it would make the one row of
                                         * things a reader cannot use the darkest
                                         * thing on the panel.
                                         */
                                        /*
                                         * Available, it wears the hue it will
                                         * have in the list, so the reader can see
                                         * which colour is about to join it.
                                         */
                                        atLimit
                                            ? "bg-finn-iron/15 text-finn-iron"
                                            : [
                                                  "ring-1",
                                                  tone.ground,
                                                  tone.groundHover,
                                                  tone.edge,
                                                  tone.edgeHover,
                                                  tone.ink,
                                              ].join(" "),
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
                                        <Plus aria-hidden="true" className="h-3 w-3" />
                                        {/*
                                          * Inherits rather than tints: the chip's
                                          * ink is already the mark's hue, and at
                                          * the limit it dims to grey — a state
                                          * only the cascade knows about.
                                          */}
                                        <PriorityIcon
                                            name={definition.icon}
                                            className="h-3.5 w-3.5"
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
                            );
                        })}
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
