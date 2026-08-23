import { useState } from "react";
import type { PriorityDefinition, Profile } from "@/lib/reasoning-engine/types";
import { Section } from "../../components/primitives";
import { ProfileCard } from "./components/ProfileCard";
import { ConfirmDialog } from "../../components/ConfirmDialog";

interface ProfilesSettingsProps {
    profiles: Profile[];
    priorityDefinitions: PriorityDefinition[];
    defaultProfileId: string;
    onSaveProfile: (profile: Profile, isNew: boolean) => void;
    onDeleteProfile: (profile: Profile) => void;
    onToggleEnabled: (id: string, enabled: boolean) => void;
    onSetDefault: (id: string) => void;
}

export function ProfilesSettings({
    profiles,
    priorityDefinitions,
    defaultProfileId,
    onSaveProfile,
    onDeleteProfile,
    onToggleEnabled,
    onSetDefault,
}: ProfilesSettingsProps) {
    const [openId, setOpenId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);

    const enabledCount = profiles.filter((profile) => profile.enabled).length;

    const handleSaveProfile = (profile: Profile, isNew: boolean) => {
        onSaveProfile(profile, isNew);
        setOpenId(null);
    };

    return (
        <Section
            title="Profiles"
            description="Profiles are shortcuts for a ranked set of priorities — not a bucket of features. The same priority can appear in several profiles with a different rank in each."
        >
            <div className="flex flex-col gap-4">
                {profiles.map((profile) => (
                    <ProfileCard
                        key={profile.id}
                        profile={profile}
                        priorityDefinitions={priorityDefinitions}
                        defaultProfileId={defaultProfileId}
                        enabledCount={enabledCount}
                        open={openId === profile.id}
                        onEdit={() =>
                            setOpenId(
                                openId === profile.id ? null : profile.id,
                            )
                        }
                        onSave={(updatedProfile) =>
                            handleSaveProfile(updatedProfile, false)
                        }
                        onCancel={() => setOpenId(null)}
                        onDelete={() => setDeleteTarget(profile)}
                        onToggleEnabled={onToggleEnabled}
                        onSetDefault={onSetDefault}
                    />
                ))}
            </div>

            <ConfirmDialog
                open={deleteTarget != null}
                onOpenChange={(open) => {
                    if (!open) setDeleteTarget(null);
                }}
                title={
                    deleteTarget
                        ? `Delete "${deleteTarget.label}"?`
                        : ""
                }
                confirmLabel="Delete profile"
                onConfirm={() => {
                    if (deleteTarget) {
                        onDeleteProfile(deleteTarget);
                    }

                    setDeleteTarget(null);
                }}
                description={
                    deleteTarget?.id === defaultProfileId
                        ? "This is currently your default profile. Another enabled profile will automatically become the default."
                        : "This can't be undone."
                }
            />
        </Section>
    );
}