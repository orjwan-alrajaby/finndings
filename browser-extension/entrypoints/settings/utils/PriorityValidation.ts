import {
  CATEGORY_IDS,
  NUMERIC_ONLY_CATEGORIES,
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

/** Human-readable problems with a single profile, given the current priority roster. Empty = healthy. */
export function getProfileIssues(profile: Profile, priorityDefinitions: PriorityDefinition[]): string[] {
  const issues: string[] = [];
  if (profile.priorities.length < 3) issues.push(`Only ${profile.priorities.length} of the required 3–5 priorities selected.`);
  if (profile.priorities.length > 5) issues.push(`Has ${profile.priorities.length} priorities — the limit is 5.`);

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

export function validatePriorityDraft(features: FeatureWeight[], id: CategoryId): string | null {
  if (!isNumericOnlyPriority(id) && features.length === 0) return "Add at least one feature.";
  if (features.length > 5) return "A priority can have at most 5 features.";
  return null;
}

export function validateProfileDraft(order: CategoryId[]): string | null {
  if (order.length < 3) return "Select at least 3 priorities.";
  if (order.length > 5) return "Select at most 5 priorities.";
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