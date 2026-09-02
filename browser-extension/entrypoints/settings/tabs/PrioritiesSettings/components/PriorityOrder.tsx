import type {
    CategoryId,
    FeatureSelection,
    PriorityDefinition,
    Profile,
} from "@/lib/reasoning-engine/types";

import {
    applicableProfiles,
    PRIORITY_ORDER_DESCRIPTION,
    PriorityOrderList,
    ProfilePresets,
} from "@/components/PriorityOrder";

import { Section } from "../../../components/primitives";

/**
 * The priority order, as a setting.
 *
 * The list itself is shared with the compare flow — there is one priority
 * order, so there is one control for it. What belongs to this page is the
 * framing: a reader here already has an answer and is adjusting it, so the
 * profiles are a compact row of chips rather than the explained cards the
 * compare flow shows someone meeting the idea for the first time.
 */
export function PriorityOrder({
    priorities,
    priorityDefinitions,
    categoryFeatures,
    profiles,
    onChange,
}: {
    priorities: CategoryId[];
    priorityDefinitions: PriorityDefinition[];
    categoryFeatures: Record<CategoryId, FeatureSelection>;
    profiles: Profile[];
    onChange: (next: CategoryId[]) => void;
}) {
    const hasProfiles =
        applicableProfiles(profiles, priorityDefinitions).length > 0;

    return (
        <Section title="Your priorities" description={PRIORITY_ORDER_DESCRIPTION}>
            {hasProfiles && (
                <div className="mb-5">
                    <p className="text-xs font-black text-finn-black">
                        Start from a profile
                    </p>

                    <p className="mt-0.5 text-[11px] leading-4 text-finn-iron">
                        A profile is a starting point, not a setting — apply one
                        and then change whatever you like.
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
                categoryFeatures={categoryFeatures}
                onChange={onChange}
            />
        </Section>
    );
}
