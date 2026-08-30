import { useState } from "react";
import {
    AVAILABLE_CATEGORY_FEATURES,
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
    onSavePriority: (
        priority: PriorityDefinition,
        features: FeatureSelection,
        isNew: boolean,
    ) => void;
}

export function PrioritiesSettings({
    priorities,
    priorityDefinitions,
    categoryFeatures,
    profiles,
    onChangePriorities,
    onSavePriority,
}: PrioritiesSettingsProps) {
    const [openId, setOpenId] =
        useState<CategoryId | null>(null);

    const handleTogglePriority = (
        priorityId: CategoryId,
    ) => {
        setOpenId((current) =>
            current === priorityId
                ? null
                : priorityId,
        );
    };

    const handleSavePriority = (
        priority: PriorityDefinition,
        features: FeatureSelection,
    ) => {
        onSavePriority(
            priority,
            features,
            false,
        );

        setOpenId(null);
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
            description="Your priority order says how much each category matters overall. This is the finer question: inside a category, every feature counts the same by default — you can raise up to five so they count for more. Cars are judged on the whole category either way, and a car missing one you raised isn't ruled out; it just gives up some ground and the gap is named in your advice."
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
                                        onCancel={() =>
                                            setOpenId(
                                                null,
                                            )
                                        }
                                        onSave={
                                            handleSavePriority
                                        }
                                        isOpen={open}
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