/**
 * Regenerates `entrypoints/content/lens-panel/icons.ts` from hugeicons.
 *
 * The panel injected into finn.com is not React, so it cannot use the
 * `HugeiconsIcon` component the rest of the app does. It needs the raw shapes.
 * Those live in @hugeicons/core-free-icons' per-icon modules, which the
 * package exposes but which carry no runtime guarantee of layout — importing
 * them directly would tie the build to a file arrangement nobody promised.
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
 * The icons the panel draws: the name the data uses, and the hugeicons export
 * it resolves to. The left side is what `CATEGORIES[id].icon` holds and what
 * `PriorityIcon` keys on, so the two surfaces stay addressable by one name.
 */
export const PANEL_ICONS = {
  /* Priority marks — the seven categories, plus the fallback for a custom one. */
  shield: "ShieldCheckIcon",
  users: "UserGroupIcon",
  backpack: "Backpack01Icon",
  road: "CarFrontIcon",
  snowflake: "SnowflakeIcon",
  leaf: "Leaf01Icon",
  sofa: "Sofa01Icon",
  car: "Car01Icon",
  /* Profile marks that aren't also categories. */
  compass: "CompassIcon",
  scale: "ScaleIcon",
  /* The panel's own furniture. */
  info: "InformationCircleIcon",
  "chevron-down": "ChevronDownIcon",
  search: "Search01Icon",
  x: "Cancel01Icon",
  check: "CheckIcon",
  plus: "PlusSignIcon",
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
export function readIconNode(exportName, base = root) {
  const file = join(
    base,
    "node_modules/@hugeicons/core-free-icons/dist/esm",
    `${exportName}.js`,
  );
  const source = readFileSync(file, "utf8");
  const match = source.match(/^const \w+ = (\[[\s\S]*?\n\]);$/m);

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
 * installed @hugeicons/core-free-icons, and see that script for why the shapes
 * are copied here rather than imported. \`icons.test.ts\` fails if the two
 * disagree.
 *
 * Icons are hugeicons (MIT). https://hugeicons.com
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
