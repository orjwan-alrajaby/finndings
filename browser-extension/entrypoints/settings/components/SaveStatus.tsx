import { useEffect, useRef, useState } from "react";
import {
    ArrowUturnLeftIcon,
    CheckCircleIcon,
    ChevronDownIcon,
    CloudIcon,
    ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

import type { ChangeGroup, SettingsChange } from "@/lib/settings-changes";

export type SaveState = "idle" | "saving" | "saved" | "failed";

const GROUP_LABEL: Record<ChangeGroup, string> = {
    priorities: "Priorities",
    features: "What counts inside",
    profiles: "Profiles",
    driving: "Driving",
};

/**
 * What is saved, what changed, and how to take any of it back.
 *
 * This replaces a bar fixed to the bottom of the window that said "You have
 * unsaved changes" and carried the only button that actually wrote anything.
 * Two things were wrong with it and only one was the styling.
 *
 * The first is that the page had two kinds of Save and they looked the same.
 * A priority editor's "Save changes" committed to the page; the bar's "Save
 * changes" committed to disk. A reader who pressed the first and closed the
 * tab lost their work, having pressed a button labelled Save. That is not a
 * mistake a reader makes, it is one a product makes. There is now one kind of
 * save and nobody presses it: edits persist on their own.
 *
 * The second is that "you have unsaved changes" is the least useful true
 * sentence available — it names nothing, so it can't be checked, and it makes
 * one careless click and an afternoon's work look identical. This says how
 * many changes, what each one was, and offers to undo them one at a time.
 *
 * It sits in the page header rather than floating over the content, because
 * it is a status and not an obstacle, and because a thing fixed to the bottom
 * of a window is a thing you stop seeing on the second day.
 */
export function SaveStatus({
    state,
    changes,
    onRevert,
    onRevertAll,
    onRetry,
}: {
    state: SaveState;
    /** Everything different from what was on disk when the page opened. */
    changes: SettingsChange[];
    onRevert: (id: string) => void;
    onRevertAll: () => void;
    onRetry: () => void;
}) {
    const [open, setOpen] = useState(false);
    const container = useRef<HTMLDivElement>(null);

    /* A panel over the page closes when the reader looks away from it. */
    useEffect(() => {
        if (!open) return;

        const onPointerDown = (event: MouseEvent) => {
            if (!container.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };

        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);

        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    /* Nothing to look at once everything is back to how it was. */
    useEffect(() => {
        if (changes.length === 0) setOpen(false);
    }, [changes.length]);

    const count = changes.length;

    return (
        <div ref={container} className="relative">
            <div
                className={[
                    "flex items-center gap-1 rounded-full p-1 shadow-sm transition-colors",
                    state === "failed" ? "bg-finn-error/10" : "bg-white",
                ].join(" ")}
            >
                <span className="flex items-center gap-1.5 pl-3 pr-1">
                    <Indicator state={state} />

                    <span
                        className={[
                            "text-xs font-black",
                            state === "failed"
                                ? "text-finn-error"
                                : "text-finn-black",
                        ].join(" ")}
                    >
                        {state === "saving" && "Saving…"}
                        {state === "saved" && "Saved"}
                        {state === "failed" && "Not saved"}
                        {state === "idle" &&
                            (count > 0 ? "Saved" : "Up to date")}
                    </span>
                </span>

                {state === "failed" ? (
                    <button
                        type="button"
                        onClick={onRetry}
                        className="rounded-full bg-finn-error px-3.5 py-2 text-xs font-black text-white transition hover:brightness-110"
                    >
                        Try again
                    </button>
                ) : (
                    count > 0 && (
                        <button
                            type="button"
                            onClick={() => setOpen((value) => !value)}
                            aria-expanded={open}
                            className={[
                                "flex items-center gap-1.5 rounded-full px-3 py-2",
                                "text-xs font-bold transition-colors",
                                open
                                    ? "bg-finn-accent-blue text-white"
                                    : "bg-finn-pale-blue text-finn-accent-blue hover:bg-finn-accent-blue hover:text-white",
                            ].join(" ")}
                        >
                            {count} {count === 1 ? "change" : "changes"}
                            <ChevronDownIcon
                                className={[
                                    "h-3.5 w-3.5 transition-transform",
                                    open ? "rotate-180" : "",
                                ].join(" ")}
                            />
                        </button>
                    )
                )}
            </div>

            {open && count > 0 && (
                <ChangePanel
                    changes={changes}
                    onRevert={onRevert}
                    onRevertAll={onRevertAll}
                />
            )}
        </div>
    );
}

function Indicator({ state }: { state: SaveState }) {
    if (state === "failed") {
        return (
            <ExclamationTriangleIcon className="h-4 w-4 text-finn-error" />
        );
    }

    if (state === "saving") {
        return (
            <span
                aria-hidden="true"
                className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-finn-cotton border-t-finn-accent-blue"
            />
        );
    }

    if (state === "saved") {
        return <CheckCircleIcon className="h-4 w-4 text-finn-success" />;
    }

    return <CloudIcon className="h-4 w-4 text-finn-iron" />;
}

/**
 * The changes, grouped, each with its own way back.
 *
 * Against what was on disk when the page opened rather than against the last
 * keystroke — so a reader who moves a priority and moves it back has made no
 * change, and the list says so by not mentioning it.
 */
function ChangePanel({
    changes,
    onRevert,
    onRevertAll,
}: {
    changes: SettingsChange[];
    onRevert: (id: string) => void;
    onRevertAll: () => void;
}) {
    const groups = [...new Set(changes.map((change) => change.group))];

    return (
        <div className="absolute right-0 top-full z-40 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-[22px] bg-white shadow-xl">
            <div className="border-b border-finn-cotton px-4 py-3">
                <p className="text-xs font-black text-finn-black">
                    Changed since you opened this page
                </p>

                <p className="mt-0.5 text-[11px] leading-4 text-finn-iron">
                    All of it is already saved. Undo anything here and that is
                    saved too.
                </p>
            </div>

            <div className="max-h-80 overflow-y-auto">
                {groups.map((group) => (
                    <div key={group}>
                        <p className="bg-finn-snow px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-finn-iron">
                            {GROUP_LABEL[group]}
                        </p>

                        {changes
                            .filter((change) => change.group === group)
                            .map((change) => (
                                <div
                                    key={change.id}
                                    className="flex items-start gap-2 border-b border-finn-snow px-4 py-2.5 last:border-b-0"
                                >
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-xs font-bold text-finn-black">
                                            {change.label}
                                        </span>

                                        <span className="mt-0.5 block text-[11px] leading-4 text-finn-iron">
                                            {change.detail}
                                        </span>
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() => onRevert(change.id)}
                                        title={`Undo the change to ${change.label}`}
                                        className="flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black text-finn-iron transition hover:bg-finn-snow hover:text-finn-black"
                                    >
                                        <ArrowUturnLeftIcon className="h-3 w-3" />
                                        Undo
                                    </button>
                                </div>
                            ))}
                    </div>
                ))}
            </div>

            <div className="border-t border-finn-cotton px-4 py-3">
                <button
                    type="button"
                    onClick={onRevertAll}
                    className="w-full rounded-full bg-finn-snow py-2.5 text-xs font-black text-finn-black transition hover:bg-finn-cotton"
                >
                    Undo all {changes.length}
                </button>
            </div>
        </div>
    );
}
