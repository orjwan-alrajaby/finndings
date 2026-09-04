import { useCallback, useEffect, useRef, useState } from "react";
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
    /** Told which priority is mid-edit with work outstanding, if any. */
    onPendingEditChange?: (pending: { id: CategoryId; label: string } | null) => void;
    /**
     * Bumped by the page when the reader presses Save with an editor still
     * open. Each new value is a request to put that editor in front of them.
     */
    revealPendingSignal?: number;
}

export function PrioritiesSettings({
    priorities,
    priorityDefinitions,
    categoryFeatures,
    profiles,
    onChangePriorities,
    onSavePriority,
    onPendingEditChange,
    revealPendingSignal = 0,
}: PrioritiesSettingsProps) {
    const [openId, setOpenId] =
        useState<CategoryId | null>(null);

    /** The open editor, when it is holding work the reader hasn't kept yet. */
    const [pendingId, setPendingId] = useState<CategoryId | null>(null);

    /** Set while the card is being pointed at, so it can catch the eye. */
    const [flashing, setFlashing] = useState(false);

    const cards = useRef(new Map<CategoryId, HTMLDivElement | null>());

    useEffect(() => {
        const pending = priorityDefinitions.find(
            (definition) => definition.id === pendingId,
        );

        onPendingEditChange?.(
            pending ? { id: pending.id, label: pending.label } : null,
        );
    }, [pendingId, priorityDefinitions, onPendingEditChange]);

    /**
     * Put the unfinished editor in front of the reader.
     *
     * The page's Save button can't write an open editor's draft, so pressing
     * it with one open used to save around the edit in progress and lose it
     * silently. Rather than refuse with a message somewhere else on the page,
     * this brings the reader to the thing that needs a decision — the two
     * buttons that resolve it are already there.
     */
    useEffect(() => {
        if (!revealPendingSignal || !pendingId) return;

        cards.current.get(pendingId)?.scrollIntoView({
            behavior: "smooth",
            block: "center",
        });

        setFlashing(true);

        const timer = setTimeout(() => setFlashing(false), 1800);

        return () => clearTimeout(timer);
    }, [revealPendingSignal, pendingId]);

    /*
     * Stable, so the editor's effect fires when its draft changes rather than
     * on every render of this page.
     */
    const handleDirtyChange = useCallback(
        (id: CategoryId, dirty: boolean) =>
            setPendingId((current) => {
                if (dirty) return id;

                return current === id ? null : current;
            }),
        [],
    );

    const handleTogglePriority = (
        priorityId: CategoryId,
    ) => {
        setOpenId((current) => {
            const next = current === priorityId ? null : priorityId;

            /* A different editor's draft is not this one's. */
            if (next !== current) setPendingId(null);

            return next;
        });
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
        setPendingId(null);
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

                        const pending = pendingId === priority.id;

                        return (
                            <div
                                key={priority.id}
                                ref={(node) => {
                                    cards.current.set(priority.id, node);
                                }}
                                className={[
                                    "rounded-[22px] transition-shadow",
                                    pending && flashing
                                        ? "shadow-[0_0_0_3px] shadow-finn-warning"
                                        : "",
                                ].join(" ")}
                            >
                            <PriorityCard
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
                                        onCancel={() => {
                                            setOpenId(null);
                                            setPendingId(null);
                                        }}
                                        onSave={
                                            handleSavePriority
                                        }
                                        isOpen={open}
                                        onDirtyChange={handleDirtyChange}
                                    />
                                )}
                            </PriorityCard>
                            </div>
                        );
                    },
                )}
            </div>
        </Section>
        </>
    );
}