import { useState } from "react";
import {
    DEFAULT_CATEGORY_FEATURES,
} from "@/lib/reasoning-engine/constants";
import {
    type CategoryId,
    type FeatureWeight,
    type PriorityDefinition,
} from "@/lib/reasoning-engine/types";
import { Section } from "../../components/primitives";
import { PriorityEditor } from "./components/PriorityEditor";
import { PriorityCard } from "./components/PriorityCard";

interface PrioritiesSettingsProps {
    priorityDefinitions: PriorityDefinition[];
    categoryFeatures: Record<CategoryId, FeatureWeight[]>;
    onSavePriority: (
        priority: PriorityDefinition,
        features: FeatureWeight[],
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
        features: FeatureWeight[],
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
            description="Choose the priorities Lens considers when comparing cars. Each priority has its own features that you can enable and rank by importance."
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

                        const availableFeatures =
                            DEFAULT_CATEGORY_FEATURES[
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