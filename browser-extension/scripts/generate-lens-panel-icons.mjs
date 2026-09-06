/**
 * Regenerates `entrypoints/content/lens-panel/icons.ts` from lucide-react.
 *
 * The panel injected into finn.com is not React, so it cannot use the icon
 * components the rest of the app does. It needs the raw shapes. Those live in
 * lucide-react's per-icon modules, which are internal to the package and carry
 * no types — importing them at runtime would tie the build to a file layout
 * the package makes no promise about.
 *
 * So the shapes are copied into the repo instead, by this script, and
 * `icons.test.ts` re-runs the same derivation and fails if the committed copy
 * has drifted from the installed lucide. That turns a silent divergence into a
 * red test on the next `npm update`.
 *
 * Run with: node scripts/generate-lens-panel-icons.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** The icons the panel draws, by their lucide name. */
export const PANEL_ICON_NAMES = [
  /* Priority marks — the seven categories, plus the fallback for a custom one. */
  "shield",
  "users",
  "backpack",
  "route",
  "snowflake",
  "leaf",
  "sofa",
  "car",
  /* Profile marks that aren't also categories. */
  "compass",
  "scale",
  /* The panel's own furniture. */
  "info",
  "chevron-down",
  "search",
  "x",
  "check",
  "plus",
];

/** Reads one icon's shapes out of the installed package, dropping React keys. */
export function readIconNode(name, base = root) {
  const file = join(
    base,
    "node_modules/lucide-react/dist/esm/icons",
    `${name}.mjs`,
  );
  const source = readFileSync(file, "utf8");
  /* Non-greedy to the first `];`, which is the literal's own end: an inner
     shape closes with `]` followed by a comma or a newline, never a
     semicolon. Matches both the one-line and the wrapped module layouts. */
  const match = source.match(/const __iconNode = (\[[\s\S]*?\]);/);

  if (!match) throw new Error(`no __iconNode in ${file}`);

  /* The module is a literal, so evaluating it is reading it. */
  const node = new Function(`return ${match[1]}`)();

  return node.map(([tag, attrs]) => {
    const { key, ...rest } = attrs;
    return [tag, rest];
  });
}

export function buildTable(names = PANEL_ICON_NAMES, base = root) {
  return Object.fromEntries(names.map((n) => [n, readIconNode(n, base)]));
}

const HEADER = `/*
 * GENERATED — do not edit by hand.
 *
 * Run \`node scripts/generate-lens-panel-icons.mjs\` to rebuild this from the
 * installed lucide-react, and see that script for why the shapes are copied
 * here rather than imported. \`icons.test.ts\` fails if the two disagree.
 *
 * Icons are lucide (ISC). https://lucide.dev
 */

/** One drawn shape: an SVG tag and the attributes that describe it. */
export type IconShape = [string, Record<string, string>];

export type IconNode = IconShape[];

export const LENS_PANEL_ICONS: Record<string, IconNode> = `;

const table = buildTable();
const body = JSON.stringify(table, null, 2);

writeFileSync(
  join(root, "entrypoints/content/lens-panel/icons.ts"),
  `${HEADER}${body};\n`,
  "utf8",
);

console.log(`wrote ${Object.keys(table).length} icons`);
