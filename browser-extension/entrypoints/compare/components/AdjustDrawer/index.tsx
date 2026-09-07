import { useState } from "react";
import * as Accordion from "@radix-ui/react-accordion";
import * as Dialog from "@radix-ui/react-dialog";
import { Settings, X } from "lucide-react";

import type {
    CategoryId,
    LensPreferences,
} from "@/lib/reasoning-engine/types";
import { SaveControl } from "@/components/SaveControl";

import { type Answers, useCompareStore } from "../../store";
import {
    clearFeatures,
    featuresChanged,
    restoreSavedFeatures,
    sameAnswers,
    setFeatureImportance,
    toggleFeature,
} from "./draft";
import { AssumptionsSection } from "./AssumptionsSection";
import { FeatureSection } from "./FeatureSection";
import { PriorityOrderSection } from "./PriorityOrderSection";

/**
 * The questions, over the answer rather than in front of it.
 *
 * These three — the priority order, what counts inside each priority, and
 * what the reader's driving costs — used to be three steps walked before any
 * recommendation existed. That asked someone to tune a thing they had never
 * seen: you cannot tell whether "practicality third" is right until you have
 * watched what third does to the result. So the advice comes first, and this
 * is where it gets argued with.
 *
 * Two things changed here, and they are the same change twice.
 *
 * **It is a drawer now, not a splint.** The page used to give up 27rem of its
 * width whenever this opened, so that a change could be watched landing
 * behind it. In practice it squeezed the advice into a column too narrow to
 * read while the reader worked in a column too narrow to work in, and neither
 * half got the room it needed. It is a proper modal drawer with a backdrop:
 * it overlays the page, it is as wide as it needs to be, and the page it
 * covers is waiting underneath.
 *
 * **Nothing lands until Save.** Every control used to write straight into the
 * store, so the recommendation re-reasoned on each keystroke — which is
 * exactly the behaviour the drawer's own width existed to justify. Once it
 * overlays the page there is nothing to watch, and re-reasoning under a
 * covered page is work nobody asked for. So the drawer holds a draft and
 * commits it in one act, through the same `SaveControl` the settings page
 * uses and saying the same three things: unsaved changes, save, saved.
 *
 * The draft outlives a close on purpose. A reader who shuts the drawer to
 * re-read the advice has not thrown their edits away, and reopening it to
 * find them gone would be the drawer deciding that for them.
 */
export function AdjustDrawer({
    open,
    onOpenChange,
    onSettings,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSettings: () => void;
}) {
    const priorityDefinitions = useCompareStore(
        (state) => state.priorityDefinitions,
    );
    const profiles = useCompareStore((state) => state.profiles);
    const savedPreferences = useCompareStore(
        (state) => state.savedPreferences,
    );
    const savedCategoryFeatures = useCompareStore(
        (state) => state.savedCategoryFeatures,
    );
    const applyAnswers = useCompareStore((state) => state.applyAnswers);

    /*
     * What the page is currently reasoning from. Read as one object because
     * that is what a draft is compared against and what a save replaces.
     */
    const applied: Answers = useCompareStore((state) => ({
        priorities: state.priorities,
        preferences: state.preferences,
        features: state.features,
    }));

    /*
     * Seeded once. The page holds this drawer back until the saved settings
     * have been read, so there is no window in which the defaults could be
     * captured as the reader's answers.
     */
    const [draft, setDraft] = useState<Answers>(applied);
    const [expanded, setExpanded] = useState<CategoryId | null>(
        applied.priorities[0] ?? null,
    );
    const [saved, setSaved] = useState(false);

    const dirty = !sameAnswers(draft, applied);

    const save = () => {
        applyAnswers(draft);

        setSaved(true);
        window.setTimeout(() => setSaved(false), 1800);
    };

    const setPriorities = (priorities: CategoryId[]) => {
        setDraft((current) => ({ ...current, priorities }));

        /*
         * The feature editor stays open on a priority the reader still has.
         * Leaving a card open for a category they just dropped would leave
         * that part of the drawer showing nothing at all.
         */
        setExpanded((current) =>
            current && priorities.includes(current)
                ? current
                : (priorities[0] ?? null),
        );
    };

    const setPreferences = (preferences: LensPreferences) => {
        setDraft((current) => ({ ...current, preferences }));
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="finn-lens-scrim fixed inset-0 z-40 bg-finn-black/40 backdrop-blur-[2px]" />

                <Dialog.Content
                    aria-describedby="adjust-drawer-purpose"
                    className={[
                        "finn-lens-drawer",
                        "fixed inset-y-0 right-0 z-50 flex w-full flex-col",
                        "max-w-[min(100vw,46rem)]",
                        "border-l border-finn-cotton bg-finn-snow shadow-2xl outline-none",
                    ].join(" ")}
                >
                    <Header onSettings={onSettings} />

                    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
                        {/*
                          * `multiple`, and every section open to begin with:
                          * the reader came here to change something and does
                          * not yet know which of the three it is.
                          */}
                        <Accordion.Root
                            type="multiple"
                            defaultValue={["order", "features", "driving"]}
                            className="flex flex-col gap-3"
                        >
                            <PriorityOrderSection
                                priorities={draft.priorities}
                                priorityDefinitions={priorityDefinitions}
                                profiles={profiles}
                                features={draft.features}
                                onChange={setPriorities}
                            />

                            <FeatureSection
                                priorities={draft.priorities}
                                features={draft.features}
                                savedCategoryFeatures={savedCategoryFeatures}
                                expanded={expanded}
                                onExpandedChange={setExpanded}
                                changed={featuresChanged(
                                    draft,
                                    savedCategoryFeatures,
                                )}
                                onToggleFeature={(category, feature) =>
                                    setDraft((current) =>
                                        toggleFeature(
                                            current,
                                            category,
                                            feature,
                                        ),
                                    )
                                }
                                onImportanceChange={(
                                    category,
                                    feature,
                                    importance,
                                ) =>
                                    setDraft((current) =>
                                        setFeatureImportance(
                                            current,
                                            category,
                                            feature,
                                            importance,
                                        ),
                                    )
                                }
                                onClearCategory={(category) =>
                                    setDraft((current) =>
                                        clearFeatures(current, category),
                                    )
                                }
                                onRestoreSaved={() =>
                                    setDraft((current) =>
                                        restoreSavedFeatures(
                                            current,
                                            savedCategoryFeatures,
                                        ),
                                    )
                                }
                            />

                            <AssumptionsSection
                                preferences={draft.preferences}
                                savedPreferences={savedPreferences}
                                onChange={setPreferences}
                                onUseSaved={() =>
                                    setPreferences({ ...savedPreferences })
                                }
                            />
                        </Accordion.Root>
                    </div>

                    <Footer
                        dirty={dirty}
                        saved={saved}
                        onSave={save}
                        onSettings={onSettings}
                    />
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

function Header({ onSettings }: { onSettings: () => void }) {
    return (
        <header className="flex items-start justify-between gap-3 border-b border-finn-cotton bg-white px-4 py-4 sm:px-6">
            <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-finn-accent-blue">
                    Adjust
                </p>

                <Dialog.Title className="mt-1 text-base font-black text-finn-black">
                    Change an answer, then save it
                </Dialog.Title>

                <Dialog.Description
                    id="adjust-drawer-purpose"
                    className="mt-1 text-[11px] leading-4 text-finn-iron"
                >
                    Nothing here changes your recommendation until you save —
                    so you can try a few things out first.
                </Dialog.Description>
            </div>

            <div className="flex shrink-0 items-center gap-1">
                <button
                    type="button"
                    onClick={onSettings}
                    className="hidden h-9 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold text-finn-iron transition hover:bg-finn-snow hover:text-finn-black sm:inline-flex"
                >
                    <Settings aria-hidden="true" className="h-3.5 w-3.5" />
                    Settings
                </button>

                <Dialog.Close
                    aria-label="Close"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-finn-iron transition hover:bg-finn-snow hover:text-finn-black"
                >
                    <X aria-hidden="true" className="h-5 w-5" />
                </Dialog.Close>
            </div>
        </header>
    );
}

/**
 * The save, and the one thing a reader needs told about it: what survives
 * past this comparison and what doesn't.
 */
function Footer({
    dirty,
    saved,
    onSave,
    onSettings,
}: {
    dirty: boolean;
    saved: boolean;
    onSave: () => void;
    onSettings: () => void;
}) {
    return (
        <footer className="flex flex-col-reverse gap-3 border-t border-finn-cotton bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-[11px] leading-4 text-finn-iron">
                Your order is kept for next time. Everything else applies to
                this comparison only —{" "}
                <button
                    type="button"
                    onClick={onSettings}
                    className="inline-flex items-center gap-1 font-bold text-finn-accent-blue underline-offset-2 transition hover:underline"
                >
                    <Settings aria-hidden="true" className="h-3 w-3" />
                    make it permanent in Settings
                </button>
                .
            </p>

            <SaveControl
                dirty={dirty}
                saved={saved}
                onSave={onSave}
                saveLabel="Apply changes"
                className="shrink-0 justify-end"
            />
        </footer>
    );
}
