import { HugeiconsIcon } from "@hugeicons/react";
import { CheckIcon } from "@hugeicons/core-free-icons";

/**
 * The only thing on this page that keeps anything.
 *
 * There used to be two. A priority editor had its own Save a few hundred
 * pixels from this one, and only this one wrote to disk — so a reader could
 * press Save, press Save again, and lose the edit. The editor no longer holds
 * a draft at all: its changes land in the page as they are made, and this is
 * the single act that commits them.
 *
 * Which puts the whole burden on this button being *noticed*. It was in a bar
 * fixed to the bottom of the window, which is furniture a reader stops seeing
 * on the second day; it now sits in the sticky tab row, and when there is
 * something to save it says so and pulses — twice, gently, and then stops.
 * A control that pulsed forever would be nagging, and a reader who has read
 * it once does not need telling again.
 */
export function SaveControl({
    dirty,
    saved,
    onSave,
}: {
    dirty: boolean;
    /** True for a moment after a successful write. */
    saved: boolean;
    onSave: () => void;
}) {
    return (
        <span className="flex items-center gap-2.5">
            <span
                className={[
                    "text-xs font-bold transition-colors",
                    dirty ? "text-finn-warning" : "text-finn-iron",
                ].join(" ")}
            >
                {saved
                    ? "Saved."
                    : dirty
                        ? "Unsaved changes"
                        : "All changes saved"}
            </span>

            <button
                type="button"
                onClick={onSave}
                disabled={!dirty}
                /*
                 * Keyed on the state so the animation restarts each time the
                 * page goes from clean to dirty. Without it a reader who
                 * saves and then changes something else gets no second
                 * prompt, having been given one for the first change.
                 */
                key={dirty ? "dirty" : "clean"}
                className={[
                    "inline-flex items-center gap-2 rounded-full px-5 py-2.5",
                    "text-xs font-black shadow-sm transition-colors",
                    dirty
                        ? "finn-lens-attention bg-finn-accent-blue text-white hover:bg-finn-highlight-navy"
                        : "cursor-default bg-white text-finn-iron",
                ].join(" ")}
            >
                <HugeiconsIcon icon={CheckIcon} className="h-4 w-4" />
                {dirty ? "Save changes" : "Saved"}
            </button>
        </span>
    );
}
