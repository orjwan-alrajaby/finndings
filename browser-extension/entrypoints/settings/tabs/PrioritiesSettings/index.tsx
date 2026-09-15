import { useState } from "react";
import {
    AVAILABLE_CATEGORY_FEATURES,
    DEFAULT_CATEGORY_FEATURES,
} from "@/lib/reasoning-engine/constants";
import {
    type CategoryId,
    type FeatureSelection,
    type PriorityDefinition,
    type Profile,
} from "@/lib/reasoning-engine/types";
import { Section } from "../../components/primitives";
import { PriorityEditor } from "./components/PriorityEditor";
import { buildPickedElsewhere } from "@/components/FeatureInfluencePicker";
import { PriorityCard } from "./components/PriorityCard";
import { PriorityOrder } from "./components/PriorityOrder";

interface PrioritiesSettingsProps {
    priorities: CategoryId[];
    priorityDefinitions: PriorityDefinition[];
    categoryFeatures: Record<CategoryId, FeatureSelection>;
    profiles: Profile[];
    onChangePriorities: (next: CategoryId[]) => void;
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
    onChangePriorities,
    onChangeFeatures,
}: PrioritiesSettingsProps) {
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
            onChange={onChangePriorities}
        />

        <Section
            title="What counts inside each priority"
            description="Your order above decides how much each priority counts overall. This is the finer question: inside one, every feature counts the same to start with, and you can raise up to five so they count for more. Either way a car is judged on the whole priority, and raising something never rules a car out — a car that misses it loses a little ground, and your advice says so."
        >
            <div className="flex flex-col gap-3">
                {priorityDefinitions.map(
                    (priority) => {
                        const open =
                            openId === priority.id;

                        const features =
                            categoryFeatures[
                            priority.id
                            ] ?? [];

                        /* The whole catalogue, not just what's switched on. */
                        const availableFeatures =
                            AVAILABLE_CATEGORY_FEATURES[
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
                                        availableFeatures={
                                            availableFeatures
                                        }
                                        pickedElsewhere={buildPickedElsewhere(
                                            priority.id,
                                            categoryFeatures,
                                            Object.fromEntries(
                                                priorityDefinitions.map(
                                                    (item) => [
                                                        item.id,
                                                        {
                                                            label: item.label,
                                                            icon: item.icon,
                                                        },
                                                    ],
                                                ),
                                            ),
                                        )}
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
                                            DEFAULT_CATEGORY_FEATURES[
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