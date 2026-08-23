import "@/assets/tailwind.css";
import { useState } from "react";
import {
    ArrowRightIcon,
    Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import {
    type CategoryId,
    type FeatureWeight,
    type Profile,
} from "@/lib/reasoning-engine/types";
import {
    CATEGORY_IDS,
} from "@/lib/reasoning-engine/constants";

import { SelectionModeSwitch } from "./components/SelectionModeSwitch";
import { ProfileSelection } from "./components/ProfileSelection";
import { CustomPrioritySelection } from "./components/CustomPrioritySelection";
import type { SelectionMode } from "./types";

export function StepOneChoosePrioritiesStep({
    priorities,
    setPriorities,
    profiles,
    onNext,
    onSettings,
    categoryFeatures,
}: {
    priorities: CategoryId[];
    setPriorities: (value: CategoryId[]) => void;
    profiles: Profile[];
    onNext: () => void;
    onSettings: () => void;
    categoryFeatures: Record<CategoryId, FeatureWeight[]>;
}) {
    const [expandedCat, setExpandedCat] =
        useState<CategoryId | null>(null);

    const [activeProfileId, setActiveProfileId] =
        useState<string | null>(null);

    const [selectionMode, setSelectionMode] =
        useState<SelectionMode>("profile");

    const available = CATEGORY_IDS.filter(
        (id) => !priorities.includes(id),
    );

    const atLimit = priorities.length >= 5;

    const togglePriority = (id: CategoryId) => {
        if (priorities.includes(id)) {
            setPriorities(
                priorities.filter((category) => category !== id),
            );
            setActiveProfileId(null);
            return;
        }

        if (atLimit) return;

        setPriorities([...priorities, id]);
        setActiveProfileId(null);
    };

    const applyProfile = (profile: Profile) => {
        setActiveProfileId(profile.id);
        setPriorities(profile.priorities.slice(0, 5));
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
                    Choose up to five things you care about. We'll ask you
                    to put them in order next.
                </p>
            </div>

            <SelectionModeSwitch
                value={selectionMode}
                onChange={setSelectionMode}
            />

            {selectionMode === "profile" && (
                <ProfileSelection
                    profiles={profiles}
                    activeProfileId={activeProfileId}
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
                    expandedCat={expandedCat}
                    categoryFeatures={categoryFeatures}
                    onTogglePriority={togglePriority}
                    onExpandCategory={(categoryId) =>
                        setExpandedCat((current) =>
                            current === categoryId
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
                    disabled={priorities.length < 3}
                    onClick={onNext}
                    className="flex h-13 flex-1 items-center justify-center gap-2 rounded-full bg-finn-accent-blue text-sm font-black text-white shadow-md transition hover:bg-finn-highlight-navy disabled:cursor-not-allowed disabled:bg-finn-cotton disabled:text-finn-iron"
                >
                    Order my priorities
                    <ArrowRightIcon className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}