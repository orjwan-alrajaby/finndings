import { useState } from "react";
import {
    DEFAULT_DEFAULT_PROFILE_ID,
    profileEmphasis,
} from "@/lib/reasoning-engine/constants";
import {
    type CategoryId,
    type FeatureSelection,
    type PriorityDefinition,
    type Profile,
    type ProfileId,
    type SettingsBasis,
} from "@/lib/reasoning-engine/types";
import { Section } from "../../components/primitives";
import { EmphasisScope } from "@/components/EmphasisScope";
import { PriorityEditor } from "./components/PriorityEditor";
import { PriorityCard } from "./components/PriorityCard";
import { PriorityOrder } from "./components/PriorityOrder";

interface PrioritiesSettingsProps {
    priorities: CategoryId[];
    priorityDefinitions: PriorityDefinition[];
    categoryFeatures: Record<CategoryId, FeatureSelection>;
    profiles: Profile[];
    basedOn: SettingsBasis;
    customised: boolean;
    onChangePriorities: (next: CategoryId[]) => void;
    onApplyProfile: (profile: ProfileId) => void;
    onUndoProfile: (() => void) | null;
    onChangeFeatures: (
        priorityId: CategoryId,
        features: FeatureSelection,
    ) => void;
}

export function PrioritiesSettings({
    priorities,
    priorityDefinitions,
    categoryFeatures,
    profiles,
    basedOn,
    customised,
    onChangePriorities,
    onApplyProfile,
    onUndoProfile,
    onChangeFeatures,
}: PrioritiesSettingsProps) {
    /* "Reset to defaults" inside a priority means the profile the reader started from. */
    const startingEmphasis = profileEmphasis(basedOn ?? DEFAULT_DEFAULT_PROFILE_ID);
    const profileLabel = basedOn
        ? (profiles.find((profile) => profile.id === basedOn)?.label ?? null)
        : null;

    const [openId, setOpenId] =
        useState<CategoryId | null>(null);

    const handleTogglePriority = (
        priorityId: CategoryId,
    ) => {
        setOpenId((current) =>
            current === priorityId ? null : priorityId,
        );
    };

    return (
        <>
        <PriorityOrder
            priorities={priorities}
            priorityDefinitions={priorityDefinitions}
            categoryFeatures={categoryFeatures}
            profiles={profiles}
            basedOn={basedOn}
            customised={customised}
            onChange={onChangePriorities}
            onApplyProfile={onApplyProfile}
            onUndoProfile={onUndoProfile}
        />

        <Section
            title="What counts inside each priority"
            description="Your order above decides how much each priority counts overall. Here you decide what counts for more inside each one. Everything a priority checks counts at Standard, apart from a few niche items like a towbar that count only once raised, and you can raise up to five. Raising something never rules a car out: a car FINN doesn't list it for loses a little ground, and your advice says so."
        >
            <EmphasisScope
                scope="settings"
                basedOn={basedOn}
                customised={customised}
                profiles={profiles}
            />

            <div className="flex flex-col gap-3">
                {priorityDefinitions.map(
                    (priority) => {
                        const open =
                            openId === priority.id;

                        const features =
                            categoryFeatures[
                            priority.id
                            ] ?? [];

                        return (
                            <PriorityCard
                                key={priority.id}
                                priority={priority}
                                features={features}
                                open={open}
                                onToggle={() =>
                                    handleTogglePriority(
                                        priority.id,
                                    )
                                }
                            >
                                {open && (
                                    <PriorityEditor
                                        priority={
                                            priority
                                        }
                                        features={
                                            features
                                        }
                                        profileLabel={profileLabel}
                                        onChange={(next) =>
                                            onChangeFeatures(
                                                priority.id,
                                                next,
                                            )
                                        }
                                        onClose={() =>
                                            setOpenId(null)
                                        }
                                        defaults={
                                            startingEmphasis[
                                            priority.id
                                            ] ?? []
                                        }
                                    />
                                )}
                            </PriorityCard>
                        );
                    },
                )}
            </div>
        </Section>
        </>
    );
}