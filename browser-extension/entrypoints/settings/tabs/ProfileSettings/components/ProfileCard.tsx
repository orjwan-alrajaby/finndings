import type { PriorityDefinition, Profile } from "@/lib/reasoning-engine/types";
import {
    DefaultBadge,
    SetDefaultButton,
    Toggle,
} from "@/entrypoints/settings/components/primitives";

interface ProfileCardProps {
    profile: Profile;
    priorityDefinitions: PriorityDefinition[];
    isDefault: boolean;
    enabledCount: number;
    onToggleEnabled: (id: string, enabled: boolean) => void;
    onSetDefault: (id: string) => void;
}

export function ProfileCard({
    profile,
    priorityDefinitions,
    isDefault,
    enabledCount,
    onToggleEnabled,
    onSetDefault,
}: ProfileCardProps) {
    /* Lens always needs one strategy to start from. */
    const isLastEnabled = profile.enabled && enabledCount <= 1;

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

                    <p className="mt-0.5 text-xs leading-5 text-finn-iron">
                        {profile.forWhom}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-finn-black">
                        {profile.assumes}
                    </p>

                    <PriorityList
                        profile={profile}
                        priorityDefinitions={priorityDefinitions}
                    />

                    {!isDefault && profile.enabled && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            <SetDefaultButton
                                onClick={() => onSetDefault(profile.id)}
                            />
                        </div>
                    )}
                </div>

                <Toggle
                    checked={profile.enabled}
                    disabled={isLastEnabled}
                    onChange={(next) => onToggleEnabled(profile.id, next)}
                    label={`${profile.enabled ? "Disable" : "Enable"} ${profile.label}`}
                />
            </div>

            {isLastEnabled && (
                <p className="mx-4 mb-3 rounded-xl bg-finn-cotton px-3 py-2 text-[10px] leading-4 text-finn-iron">
                    This is the only profile still switched on, so it can't be
                    switched off — Lens always needs one to start you from.
                </p>
            )}

            {isDefault && (
                <p className="mx-4 mb-3 rounded-xl bg-finn-pale-blue px-3 py-2 text-[10px] leading-4 text-finn-highlight-navy">
                    This profile is selected automatically when you start a new
                    comparison. Anything you change afterwards is kept.
                </p>
            )}
        </div>
    );
}

interface PriorityListProps {
    profile: Profile;
    priorityDefinitions: PriorityDefinition[];
}

/** The profile's fixed order, shown so the label is never taken on trust. */
function PriorityList({ profile, priorityDefinitions }: PriorityListProps) {
    return (
        <div className="mt-3 flex flex-wrap gap-1.5">
            {profile.priorities.map((id, index) => {
                const definition = priorityDefinitions.find(
                    (priority) => priority.id === id,
                );

                return (
                    <span
                        key={id}
                        className={[
                            "rounded-full border px-2.5 py-1 text-[10px] font-bold shadow-xs",
                            definition?.enabled
                                ? "border-finn-iron/20 bg-white text-finn-black"
                                : "border-finn-warning/20 bg-finn-warning/10 text-finn-warning",
                        ].join(" ")}
                    >
                        {index + 1} · {definition?.label ?? "Unknown priority"}
                        {definition && !definition.enabled && " (off)"}
                    </span>
                );
            })}
        </div>
    );
}
