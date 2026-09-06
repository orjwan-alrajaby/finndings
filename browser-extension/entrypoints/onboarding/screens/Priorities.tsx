import { useEffect, useState } from "react";
import {
    ArrowLeft,
    ArrowRight,
    CircleCheck,
    Sparkles,
    Undo2,
} from "lucide-react";

import { PriorityIcon } from "@/components/PriorityIcon";

import {
    applicableProfiles,
    matchingProfile,
    PriorityOrderList,
    ProfilePresets,
} from "@/components/PriorityOrder";
import {
    DEFAULT_PRIORITIES,
    MAX_PRIORITIES,
    MIN_PRIORITIES,
} from "@/lib/reasoning-engine/constants";
import type {
    CategoryId,
    FeatureSelection,
    PriorityDefinition,
    Profile,
} from "@/lib/reasoning-engine/types";

/** Which of the panel's two faces is showing. */
type View = "order" | "presets";

/**
 * The one question the product cannot work without.
 *
 * Same control as the compare flow and Settings, because there is one
 * priority order and inventing a third way to edit it would only teach the
 * reader something they would have to unlearn.
 *
 * **The presets are a view of this panel, not a section above it.** They used
 * to sit stacked on top of the order — six profile cards, each listing five
 * priorities, and then the list they fill in, so the reader met a screenful
 * of alternatives before reaching the thing being asked of them and had to
 * scroll back up to compare an applied profile against the cards that offered
 * it. Now the order leads, because that is the answer; the presets are a way
 * *in* to it, offered underneath as a question the reader may not need. Taking
 * one swaps the panel, and applying one swaps it back — which puts the result
 * exactly where the offer was, with nothing to scroll to see what happened.
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
    const [view, setView] = useState<View>("order");

    /**
     * The preset just applied, and the order it replaced.
     *
     * Swapping the panel back put the result where the offer was, which is
     * the right place — but a list quietly rewritten underneath a reader who
     * was looking at the presets a second ago is a change only an observant
     * one notices. So the panel says which preset did it, and keeps what was
     * there before so undoing is one press rather than five drags.
     */
    const [applied, setApplied] = useState<{
        label: string;
        icon: string;
        previous: CategoryId[];
    } | null>(null);

    const hasProfiles =
        applicableProfiles(profiles, priorityDefinitions).length > 0;

    /** The preset the current order *is*, whether or not it was just applied. */
    const inUse = matchingProfile(profiles, priorityDefinitions, priorities);

    /*
     * An edit of their own ends the announcement: it was about one action, and
     * the reader has since taken another.
     */
    const handleListChange = (next: CategoryId[]) => {
        setApplied(null);
        onChange(next);
    };

    /*
     * A swapped panel starts at its own top. The two faces are different
     * heights, so without this a reader who opens the presets from the bottom
     * of a five-row list lands halfway down the cards.
     */
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [view]);

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

            <section className="mt-8 overflow-hidden rounded-[28px] bg-white shadow-sm">
                {view === "order" ? (
                    <OrderView
                        priorities={priorities}
                        priorityDefinitions={priorityDefinitions}
                        categoryFeatures={categoryFeatures}
                        inUse={inUse}
                        applied={applied}
                        onChange={handleListChange}
                        onUndo={() => {
                            if (!applied) return;

                            onChange([...applied.previous]);
                            setApplied(null);
                        }}
                        onReset={
                            sameOrder(priorities, DEFAULT_PRIORITIES)
                                ? undefined
                                : () => {
                                    setApplied(null);
                                    onChange([...DEFAULT_PRIORITIES]);
                                }
                        }
                        onOpenPresets={
                            hasProfiles ? () => setView("presets") : undefined
                        }
                    />
                ) : (
                    <PresetsView
                        priorities={priorities}
                        priorityDefinitions={priorityDefinitions}
                        profiles={profiles}
                        onApply={(profile) => {
                            setApplied({
                                label: profile.label,
                                icon: profile.icon,
                                previous: [...priorities],
                            });

                            onChange([...profile.priorities]);

                            /*
                             * Straight back to the list. A profile is a
                             * starting point, and the only way to see what it
                             * started is the order it just wrote.
                             */
                            setView("order");
                        }}
                        onBack={() => setView("order")}
                    />
                )}
            </section>

            <div className="mt-8 flex items-center justify-center gap-3">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex h-13 w-13 items-center justify-center rounded-full border-2 border-finn-cotton text-finn-iron transition hover:bg-white hover:text-finn-black"
                    aria-label="Back to how it works"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>

                <button
                    type="button"
                    disabled={priorities.length < MIN_PRIORITIES}
                    onClick={onNext}
                    className="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-finn-accent-blue px-8 text-sm font-black text-white shadow-md transition hover:bg-finn-highlight-navy disabled:cursor-not-allowed disabled:bg-finn-cotton disabled:text-finn-iron"
                >
                    Next: how you drive
                    <ArrowRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

/** Whether two orders are the same list in the same order. */
function sameOrder(a: CategoryId[], b: CategoryId[]): boolean {
    return a.length === b.length && a.every((id, index) => b[index] === id);
}

/**
 * What just happened, said plainly.
 *
 * Applying a preset rewrites five rows at once and swaps the panel back to
 * them — a large change, arriving while the reader's attention is on the
 * cards they were choosing between. Without this the only evidence is the
 * list itself being different from a list they had barely looked at. It
 * pulses once, borrowing the same attention animation the Save button uses,
 * and carries the way back out.
 */
function AppliedBanner({
    applied,
    onUndo,
}: {
    applied: { label: string; icon: string; previous: CategoryId[] };
    onUndo: () => void;
}) {
    return (
        <div className="finn-lens-attention mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-finn-pale-blue px-4 py-3">
            <CircleCheck className="h-5 w-5 shrink-0 text-finn-accent-blue" />

            <p className="min-w-0 flex-1 flex items-center gap-1 text-xs leading-5 text-finn-highlight-navy">
                <strong className="inline-flex items-center gap-1 font-black">
                    <PriorityIcon
                        name={applied.icon}
                        className="h-3.5 w-3.5"
                    />
                    {applied.label} applied.
                </strong>{" "}
                <span>
                    Your order below is now its priorities, in its order — change
                    anything you disagree with.
                </span>
            </p>

            <button
                type="button"
                onClick={onUndo}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-finn-accent-blue shadow-sm transition hover:bg-finn-accent-blue hover:text-white"
            >
                <Undo2 className="h-3.5 w-3.5" />
                Undo
            </button>
        </div>
    );
}

/** The answer: the order itself, with a way out to the presets under it. */
function OrderView({
    priorities,
    priorityDefinitions,
    categoryFeatures,
    inUse,
    applied,
    onChange,
    onUndo,
    onReset,
    onOpenPresets,
}: {
    priorities: CategoryId[];
    priorityDefinitions: PriorityDefinition[];
    categoryFeatures: Record<CategoryId, FeatureSelection>;
    /** The preset this order matches exactly, if any. */
    inUse: Profile | null;
    /** The preset just applied, when one was. */
    applied: { label: string; icon: string; previous: CategoryId[] } | null;
    onChange: (next: CategoryId[]) => void;
    onUndo: () => void;
    /** Omitted when the order already is the default — nothing to reset to. */
    onReset?: () => void;
    /** Omitted when every profile is switched off — then there is no offer. */
    onOpenPresets?: () => void;
}) {
    return (
        <>
            <div className="p-5 sm:p-7">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h2 className="text-lg font-black text-finn-black">
                        Your priorities
                    </h2>

                    {/*
                      * Persistent, unlike the banner below it. The banner is
                      * about an action a moment ago; this is about the state,
                      * and it survives a scroll, a page turn and a return.
                      * It disappears the moment the reader moves anything,
                      * because then the order is theirs and not the profile's.
                      */}
                    {inUse && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-finn-pale-blue px-2.5 py-1 text-[11px] font-black text-finn-accent-blue">
                            <PriorityIcon name={inUse.icon} className="h-3 w-3" />
                            {inUse.label}
                        </span>
                    )}
                </div>

                <p className="mt-1 mb-4 max-w-3xl text-xs leading-5 text-finn-iron">
                    Drag a row, or use the arrows, to change what counts for
                    more. You can come back and change this whenever you like —
                    it lives in Settings, and in the compare flow.
                </p>

                {applied && (
                    <AppliedBanner applied={applied} onUndo={onUndo} />
                )}

                <PriorityOrderList
                    priorities={priorities}
                    priorityDefinitions={priorityDefinitions}
                    categoryFeatures={categoryFeatures}
                    onChange={onChange}
                />

                {onReset && (
                    <div className="mt-5 border-t border-finn-cotton pt-4">
                        <button
                            type="button"
                            onClick={onReset}
                            className="inline-flex items-center gap-1.5 rounded-full bg-finn-snow px-3.5 py-2 text-[11px] font-bold text-finn-iron transition hover:bg-finn-cotton hover:text-finn-black"
                        >
                            <Undo2 className="h-3.5 w-3.5" />
                            Start over from Lens's order
                        </button>
                    </div>
                )}
            </div>

            {onOpenPresets && (
                <button
                    type="button"
                    onClick={onOpenPresets}
                    className="flex w-full items-center gap-3 border-t border-finn-cotton bg-finn-snow px-5 py-4 text-left transition hover:bg-finn-pale-blue sm:px-7"
                >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-finn-accent-blue shadow-sm">
                        <Sparkles className="h-4 w-4" />
                    </span>

                    <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black text-finn-black">
                            Not sure where to start?
                        </span>

                        <span className="mt-0.5 block text-xs leading-4 text-finn-iron">
                            Start from a preset written for a way of driving,
                            then change whatever you like.
                        </span>
                    </span>

                    <ArrowRight className="h-4 w-4 shrink-0 text-finn-accent-blue" />
                </button>
            )}
        </>
    );
}

/** The way in, for a reader who does not want to start from a blank order. */
function PresetsView({
    priorities,
    priorityDefinitions,
    profiles,
    onApply,
    onBack,
}: {
    priorities: CategoryId[];
    priorityDefinitions: PriorityDefinition[];
    profiles: Profile[];
    /** The whole profile, not just its order — the caller has to name it. */
    onApply: (profile: Profile) => void;
    onBack: () => void;
}) {
    return (
        <div className="p-5 sm:p-7">
            <div className="flex items-start gap-3">
                <button
                    type="button"
                    onClick={onBack}
                    aria-label="Back to your priorities"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-finn-cotton text-finn-iron transition hover:bg-finn-snow hover:text-finn-black"
                >
                    <ArrowLeft className="h-4 w-4" />
                </button>

                <div className="min-w-0">
                    <h2 className="text-lg font-black text-finn-black">
                        Choose a preset
                    </h2>

                    <p className="mt-1 max-w-3xl text-xs leading-5 text-finn-iron">
                        We call these{" "}
                        <strong className="font-black text-finn-black">
                            profiles
                        </strong>
                        . Each is a way of driving rather than a kind of car —
                        the nervous driver, the family, the commuter — written
                        out as {MAX_PRIORITIES} priorities already in a
                        sensible order. Reach for one when you know roughly how
                        you drive but not which categories that translates to.
                        Picking one fills in your order and brings you straight
                        back to it, where you can change anything you disagree
                        with.
                    </p>
                </div>
            </div>

            <div className="mt-5">
                <ProfilePresets
                    layout="cards"
                    profiles={profiles}
                    priorityDefinitions={priorityDefinitions}
                    priorities={priorities}
                    onApply={(next) => {
                        const chosen = profiles.find(
                            (profile) =>
                                profile.priorities.length === next.length &&
                                profile.priorities.every(
                                    (id, index) => next[index] === id,
                                ),
                        );

                        if (chosen) onApply(chosen);
                    }}
                />
            </div>
        </div>
    );
}
