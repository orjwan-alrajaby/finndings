import type {
  FitAnalysis,
  FitFeature,
  FitLevel,
  FitPriority,
} from "@/lib/reasoning-engine/fit";
import type { CostLine } from "@/lib/reasoning-engine/types";
import type { Tradeoff } from "@/lib/reasoning-engine/narrative/types";

import { describeFit } from "@/lib/reasoning-engine/fit";
import { formatEUR, formatKm } from "@/lib/reasoning-engine";

import { el, fragment } from "./dom";

/**
 * The analysis, drawn.
 *
 * Every string on the page comes out of the reasoning engine or off the car.
 * Nothing here decides anything: if a sentence isn't in `analysis`, it isn't
 * on the panel. That is deliberate — the moment this file starts writing its
 * own copy is the moment the panel can say something the engine can't back up.
 *
 * The order is the order a reader asks the questions in: how well does it fit,
 * why, what about each thing I said I cared about, did I get the features I
 * asked for, what does it cost, and what am I accepting.
 */

/* -------------------------------------------------------------------------- */
/* Shared parts                                                               */
/* -------------------------------------------------------------------------- */

/**
 * How full the band is, as four segments.
 *
 * A band is a summary of a score the reader is deliberately never shown, so
 * the indicator has to read as "how much of this" without reading as a mark
 * out of ten. Four segments in one colour do that; a number or a coloured
 * grade would not.
 */
const SEGMENTS: Record<FitLevel, number> = {
  strong: 4,
  good: 3,
  partial: 2,
  limited: 1,
  unknown: 0,
};

function meter(level: FitLevel): HTMLElement {
  const filled = SEGMENTS[level];

  return el(
    "span",
    {
      class: "inline-flex items-center gap-[3px]",
      attrs: { "aria-hidden": "true" },
    },
    [0, 1, 2, 3].map((index) =>
      el("span", {
        class: [
          "block h-3 w-[3px] rounded-full",
          index < filled ? "bg-finn-accent-blue" : "bg-finn-accent-blue/20",
        ].join(" "),
      }),
    ),
  );
}

function bandChip(level: FitLevel, label: string): HTMLElement {
  const tone =
    level === "unknown"
      ? "bg-finn-cotton text-finn-iron"
      : "bg-finn-pale-blue text-finn-highlight-navy";

  return el(
    "span",
    {
      class: [
        "inline-flex items-center gap-2 rounded-full px-2.5 py-1",
        "text-[11px] font-bold whitespace-nowrap",
        tone,
      ].join(" "),
    },
    [meter(level), el("span", { text: label })],
  );
}

function sectionHeading(text: string): HTMLElement {
  return el("h3", {
    class: "text-[11px] font-black uppercase tracking-[0.14em] text-finn-iron",
    text,
  });
}

function section(title: string, ...children: (Node | null)[]): HTMLElement {
  return el(
    "section",
    { class: "border-t border-finn-cotton px-5 py-4" },
    [sectionHeading(title), ...children],
  );
}

/** A short line of plain prose, as the engine wrote it. */
function prose(text: string, tone = "text-finn-black"): HTMLElement {
  return el("p", { class: `text-[13px] leading-5 ${tone}`, text });
}

/* -------------------------------------------------------------------------- */
/* 1. Overall fit                                                             */
/* -------------------------------------------------------------------------- */

export function fitHeader(analysis: FitAnalysis): HTMLElement {
  const { vehicle } = analysis;

  const subtitle = [vehicle.trim, vehicle.equipmentLine, vehicle.engine]
    .filter(Boolean)
    .join(" · ");

  return el("header", { class: "px-5 pb-4 pt-1" }, [
    el("p", {
      class: "text-lg font-black leading-6 text-finn-black",
      text: vehicle.name,
    }),

    subtitle
      ? el("p", {
          class: "mt-0.5 text-xs leading-4 text-finn-iron",
          text: subtitle,
        })
      : null,

    el("div", { class: "mt-3 flex items-center gap-2" }, [
      bandChip(analysis.overall.level, analysis.overall.label),
    ]),

    el("p", {
      class: "mt-2.5 text-[13px] leading-5 text-finn-black",
      text: describeFit(analysis),
    }),

    /*
     * Requirement, not decoration. The same car opened by somebody else gets a
     * different word, and a panel that says "Strong match" without saying what
     * it is a match *with* invites being read as a verdict on the car.
     */
    el("p", {
      class: "mt-2 text-[11px] leading-4 text-finn-iron",
      text:
        "Measured against your saved Lens settings — your priorities, their order, and the features you picked out. Someone with different settings would see a different answer.",
    }),
  ]);
}

/* -------------------------------------------------------------------------- */
/* 2. Why it fits                                                             */
/* -------------------------------------------------------------------------- */

export function strengthsSection(analysis: FitAnalysis): HTMLElement | null {
  if (!analysis.strengths.length) return null;

  return section(
    "Why it fits",
    el(
      "ul",
      { class: "mt-2 flex flex-col gap-2" },
      analysis.strengths.map((reason) =>
        el("li", { class: "flex gap-2" }, [
          el("span", {
            class: "mt-[7px] block h-1.5 w-1.5 shrink-0 rounded-full bg-finn-accent-blue",
            attrs: { "aria-hidden": "true" },
          }),
          prose(reason),
        ]),
      ),
    ),
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Priority by priority                                                    */
/* -------------------------------------------------------------------------- */

/**
 * One priority, closed by default and openable.
 *
 * Closed it answers the only question a reader scanning has: how does this car
 * do on the thing I put third? Open it shows the evidence that produced the
 * answer — which features, which figures — because a band nobody can check is
 * just an opinion with a colour.
 */
function priorityRow(priority: FitPriority): HTMLElement {
  const body = el("div", { class: "hidden px-3 pb-3" }, [
    ...priority.sentences.map((line) =>
      el("p", {
        class: "mt-2 text-[12px] leading-[18px] text-finn-iron",
        text: line,
      }),
    ),

    priority.picked.length
      ? el(
          "ul",
          { class: "mt-3 flex flex-col gap-1.5" },
          priority.picked.map(featureRow),
        )
      : null,

    priority.measurements.length
      ? el(
          "dl",
          { class: "mt-3 flex flex-wrap gap-x-4 gap-y-1" },
          priority.measurements.flatMap((fact) => [
            el("dt", {
              class: "text-[11px] text-finn-iron",
              text: `${fact.label}:`,
            }),
            el("dd", {
              class: "text-[11px] font-bold text-finn-black",
              text: fact.display,
            }),
          ]),
        )
      : null,

    !priority.hasEvidence
      ? el("p", {
          class: "mt-2 text-[12px] leading-[18px] text-finn-iron",
          text: "FINN's data doesn't carry anything we can judge this priority on for this car.",
        })
      : null,
  ]);

  const chevron = el("span", {
    class: "text-finn-iron transition-transform duration-150",
    attrs: { "aria-hidden": "true" },
    text: "⌄",
  });

  const button = el(
    "button",
    {
      class: [
        "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left",
        "transition-colors hover:bg-finn-snow",
      ].join(" "),
      attrs: { type: "button", "aria-expanded": "false" },
      on: {
        click: () => {
          const open = body.classList.toggle("hidden");

          button.setAttribute("aria-expanded", String(!open));
          chevron.classList.toggle("rotate-180", !open);
        },
      },
    },
    [
      el("span", {
        class: "w-4 shrink-0 text-[11px] font-black text-finn-iron",
        text: `${priority.rank}`,
      }),

      el("span", {
        class: "shrink-0 text-sm",
        attrs: { "aria-hidden": "true" },
        text: priority.icon,
      }),

      el("span", { class: "min-w-0 flex-1" }, [
        el("span", {
          class: "block truncate text-[13px] font-bold text-finn-black",
          text: priority.label,
        }),
        el("span", {
          class: "block text-[11px] text-finn-iron",
          text: coverageLine(priority),
        }),
      ]),

      bandChip(priority.band.level, priority.band.label),
      chevron,
    ],
  );

  return el("li", { class: "rounded-xl" }, [button, body]);
}

/** The count behind the band, which is the part a reader can check. */
function coverageLine(priority: FitPriority): string {
  if (priority.band.level === "unknown") return "Equipment not listed by FINN";

  const picks = priority.picked.length;

  const held = priority.picked.filter(
    (feature) => feature.state === "present",
  ).length;

  const catalogue = `${priority.covered} of ${priority.catalogueSize} systems it covers`;

  return picks
    ? `${held} of your ${picks} pick${picks === 1 ? "" : "s"} · ${catalogue}`
    : catalogue;
}

export function prioritiesSection(analysis: FitAnalysis): HTMLElement {
  return section(
    "Your priorities, in your order",
    el(
      "ul",
      { class: "mt-2 flex flex-col" },
      analysis.priorities.map(priorityRow),
    ),
  );
}

/* -------------------------------------------------------------------------- */
/* 4. The features they picked out                                            */
/* -------------------------------------------------------------------------- */

const STATE_MARK: Record<FitFeature["state"], string> = {
  present: "✓",
  absent: "✕",
  unknown: "–",
};

const STATE_CLASS: Record<FitFeature["state"], string> = {
  present: "text-finn-influence-emerald",
  absent: "text-finn-iron",
  unknown: "text-finn-iron",
};

const STATE_LABEL: Record<FitFeature["state"], string> = {
  present: "has it",
  absent: "doesn't have it",
  unknown: "not available",
};

function featureRow(feature: FitFeature): HTMLElement {
  return el("li", { class: "flex items-start gap-2" }, [
    el("span", {
      class: `w-3 shrink-0 text-[12px] font-black leading-[18px] ${STATE_CLASS[feature.state]}`,
      attrs: { "aria-hidden": "true" },
      text: STATE_MARK[feature.state],
    }),

    el("span", { class: "min-w-0 flex-1" }, [
      el("span", {
        class: [
          "text-[12px] leading-[18px]",
          feature.state === "present"
            ? "text-finn-black"
            : "text-finn-iron",
        ].join(" "),
        text: feature.label,
      }),

      feature.state === "unknown"
        ? el("span", {
            class: "ml-1.5 text-[11px] text-finn-iron",
            text: "· not available",
          })
        : null,

      /*
       * The influence level is shown only where it changes what the row
       * means: a pick the reader said should count highly, that the car
       * doesn't have, is the row they most need to see.
       */
      feature.state === "absent" && feature.importance === "high"
        ? el("span", {
            class:
              "ml-1.5 rounded-full bg-finn-influence-red-pale px-1.5 py-px text-[10px] font-bold text-finn-influence-red",
            text: "counts highly",
          })
        : null,
    ]),

    el("span", {
      class: "sr-only",
      text: STATE_LABEL[feature.state],
    }),
  ]);
}

export function featuresSection(analysis: FitAnalysis): HTMLElement | null {
  const { present, absent, unknown } = analysis.picked;
  const total = present.length + absent.length + unknown.length;

  if (total === 0) {
    return section(
      "Features you picked out",
      prose(
        "You haven't picked out particular features, so each priority above is judged across everything it covers.",
        "mt-2 text-finn-iron",
      ),
    );
  }

  const summary = unknown.length
    ? "FINN didn't list this car's equipment, so we can't say either way."
    : `This car has ${present.length} of the ${total} you picked out.`;

  return section(
    "Features you picked out",
    prose(summary, "mt-2 text-finn-iron"),
    el(
      "ul",
      { class: "mt-2.5 flex flex-col gap-1.5" },
      [...present, ...absent, ...unknown].map(featureRow),
    ),
    /*
     * Said once, here, where the crosses are. A missing pick is a compromise
     * the reader weighs, and the product's position is that it is never a
     * reason for Lens to rule a car out on their behalf.
     */
    absent.length
      ? prose(
          "A feature this car doesn't have never rules it out — it counts against the fit and shows up below as something to consider.",
          "mt-3 text-[11px] leading-4 text-finn-iron",
        )
      : null,
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Cost                                                                    */
/* -------------------------------------------------------------------------- */

const SOURCE_LABEL: Record<CostLine["source"], string> = {
  finn: "FINN charges this",
  estimate: "Lens estimate",
  user: "Your setting",
};

function costRow(line: CostLine): HTMLElement {
  return el("li", { class: "flex items-baseline justify-between gap-3 py-1" }, [
    el("span", { class: "min-w-0" }, [
      el("span", {
        class: "block text-[12px] leading-4 text-finn-black",
        text: line.label,
      }),
      el("span", {
        class: "block text-[10px] leading-4 text-finn-iron",
        text: SOURCE_LABEL[line.source],
      }),
    ]),

    el("span", {
      class: [
        "shrink-0 text-[13px] font-bold tabular-nums",
        line.available ? "text-finn-black" : "text-finn-iron",
      ].join(" "),
      text: line.available && line.amount != null
        ? formatEUR(line.amount)
        : "Not available",
    }),
  ]);
}

export function costSection(analysis: FitAnalysis): HTMLElement {
  const { cost, costReasoning } = analysis;
  const { breakdown } = cost;

  const budgetTone =
    breakdown.budgetStatus === "over"
      ? "text-finn-influence-red"
      : breakdown.budgetStatus === "unknown"
        ? "text-finn-iron"
        : "text-finn-black";

  const perHundred = breakdown.energy.costPer100Km;

  return section(
    "What it costs you",

    el("div", { class: "mt-2 flex items-baseline gap-2" }, [
      el("span", {
        class: "text-2xl font-black leading-7 text-finn-black tabular-nums",
        text: formatEUR(breakdown.totalMonthly),
      }),
      el("span", {
        class: "text-[11px] text-finn-iron",
        text: breakdown.complete ? "estimated per month" : "per month, and incomplete",
      }),
    ]),

    el("ul", { class: "mt-2.5 divide-y divide-finn-cotton" }, cost.lines.map(costRow)),

    perHundred != null
      ? el("p", {
          class: "mt-2 text-[11px] leading-4 text-finn-iron",
          text: `About ${formatEUR(perHundred)} per 100 km at the ${formatKm(
            costReasoning.monthlyKm,
          )} a month you told us you drive.`,
        })
      : null,

    cost.budgetSentence
      ? el("p", {
          class: `mt-2 text-[12px] leading-[18px] font-bold ${budgetTone}`,
          text: cost.budgetSentence,
        })
      : null,

    ...cost.caveats.map((caveat) =>
      el("p", {
        class: "mt-2 text-[11px] leading-4 text-finn-iron",
        text: caveat,
      }),
    ),
  );
}

/* -------------------------------------------------------------------------- */
/* 6. Tradeoffs                                                               */
/* -------------------------------------------------------------------------- */

function tradeoffRow(tradeoff: Tradeoff): HTMLElement {
  return el(
    "li",
    { class: "rounded-xl bg-finn-snow px-3 py-2.5" },
    [
      el("p", {
        class: "text-[12px] font-bold leading-[18px] text-finn-black",
        text: tradeoff.headline,
      }),
      el("p", {
        class: "mt-1 text-[12px] leading-[18px] text-finn-iron",
        text: tradeoff.evidence,
      }),
      el("p", {
        class: "mt-1 text-[11px] leading-4 text-finn-iron",
        text: tradeoff.relevance,
      }),
    ],
  );
}

export function tradeoffsSection(analysis: FitAnalysis): HTMLElement | null {
  if (!analysis.tradeoffs.length) return null;

  return section(
    "Things to consider",
    el(
      "ul",
      { class: "mt-2 flex flex-col gap-2" },
      analysis.tradeoffs.map(tradeoffRow),
    ),
  );
}

/* -------------------------------------------------------------------------- */
/* Assembly                                                                   */
/* -------------------------------------------------------------------------- */

export function analysisBody(analysis: FitAnalysis): DocumentFragment {
  return fragment([
    fitHeader(analysis),
    strengthsSection(analysis),
    prioritiesSection(analysis),
    featuresSection(analysis),
    costSection(analysis),
    tradeoffsSection(analysis),

    el("footer", { class: "border-t border-finn-cotton px-5 py-4" }, [
      el("p", {
        class: "text-[11px] leading-4 text-finn-iron",
        text: analysis.cost.disclaimer,
      }),
    ]),
  ]);
}
