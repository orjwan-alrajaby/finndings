import type { FitFeature, FitPriority } from "./reasoning-engine/fit";
import type { FeatureFact, StandardFact } from "./reasoning-engine/narrative/types";
import type { FeatureId } from "./reasoning-engine/types";




/* -------------------------------------------------------------------------- */
/* The feature table                                                          */
/* -------------------------------------------------------------------------- */

/** What FINN's list says about one item on one car. */
export type ItemState = "listed" | "unlisted" | "unknown";

/**
 * How each state looks, everywhere an item is drawn.
 *
 * Colour means one thing in this table: what FINN lists. Green with a tick
 * for listed, rose with a cross for not listed, a dashed grey outline with a
 * question mark where FINN didn't say. It used to mean the level the reader
 * raised an item to, so a missing "somewhat" item was drawn green and struck
 * through — the colour of good news on a gap. The level is a small badge now.
 */
export const ITEM_STATE: Record<
  ItemState,
  {
    label: string;
    icon: "circle-check" | "circle-x" | "circle-question-mark";
    /** The icon's colour on a chip: the state, readable in any section. */
    iconInk: string;
    /** The chip's label colour: a gap reads as one before its icon is seen. */
    labelInk: string;
    bar: string;
    ink: string;
  }
> = {
  listed: {
    label: "Listed",
    icon: "circle-check",
    iconInk: "text-emerald-600",
    labelInk: "text-finn-black",
    bar: "bg-finn-success",
    ink: "text-finn-influence-emerald",
  },
  unlisted: {
    label: "Not listed",
    icon: "circle-x",
    iconInk: "text-rose-600",
    labelInk: "text-rose-800",
    bar: "bg-finn-error",
    ink: "text-finn-influence-red",
  },
  unknown: {
    label: "FINN didn't say",
    icon: "circle-question-mark",
    iconInk: "text-finn-iron",
    labelInk: "text-finn-iron",
    bar: "bg-finn-iron/30",
    ink: "text-finn-iron",
  },
};

/** The colour of a section, which says what kind of items it holds. */
export type SectionPalette = "gold" | "green" | "red" | "blue" | "grey";

/**
 * Each section on its own tinted card: gold for what the reader raised, green
 * for other counted items the car lists, red for those it doesn't, blue for
 * standard equipment. Chips are white on every card, so their icon — a tick
 * or a cross — carries the state inside the two mixed sections.
 */
export const SECTION_LOOK: Record<
  SectionPalette,
  { card: string; title: string; tally: string; chip: string }
> = {
  gold: {
    card: "bg-amber-50 ring-1 ring-amber-300",
    title: "text-amber-900",
    tally: "text-amber-800",
    chip: "ring-amber-200",
  },
  green: {
    card: "bg-emerald-50 ring-1 ring-emerald-300",
    title: "text-emerald-900",
    tally: "text-emerald-800",
    chip: "ring-emerald-200",
  },
  red: {
    card: "bg-rose-50 ring-1 ring-rose-300",
    title: "text-rose-900",
    tally: "text-rose-800",
    chip: "ring-rose-200",
  },
  blue: {
    card: "bg-blue-50 ring-1 ring-blue-300",
    title: "text-blue-900",
    tally: "text-blue-800",
    chip: "ring-blue-200",
  },
  grey: {
    card: "bg-finn-snow ring-1 ring-black/10",
    title: "text-finn-black",
    tally: "text-finn-iron",
    chip: "ring-black/10",
  },
};

export interface TableItem {
  fact: FeatureFact;
  state: ItemState;
}

export interface Tally {
  listed: number;
  unlisted: number;
  unknown: number;
}

export interface FeatureTableGroup {
  id: "raised" | "countedListed" | "countedUnlisted" | "countedUnknown" | "standard";
  title: string;
  /** "2 of 3 listed" for a mixed section; the count for a single-state one. */
  tallyLabel: string;
  tally: Tally;
  palette: SectionPalette;
  items: TableItem[];
  /** Behind the row's "i": where "standard" comes from. Standard equipment only. */
  info: StandardInfo | null;
}

export interface FeatureTable {
  tally: Tally;
  /** "5 listed · 3 not listed · 1 FINN didn't say", skipping any that are zero. */
  summary: string;
  /** The same, one part per state, so each count can wear its state's colour. */
  summaryParts: { state: ItemState; text: string }[];
  groups: FeatureTableGroup[];
}

const STATE_ORDER: ItemState[] = ["listed", "unlisted", "unknown"];
const LEVEL_ORDER = ["high", "medium", "low"] as const;

const tallyOf = (items: TableItem[]): Tally => ({
  listed: items.filter((item) => item.state === "listed").length,
  unlisted: items.filter((item) => item.state === "unlisted").length,
  unknown: items.filter((item) => item.state === "unknown").length,
});

const tallyLabelOf = (tally: Tally): string => {
  const known = tally.listed + tally.unlisted;
  const base = known ? `${tally.listed} of ${known} listed` : "Not in FINN's list";

  return tally.unknown && known ? `${base} · ${tally.unknown} unknown` : base;
};

/** Listed first, then gaps, then unknowns; within each, the strongest raise first. */
const sorted = (items: TableItem[]): TableItem[] =>
  [...items].sort(
    (a, b) =>
      STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state) ||
      LEVEL_ORDER.indexOf(a.fact.importance ?? "low") - LEVEL_ORDER.indexOf(b.fact.importance ?? "low"),
  );

const fromFit = (feature: FitFeature): TableItem => ({
  fact: feature,
  state: feature.state === "present" ? "listed" : feature.state === "absent" ? "unlisted" : "unknown",
});

export interface FeatureTableInput {
  picked: TableItem[];
  counted: TableItem[];
  standard: StandardFact[];
}

/** The input for a car judged on its own, as the fit panel and the pinned card read it. */
export function tableInputOf(priority: FitPriority): FeatureTableInput {
  return {
    picked: priority.picked.map(fromFit),
    counted: priority.alsoCounted.map(fromFit),
    standard: priority.standard,
  };
}

/**
 * One priority's equipment as coloured sections under one summary: what you
 * raised (gold), other counted items the car lists (green) and doesn't (red),
 * and its standard equipment (blue). An unknown counted item, which is rare,
 * gets a grey section of its own rather than a colour that would claim an
 * answer.
 */
export function featureTableOf(input: FeatureTableInput): FeatureTable | null {
  const raised = sorted(input.picked);
  const counted = sorted(input.counted);
  /* A standard item the reader raised is said once, under what they raised. */
  const raisedKeys = new Set(raised.map((item) => item.fact.key));
  const standardFacts = input.standard.filter((fact) => !raisedKeys.has(fact.key));
  const standard = sorted(standardFacts.map((fact) => ({ fact, state: fact.state })));

  const group = (
    id: FeatureTableGroup["id"],
    title: string,
    palette: SectionPalette,
    items: TableItem[],
    mixed: boolean,
    info: StandardInfo | null = null,
  ): FeatureTableGroup | null => {
    if (!items.length) return null;

    const tally = tallyOf(items);

    return {
      id,
      title,
      tallyLabel: mixed ? tallyLabelOf(tally) : String(items.length),
      tally,
      palette,
      items,
      info,
    };
  };

  const countedIn = (state: ItemState) => counted.filter((item) => item.state === state);

  const groups = [
    group("raised", "You raised", "gold", raised, true),
    group("countedListed", "Also counted · listed", "green", countedIn("listed"), false),
    group("countedUnlisted", "Also counted · not listed", "red", countedIn("unlisted"), false),
    group("countedUnknown", "Also counted · FINN didn't say", "grey", countedIn("unknown"), false),
    group(
      "standard",
      "Standard equipment",
      "blue",
      standard,
      true,
      standardInfoOf(standardFacts.map((fact) => fact.key as FeatureId)),
    ),
  ].filter((item): item is FeatureTableGroup => item != null);

  if (!groups.length) return null;

  const all = groups.flatMap((item) => item.items);
  const tally = tallyOf(all);

  const summaryParts = (
    [
      ["listed", `${tally.listed} listed`],
      ["unlisted", `${tally.unlisted} not listed`],
      ["unknown", `${tally.unknown} FINN didn't say`],
    ] as const
  )
    .filter(([state]) => tally[state] > 0)
    .map(([state, text]) => ({ state, text }));

  return {
    tally,
    summary: summaryParts.map((part) => part.text).join(" · "),
    summaryParts,
    groups,
  };
}

/* -------------------------------------------------------------------------- */
/* Standard equipment                                                         */
/* -------------------------------------------------------------------------- */

/** A law the "i" cites, numbered in the order it's first needed. */
export interface StandardReference {
  label: string;
  url: string;
}

export interface StandardInfo {
  title: string;
  /** One or two sentences, with superscript marks where laws are cited. */
  body: string;
  references: StandardReference[];
}

const GENERAL_SAFETY: StandardReference = {
  label: "EU General Safety Regulation (EU) 2019/2144",
  url: "https://eur-lex.europa.eu/eli/reg/2019/2144/oj",
};

/*
 * Only what the regulations actually require, in the form FINN names it.
 * Everything else is standard because nearly every car on finn.com has it,
 * and the "i" says only that.
 */
const EU_LAW: Partial<Record<FeatureId, StandardReference>> = {
  hasEmergencyBrakingAssist: GENERAL_SAFETY,
  hasLaneKeepingAssist: GENERAL_SAFETY,
  hasTirePressureMonitoringSystem: {
    label: "EU vehicle safety Regulation (EC) No 661/2009",
    url: "https://eur-lex.europa.eu/eli/reg/2009/661/oj",
  },
  hasEmergencyCallSystem: {
    label: "EU eCall Regulation (EU) 2015/758",
    url: "https://eur-lex.europa.eu/eli/reg/2015/758/oj",
  },
};

const SUPERSCRIPT = ["¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];

/**
 * Where "standard" comes from, in a sentence: what a modern car should have,
 * required by EU law where it is (cited), and what nearly every car on
 * finn.com comes with. No figures — the reader needs the source, not the
 * arithmetic.
 */
export function standardInfoOf(keys: readonly FeatureId[]): StandardInfo {
  const references: StandardReference[] = [];

  for (const key of keys) {
    const law = EU_LAW[key];
    if (law && !references.includes(law)) references.push(law);
  }

  const marks = references.map((_, index) => SUPERSCRIPT[index] ?? `(${index + 1})`).join("");

  return {
    title: "Standard equipment",
    body: references.length
      ? `What a modern car should have. EU law requires some of it on new cars${marks}, and nearly every car on finn.com comes with it.`
      : "What a modern car should have — nearly every car on finn.com comes with it.",
    references,
  };
}

