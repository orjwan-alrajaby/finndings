import "@/assets/tailwind.css";
import { useEffect, useState } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { AcademicCapIcon, ArrowLeftIcon, ArrowPathIcon, CheckIcon } from "@heroicons/react/24/outline";
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

  const [saved, setSaved] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);

  /*
   * What is on disk, as text, so the bar can tell the reader whether what
   * they are looking at is what Lens will actually use. Nothing on this page
   * takes effect until it is saved, and the priority order in particular is
   * now something a reader arrives here specifically to set — leaving them
   * unsure whether they did is the one thing this page must not do.
   */
  const [persisted, setPersisted] = useState<string | null>(null);

  useEffect(() => {
    loadLensSettings().then((settings) => {
      setPreferences(settings.preferences);
      setPriorities(settings.priorities);
      setPriorityDefinitions(settings.priorityDefinitions);
      setCategoryFeatures(settings.categoryFeatures);
      setProfiles(settings.profiles);
      setDefaultProfileId(settings.defaultProfileId);
      setPersisted(snapshot(settings));
      setLoading(false);
    });
  }, []);

  const flashSaved = () => { setSaved(true); window.setTimeout(() => setSaved(false), 1800); };

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

  const save = async () => {
    const settings = currentSettings();

    await saveLensSettings(settings);

    setPersisted(snapshot(settings));
    flashSaved();
  };

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
    flashSaved();
  };

  /*
   * Compared as text rather than field by field: everything on this page is
   * plain data, and a deep equality helper would be a second description of
   * the same shape to keep in step with the first.
   */
  const dirty = persisted !== null && snapshot(currentSettings()) !== persisted;

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

        <div className="mb-5 flex flex-col-reverse xs:flex-row items-center justify-between gap-3">
          <SettingsTabs active={tab} onChange={setTab} badges={{ profiles: profilesNeedingAttention }} />
          <div className="flex items-center gap-4">
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

        <div className="space-y-4 pb-24">
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

        <div className="fixed inset-x-4 bottom-4 z-30 mx-auto flex flex-col 2xs:flex-row max-w-5xl items-center justify-between gap-4 rounded-3xl bg-finn-black p-3 pl-5 text-white shadow-xl sm:inset-x-6 lg:inset-x-10">
          <div>
            <p className="text-sm font-black">
              {saved
                ? "Saved."
                : dirty
                  ? "You have unsaved changes."
                  : "Settings are local to this extension."}
            </p>
            <p className="text-[10px] text-white/55">
              {dirty
                ? "Nothing here reaches FINN Lens until you save."
                : "Changes affect future recommendations."}
            </p>
          </div>
          <button
            type="button"
            onClick={save}
            disabled={!dirty}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-black text-white transition-colors ${dirty ? "bg-finn-accent-blue hover:bg-finn-highlight-navy" : "cursor-default bg-white/15 text-white/50"}`}
          >
            <CheckIcon className="h-4 w-4" />
            {dirty ? "Save changes" : "Saved"}
          </button>
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