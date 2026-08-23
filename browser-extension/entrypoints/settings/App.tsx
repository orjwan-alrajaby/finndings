import "@/assets/tailwind.css";
import { useEffect, useState } from "react";
import { ArrowLeftIcon, ArrowPathIcon, CheckIcon } from "@heroicons/react/24/outline";
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
  FeatureWeight,
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
import { ConfirmDialog } from "./components/ConfirmDialog";
import { getProfileIssues } from "./utils/PriorityValidation";

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
  const [priorityDefinitions, setPriorityDefinitions] = useState<PriorityDefinition[]>(DEFAULT_PRIORITY_DEFINITIONS);
  const [categoryFeatures, setCategoryFeatures] = useState<Record<CategoryId, FeatureWeight[]>>(DEFAULT_CATEGORY_FEATURES);
  const [profiles, setProfiles] = useState<Profile[]>(DEFAULT_PROFILES);
  const [defaultProfileId, setDefaultProfileId] = useState<string>(DEFAULT_DEFAULT_PROFILE_ID);

  const [saved, setSaved] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);

  useEffect(() => {
    loadLensSettings().then((settings) => {
      setPreferences(settings.preferences);
      setPriorityDefinitions(settings.priorityDefinitions);
      setCategoryFeatures(settings.categoryFeatures);
      setProfiles(settings.profiles);
      setDefaultProfileId(settings.defaultProfileId);
      setLoading(false);
    });
  }, []);

  const flashSaved = () => { setSaved(true); window.setTimeout(() => setSaved(false), 1800); };

  // `priorities` is a legacy fallback field predating the profile system —
  // kept in sync with the current default profile's order (falling back to
  // the constant only if that profile is somehow missing) rather than left
  // frozen at DEFAULT_PRIORITIES forever.
  const currentSettings = (): LensSettings => ({
    preferences,
    priorities: profiles.find((p) => p.id === defaultProfileId)?.priorities ?? DEFAULT_PRIORITIES,
    priorityDefinitions,
    categoryFeatures,
    profiles,
    defaultProfileId: defaultProfileId as ProfileId,
  });

  const save = async () => {
    await saveLensSettings(currentSettings());
    flashSaved();
  };

  // ── Priorities ──────────────────────────────────────────────────────────

  const handleSavePriority = (priority: PriorityDefinition, features: FeatureWeight[], isNew: boolean) => {
    setPriorityDefinitions((cur) => (isNew ? [...cur, priority] : cur.map((p) => (p.id === priority.id ? priority : p))));
    setCategoryFeatures((cur) => ({ ...cur, [priority.id]: features }));
    if (priority.isCustom) registerCustomMeta(priority);
  };

  // ── Profiles ────────────────────────────────────────────────────────────

  const reassignDefaultIfNeeded = (removedOrDisabledId: string) => {
    if (removedOrDisabledId !== defaultProfileId) return;
    const replacement = profiles.find((p) => p.id !== removedOrDisabledId && p.enabled);
    if (replacement) setDefaultProfileId(replacement.id);
  };

  const handleSaveProfile = (profile: Profile, isNew: boolean) => {
    setProfiles((cur) => (isNew ? [...cur, profile] : cur.map((p) => (p.id === profile.id ? profile : p))));
    if (isNew && profiles.length === 0) setDefaultProfileId(profile.id);
  };

  const handleDeleteProfile = (profile: Profile) => {
    setProfiles((cur) => cur.filter((p) => p.id !== profile.id));
    reassignDefaultIfNeeded(profile.id);
  };

  const handleToggleProfileEnabled = (id: string, enabled: boolean) => {
    setProfiles((cur) => cur.map((p) => (p.id === id ? { ...p, enabled } : p)));
    if (!enabled) reassignDefaultIfNeeded(id);
  };

  // ── Restore defaults ────────────────────────────────────────────────────

  const handleRestoreDefaults = async () => {
    for (const p of priorityDefinitions) {
      if (p.isCustom) unregisterCategoryMeta(p.id);
    }
    setPreferences(DEFAULT_PREFERENCES);
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
    setRestoreOpen(false);
    flashSaved();
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
          <button type="button" onClick={() => setRestoreOpen(true)} className="inline-flex items-center gap-1.5 text-xs font-bold text-finn-iron hover:text-finn-black">
            <ArrowPathIcon className="h-3.5 w-3.5" /> Restore defaults
          </button>
        </div>

        <div className="space-y-4 pb-24">
          {tab === "priorities" && (
            <PrioritiesSettings
              priorityDefinitions={priorityDefinitions}
              categoryFeatures={categoryFeatures}
              onSavePriority={handleSavePriority}
            />
          )}
          {tab === "profiles" && (
            <ProfilesSettings
              profiles={profiles}
              priorityDefinitions={priorityDefinitions}
              defaultProfileId={defaultProfileId}
              onSaveProfile={handleSaveProfile}
              onDeleteProfile={handleDeleteProfile}
              onToggleEnabled={handleToggleProfileEnabled}
              onSetDefault={setDefaultProfileId}
            />
          )}
          {tab === "driving" && <DrivingSettings preferences={preferences} onChange={setPreferences} />}
        </div>

        <div className="fixed inset-x-4 bottom-4 z-30 mx-auto flex flex-col 2xs:flex-row max-w-5xl items-center justify-between gap-4 rounded-3xl bg-finn-black p-3 pl-5 text-white shadow-xl sm:inset-x-6 lg:inset-x-10">
          <div>
            <p className="text-sm font-black">{saved ? "Saved." : "Settings are local to this extension."}</p>
            <p className="text-[10px] text-white/55">Changes affect future recommendations.</p>
          </div>
          <button type="button" onClick={save} className="inline-flex items-center gap-2 rounded-full bg-finn-accent-blue px-5 py-3 text-xs font-black text-white">
            <CheckIcon className="h-4 w-4" />
            Save changes
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
        description="This resets priorities, features, profiles, the default profile, and driving assumptions to FINN Lens's factory configuration. Any custom priorities, profiles, or edits you've made will be lost. This can't be undone."
      />
    </main>
  );
}