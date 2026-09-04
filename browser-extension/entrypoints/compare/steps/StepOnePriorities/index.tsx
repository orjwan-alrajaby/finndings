import "@/assets/tailwind.css";
import { useState } from "react";
import {
    ArrowRightIcon,
    ChevronDownIcon,
    Cog6ToothIcon,
    PencilSquareIcon,
} from "@heroicons/react/24/outline";

import {
    applicableProfiles,
    PriorityOrderList,
    ProfilePresets,
} from "@/components/PriorityOrder";
import { MAX_PRIORITIES, MIN_PRIORITIES, useCompareStore } from "../../store";
import { FinnLink } from "@/components/FinnLink";

/**
 * What matters to you, and in what order — one question, one screen.
 *
 * This replaces the two steps that used to sit here. Choosing priorities and
 * ordering them were never separate decisions: a reader picking "family
 * friendly" already knows whether it beats "long distance", and splitting
 * the question meant they chose blind on one screen and discovered what they
 * had built on the next. The list here is the same control Settings uses, so
 * a reader who adjusts their order in either place is using the same thing.
 *
 * The step also has to teach. It is the first thing a new reader meets, and
 * "priority" is doing specific work in this product — a weighting, not a
 * filter — that nothing else on the screen would tell them. Hence the
 * explanation above the list, and the profiles offered as a way in for
 * anyone who would rather not start from a blank order.
 */
export function StepOnePrioritiesStep({
    onSettings,
}: {
    onSettings: () => void;
}) {
    const priorities = useCompareStore((state) => state.priorities);
    const priorityDefinitions = useCompareStore(
        (state) => state.priorityDefinitions,
    );
    const profiles = useCompareStore((state) => state.profiles);

    /*
     * This run's picks rather than the saved ones, so the per-row count of
     * features raised matches what a reader set in step 2.
     */
    const features = useCompareStore((state) => state.features);

    const setPriorities = useCompareStore((state) => state.setPriorities);
    const next = useCompareStore((state) => state.next);

    const hasProfiles =
        applicableProfiles(profiles, priorityDefinitions).length > 0;

    return (
        <div className="w-full space-y-7">
            <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-finn-accent-blue">
                    Step 1
                </p>

                <h2 className="mt-2 text-3xl font-black tracking-tight text-finn-black sm:text-4xl">
                    What matters to you, and in what order?
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-finn-iron">
                    A priority is one thing you want a car to be good at —
                    how safe it is, how it handles a long drive, how much
                    room it has for a family. Pick between {MIN_PRIORITIES}{" "}
                    and {MAX_PRIORITIES} of them and drag them into the order
                    they matter to you. That order is the whole argument
                    Lens makes: the one at the top counts for the most, the
                    one at the bottom for the least, and every claim in your
                    advice is measured against it.
                </p>
            </div>

            <WhatThisDoes />

            {hasProfiles && (
                <section className="rounded-[28px] bg-white p-5 shadow-sm sm:p-6">
                    <h3 className="text-lg font-black text-finn-black">
                        Not sure where to start? Choose a preset.
                    </h3>

                    <p className="mt-1 max-w-3xl text-xs leading-5 text-finn-iron">
                        We call these <strong className="font-black text-finn-black">profiles</strong>.
                        Each one is a way of driving rather than a kind of
                        car — the nervous driver, the family, the commuter —
                        written out as {MAX_PRIORITIES} priorities already in
                        a sensible order. Pick the one that sounds most like
                        you and it fills in the list below; then change
                        anything you disagree with.
                    </p>

                    <div className="mt-4">
                        <ProfilePresets
                            layout="cards"
                            profiles={profiles}
                            priorityDefinitions={priorityDefinitions}
                            priorities={priorities}
                            onApply={setPriorities}
                        />
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-finn-cotton pt-4">
                        <p className="max-w-2xl text-[11px] leading-4 text-finn-iron">
                            <strong className="font-black text-finn-black">
                                A profile is a starting point, never a
                                setting.
                            </strong>{" "}
                            Nothing is locked once you apply one — whatever
                            the list below says when you leave this step is
                            what Lens uses. Reach for one when you know
                            roughly how you drive but not which categories
                            that translates to; build your own order instead
                            when you already know the one or two things that
                            decide it for you.
                        </p>

                        <button
                            type="button"
                            onClick={onSettings}
                            className="flex shrink-0 items-center gap-1 text-xs font-bold text-finn-accent-blue transition hover:text-finn-highlight-navy"
                        >
                            <PencilSquareIcon className="h-3.5 w-3.5" />
                            Manage profiles
                        </button>
                    </div>
                </section>
            )}

            <section className="rounded-[28px] bg-white p-5 shadow-sm sm:p-7">
                <h3 className="text-lg font-black text-finn-black">
                    Your priorities
                </h3>

                <p className="mt-1 mb-5 max-w-3xl text-xs leading-5 text-finn-iron">
                    {hasProfiles
                        ? "Whether you started from a profile or from scratch, this list is the answer. Drag a row, or use the arrows, to change what counts for more."
                        : "Drag a row, or use the arrows, to change what counts for more."}
                </p>

                <PriorityOrderList
                    priorities={priorities}
                    priorityDefinitions={priorityDefinitions}
                    categoryFeatures={features}
                    onChange={setPriorities}
                />
            </section>

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
                    Next: set my preferences
                    <ArrowRightIcon className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

/**
 * The one thing about priorities a reader cannot work out from the list.
 *
 * Ranking things is self-explanatory. What isn't is that ranking them low
 * doesn't rule anything out — the commonest way to misread this screen is as
 * a filter, and a reader who thinks that will drop priorities they actually
 * care about to avoid excluding cars. Open by default, and closable, because
 * it is worth reading once and not five times.
 */
function WhatThisDoes() {
    const [open, setOpen] = useState(true);

    return (
        <div className="rounded-[22px] bg-finn-pale-blue px-5 py-4">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                className="flex w-full items-center gap-2 text-left"
            >
                <span className="flex-1 text-sm font-black text-finn-highlight-navy">
                    What your order actually does
                </span>

                <ChevronDownIcon
                    className={[
                        "h-4 w-4 shrink-0 text-finn-highlight-navy transition-transform duration-200",
                        open ? "rotate-180" : "",
                    ].join(" ")}
                />
            </button>

            {open && (
                <ul className="mt-3 space-y-2 text-xs leading-5 text-finn-black">
                    <li className="flex gap-2">
                        <span aria-hidden="true">•</span>
                        <span>
                            It weighs, it doesn't filter. A car that is weak
                            at your top priority is still compared, still
                            ranked, and still explained — it just has ground
                            to make up.
                        </span>
                    </li>

                    <li className="flex gap-2">
                        <span aria-hidden="true">•</span>
                        <span>
                            Position is worth a lot. The first priority
                            carries far more of the result than the last, so
                            the order matters more than the exact set.
                        </span>
                    </li>

                    <li className="flex gap-2">
                        <span aria-hidden="true">•</span>
                        <span>
                            It is what your advice argues from. Every reason
                            Lens gives you for a car, and every tradeoff it
                            names, is stated in terms of this order.
                        </span>
                    </li>

                    <li className="flex gap-2">
                        <span aria-hidden="true">•</span>
                        <span>
                            Your order is saved. Unlike the next two steps,
                            what you set here is kept for next time and used
                            on <FinnLink /> as you browse.
                        </span>
                    </li>
                </ul>
            )}
        </div>
    );
}
