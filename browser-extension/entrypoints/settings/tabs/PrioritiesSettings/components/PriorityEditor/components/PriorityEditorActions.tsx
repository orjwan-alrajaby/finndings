interface PriorityEditorActionsProps {
    disabled: boolean;
    onCancel: () => void;
    onSave: () => void;
}

/**
 * Closing an editor, not writing a file.
 *
 * This said "Save changes", which is also what the page's own save button
 * says — and only one of them writes anything. Two identical labels a few
 * hundred pixels apart, one of which commits a draft to the page and one of
 * which commits the page to disk, is the whole of why a reader saves a
 * priority and then wonders why nothing was saved.
 *
 * "Keep" is what this does: the draft joins the page, and the page still
 * needs saving. The button that does that says so, and now says something
 * different.
 */
export function PriorityEditorActions({
    disabled,
    onCancel,
    onSave,
}: PriorityEditorActionsProps) {
    return (
        <div className="flex gap-2 pt-1">
            <button
                type="button"
                onClick={onCancel}
                className="h-10 flex-1 rounded-full bg-white text-xs font-bold text-finn-black shadow-sm"
            >
                Discard
            </button>

            <button
                type="button"
                disabled={disabled}
                onClick={onSave}
                className="h-10 flex-1 rounded-full bg-finn-highlight-navy text-xs font-bold text-white shadow-sm disabled:opacity-40"
            >
                Keep
            </button>
        </div>
    );
}