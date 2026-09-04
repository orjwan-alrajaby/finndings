import {
    ArrowDownCircleIcon,
    CheckIcon,
} from "@heroicons/react/24/outline";

/**
 * Saving, and the one thing that can stop it.
 *
 * This page has two levels of keeping: a priority editor's Done, which puts a
 * draft into the page, and this, which puts the page onto disk. That is a
 * reasonable shape — an editor you can abandon is worth having — and a bad
 * one to leave unexplained, because a reader who edits a priority and comes
 * straight here would have their draft written around and lost, having
 * pressed Save.
 *
 * So when an editor is still open with work in it, this stops looking like a
 * save button and starts looking like a signpost. Pressing it doesn't refuse
 * with a message; it takes the reader to the editor and flashes it, because
 * the two buttons that resolve this are already there and no wording here
 * could beat showing them.
 */
export function SaveControl({
    dirty,
    saved,
    pendingLabel,
    onSave,
}: {
    dirty: boolean;
    /** True for a moment after a successful write. */
    saved: boolean;
    /** The priority still being edited, when one is. */
    pendingLabel: string | null;
    onSave: () => void;
}) {
    if (pendingLabel) {
        return (
            <button
                type="button"
                onClick={onSave}
                className="inline-flex items-center gap-2 rounded-full bg-finn-warning px-5 py-2.5 text-xs font-black text-white shadow-sm transition hover:brightness-105"
            >
                <ArrowDownCircleIcon className="h-4 w-4" />
                Finish editing {pendingLabel}
            </button>
        );
    }

    return (
        <span className="flex items-center gap-2.5">
            <span
                className={[
                    "text-xs font-bold",
                    dirty ? "text-finn-black" : "text-finn-iron",
                ].join(" ")}
            >
                {saved
                    ? "Saved."
                    : dirty
                        ? "Not saved yet"
                        : "All changes saved"}
            </span>

            <button
                type="button"
                onClick={onSave}
                disabled={!dirty}
                className={[
                    "inline-flex items-center gap-2 rounded-full px-5 py-2.5",
                    "text-xs font-black shadow-sm transition-colors",
                    dirty
                        ? "bg-finn-accent-blue text-white hover:bg-finn-highlight-navy"
                        : "cursor-default bg-white text-finn-iron",
                ].join(" ")}
            >
                <CheckIcon className="h-4 w-4" />
                {dirty ? "Save changes" : "Saved"}
            </button>
        </span>
    );
}
