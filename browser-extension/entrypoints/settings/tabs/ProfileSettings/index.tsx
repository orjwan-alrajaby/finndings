import type { PriorityDefinition, Profile } from "@/lib/reasoning-engine/types";
import { Section } from "../../components/primitives";
import { ProfileCard } from "./components/ProfileCard";

interface ProfilesSettingsProps {
    profiles: Profile[];
    priorityDefinitions: PriorityDefinition[];
    defaultProfileId: string;
    onToggleEnabled: (id: string, enabled: boolean) => void;
    onSetDefault: (id: string) => void;
}

/**
 * Profiles are predefined recommendation strategies, not user documents.
 *
 * They can be switched on, switched off, and made the default. They cannot be
 * renamed, reordered or deleted: a "Family First" profile the user has
 * rewritten to lead on comfort is a lie in the picker, and the honest way to
 * express that is the custom priority flow instead.
 *
 * "Default" here means *automatically selected* — not merely "shipped in the
 * list". Exactly one profile holds it, and it must be an enabled one.
 */
export function ProfilesSettings({
    profiles,
    priorityDefinitions,
    defaultProfileId,
    onToggleEnabled,
    onSetDefault,
}: ProfilesSettingsProps) {
    const enabledCount = profiles.filter((profile) => profile.enabled).length;

    return (
        <Section
            title="Profiles"
            description="A profile is a starting philosophy: five priorities in a sensible order. Turn off the ones you'll never use, and pick the one Lens should start you on. If you want a different order, choose your own priorities in the compare flow instead — that always wins over a profile."
        >
            <div className="flex flex-col gap-4">
                {profiles.map((profile) => (
                    <ProfileCard
                        key={profile.id}
                        profile={profile}
                        priorityDefinitions={priorityDefinitions}
                        isDefault={profile.id === defaultProfileId}
                        enabledCount={enabledCount}
                        onToggleEnabled={onToggleEnabled}
                        onSetDefault={onSetDefault}
                    />
                ))}
            </div>
        </Section>
    );
}
