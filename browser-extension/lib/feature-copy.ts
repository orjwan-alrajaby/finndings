import type { FeatureImportance } from "./reasoning-engine/types";
import type { FitFeature, FitPriority } from "./reasoning-engine/fit";
import type { RowTone } from "./row-tone";

import {
  DEFAULT_FEATURE_IMPORTANCE,
  FEATURE_IMPORTANCE,
  IMPORTANCE_LEVELS,
} from "./reasoning-engine/constants";

/**
 * What the car has and hasn't in one priority, in the five groups that answer
 * five different questions.
 *
 * The grouping used to be written out twice — once in the in-page panel and
 * once in the pinned car's card — with the same five titles typed in both
 * places and a different colour scheme either side. Two surfaces describing
 * one audit, free to drift on which question they were answering.
 *
 * The order is the order a reader cares about: what they asked for and got,
 * what they asked for and didn't, what else counted either way, and last what
 * FINN never said.
 */

/**
 * What a chip is saying about its feature.
 *
 * `rivalOnly` says "this counted, but you never singled it out". It sits on
 * the white ground of a group's row, where the group's own edge has already
 * said whether the car has the thing.
 *
 * The three levels are for chips already filed under a heading naming their
 * level: there the chip's colour is the reader's own answer about this
 * feature, in the same three hues the picker gave them — rose, orange, emerald
 * — rather than a fourth thing to learn.
 */
export type FeatureChipTone = "present" | "missing" | "rivalOnly" | FeatureImportance;

export const FEATURE_CHIP_TONE: Record<FeatureChipTone, string> = {
  present: "bg-finn-pale-blue text-finn-highlight-navy",
  missing: "bg-finn-warning/15 text-finn-warning-deep",
  rivalOnly: "bg-finn-cotton text-finn-iron",
  high: FEATURE_IMPORTANCE.high.chipClass,
  medium: FEATURE_IMPORTANCE.medium.chipClass,
  low: FEATURE_IMPORTANCE.low.chipClass,
};

/**
 * One level of influence, and the picks the reader gave it.
 *
 * A group of things the car hasn't got is not a flat list: the reader said
 * some of them should count about four times as much as a feature left on
 * standard and others about twice, and which is which is the difference
 * between a reason to keep looking and a shrug. The level was on each chip as
 * a coloured dot, which asks the reader to decode five dots rather than read
 * three headings.
 */
export interface InfluenceBand {
  level: FeatureImportance;
  /** "Highly influential" — the level as the picker names it. */
  title: string;
  /** What the level actually does to the result, behind the heading's "i". */
  meaning: string;
  /**
   * The heading's ink: the level's own accent, so the title and the chips
   * under it are plainly one thing rather than a grey label over a colour.
   */
  accent: string;
  features: FitFeature[];
}

/**
 * The reader's picks under the level they gave each one, strongest first.
 *
 * A pick always carries a level — the picker applies the default the moment
 * one is made — so the fallback here is that same default rather than a fourth
 * heading for features that have somehow lost theirs.
 */
export function byInfluence(features: FitFeature[]): InfluenceBand[] {
  return IMPORTANCE_LEVELS.map((level) => {
    const step = FEATURE_IMPORTANCE[level];

    return {
      level,
      title: step.badgeLabel,
      meaning: step.meaning,
      accent: step.accentTextClass,
      features: features.filter(
        (feature) => (feature.importance ?? DEFAULT_FEATURE_IMPORTANCE) === level,
      ),
    };
  }).filter((band) => band.features.length > 0);
}

export interface FeatureGroup {
  id: "pickedPresent" | "pickedAbsent" | "present" | "absent" | "unknown";
  /** The question this group answers, as a sentence about the reader. */
  title: string;
  features: FitFeature[];
  /**
   * The row's edge. Blue for a pick the car meets, red for one it misses,
   * green for equipment that counted anyway, grey for the rest. Red because a
   * missed pick is the one thing here the reader told us mattered and the car
   * doesn't give them.
   */
  tone: RowTone;
  /** How the chips inside it are drawn. */
  chip: FeatureChipTone;
  /** Whether the car lacks these, which strikes the chip's label through. */
  struck: boolean;
  /**
   * The features under the level the reader gave them, for the two groups
   * that are made of their picks. Null for the other three, where nothing was
   * picked and so no level was ever stated.
   */
  bands: InfluenceBand[] | null;
}

export function featureGroupsOf(priority: FitPriority): FeatureGroup[] {
  const has = (feature: FitFeature) => feature.state === "present";
  const hasnt = (feature: FitFeature) => feature.state === "absent";
  const unknown = (feature: FitFeature) => feature.state === "unknown";

  const asked = priority.picked;
  const rest = priority.alsoCounted;

  const groups: FeatureGroup[] = [
    {
      id: "pickedPresent",
      title: "You gave extra influence, and it has",
      features: asked.filter(has),
      tone: "info",
      chip: "present",
      struck: false,
      bands: byInfluence(asked.filter(has)),
    },
    {
      id: "pickedAbsent",
      title: "You gave extra influence, but it doesn't have",
      features: asked.filter(hasnt),
      tone: "error",
      chip: "missing",
      struck: true,
      bands: byInfluence(asked.filter(hasnt)),
    },
    {
      id: "present",
      title: asked.length ? "Also counted here, and it has" : "It has",
      features: rest.filter(has),
      tone: "success",
      chip: "rivalOnly",
      struck: false,
      bands: null,
    },
    {
      /*
       * A gap in equipment nobody asked for is a fact, not a problem: struck
       * through so the answer is legible, but never coloured like a missed
       * pick two rows above it.
       */
      id: "absent",
      title: asked.length ? "Also counted here, but it doesn't have" : "It doesn't have",
      features: rest.filter(hasnt),
      tone: "neutral",
      chip: "rivalOnly",
      struck: true,
      bands: null,
    },
    {
      id: "unknown",
      title: "FINN didn't say either way",
      features: [...asked, ...rest].filter(unknown),
      tone: "neutral",
      chip: "rivalOnly",
      struck: false,
      bands: null,
    },
  ];

  return groups.filter((group) => group.features.length > 0);
}
