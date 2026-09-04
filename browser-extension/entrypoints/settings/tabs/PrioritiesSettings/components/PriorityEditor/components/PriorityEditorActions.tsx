interface PriorityEditorActionsProps {
    disabled: boolean;
    onCancel: () => void;
    onSave: () => void;
}

/**
 * Closing an editor, not saving a file.
 *
 * This button used to say "Save changes", which is what the page's own save
 * button said — and only one of them wrote anything. A reader who pressed
 * this one and closed the tab lost work having pressed something labelled
 * Save. The page saves on its own now, so what is left for this to do is
 * take the reader out of the editor with their edits kept, and the word for
 * that is Done.
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
                Done
            </button>
        </div>
    );
}