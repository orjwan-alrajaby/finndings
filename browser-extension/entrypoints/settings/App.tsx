import "@/assets/tailwind.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { AcademicCapIcon, ArrowLeftIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import {
  DEFAULT_CATEGORY_FEATURES,
  DEFAULT_DEFAULT_PROFILE_ID,
  DEFAULT_PREFERENCES,
  DEFAULT_PRIORITIES,
  DEFAULT_PRIORITY_DEFINITIONS,
  DEFAULT_PROFILES,
} from "@/lib/reasoning-engine/constants";
import {
  loadLensSettings,
  registerCategoryMeta,
  saveLensSettings,
  unregisterCategoryMeta,
} from "@/lib/reasoning-engine";
import type {
  CategoryId,
  FeatureSelection,
  LensPreferences,
  LensSettings,
  PriorityDefinition,
  Profile,
  ProfileId,
} from "@/lib/reasoning-engine/types";
import { SettingsTabs, type SettingsTab } from "./tabs/SettingsTabs";
import { PrioritiesSettings } from "./tabs/PrioritiesSettings";
import { ProfilesSettings } from "./tabs/ProfileSettings";
import { DrivingSettings } from "./tabs/DrivingSettings";
import { DataSettings } from "./tabs/DataSettings";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { getProfileIssues } from "./utils/PriorityValidation";
import { snapshot } from "./utils/snapshot";
import { SaveStatus, type SaveState } from "./components/SaveStatus";
import {
  describeSettingsChanges,
  revertChange,
} from "@/lib/settings-changes";
import type { StoredDataGroupId } from "@/lib/stored-data";
import { openBrowserTab } from "../popup/utils";

function registerCustomMeta(priority: PriorityDefinition) {
  registerCategoryMeta(priority.id, {
    label: priority.label,
    icon: priority.icon,
    color: "#5B6472",
    question: priority.description || priority.label,
    description: priority.description,
    recommendedFor: [],
    features: [],
  });
}

export default function SettingsPage({ onBack }: { onBack?: () => void }) {
  const [tab, setTab] = useState<SettingsTab>("priorities");
  const [loading, setLoading] = useState(true);

  const [preferences, setPreferences] = useState<LensPreferences>(DEFAULT_PREFERENCES);
  const [priorities, setPriorities] = useState<CategoryId[]>(DEFAULT_PRIORITIES);
  const [priorityDefinitions, setPriorityDefinitions] = useState<PriorityDefinition[]>(DEFAULT_PRIORITY_DEFINITIONS);
  const [categoryFeatures, setCategoryFeatures] = useState<Record<CategoryId, FeatureSelection>>(DEFAULT_CATEGORY_FEATURES);
  const [profiles, setProfiles] = useState<Profile[]>(DEFAULT_PROFILES);
  const [defaultProfileId, setDefaultProfileId] = useState<string>(DEFAULT_DEFAULT_PROFILE_ID);

  const [restoreOpen, setRestoreOpen] = useState(false);

  /*
   * What is on disk, as text. Nothing on this page waits for a button any
   * more, so this is what the status reads to say "saved" rather than what a
   * Save button reads to decide whether it is allowed to be pressed.
   */
  const [persisted, setPersisted] = useState<string | null>(null);

  /**
   * What was on disk when the page opened.
   *
   * The reference for the change list, and deliberately not `persisted`:
   * every edit is written immediately, so measuring against what is on disk
   * *now* would empty the list a moment after filling it. Measuring against
   * where the reader started is what makes "3 changes" a description of
   * their visit rather than of the last half-second.
   */
  const [baseline, setBaseline] = useState<LensSettings | null>(null);

  const [saveState, setSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    loadLensSettings().then((settings) => {
      setPreferences(settings.preferences);
      setPriorities(settings.priorities);
      setPriorityDefinitions(settings.priorityDefinitions);
      setCategoryFeatures(settings.categoryFeatures);
      setProfiles(settings.profiles);
      setDefaultProfileId(settings.defaultProfileId);
      setPersisted(snapshot(settings));
      setBaseline(settings);
      setLoading(false);
    });
  }, []);

  // `priorities` is saved from here now, and that is a change worth naming.
  //
  // It used to be omitted because the compare flow was the only place the
  // order could be set, so writing it from here could only have overwritten a
  // customised order with a profile's. It is now shown on this page and edited
  // directly, so saving it is saving what the reader is looking at. Both
  // places write the same key, which is right: there is one priority order,
  // not a settings one and a compare one.
  const currentSettings = (): LensSettings => ({
    preferences,
    priorities,
    priorityDefinitions,
    categoryFeatures,
    profiles,
    defaultProfileId: defaultProfileId as ProfileId,
  });

  /**
   * Write what is on screen, and say so.
   *
   * Called by the autosave effect rather than by a button: this page used to
   * have two things labelled "Save changes", one of which committed to React
   * state and one of which committed to disk, and a reader who pressed the
   * first and closed the tab lost work having pressed Save. There is now one
   * kind of save and nobody presses it.
   */
  const save = useCallback(async (settings: LensSettings) => {
    setSaveState("saving");

    try {
      await saveLensSettings(settings);

      setPersisted(snapshot(settings));
      setSaveState("saved");
    } catch (error) {
      console.error("FINN Lens: could not save your settings", error);

      /*
       * Left as failed until the next successful write. A page that quietly
       * went back to saying "Saved" would be telling the reader their work
       * is safe when it is only in a tab.
       */
      setSaveState("failed");
    }
  }, []);

  // ── Priorities ──────────────────────────────────────────────────────────

  const handleSavePriority = (priority: PriorityDefinition, features: FeatureSelection, isNew: boolean) => {
    setPriorityDefinitions((cur) => (isNew ? [...cur, priority] : cur.map((p) => (p.id === priority.id ? priority : p))));
    setCategoryFeatures((cur) => ({ ...cur, [priority.id]: features }));
    if (priority.isCustom) registerCustomMeta(priority);
  };

  // ── Profiles ────────────────────────────────────────────────────────────
  //
  // Profiles are product configuration: they can be switched on and off and
  // one of them is the default, but their copy and priority order are fixed.
  // The only thing to guard here is that the default always points at a
  // profile that is actually available.

  const handleToggleProfileEnabled = (id: string, enabled: boolean) => {
    const next = profiles.map((p) => (p.id === id ? { ...p, enabled } : p));

    if (!next.some((p) => p.enabled)) return;

    setProfiles(next);

    if (!enabled && id === defaultProfileId) {
      const replacement = next.find((p) => p.enabled);
      if (replacement) setDefaultProfileId(replacement.id);
    }
  };

  // ── Deleting stored data ────────────────────────────────────────────────

  /**
   * Put the page back in step with storage after something was deleted.
   *
   * This page holds the settings in React state and compares them against a
   * snapshot of what is on disk. Delete the settings from under it and both
   * are stale: the form still shows the values that were just removed, and
   * the save bar would cheerfully offer to write them back — which would
   * undo the deletion by the most confusing route available.
   *
   * Only the settings group needs this. Pinned cars, the browsing cache and
   * the setup record are not on this page, so deleting them changes nothing
   * it is holding.
   */
  const handleDataCleared = (groups: StoredDataGroupId[]) => {
    if (!groups.includes("settings")) return;

    for (const p of priorityDefinitions) {
      if (p.isCustom) unregisterCategoryMeta(p.id);
    }

    setPreferences(DEFAULT_PREFERENCES);
    setPriorities(DEFAULT_PRIORITIES);
    setPriorityDefinitions(DEFAULT_PRIORITY_DEFINITIONS);
    setCategoryFeatures(DEFAULT_CATEGORY_FEATURES);
    setProfiles(DEFAULT_PROFILES);
    setDefaultProfileId(DEFAULT_DEFAULT_PROFILE_ID);

    /*
     * The snapshot is set to the defaults rather than re-read, because that
     * is exactly what storage now holds: nothing, which `loadLensSettings`
     * reads as the defaults. Saving is left disabled until the reader
     * changes something, so a deletion is not silently written back.
     */
    /*
     * The baseline moves with it, and that is the point rather than an
     * oversight. Everything the reader had is gone from storage, so a change
     * list still measuring against it would be offering to "undo" the
     * deletion by writing the deleted settings back — which is the one thing
     * a deletion has to mean it cannot do. After this, the defaults are where
     * they started.
     */
    const defaults: LensSettings = {
      preferences: DEFAULT_PREFERENCES,
      priorities: DEFAULT_PRIORITIES,
      priorityDefinitions: DEFAULT_PRIORITY_DEFINITIONS,
      categoryFeatures: DEFAULT_CATEGORY_FEATURES,
      profiles: DEFAULT_PROFILES,
      defaultProfileId: DEFAULT_DEFAULT_PROFILE_ID,
    };

    setPersisted(snapshot(defaults));
    setBaseline(defaults);
    setSaveState("idle");
  };

  // ── Restore defaults ────────────────────────────────────────────────────

  const handleRestoreDefaults = async () => {
    for (const p of priorityDefinitions) {
      if (p.isCustom) unregisterCategoryMeta(p.id);
    }
    setPreferences(DEFAULT_PREFERENCES);
    setPriorities(DEFAULT_PRIORITIES);
    setPriorityDefinitions(DEFAULT_PRIORITY_DEFINITIONS);
    setCategoryFeatures(DEFAULT_CATEGORY_FEATURES);
    setProfiles(DEFAULT_PROFILES);
    setDefaultProfileId(DEFAULT_DEFAULT_PROFILE_ID);
    await saveLensSettings({
      preferences: DEFAULT_PREFERENCES,
      priorities: DEFAULT_PRIORITIES,
      priorityDefinitions: DEFAULT_PRIORITY_DEFINITIONS,
      categoryFeatures: DEFAULT_CATEGORY_FEATURES,
      profiles: DEFAULT_PROFILES,
      defaultProfileId: DEFAULT_DEFAULT_PROFILE_ID,
    });
    setPersisted(
      snapshot({
        preferences: DEFAULT_PREFERENCES,
        priorities: DEFAULT_PRIORITIES,
        priorityDefinitions: DEFAULT_PRIORITY_DEFINITIONS,
        categoryFeatures: DEFAULT_CATEGORY_FEATURES,
        profiles: DEFAULT_PROFILES,
        defaultProfileId: DEFAULT_DEFAULT_PROFILE_ID,
      }),
    );
    setRestoreOpen(false);
    setSaveState("saved");
  };

  /*
   * Compared as text rather than field by field: everything on this page is
   * plain data, and a deep equality helper would be a second description of
   * the same shape to keep in step with the first.
   */
  const dirty = persisted !== null && snapshot(currentSettings()) !== persisted;

  /**
   * Write anything unwritten, shortly after the reader stops changing it.
   *
   * Debounced rather than immediate because a drag along the priority list
   * and a held-down arrow on a number field are each one intention and many
   * state updates, and storage should see the intention. Long enough to
   * coalesce a gesture, short enough that a reader who closes the tab
   * straight after a click has already been saved.
   */
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (loading || !dirty) return;

    const settings = currentSettings();

    if (saveTimer.current !== null) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      void save(settings);
    }, 600);

    return () => {
      if (saveTimer.current !== null) clearTimeout(saveTimer.current);
    };
  });

  /**
   * Everything different from where the reader started, in their terms.
   *
   * Derived rather than accumulated, so undoing a change by hand removes it
   * from the list on its own — an edit and its reversal are not two entries,
   * they are no entry.
   */
  const changes = useMemo(
    () => (baseline ? describeSettingsChanges(baseline, currentSettings()) : []),
    [
      baseline,
      preferences,
      priorities,
      priorityDefinitions,
      categoryFeatures,
      profiles,
      defaultProfileId,
    ],
  );

  const applySettings = (next: LensSettings) => {
    setPreferences(next.preferences);
    setPriorities(next.priorities);
    setPriorityDefinitions(next.priorityDefinitions);
    setCategoryFeatures(next.categoryFeatures);
    setProfiles(next.profiles);
    setDefaultProfileId(next.defaultProfileId);
  };

  const handleRevert = (id: string) => {
    if (!baseline) return;

    applySettings(revertChange(baseline, currentSettings(), id));
  };

  const handleRevertAll = () => {
    if (baseline) applySettings(baseline);
  };

  const profilesNeedingAttention = profiles.filter((p) => getProfileIssues(p, priorityDefinitions).length > 0).length;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-finn-snow">
        <span className="text-sm text-finn-iron">Loading settings…</span>
      </main>
    );
  }

  return (
    <Tooltip.Provider delayDuration={250}>
    <main className="min-h-screen bg-finn-snow text-finn-black">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <header className="mb-7 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-finn-accent-blue">FINN Lens</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Settings</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-finn-iron">
              Change the priorities, profiles, and driving assumptions FINN Lens uses when explaining your pinned cars.
            </p>
          </div>
          {onBack && (
            <button type="button" onClick={onBack} className="rounded-full bg-white p-3 text-finn-iron shadow-sm hover:text-finn-black">
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
          )}
        </header>

        {/*
          * Sticky, because the thing it replaced was fixed to the bottom of
          * the window and a reader stops seeing that on the second day. Here
          * it stays beside the tabs — where they already look to move around
          * the page — instead of hovering over the content it describes.
          */}
        <div className="sticky top-0 z-30 -mx-4 mb-5 flex flex-col-reverse items-center justify-between gap-3 bg-finn-snow/90 px-4 py-3 backdrop-blur-md xs:flex-row sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
          <SettingsTabs active={tab} onChange={setTab} badges={{ profiles: profilesNeedingAttention }} />
          <div className="flex flex-wrap items-center gap-4">
            <SaveStatus
              state={saveState}
              changes={changes}
              onRevert={handleRevert}
              onRevertAll={handleRevertAll}
              onRetry={() => void save(currentSettings())}
            />

            {/*
              * The setup flow opens itself once, on install. Anyone who
              * skipped it, or who wants the explanation back, has no other
              * way to reach it — a page that can only be seen by accident of
              * timing may as well not exist.
              */}
            <button type="button" onClick={() => void openBrowserTab("OPEN_ONBOARDING_PAGE")} className="inline-flex items-center gap-1.5 text-xs font-bold text-finn-iron hover:text-finn-black">
              <AcademicCapIcon className="h-3.5 w-3.5" /> Setup guide
            </button>
            <button type="button" onClick={() => setRestoreOpen(true)} className="inline-flex items-center gap-1.5 text-xs font-bold text-finn-iron hover:text-finn-black">
              <ArrowPathIcon className="h-3.5 w-3.5" /> Restore defaults
            </button>
          </div>
        </div>

        <div className="space-y-4 pb-12">
          {tab === "priorities" && (
            <PrioritiesSettings
              priorities={priorities}
              priorityDefinitions={priorityDefinitions}
              categoryFeatures={categoryFeatures}
              profiles={profiles}
              onChangePriorities={setPriorities}
              onSavePriority={handleSavePriority}
            />
          )}
          {tab === "profiles" && (
            <ProfilesSettings
              profiles={profiles}
              priorityDefinitions={priorityDefinitions}
              defaultProfileId={defaultProfileId}
              onToggleEnabled={handleToggleProfileEnabled}
              onSetDefault={setDefaultProfileId}
            />
          )}
          {tab === "driving" && <DrivingSettings preferences={preferences} onChange={setPreferences} />}
          {tab === "data" && <DataSettings onCleared={handleDataCleared} />}
        </div>

      </div>

      <ConfirmDialog
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
        title="Restore default settings?"
        confirmLabel="Restore defaults"
        tone="danger"
        onConfirm={handleRestoreDefaults}
        description="This resets priorities, features, which profiles are enabled, the default profile, and driving assumptions to FINN Lens's factory configuration. Any custom priorities or edits you've made will be lost. This can't be undone."
      />
    </main>
    </Tooltip.Provider>
  );
}