import { useState } from "react";
import {
    AVAILABLE_CATEGORY_FEATURES,
} from "@/lib/reasoning-engine/constants";
import {
    type CategoryId,
    type FeatureSelection,
    type PriorityDefinition,
} from "@/lib/reasoning-engine/types";
import { Section } from "../../components/primitives";
import { PriorityEditor } from "./components/PriorityEditor";
import { PriorityCard } from "./components/PriorityCard";

interface PrioritiesSettingsProps {
    priorityDefinitions: PriorityDefinition[];
    categoryFeatures: Record<CategoryId, FeatureSelection>;
    onSavePriority: (
        priority: PriorityDefinition,
        features: FeatureSelection,
        isNew: boolean,
    ) => void;
}

export function PrioritiesSettings({
    priorityDefinitions,
    categoryFeatures,
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
        <Section
            title="Priorities"
            description="Your priority order says how much each category matters. This is the finer question: within a category, are there particular features Lens should pay extra attention to? Pick up to five, or none — cars are judged on the whole category either way, and a car missing one you picked isn't ruled out. It just shows up as a tradeoff in your advice."
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
    );
}