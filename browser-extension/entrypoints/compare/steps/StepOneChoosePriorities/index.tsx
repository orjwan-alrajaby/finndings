import "@/assets/tailwind.css";
import { useEffect, useState } from "react";
import {
    ArrowRightIcon,
    Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import { type Profile } from "@/lib/reasoning-engine/types";
import {
    CATEGORY_IDS,
} from "@/lib/reasoning-engine/constants";

import { MAX_PRIORITIES, MIN_PRIORITIES, useCompareStore } from "../../store";
import { SelectionModeSwitch } from "./components/SelectionModeSwitch";
import { ProfileSelection } from "./components/ProfileSelection";
import { CustomPrioritySelection } from "./components/CustomPrioritySelection";

export function StepOneChoosePrioritiesStep({
    onSettings,
}: {
    onSettings: () => void;
}) {
    const priorities = useCompareStore((state) => state.priorities);
    const profiles = useCompareStore((state) => state.profiles);
    const defaultProfileId = useCompareStore(
        (state) => state.defaultProfileId,
    );
    /*
     * This run's picks rather than the saved ones, so a reader who comes
     * back here after editing in step 3 sees what is actually in play.
     */
    const features = useCompareStore((state) => state.features);

    const selectionMode = useCompareStore((state) => state.selectionMode);
    const setSelectionMode = useCompareStore(
        (state) => state.setSelectionMode,
    );

    const expandedCategory = useCompareStore(
        (state) => state.expandedCategory,
    );
    const setExpandedCategory = useCompareStore(
        (state) => state.setExpandedCategory,
    );

    const setPriorities = useCompareStore((state) => state.setPriorities);
    const togglePriority = useCompareStore((state) => state.togglePriority);
    const next = useCompareStore((state) => state.next);

    const [activeProfileId, setActiveProfileId] =
        useState<string | null>(null);

    /* Disabled profiles are not offered — that is what disabling one means. */
    const enabledProfiles = profiles.filter((profile) => profile.enabled);

    /*
     * "Default profile" means selected, not merely present in the list. It is
     * a starting point though, so it only claims the selection while the user
     * hasn't made one of their own: an order matching a profile's shows as
     * that profile, and anything else shows as no profile at all.
     */
    useEffect(() => {
        const matching = enabledProfiles.find(
            (profile) =>
                profile.priorities.length === priorities.length &&
                profile.priorities.every(
                    (id, index) => priorities[index] === id,
                ),
        );

        setActiveProfileId(matching?.id ?? null);
    }, [profiles, priorities]);

    const defaultProfile =
        enabledProfiles.find(
            (profile) => profile.id === defaultProfileId,
        ) ?? enabledProfiles[0];

    const available = CATEGORY_IDS.filter(
        (id) => !priorities.includes(id),
    );

    const atLimit = priorities.length >= MAX_PRIORITIES;

    const applyProfile = (profile: Profile) => {
        setPriorities([...profile.priorities]);
    };

    return (
        <div className="space-y-7">
            <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-finn-accent-blue">
                    Step 1
                </p>

                <h2 className="mt-2 text-3xl font-black tracking-tight text-finn-black sm:text-4xl">
                    What matters most to you?
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-finn-iron">
                    Start from a profile or pick your own — either way you
                    get up to five priorities, and you'll put them in order
                    next. Whatever you change here is what Lens uses; a
                    profile is only a starting point.
                </p>
            </div>

            <SelectionModeSwitch
                value={selectionMode}
                onChange={setSelectionMode}
            />

            {selectionMode === "profile" && (
                <ProfileSelection
                    profiles={enabledProfiles}
                    defaultProfileId={defaultProfile?.id ?? null}
                    activeProfileId={activeProfileId}
                    categoryFeatures={features}
                    onSelect={applyProfile}
                    onSettings={onSettings}
                    onChooseCustom={() => setSelectionMode("custom")}
                />
            )}

            {selectionMode === "custom" && (
                <CustomPrioritySelection
                    priorities={priorities}
                    available={available}
                    atLimit={atLimit}
                    expandedCat={expandedCategory}
                    categoryFeatures={features}
                    onTogglePriority={togglePriority}
                    onExpandCategory={(categoryId) =>
                        setExpandedCategory(
                            expandedCategory === categoryId
                                ? null
                                : categoryId,
                        )
                    }
                    onChooseProfile={() =>
                        setSelectionMode("profile")
                    }
                />
            )}

            <div className="flex gap-3 border-t border-finn-cotton pt-5">
                <button
                    type="button"
                    onClick={onSettings}
                    className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full border-2 border-finn-cotton text-finn-iron transition hover:bg-white hover:text-finn-black"
                    aria-label="Settings"
                >
                    <Cog6ToothIcon className="h-5 w-5" />
                </button>

                <button
                    type="button"
                    disabled={priorities.length < MIN_PRIORITIES}
                    onClick={next}
                    className="flex h-13 flex-1 items-center justify-center gap-2 rounded-full bg-finn-accent-blue text-sm font-black text-white shadow-md transition hover:bg-finn-highlight-navy disabled:cursor-not-allowed disabled:bg-finn-cotton disabled:text-finn-iron"
                >
                    Order my priorities
                    <ArrowRightIcon className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
