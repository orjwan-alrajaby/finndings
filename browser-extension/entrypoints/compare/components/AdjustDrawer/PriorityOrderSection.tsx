import { MAX_PRIORITIES } from "@/lib/reasoning-engine/constants";
import type {
    CategoryId,
    FeatureSelection,
    PriorityDefinition,
    Profile,
    ProfileId,
    SettingsBasis,
} from "@/lib/reasoning-engine/types";
import {
    applicableProfiles,
    PriorityOrderList,
    ProfileBasisNote,
    ProfilePresets,
} from "@/components/PriorityOrder";

import { ListOrdered, Sparkles } from "lucide-react";

import { DrawerSection, SECTION_TONE } from "./DrawerSection";

/**
 * The order itself, and the profiles as a way of setting it in one go.
 *
 * Presentational: it reads what it is given and calls back with the order it
 * wants, or the profile to start from. The draft it is editing, and the undo
 * for a profile just applied, belong to the drawer.
 */
export function PriorityOrderSection({
    priorities,
    priorityDefinitions,
    profiles,
    features,
    basedOn,
    customised,
    onChange,
    onApplyProfile,
    onUndoProfile,
}: {
    priorities: CategoryId[];
    priorityDefinitions: PriorityDefinition[];
    profiles: Profile[];
    features: Record<CategoryId, FeatureSelection>;
    basedOn: SettingsBasis;
    customised: boolean;
    onChange: (priorities: CategoryId[]) => void;
    onApplyProfile: (profile: ProfileId) => void;
    onUndoProfile: (() => void) | null;
}) {
    const hasProfiles =
        applicableProfiles(profiles, priorityDefinitions).length > 0;

    return (
        <DrawerSection
            value="order"
            tone={SECTION_TONE.order}
            icon={<ListOrdered aria-hidden="true" className="h-4.5 w-4.5" />}
            eyebrow="Your ranking"
            title="What matters, and in what order"
            summary={`${priorities.length} of ${MAX_PRIORITIES} chosen · the top one carries the most`}
        >
            {hasProfiles && (
                <div className="mb-5 border-b border-finn-cotton pb-5">
                    <p className="flex items-center gap-1.5 text-xs font-black text-finn-black">
                        <Sparkles
                            aria-hidden="true"
                            className="h-3.5 w-3.5 text-finn-accent-blue"
                        />
                        Start from a profile
                    </p>

                    <p className="mt-0.5 text-[11px] leading-4 text-finn-iron">
                        A way of driving, written out as an order and what
                        counts for more inside each priority. It replaces
                        both — change anything you disagree with.
                    </p>

                    <div className="mt-3">
                        <ProfilePresets
                            profiles={profiles}
                            priorityDefinitions={priorityDefinitions}
                            priorities={priorities}
                            onApply={onApplyProfile}
                            layout="tiles"
                        />
                    </div>

                    <ProfileBasisNote
                        basedOn={basedOn}
                        customised={customised}
                        profiles={profiles}
                        onUndo={onUndoProfile}
                    />
                </div>
            )}

            <PriorityOrderList
                priorities={priorities}
                priorityDefinitions={priorityDefinitions}
                categoryFeatures={features}
                onChange={onChange}
            />
        </DrawerSection>
    );
}
