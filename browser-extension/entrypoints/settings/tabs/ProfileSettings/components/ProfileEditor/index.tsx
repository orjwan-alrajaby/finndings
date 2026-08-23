import { useState } from "react";
import type {
    CategoryId,
    PriorityDefinition,
    Profile,
} from "@/lib/reasoning-engine/types";
import { validateProfileDraft } from "@/entrypoints/settings/utils/PriorityValidation";
import { InlineError } from "@/entrypoints/settings/components/primitives";
import { PriorityRow } from "./components/PriorityRow";

const MAX_PRIORITIES = 5;

interface ProfileEditorProps {
    profile: Profile;
    priorityDefinitions: PriorityDefinition[];
    onSave: (profile: Profile) => void;
    onCancel: () => void;
}

export function ProfileEditor({
    profile,
    priorityDefinitions,
    onSave,
    onCancel,
}: ProfileEditorProps) {
    const [priorities, setPriorities] = useState<CategoryId[]>(
        () => [...profile.priorities],
    );

    const atMax = priorities.length >= MAX_PRIORITIES;

    const selectable = priorityDefinitions.filter(
        (priority) =>
            priority.enabled && !priorities.includes(priority.id),
    );

    const error = validateProfileDraft(priorities);

    const addPriority = (id: CategoryId) => {
        setPriorities((current) => {
            if (current.length >= MAX_PRIORITIES) {
                return current;
            }

            if (current.includes(id)) {
                return current;
            }

            return [...current, id];
        });
    };

    const removePriority = (id: CategoryId) => {
        setPriorities((current) =>
            current.filter((priorityId) => priorityId !== id),
        );
    };

    const movePriority = (
        index: number,
        direction: -1 | 1,
    ) => {
        setPriorities((current) => {
            const nextIndex = index + direction;

            if (
                index < 0 ||
                index >= current.length ||
                nextIndex < 0 ||
                nextIndex >= current.length
            ) {
                return current;
            }

            const next = [...current];
            const a = next[index];
            const b = next[nextIndex];

            if (a === undefined || b === undefined) {
                return current;
            }

            next[index] = b;
            next[nextIndex] = a;

            return next;
        });
    };

    const handleSave = () => {
        if (error) {
            return;
        }

        onSave({
            ...profile,
            priorities,
        });
    };

    return (
        <div className="space-y-3 border-t border-white p-4">
            <div>
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-finn-iron">
                        Priorities, ranked ({priorities.length}/{MAX_PRIORITIES})
                    </span>
                </div>

                {priorities.length < 3 && (
                    <p className="mt-1 text-[10px] text-finn-iron">
                        Select at least 3 to save this profile.
                    </p>
                )}

                <div className="mt-2 space-y-1.5">
                    {priorities.map((id, index) => {
                        const definition = priorityDefinitions.find(
                            (priority) => priority.id === id,
                        );

                        return (
                            <PriorityRow
                                key={id}
                                definition={definition}
                                index={index}
                                total={priorities.length}
                                onMove={movePriority}
                                onRemove={removePriority}
                            />
                        );
                    })}
                </div>

                {!atMax && selectable.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {selectable.map((priority) => (
                            <button
                                key={priority.id}
                                type="button"
                                onClick={() => addPriority(priority.id)}
                                className="rounded-full bg-white px-2.5 py-1.5 text-[10px] font-bold text-finn-iron hover:text-finn-black"
                            >
                                + {priority.icon} {priority.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <InlineError>{error}</InlineError>

            <div className="flex gap-2 pt-1">
                <button
                    type="button"
                    onClick={onCancel}
                    className="h-10 flex-1 rounded-full border border-finn-cotton text-xs font-bold text-finn-black"
                >
                    Cancel
                </button>

                <button
                    type="button"
                    disabled={Boolean(error)}
                    onClick={handleSave}
                    className="h-10 flex-1 rounded-full bg-finn-highlight-navy text-xs font-bold text-white disabled:opacity-40"
                >
                    Save profile
                </button>
            </div>
        </div>
    );
}