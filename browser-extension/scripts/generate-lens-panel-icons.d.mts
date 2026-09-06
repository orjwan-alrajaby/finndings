/**
 * Types for the icon generator, which is plain ESM so it can be run with
 * `node` without a build step. Only the pieces `icons.test.ts` imports are
 * declared — the script's own entry point is a side effect, not an export.
 */
export type IconShape = [string, Record<string, string>];
export type IconNode = IconShape[];

export const PANEL_ICON_NAMES: string[];
export function readIconNode(name: string, base?: string): IconNode;
export function buildTable(
    names?: string[],
    base?: string,
): Record<string, IconNode>;
