import type { PriorityDefinition, Profile } from "@/lib/reasoning-engine/types";
import {
    DefaultBadge,
    SetDefaultButton,
    Toggle,
} from "@/entrypoints/settings/components/primitives";
import { PriorityIcon } from "@/components/PriorityIcon";

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
        /*
         * The default wears its state rather than explaining it. It used to
         * carry a paragraph saying it is the one Lens starts you on; a pale
         * blue card at the top of the list says the same thing without
         * spending three lines on it, and says it while the reader is
         * scanning rather than after they have stopped to read.
         */
        <div
            className={[
                "rounded-[22px] drop-shadow-sm",
                isDefault ? "bg-finn-pale-blue" : "bg-finn-snow",
            ].join(" ")}
        >
            <div className="flex items-start gap-3 p-4">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-finn-iron/20 bg-white text-finn-accent-blue">
                    <PriorityIcon name={profile.icon} className="h-5 w-5" />
                </span>

                <div className="min-w-0 flex-1 space-y-1">
                    {/*
                      * The badge and the button occupy the same spot, because
                      * they answer the same question: this one is the default,
                      * or this is where you make it one. Below the priority
                      * list the button was a long way from the name it acts
                      * on, in a card that is mostly other cards' width of
                      * text.
                      */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-black text-finn-black">
                            {profile.label}
                        </span>

                        {isDefault && <DefaultBadge />}

                        {!isDefault && profile.enabled && (
                            <SetDefaultButton
                                onClick={() => onSetDefault(profile.id)}
                                label={profile.label}
                            />
                        )}
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
                </div>

                {/*
                  * The reason the last one can't be switched off moved into
                  * the switch itself. It used to be a panel under the card,
                  * which is a lot of furniture for a sentence a reader needs
                  * exactly once — but a disabled control with no explanation
                  * anywhere is a dead end, so the title carries it.
                  */}
                <Toggle
                    checked={profile.enabled}
                    disabled={isLastEnabled}
                    onChange={(next) => onToggleEnabled(profile.id, next)}
                    label={
                        isLastEnabled
                            ? `Lens needs one profile switched on, so ${profile.label} can't be switched off`
                            : `${profile.enabled ? "Disable" : "Enable"} profile ${profile.label}`
                    }
                />
            </div>
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
