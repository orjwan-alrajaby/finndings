import { Check } from "lucide-react";

/**
 * The one control that commits an edit, wherever edits are being made.
 *
 * The settings page used to have two of these. A priority editor had its own
 * Save a few hundred pixels from the real one, and only the real one wrote to
 * disk — so a reader could press Save, press Save again, and lose the edit.
 * There is one now, and it is shared: the compare drawer commits its draft
 * through the same control, saying the same three things in the same words,
 * because "have I saved this?" should not have a different answer per screen.
 *
 * Which puts the whole burden on the button being *noticed*. It was in a bar
 * fixed to the bottom of the window, which is furniture a reader stops seeing
 * on the second day; it now sits where the reader already looks — the sticky
 * tab row on settings, the drawer's own footer — and when there is something
 * to save it says so and pulses, twice, gently, and then stops. A control
 * that pulsed forever would be nagging, and a reader who has read it once
 * does not need telling again.
 */
export function SaveControl({
    dirty,
    saved,
    onSave,
    saveLabel = "Save changes",
    className,
}: {
    dirty: boolean;
    /** True for a moment after a successful write. */
    saved: boolean;
    onSave: () => void;
    /** Overridden where "changes" is vaguer than the surface can be. */
    saveLabel?: string;
    /** Lets a footer stretch the control that a toolbar keeps compact. */
    className?: string;
}) {
    return (
        <span
            className={["flex items-center gap-2.5", className ?? ""].join(
                " ",
            )}
        >
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
                <Check className="h-4 w-4" aria-hidden="true" />
                {dirty ? saveLabel : "Saved"}
            </button>
        </span>
    );
}
