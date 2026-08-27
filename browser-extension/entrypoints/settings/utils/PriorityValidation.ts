import {
  CATEGORY_IDS,
  MAX_FEATURES_PER_CATEGORY,
  MIN_FEATURES_PER_CATEGORY,
  NUMERIC_ONLY_CATEGORIES,
  PROFILE_PRIORITY_COUNT,
} from "@/lib/reasoning-engine/constants";
import type {
  CategoryId,
  FeatureWeight,
  PriorityDefinition,
  Profile,
} from "@/lib/reasoning-engine/types";

export function isBuiltInPriority(id: CategoryId): boolean {
  return CATEGORY_IDS.includes(id);
}

export function isNumericOnlyPriority(id: CategoryId): boolean {
  return NUMERIC_ONLY_CATEGORIES.includes(id);
}

/**
 * Human-readable problems with a profile, given the current priority roster.
 *
 * Profiles themselves are fixed product configuration, so the only way one can
 * go wrong is a priority the user has switched off underneath it. Empty means
 * healthy.
 */
export function getProfileIssues(profile: Profile, priorityDefinitions: PriorityDefinition[]): string[] {
  const issues: string[] = [];

  if (profile.priorities.length !== PROFILE_PRIORITY_COUNT) {
    issues.push(`Has ${profile.priorities.length} priorities — every profile carries ${PROFILE_PRIORITY_COUNT}.`);
  }

  for (const id of profile.priorities) {
    const def = priorityDefinitions.find((p) => p.id === id);
    if (!def) issues.push(`Uses a priority that no longer exists.`);
    else if (!def.enabled) issues.push(`Uses the disabled "${def.label}" priority.`);
  }
  return issues;
}

/** Every profile that references the given priority id, in its own order or not. */
export function getAffectedProfiles(priorityId: CategoryId, profiles: Profile[]): Profile[] {
  return profiles.filter((p) => p.priorities.includes(priorityId));
}

/**
 * The feature-selection rules, in one place.
 *
 * At least one feature must stay on for any priority that scores from
 * features — with none enabled the engine has no way to tell two cars apart,
 * and the priority silently stops meaning anything. Five is the ceiling.
 */
export function validatePriorityDraft(features: FeatureWeight[], id: CategoryId): string | null {
  if (isNumericOnlyPriority(id)) return null;
  if (features.length < MIN_FEATURES_PER_CATEGORY) return "Keep at least one feature enabled — otherwise this priority can't tell two cars apart.";
  if (features.length > MAX_FEATURES_PER_CATEGORY) return `A priority can have at most ${MAX_FEATURES_PER_CATEGORY} features enabled.`;
  return null;
}

export function slugify(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "priority";
}

export function generateId(prefix: string, existingIds: string[]): string {
  const base = `${prefix}-${Date.now().toString(36)}`;
  if (!existingIds.includes(base)) return base;
  let n = 1;
  while (existingIds.includes(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}