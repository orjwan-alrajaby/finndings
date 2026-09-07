import { MAX_PRIORITIES } from "@/lib/reasoning-engine/constants";
import type {
    CategoryId,
    FeatureSelection,
    PriorityDefinition,
    Profile,
} from "@/lib/reasoning-engine/types";
import {
    applicableProfiles,
    PriorityOrderList,
    ProfilePresets,
} from "@/components/PriorityOrder";

import { ListOrdered } from "lucide-react";

import { DrawerSection, SECTION_TONE } from "./DrawerSection";

/**
 * The order itself, and the profiles as a way of setting it in one go.
 *
 * Presentational: it reads what it is given and calls back with the order it
 * wants. The draft it is editing belongs to the drawer.
 */
export function PriorityOrderSection({
    priorities,
    priorityDefinitions,
    profiles,
    features,
    onChange,
}: {
    priorities: CategoryId[];
    priorityDefinitions: PriorityDefinition[];
    profiles: Profile[];
    features: Record<CategoryId, FeatureSelection>;
    onChange: (priorities: CategoryId[]) => void;
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
                <div className="mb-4 rounded-2xl bg-finn-snow p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-finn-iron">
                        Start from a profile
                    </p>

                    <p className="mt-1 text-[11px] leading-4 text-finn-iron">
                        A way of driving, written out as an order. It fills
                        the list in — change anything you disagree with.
                    </p>

                    <div className="mt-2.5">
                        <ProfilePresets
                            profiles={profiles}
                            priorityDefinitions={priorityDefinitions}
                            priorities={priorities}
                            onApply={onChange}
                        />
                    </div>
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
