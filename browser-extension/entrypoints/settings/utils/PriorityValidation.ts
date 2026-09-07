import {
  MAX_FEATURES_PER_CATEGORY,
  NUMERIC_ONLY_CATEGORIES,
  PROFILE_PRIORITY_COUNT,
} from "@/lib/reasoning-engine/constants";
import type {
  CategoryId,
  FeatureSelection,
  PriorityDefinition,
  Profile,
} from "@/lib/reasoning-engine/types";

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

/**
 * The feature-selection rule, written down.
 *
 * There is only one: a cap on how many features the user may single out.
 * Picking none is deliberately valid — the category is then judged on its
 * whole catalogue rather than abstaining — so there is no floor to enforce.
 *
 * Nothing calls this in the UI any more, and that is not an oversight. The
 * cap used to be checked after the fact and reported as an error under the
 * editor; it is now enforced where the selection is made — the picker greys
 * out the sixth and `PriorityEditor` refuses it — because a control that
 * allows a choice it will then reject is worse than one that never offers
 * it. This stays as the single statement of the rule, and its test is what
 * keeps the two enforcement points honest about what the rule is.
 */
export function validatePriorityDraft(features: FeatureSelection, id: CategoryId): string | null {
  if (isNumericOnlyPriority(id)) return null;
  if (features.length > MAX_FEATURES_PER_CATEGORY) return `You can pick out at most ${MAX_FEATURES_PER_CATEGORY} features here.`;
  return null;
}
