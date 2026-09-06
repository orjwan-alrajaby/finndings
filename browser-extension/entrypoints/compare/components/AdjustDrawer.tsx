import { useEffect, useMemo, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Cancel01Icon,
    ChevronDownIcon,
    Refresh01Icon,
    Settings02Icon,
} from "@hugeicons/core-free-icons";

import type {
    CategoryId,
    FeatureSelection,
} from "@/lib/reasoning-engine/types";
import {
    AVAILABLE_CATEGORY_FEATURES,
    CATEGORIES,
    DEFAULT_PREFERENCES,
} from "@/lib/reasoning-engine/constants";
import type { LensPreferences } from "@/lib/reasoning-engine/types";
import { DrivingAssumptions } from "@/components/DrivingAssumptions";
import { FeatureCard } from "@/components/FeatureCard";
import { buildPickedElsewhere } from "@/components/FeatureInfluencePicker";
import {
    applicableProfiles,
    PriorityOrderList,
    ProfilePresets,
} from "@/components/PriorityOrder";

import {
    featuresChanged as haveFeaturesChanged,
    MAX_PRIORITIES,
    useCompareStore,
} from "../store";
import { FeatureEditor } from "./FeatureEditor";

/**
 * The questions, beside the answer instead of in front of it.
 *
 * These three — the priority order, what counts inside each priority, and
 * what the reader's driving costs — used to be three steps walked before any
 * recommendation existed. That asked someone to tune a thing they had never
 * seen: you cannot tell whether "practicality third" is right until you have
 * watched what third does to the result. So the advice comes first now, and
 * this is where it gets argued with.
 *
 * Nothing here is applied, submitted or confirmed. Every control writes
 * straight into the compare store the page is rendered from, so the
 * recommendation behind the drawer re-reasons on each change — which is the
 * only reason to put the controls beside it rather than on a page of their
 * own.
 *
 * On a wide screen the page makes room for the drawer rather than sitting
 * under it, so cause and effect are visible at once. Only when there isn't
 * room does it become a sheet over the page, with a scrim.
 */
export function AdjustDrawer({
    open,
    onClose,
    onSettings,
}: {
    open: boolean;
    onClose: () => void;
    onSettings: () => void;
}) {
    const panel = useRef<HTMLDivElement>(null);

    /* Escape closes it, from wherever the focus happens to be. */
    useEffect(() => {
        if (!open) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };

        window.addEventListener("keydown", onKeyDown);

        return () => {
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [open, onClose]);

    /*
     * Focus moves in when it opens, so the keyboard follows the eye. It is
     * deliberately not trapped: the page behind stays live, and a reader who
     * tabs out of the drawer into their advice is doing the thing this
     * layout exists to allow.
     */
    useEffect(() => {
        if (open) panel.current?.focus();
    }, [open]);

    return (
        <>
            {/* Only where the drawer covers the page. */}
            <div
                aria-hidden="true"
                onClick={onClose}
                className={[
                    "fixed inset-0 z-30 bg-finn-black/30 transition-opacity lg:hidden",
                    open
                        ? "opacity-100"
                        : "pointer-events-none opacity-0",
                ].join(" ")}
            />

            <div
                ref={panel}
                role="dialog"
                aria-label="Adjust your answers"
                aria-hidden={!open}
                tabIndex={-1}
                inert={open ? undefined : true}
                className={[
                    "fixed right-0 top-0 z-40 flex h-screen w-full max-w-108 flex-col",
                    "border-l border-finn-cotton bg-finn-snow shadow-2xl outline-none",
                    "transition-transform duration-300 ease-out",
                    open ? "translate-x-0" : "translate-x-full",
                ].join(" ")}
            >
                <Header onClose={onClose} />

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
                    <PriorityOrderSection />
                    <FeatureSection />
                    <AssumptionsSection />
                </div>

                <Footer onSettings={onSettings} />
            </div>
        </>
    );
}

function Header({ onClose }: { onClose: () => void }) {
    return (
        <header className="flex items-start justify-between gap-3 border-b border-finn-cotton bg-white px-4 py-4">
            <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-finn-accent-blue">
                    Adjust
                </p>

                <h2 className="mt-1 text-base font-black text-finn-black">
                    Change an answer, watch it land
                </h2>

                <p className="mt-1 text-[11px] leading-4 text-finn-iron">
                    Every change re-runs the comparison behind this panel
                    straight away.
                </p>
            </div>

            <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-finn-iron transition hover:bg-finn-snow hover:text-finn-black"
            >
                <HugeiconsIcon icon={Cancel01Icon} className="h-5 w-5" />
            </button>
        </header>
    );
}

function Footer({ onSettings }: { onSettings: () => void }) {
    return (
        <footer className="border-t border-finn-cotton bg-white px-4 py-3">
            <p className="text-[11px] leading-4 text-finn-iron">
                Your order is kept for next time. Everything else applies to
                this comparison only —{" "}
                <button
                    type="button"
                    onClick={onSettings}
                    className="inline-flex items-center gap-1 font-bold text-finn-accent-blue underline-offset-2 transition hover:underline"
                >
                    <HugeiconsIcon icon={Settings02Icon} className="h-3 w-3" />
                    make it permanent in Settings
                </button>
                .
            </p>
        </footer>
    );
}

/* -------------------------------------------------------------------------- */
/* Sections                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * One question, open by default and closable.
 *
 * All three start open because the reader opened the drawer to change
 * something and does not yet know which of the three it is. Closing one is
 * how they keep the other two on screen while they work in a column this
 * narrow.
 */
function Section({
    title,
    summary,
    children,
}: {
    title: string;
    summary: string;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(true);

    return (
        <section className="overflow-hidden rounded-[22px] bg-white shadow-sm">
            <button
                type="button"
                onClick={() => setOpen((was) => !was)}
                aria-expanded={open}
                className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-finn-snow"
            >
                <span className="min-w-0 flex-1">
                    <span
                        role="heading"
                        aria-level={3}
                        className="block text-sm font-black text-finn-black"
                    >
                        {title}
                    </span>

                    <span className="mt-0.5 block text-[11px] leading-4 text-finn-iron">
                        {summary}
                    </span>
                </span>

                <HugeiconsIcon icon={ChevronDownIcon}
                    aria-hidden="true"
                    className={[
                        "mt-0.5 h-4 w-4 shrink-0 text-finn-iron transition-transform",
                        open ? "rotate-180" : "",
                    ].join(" ")}
                />
            </button>

            {open && <div className="px-4 pb-4">{children}</div>}
        </section>
    );
}

/** The order itself, and the profiles as a way of setting it in one go. */
function PriorityOrderSection() {
    const priorities = useCompareStore((state) => state.priorities);
    const priorityDefinitions = useCompareStore(
        (state) => state.priorityDefinitions,
    );
    const profiles = useCompareStore((state) => state.profiles);
    const features = useCompareStore((state) => state.features);
    const setPriorities = useCompareStore((state) => state.setPriorities);

    const hasProfiles =
        applicableProfiles(profiles, priorityDefinitions).length > 0;

    return (
        <Section
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
                            onApply={setPriorities}
                        />
                    </div>
                </div>
            )}

            <PriorityOrderList
                priorities={priorities}
                priorityDefinitions={priorityDefinitions}
                categoryFeatures={features}
                onChange={setPriorities}
            />
        </Section>
    );
}

/** What counts extra inside each priority. */
function FeatureSection() {
    const priorities = useCompareStore((state) => state.priorities);
    const features = useCompareStore((state) => state.features);
    const savedCategoryFeatures = useCompareStore(
        (state) => state.savedCategoryFeatures,
    );

    const toggleFeature = useCompareStore((state) => state.toggleFeature);
    const setFeatureImportance = useCompareStore(
        (state) => state.setFeatureImportance,
    );
    const resetFeaturesToSaved = useCompareStore(
        (state) => state.resetFeaturesToSaved,
    );

    const expandedPriority = useCompareStore(
        (state) => state.expandedPriority,
    );
    const setExpandedPriority = useCompareStore(
        (state) => state.setExpandedPriority,
    );

    const featuresChanged = useCompareStore(haveFeaturesChanged);

    /*
     * "Picked elsewhere" means picked in another priority the reader is
     * actually being asked about — picks kept for a category they since
     * dropped are not somewhere they can see or reach.
     */
    const pickedInPriorities = useMemo(
        () =>
            Object.fromEntries(
                priorities.map((categoryId) => [
                    categoryId,
                    features[categoryId] ?? [],
                ]),
            ) as Partial<Record<CategoryId, FeatureSelection>>,
        [priorities, features],
    );

    const raised = priorities.reduce(
        (total, categoryId) => total + (features[categoryId]?.length ?? 0),
        0,
    );

    const savedCount = priorities.reduce(
        (total, categoryId) =>
            total + (savedCategoryFeatures[categoryId]?.length ?? 0),
        0,
    );

    return (
        <Section
            title="What counts inside a priority"
            summary={
                raised === 0
                    ? "Nothing raised · each category judged as a whole"
                    : `${raised} raised for extra influence`
            }
        >
            <p className="mb-3 rounded-xl bg-finn-snow px-3 py-2 text-[11px] leading-4 text-finn-iron">
                Optional. Every feature in a category counts the same until
                you raise one — and raising one never rules a car out, it
                turns up as a tradeoff instead.
            </p>

            <div className="flex flex-col gap-2">
                {priorities.map((categoryId, index) => {
                    const categoryFeatures = features[categoryId] ?? [];
                    const category = CATEGORIES[categoryId];
                    const open = expandedPriority === categoryId;

                    return (
                        <FeatureCard
                            key={categoryId}
                            icon={category.icon}
                            label={category.label}
                            featureCount={categoryFeatures.length}
                            open={open}
                            onToggle={() =>
                                setExpandedPriority(open ? null : categoryId)
                            }
                        >
                            {open && (
                                <FeatureEditor
                                    categoryId={categoryId}
                                    features={categoryFeatures}
                                    availableFeatures={
                                        AVAILABLE_CATEGORY_FEATURES[
                                            categoryId
                                        ] ?? []
                                    }
                                    rank={index + 1}
                                    pickedElsewhere={buildPickedElsewhere(
                                        categoryId,
                                        pickedInPriorities,
                                        CATEGORIES,
                                    )}
                                    onToggleFeature={(feature) =>
                                        toggleFeature(categoryId, feature)
                                    }
                                    onImportanceChange={(
                                        feature,
                                        importance,
                                    ) =>
                                        setFeatureImportance(
                                            categoryId,
                                            feature,
                                            importance,
                                        )
                                    }
                                    onResetAll={() => {
                                        for (const pick of categoryFeatures) {
                                            toggleFeature(
                                                categoryId,
                                                pick.key,
                                            );
                                        }
                                    }}
                                />
                            )}
                        </FeatureCard>
                    );
                })}
            </div>

            {featuresChanged && (
                <button
                    type="button"
                    onClick={resetFeaturesToSaved}
                    className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-finn-iron underline-offset-2 transition hover:text-finn-black hover:underline"
                >
                    <HugeiconsIcon icon={Refresh01Icon} className="h-3.5 w-3.5" />
                    {savedCount > 0 ? "Use my saved picks" : "Clear my picks"}
                </button>
            )}
        </Section>
    );
}

/** What the reader's driving costs, which decides the money on the page. */
function AssumptionsSection() {
    const preferences = useCompareStore((state) => state.preferences);
    const savedPreferences = useCompareStore(
        (state) => state.savedPreferences,
    );
    const setPreferences = useCompareStore((state) => state.setPreferences);
    const useSavedPreferences = useCompareStore(
        (state) => state.useSavedPreferences,
    );

    return (
        <Section
            title="How you drive"
            summary={
                preferences.monthlyBudget > 0
                    ? `€${preferences.monthlyBudget}/month budget · ${preferences.monthlyKm} km`
                    : `No budget set · ${preferences.monthlyKm} km a month`
            }
        >
            <DrivingAssumptions
                preferences={preferences}
                setPreferences={setPreferences}
                onUseSaved={useSavedPreferences}
                isSaved={sameAssumptions(preferences, savedPreferences)}
            />
        </Section>
    );
}

/** Whether this run's assumptions are still exactly the saved ones. */
function sameAssumptions(a: LensPreferences, b: LensPreferences): boolean {
    return (
        Object.keys(DEFAULT_PREFERENCES) as (keyof LensPreferences)[]
    ).every((key) => a[key] === b[key]);
}
