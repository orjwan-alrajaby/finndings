interface PriorityEditorActionsProps {
    disabled: boolean;
    onCancel: () => void;
    onSave: () => void;
}

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
                Cancel
            </button>

            <button
                type="button"
                disabled={disabled}
                onClick={onSave}
                className="h-10 flex-1 rounded-full bg-finn-highlight-navy text-xs font-bold text-white shadow-sm disabled:opacity-40"
            >
                Save changes
            </button>
        </div>
    );
}