import type {
  FitAnalysis,
  FitFeature,
  FitLevel,
  FitPriority,
} from "@/lib/reasoning-engine/fit";
import type { CostLine } from "@/lib/reasoning-engine/types";
import type { FinnCar } from "@/lib/types";
import type { EnvironmentalImpact } from "@/lib/reasoning-engine/environmental";
import {
  ENVIRONMENTAL_METHOD,
  ENVIRONMENTAL_METHOD_NOTES,
} from "@/lib/reasoning-engine/environmental";
import type { Tradeoff } from "@/lib/reasoning-engine/narrative/types";

import {
  describeFit,
  FIT_BANDS,
  FIT_SEGMENTS,
} from "@/lib/reasoning-engine/fit";
import { FEATURE_IMPORTANCE } from "@/lib/reasoning-engine/constants";
import { formatEUR, formatKm, formatNumber } from "@/lib/reasoning-engine";

import { el, fragment, icon, INFORMATION_CIRCLE } from "./dom";
import { pinControl } from "./pin-control";

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
 * out of ten. Four segments do that; a number or a letter grade would not.
 *
 * Coloured by band rather than in one accent, so the four are told apart
 * before they are read — see FIT_BANDS.
 */
function meter(level: FitLevel): HTMLElement {
  const filled = FIT_SEGMENTS[level];
  const band = FIT_BANDS[level];

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
          index < filled ? band.barClass : band.emptyBarClass,
        ].join(" "),
      }),
    ),
  );
}

function bandChip(level: FitLevel, label: string): HTMLElement {
  return el(
    "span",
    {
      class: [
        "inline-flex items-center gap-2 rounded-full px-2.5 py-1",
        "text-[11px] font-bold whitespace-nowrap",
        "shadow-[0_1px_6px_rgba(0,0,0,0.12)]",
        FIT_BANDS[level].chipClass,
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

/**
 * A small "i" that says what something is, without sending the reader away.
 *
 * The Advice page has the same affordance on every feature chip, and the
 * explanations it shows are already carried on the facts the engine produces —
 * they were simply being thrown away here. A reader who doesn't know what
 * rear cross-traffic alert is cannot judge whether missing it matters, which
 * makes the whole list of ticks and crosses harder to act on than it looks.
 *
 * A disclosure rather than a tooltip. The panel is 26rem wide on a page it
 * doesn't own, these explanations run to a sentence or two, and a floating
 * layer that needs positioning, portalling and a pointer is three problems the
 * answer doesn't need — a line that opens under the row is none of them, and
 * it works the same under a thumb.
 */
let infoIds = 0;

function explains(subject: string, explanation: string): {
  button: HTMLElement;
  panel: HTMLElement;
} {
  const id = `finn-lens-info-${(infoIds += 1)}`;

  const panel = el("p", {
    class: "mt-1 hidden rounded-lg bg-white px-2 py-1.5 text-[11px] leading-4 text-finn-iron",
    attrs: { id },
    text: explanation,
  });

  const button = el(
    "button",
    {
      class: [
        "ml-1 inline-flex h-4 w-4 shrink-0 items-center justify-center",
        "rounded-full align-middle text-finn-iron transition-colors",
        "hover:text-finn-accent-blue",
      ].join(" "),
      attrs: {
        type: "button",
        "aria-label": `What is ${subject}?`,
        "aria-expanded": "false",
        "aria-controls": id,
      },
      on: {
        click: (event) => {
          event.stopPropagation();

          const open = panel.classList.toggle("hidden");

          button.setAttribute("aria-expanded", String(!open));
          button.classList.toggle("text-finn-accent-blue", !open);
        },
      },
    },
    [icon(INFORMATION_CIRCLE, "h-4 w-4")],
  );

  return { button, panel };
}

/** A short line of plain prose, as the engine wrote it. */
function prose(text: string, tone = "text-finn-black"): HTMLElement {
  return el("p", { class: `text-[13px] leading-5 ${tone}`, text });
}

/* -------------------------------------------------------------------------- */
/* Configurations                                                             */
/* -------------------------------------------------------------------------- */

/**
 * What distinguishes one configuration of a model from another.
 *
 * FINN sells a Dolphin Surf as a Boost with 88 PS and as a Comfort with 156
 * PS, and the whole analysis changes between them. The same two lines are used
 * to label a configuration in the chooser and to head the analysis of one, so
 * that a reader who picks the second row and then reads two screens of prose
 * never has to wonder which car it is about.
 */
export function configurationName(car: FinnCar): string {
  const named = [car.trim, car.equipmentLine].filter(Boolean).join(" ");

  return named || car.engine || `Configuration ${car.id}`;
}

/** The figures a reader tells configurations apart by. */
export function configurationDetail(car: FinnCar): string {
  const range =
    car.electric?.range != null && car.electric.range !== "Unknown"
      ? `${formatNumber(Number(car.electric.range))} km range`
      : null;

  const price = car.pricing?.customerMonthly?.price;

  return [
    car.power?.inHp ? `${car.power.inHp} PS` : null,
    car.fuelType,
    range,
    price ? `from ${formatEUR(price)}/mo` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * The configurations this model comes in, as a choice.
 *
 * Shown whenever there is more than one, selected or not. When the URL already
 * names one this is how the reader flips to a sibling without leaving the
 * panel; when it doesn't, this is the question the panel opens with. Each row
 * carries its own band, so the choice is informed before it is made — which is
 * the one thing FINN's own configuration grid can't tell them.
 */
export function configurationsSection({
  cars,
  bandOf,
  onSelect,
}: {
  cars: FinnCar[];
  bandOf: (id: number) => { level: FitLevel; label: string } | null;
  onSelect: (id: number) => void;
}): HTMLElement | null {
  if (cars.length < 2) return null;

  const rows = cars.map((car) => {
    const band = bandOf(car.id);

    return el(
      "button",
      {
        class: [
          "flex w-full items-center gap-3 rounded-xl bg-finn-snow px-3 py-2.5",
          "text-left transition-colors hover:bg-finn-cotton",
        ].join(" "),
        attrs: { type: "button" },
        on: { click: () => onSelect(car.id) },
      },
      [
        el("span", { class: "min-w-0 flex-1" }, [
          el("span", {
            class: "block truncate text-[13px] font-bold text-finn-black",
            text: configurationName(car),
          }),
          el("span", {
            class: "block truncate text-[11px] leading-4 text-finn-iron",
            text: configurationDetail(car),
          }),
        ]),

        band ? bandChip(band.level, band.label) : null,

        el("span", {
          class: "shrink-0 text-finn-iron",
          attrs: { "aria-hidden": "true" },
          text: "›",
        }),
      ],
    );
  });

  return el("div", { class: "px-5 pb-4 pt-2" }, [
    el("div", { class: "flex flex-col gap-1.5" }, rows),
  ]);
}

/**
 * The way back to the list, and the only thing on screen that offers it.
 *
 * The list used to stay under the analysis so a reader could switch without
 * going anywhere. That reads as two screens stacked into one: the answer to
 * "how does this fit me" sits below a control asking which car we're talking
 * about, and every time the reader scrolls past it they have to re-establish
 * which row is the one they're reading. One thing at a time is easier to hold
 * — the list, or a car — so choosing replaces the list, and this brings it
 * back.
 */
export function backToConfigurations(
  count: number,
  onBack: () => void,
): HTMLElement {
  return el("div", { class: "px-5 pt-4" }, [
    el(
      "button",
      {
        class: [
          "inline-flex items-center gap-1.5 rounded-full bg-finn-snow px-3 py-1.5",
          "text-[11px] font-bold text-finn-iron transition-colors",
          "hover:bg-finn-cotton hover:text-finn-black",
        ].join(" "),
        attrs: { type: "button" },
        on: { click: onBack },
      },
      [
        el("span", { attrs: { "aria-hidden": "true" }, text: "‹" }),
        el("span", { text: `All ${count} configurations` }),
      ],
    ),
  ]);
}

/* -------------------------------------------------------------------------- */
/* 1. Overall fit                                                             */
/* -------------------------------------------------------------------------- */

export function fitHeader(analysis: FitAnalysis): HTMLElement {
  const { vehicle } = analysis;

  return el("header", { class: "pb-4" }, [
    photo(analysis),

    el("div", { class: "px-5 pt-3" }, [
      el("p", {
        class: "text-lg font-black leading-6 text-finn-black",
        text: vehicle.name,
      }),

      /*
       * The configuration, said in the same words the chooser used. Everything
       * below this line is about this one car and no other.
       */
      el("p", {
        class: "mt-0.5 text-[13px] font-bold leading-5 text-finn-accent-blue",
        text: configurationName(vehicle),
      }),

      el("p", {
        class: "mt-0.5 text-[11px] leading-4 text-finn-iron",
        text: configurationDetail(vehicle),
      }),

      el("p", {
        class: "mt-2.5 text-[13px] leading-5 text-finn-black",
        text: describeFit(analysis),
      }),

      /*
       * The one action the answer invites, and the only reason to make it
       * loud: a reader who has just been told a car suits them is exactly the
       * reader who wants to keep it, and the alternative is hunting for a
       * small circle on a card.
       */
      pinControl(vehicle as never),

      /*
       * Requirement, not decoration. The same car opened by somebody else gets a
       * different word, and a panel that says "Strong match" without saying what
       * it is a match *with* invites being read as a verdict on the car.
       */
      el("p", {
        class: "mt-3 text-[11px] leading-4 text-finn-iron",
        text:
          "Measured against your saved Lens settings — your priorities, their order, and the features you picked out. Someone with different settings would see a different answer.",
      }),
    ]),
  ]);
}

/**
 * The car, with its verdict over it.
 *
 * The same photograph FINN shows on the card, marked the same way — so a
 * reader who clicked a pill on a listing sees the pill again on the thing that
 * opened, and knows without checking that the panel is about the car they
 * asked about. It is the cheapest confirmation available and the only one that
 * survives being glanced at.
 */
function photo(analysis: FitAnalysis): HTMLElement {
  const source = analysis.vehicle.images?.thumbnail;

  return el(
    "div",
    {
      class: [
        "relative flex h-[150px] items-center justify-center overflow-hidden",
        "border-b border-finn-cotton bg-finn-snow",
      ].join(" "),
    },
    [
      source
        ? el("img", {
            class: "h-full w-full object-contain mix-blend-multiply",
            attrs: {
              src: source,
              alt: analysis.vehicle.name,
              loading: "lazy",
            },
          })
        : el("span", {
            class: "text-[11px] text-finn-iron",
            text: "No photo supplied",
          }),

      el(
        "span",
        { class: "absolute bottom-2 left-2" },
        [bandChip(analysis.overall.level, analysis.overall.label)],
      ),
    ],
  );
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
 * One priority, open.
 *
 * These used to be rows that opened. Closed, each answered the only question a
 * reader scanning has — how does this car do on the thing I put third? — and
 * hid the evidence behind a click. But a reader who has opened this panel has
 * already asked the question, and the answer to "how does it fit me" is
 * precisely the evidence: which features, which figures. Charging a click for
 * each of five priorities to read the thing they came for is a toll, not a
 * simplification, and the panel is a scroll either way.
 *
 * So each priority is a section like any other, headed the way the Advice page
 * heads the same thing — the reader's own rank, the name, the band — and the
 * evidence follows underneath it.
 */
function prioritySection(priority: FitPriority): HTMLElement {
  return el("section", { class: "border-t border-finn-cotton px-5 py-4" }, [
    el("div", { class: "flex items-start gap-2.5" }, [
      el("span", {
        class: "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-finn-pale-blue text-sm",
        attrs: { "aria-hidden": "true" },
        text: priority.icon,
      }),

      el("div", { class: "min-w-0 flex-1" }, [
        el("p", {
          class: "text-[10px] font-black uppercase tracking-[0.14em] text-finn-accent-blue",
          text: `Your priority #${priority.rank}`,
        }),

        el("h3", {
          class: "mt-0.5 text-[15px] font-black leading-5 text-finn-black",
          text: priority.label,
        }),

        el("p", {
          class: "mt-0.5 text-[11px] leading-4 text-finn-iron",
          text: coverageLine(priority),
        }),
      ]),

      bandChip(priority.band.level, priority.band.label),
    ]),

    ...priority.sentences.map((line) =>
      el("p", {
        class: "mt-2 text-[12px] leading-[18px] text-finn-iron",
        text: line,
      }),
    ),

    priority.impact ? impactBreakdown(priority.impact) : null,

    ...featureGroups(priority),

    priority.measurements.length && !priority.impact
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
}

/**
 * The four figures behind an emissions result, and why there are four.
 *
 * Every other priority can be checked against a list of features the car has
 * or hasn't. This one is figures, so what has to be shown is not the sum but
 * the reasoning: what each figure is, what it earned, and what it can't see
 * on its own. A reader who knows that the tailpipe number reads zero for every
 * electric car understands immediately why energy use is in the set — and that
 * is worth more than watching the average being taken.
 */
function impactBreakdown(impact: EnvironmentalImpact): HTMLElement {
  const methodFor = (id: string) =>
    ENVIRONMENTAL_METHOD.find((step) => step.id === id);

  return el("div", { class: "mt-3 rounded-xl bg-finn-snow p-3" }, [
    el("p", {
      class: "text-[11px] font-black uppercase tracking-[0.1em] text-finn-iron",
      text: "How this is judged",
    }),

    /*
     * No lead sentence here: the prose immediately above already says why
     * there are four, and this box's job is the four themselves.
     */
    el(
      "ul",
      { class: "mt-2 flex flex-col gap-2.5" },
      impact.components.map((component) => {
        const method = methodFor(component.id);

        return el("li", {}, [
          el("div", { class: "flex items-baseline justify-between gap-3" }, [
            el("span", {
              class: "text-[12px] font-bold text-finn-black",
              text: component.label,
            }),
            el("span", { class: "flex shrink-0 items-baseline gap-2" }, [
              el("span", {
                class: "text-[12px] font-bold tabular-nums text-finn-black",
                text: component.display,
              }),
              el("span", {
                class: "text-[10px] tabular-nums text-finn-iron",
                text: `${component.score}/100`,
              }),
            ]),
          ]),

          method
            ? el("p", {
                class: "mt-0.5 text-[11px] leading-4 text-finn-black",
                text: method.matters,
              })
            : null,

          method
            ? el("p", {
                class: "mt-1 border-l-2 border-finn-cotton pl-2 text-[11px] leading-4 text-finn-iron",
                text: method.relates,
              })
            : null,
        ]);
      }),
    ),

    el("p", {
      class: "mt-2.5 border-t border-finn-cotton pt-2 text-[11px] leading-4 text-finn-iron",
      text:
        impact.components.length === 1
          ? "That is the only one of the four FINN supplied, so it is the result on its own."
          : (ENVIRONMENTAL_METHOD_NOTES[0] as string),
    }),

    impact.missing.length
      ? el("p", {
          class: "mt-1 text-[11px] leading-4 text-finn-iron",
          text: `FINN didn't supply ${impact.missing.join(" or ")} for this car.`,
        })
      : null,

    /*
     * The caveat is deliberately not repeated here — the prose above this box
     * already carries it, and saying it twice on one screen reads as the
     * panel not trusting the reader to have read it once.
     */
  ]);
}

/**
 * What the car has and hasn't, in this priority, in four groups.
 *
 * The same four the Advice page draws, and in the same order, because they
 * answer four different questions and collapsing them loses the distinction:
 * what you asked for and got, what you asked for and didn't, what else counted
 * and it has, and what else counted and it hasn't. The reader's own picks lead
 * — they wrote them — and everything else follows under a heading that says it
 * counted too, because a reader who singled out three features has to be able
 * to see that Lens looked at more than three.
 */
function featureGroups(priority: FitPriority): (HTMLElement | null)[] {
  const has = (feature: FitFeature) => feature.state === "present";
  const hasnt = (feature: FitFeature) => feature.state === "absent";
  const unknown = (feature: FitFeature) => feature.state === "unknown";

  const asked = priority.picked;
  const rest = priority.alsoCounted;

  return [
    featureGroup("You gave extra influence, and it has", asked.filter(has)),
    featureGroup(
      "You gave extra influence, but it doesn't have",
      asked.filter(hasnt),
    ),
    featureGroup(
      asked.length ? "Also counted here, and it has" : "It has",
      rest.filter(has),
    ),
    featureGroup(
      asked.length ? "Also counted here, but it doesn't have" : "It doesn't have",
      rest.filter(hasnt),
    ),
    featureGroup(
      "FINN didn't say either way",
      [...asked, ...rest].filter(unknown),
    ),
  ];
}

function featureGroup(
  label: string,
  features: FitFeature[],
): HTMLElement | null {
  if (!features.length) return null;

  return el("div", { class: "mt-3" }, [
    el("p", {
      class: "text-[10px] font-black uppercase tracking-[0.1em] text-finn-iron",
      text: `${label} (${features.length})`,
    }),

    el(
      "ul",
      { class: "mt-1.5 flex flex-col gap-1.5" },
      features.map(featureRow),
    ),
  ]);
}

/** The count behind the band, which is the part a reader can check. */
function coverageLine(priority: FitPriority): string {
  if (priority.impact) {
    const counted = priority.impact.components.length;

    return `Judged on ${counted} emissions figure${counted === 1 ? "" : "s"}, not on equipment`;
  }

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

/* -------------------------------------------------------------------------- */
/* Feature rows                                                               */
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
  const info = feature.explanation
    ? explains(feature.label, feature.explanation)
    : null;

  const row = el("div", { class: "flex items-start gap-2" }, [
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

      info?.button ?? null,

      feature.state === "unknown"
        ? el("span", {
            class: "ml-1.5 text-[11px] text-finn-iron",
            text: "· not available",
          })
        : null,

      /*
       * Every pick carries the level the reader gave it, present or absent.
       * Which of the three they chose is the whole of what they said about a
       * feature, and a row that shows the tick without it has dropped half
       * the answer. The colours are the influence scale's own, so the level
       * reads the same here as it does where it was set.
       */
      feature.importance
        ? el("span", {
            class: [
              "ml-1.5 shrink-0 rounded-full px-1.5 py-px text-[10px] font-bold",
              FEATURE_IMPORTANCE[feature.importance].chipClass,
            ].join(" "),
            text: FEATURE_IMPORTANCE[feature.importance].badgeLabel,
          })
        : null,
    ]),

    el("span", {
      class: "sr-only",
      text: STATE_LABEL[feature.state],
    }),
  ]);

  return el("li", {}, [row, info?.panel ?? null]);
}

/* -------------------------------------------------------------------------- */
/* 4. Cost                                                                    */
/* -------------------------------------------------------------------------- */

const SOURCE_LABEL: Record<CostLine["source"], string> = {
  finn: "FINN charges this",
  estimate: "Lens estimate",
  user: "Your setting",
};

function costRow(line: CostLine): HTMLElement {
  /*
   * The engine writes a full account of every line — where the number came
   * from, which of the reader's assumptions went into it, and why it is
   * missing when it is. The panel was showing the figure and discarding all
   * of that.
   */
  const info = explains(line.label, line.explanation);

  const row = el("div", { class: "flex items-baseline justify-between gap-3 py-1" }, [
    el("span", { class: "min-w-0" }, [
      el("span", { class: "block text-[12px] leading-4 text-finn-black" }, [
        el("span", { text: line.label }),
        info.button,
      ]),
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

  return el("li", { class: "py-0.5" }, [row, info.panel]);
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
/* 5. Tradeoffs                                                               */
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

/**
 * The whole analysis of one configuration.
 *
 * `back` sits above the header rather than below it: it is the way out of
 * this car and back to the choice, and a way out belongs at the top where a
 * reader looks for it, not six sections down.
 */
export function analysisBody(
  analysis: FitAnalysis,
  back: Node | null = null,
): DocumentFragment {
  return fragment([
    back,
    fitHeader(analysis),
    strengthsSection(analysis),
    ...analysis.priorities.map(prioritySection),
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
