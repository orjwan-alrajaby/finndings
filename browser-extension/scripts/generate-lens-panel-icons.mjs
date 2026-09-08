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
 * has drifted from the installed package. That turns a silent divergence into
 * a red test on the next `npm update`.
 *
 * Run with: node scripts/generate-lens-panel-icons.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The icons the panel draws: the name the data uses, and the lucide module
 * it resolves to. The left side is what `CATEGORIES[id].icon` holds and what
 * `PriorityIcon` keys on, so the two surfaces stay addressable by one name.
 */
export const PANEL_ICONS = {
  /* Priority marks — the seven categories, plus the fallback for a custom one.
     These are filled in the panel, so they are the shapes that survive a fill;
     see `components/PriorityIcon` for why briefcase and navigation stand in
     for backpack and compass. */
  shield: "shield-check",
  users: "users",
  backpack: "briefcase",
  road: "car-front",
  snowflake: "snowflake",
  leaf: "leaf",
  sofa: "sofa",
  car: "car",
  /* Profile marks that aren't also categories. */
  compass: "navigation",
  scale: "scale",
  /* The panel's own furniture. Drawn as outlines, like every other control. */
  info: "info",
  "chevron-down": "chevron-down",
  x: "x",
  /* Pinning, on both controls that do it: the panel's button and the circle
     on each card. Outline is the offer, and the same shape filled is the
     state — see `pinControl`. It replaced a plus and a tick, which said
     "add"/"done" about an action whose whole vocabulary elsewhere in the
     product is pinning. */
  pin: "pin",
};

export const PANEL_ICON_NAMES = Object.keys(PANEL_ICONS);

/**
 * React spells SVG attributes in camelCase; `setAttribute` does not.
 *
 * The panel builds these through the DOM, so `strokeLinecap` has to become
 * `stroke-linecap` on the way in or the browser silently ignores it and the
 * strokes come out square.
 */
function kebab(name) {
  return name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

/** Reads one icon's shapes out of the installed package, dropping React keys. */
export function readIconNode(fileName, base = root) {
  const file = join(
    base,
    "node_modules/lucide-react/dist/esm/icons",
    `${fileName}.mjs`,
  );
  const source = readFileSync(file, "utf8");
  /* Non-greedy to the first `];`, which is the literal's own end: an inner
     shape closes with `]` followed by a comma or a newline, never a
     semicolon. Matches both the one-line and the wrapped module layouts. */
  const match = source.match(/const __iconNode = (\[[\s\S]*?\]);/);

  if (!match) throw new Error(`no icon literal in ${file}`);

  /* The module is a literal, so evaluating it is reading it. */
  const node = new Function(`return ${match[1]}`)();

  return node.map(([tag, attrs]) => {
    const out = {};
    for (const [attr, value] of Object.entries(attrs)) {
      if (attr === "key") continue;
      out[kebab(attr)] = String(value);
    }
    return [tag, out];
  });
}

export function buildTable(icons = PANEL_ICONS, base = root) {
  return Object.fromEntries(
    Object.entries(icons).map(([name, exportName]) => [
      name,
      readIconNode(exportName, base),
    ]),
  );
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

writeFileSync(
  join(root, "entrypoints/content/lens-panel/icons.ts"),
  `${HEADER}${JSON.stringify(table, null, 2)};\n`,
  "utf8",
);

console.log(`wrote ${Object.keys(table).length} icons`);
