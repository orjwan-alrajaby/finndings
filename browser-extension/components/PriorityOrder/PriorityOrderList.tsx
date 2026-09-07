import { useState } from "react";
import { ArrowDown, ArrowUp, Menu, Plus, X } from "lucide-react";

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
                                    <Plus aria-hidden="true" className="h-3 w-3" />
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
