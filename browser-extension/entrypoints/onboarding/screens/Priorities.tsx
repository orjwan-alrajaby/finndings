import {
    ArrowLeftIcon,
    ArrowRightIcon,
} from "@heroicons/react/24/outline";

import {
    applicableProfiles,
    PriorityOrderList,
    ProfilePresets,
} from "@/components/PriorityOrder";
import {
    MAX_PRIORITIES,
    MIN_PRIORITIES,
} from "@/lib/reasoning-engine/constants";
import type {
    CategoryId,
    FeatureSelection,
    PriorityDefinition,
    Profile,
} from "@/lib/reasoning-engine/types";

/**
 * The one question the product cannot work without.
 *
 * Same control as the compare flow and Settings, because there is one
 * priority order and inventing a third way to edit it would only teach the
 * reader something they'd have to unlearn. What differs is the ordering of
 * the screen: profiles come first and lead, because a reader who has been
 * using this product for ninety seconds should be able to finish this in one
 * click and does not yet have opinions about the difference between comfort
 * and practicality.
 */
export function Priorities({
    priorities,
    priorityDefinitions,
    categoryFeatures,
    profiles,
    onChange,
    onBack,
    onNext,
}: {
    priorities: CategoryId[];
    priorityDefinitions: PriorityDefinition[];
    categoryFeatures: Record<CategoryId, FeatureSelection>;
    profiles: Profile[];
    onChange: (next: CategoryId[]) => void;
    onBack: () => void;
    onNext: () => void;
}) {
    const hasProfiles =
        applicableProfiles(profiles, priorityDefinitions).length > 0;

    return (
        <div>
            <div className="text-center">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-finn-accent-blue">
                    Step 1 of 2
                </p>

                <h1 className="mx-auto mt-3 max-w-2xl text-3xl font-black leading-tight tracking-tight text-finn-black sm:text-4xl">
                    What matters to you, and in what order?
                </h1>

                <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-finn-iron">
                    A priority is one thing you want a car to be good at — how
                    safe it is, how it handles a long drive, how much room it
                    has for a family. Pick {MIN_PRIORITIES}–{MAX_PRIORITIES}{" "}
                    and put them in the order they matter. The one at the top
                    counts for the most, the one at the bottom for the least.
                </p>

                <p className="mx-auto mt-3 max-w-2xl rounded-full bg-finn-pale-blue px-5 py-2 text-xs font-bold leading-5 text-finn-highlight-navy">
                    This order weighs, it never filters. A car that is weak at
                    your top priority is still ranked and still explained — it
                    just has ground to make up.
                </p>
            </div>

            {hasProfiles && (
                <section className="mt-8 rounded-[28px] bg-white p-5 shadow-sm sm:p-6">
                    <h2 className="text-lg font-black text-finn-black">
                        Not sure where to start? Choose a preset.
                    </h2>

                    <p className="mt-1 max-w-3xl text-xs leading-5 text-finn-iron">
                        We call these{" "}
                        <strong className="font-black text-finn-black">
                            profiles
                        </strong>
                        . Each one is a way of driving rather than a kind of
                        car — the nervous driver, the family, the commuter —
                        written out as {MAX_PRIORITIES} priorities already in a
                        sensible order. Pick whichever sounds most like you; it
                        fills in the list below and you can change anything you
                        disagree with. Reach for one when you know roughly how
                        you drive but not which categories that translates to.
                    </p>

                    <div className="mt-4">
                        <ProfilePresets
                            layout="cards"
                            profiles={profiles}
                            priorityDefinitions={priorityDefinitions}
                            priorities={priorities}
                            onApply={onChange}
                        />
                    </div>
                </section>
            )}

            <section className="mt-4 rounded-[28px] bg-white p-5 shadow-sm sm:p-7">
                <h2 className="text-lg font-black text-finn-black">
                    Your priorities
                </h2>

                <p className="mt-1 mb-5 max-w-3xl text-xs leading-5 text-finn-iron">
                    Drag a row, or use the arrows, to change what counts for
                    more. You can come back and change this whenever you like —
                    it lives in Settings, and in the compare flow.
                </p>

                <PriorityOrderList
                    priorities={priorities}
                    priorityDefinitions={priorityDefinitions}
                    categoryFeatures={categoryFeatures}
                    onChange={onChange}
                />
            </section>

            <div className="mt-8 flex items-center justify-center gap-3">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex h-13 w-13 items-center justify-center rounded-full border-2 border-finn-cotton text-finn-iron transition hover:bg-white hover:text-finn-black"
                    aria-label="Back to how it works"
                >
                    <ArrowLeftIcon className="h-5 w-5" />
                </button>

                <button
                    type="button"
                    disabled={priorities.length < MIN_PRIORITIES}
                    onClick={onNext}
                    className="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-finn-accent-blue px-8 text-sm font-black text-white shadow-md transition hover:bg-finn-highlight-navy disabled:cursor-not-allowed disabled:bg-finn-cotton disabled:text-finn-iron"
                >
                    Next: how you drive
                    <ArrowRightIcon className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
