import type { PriorityDefinition, Profile } from "@/lib/reasoning-engine/types";
import { ProfileEditor } from "./ProfileEditor";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { DefaultBadge, SetDefaultButton, Toggle } from "@/entrypoints/settings/components/primitives";

interface ProfileCardProps {
    profile: Profile;
    priorityDefinitions: PriorityDefinition[];
    defaultProfileId: string;
    enabledCount: number;
    open: boolean;
    onEdit: () => void;
    onSave: (profile: Profile) => void;
    onCancel: () => void;
    onDelete: () => void;
    onToggleEnabled: (id: string, enabled: boolean) => void;
    onSetDefault: (id: string) => void;
}

export function ProfileCard({
    profile,
    priorityDefinitions,
    defaultProfileId,
    enabledCount,
    open,
    onEdit,
    onSave,
    onCancel,
    onDelete,
    onToggleEnabled,
    onSetDefault,
}: ProfileCardProps) {
    const isLastEnabled = profile.enabled && enabledCount <= 1;
    const isDefault = profile.id === defaultProfileId;

    return (
        <div className="rounded-[22px] bg-finn-snow drop-shadow-sm">
            <div className="flex items-start gap-3 p-4">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-finn-iron/20 bg-white text-2xl font-bold text-finn-accent-blue">
                    {profile.icon}
                </span>

                <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-black text-finn-black">
                            {profile.label}
                        </span>

                        {isDefault && <DefaultBadge />}
                    </div>

                    <p className="mt-0.5 text-xs text-finn-iron">
                        {profile.forWhom}
                    </p>

                    {profile?.priorities?.length > 0 && <PriorityList
                        profile={profile}
                        priorityDefinitions={priorityDefinitions}
                    />}

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        {!isDefault && profile.enabled && (
                            <SetDefaultButton onClick={() => onSetDefault(profile.id)} />
                        )}
                    </div>
                </div>

                <div className="flex flex-shrink-0 flex-col items-end gap-2">
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={onEdit}
                            className="rounded-full p-2 text-finn-iron hover:text-finn-black"
                            aria-label="Edit"
                        >
                            <PencilSquareIcon className="h-4 w-4" />
                        </button>

                        <button
                            type="button"
                            onClick={onDelete}
                            disabled={isLastEnabled}
                            className="rounded-full p-2 text-finn-iron transition-colors hover:text-finn-error disabled:cursor-not-allowed disabled:opacity-30"
                            aria-label={`Delete ${profile.label}`}
                        >
                            <TrashIcon className="h-4 w-4" />
                        </button>
                    </div>

                    <Toggle
                        checked={profile.enabled}
                        disabled={isLastEnabled}
                        onChange={(next) => onToggleEnabled(profile.id, next)}
                        label={`${profile.enabled ? "Disable" : "Enable"} ${profile.label}`}
                    />
                </div>
            </div>

            {isLastEnabled && (
                <p className="mx-4 mb-3 rounded-xl bg-finn-cotton px-3 py-2 text-[10px] leading-4 text-finn-iron">
                    This is the only enabled profile, so it can't be disabled
                    or deleted — FINN Lens always needs one to fall back on.
                </p>
            )}

            {open && (
                <ProfileEditor
                    profile={profile}
                    priorityDefinitions={priorityDefinitions}
                    onCancel={onCancel}
                    onSave={onSave}
                />
            )}
        </div>
    );
}

interface PriorityListProps {
    profile: Profile;
    priorityDefinitions: PriorityDefinition[];
}

function PriorityList({
    profile,
    priorityDefinitions,
}: PriorityListProps) {
    return (
        <div className="mt-4 flex flex-wrap gap-1.5">
            {profile.priorities.map((id, index) => {
                const definition = priorityDefinitions.find(
                    (priority) => priority.id === id,
                );

                return (
                    <span
                        key={id}
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-bold shadow-xs ${definition && definition.enabled
                            ? "border-finn-iron/20 bg-white text-finn-black"
                            : "border-finn-warning/20 bg-finn-warning/10 text-finn-warning"
                            }`}
                    >
                        {index + 1} ·{" "}
                        {definition?.label ?? "Unknown priority"}
                    </span>
                );
            })}
        </div>
    );
}