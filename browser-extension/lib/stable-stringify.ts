/**
 * A value as one string that depends on the value and not on how it was built.
 *
 * Two objects holding identical data serialise differently under
 * `JSON.stringify` if their keys were inserted in a different order — and
 * they routinely are: `loadLensSettings` assembles settings in one order, the
 * settings page's own state in another, and a draft in a drawer in a third.
 * Comparing those directly reports every freshly loaded page as unsaved.
 *
 * So record keys are sorted on the way out and array order is kept, which is
 * the distinction that matters here: the order of a priority list is one of
 * the answers, and the order `preferences` happened to be spread in is not.
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(normalise(value));
}

function normalise(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalise);

  if (value === null || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => [key, normalise((value as Record<string, unknown>)[key])]),
  );
}
