import type {
  FitAnalysis,
  FitFeature,
  FitLevel,
  FitPriority,
} from "@/lib/reasoning-engine/fit";
import type { CostLine } from "@/lib/reasoning-engine/types";
import type { FinnCar } from "@/lib/types";
import type { EnvironmentalAssessment } from "@/lib/reasoning-engine/environmental";
import {
  describeEnvironment,
  ENVIRONMENTAL_METHOD,
} from "@/lib/reasoning-engine/environmental";
import type { Tradeoff } from "@/lib/reasoning-engine/narrative/types";

import {
  describeFit,
  FIT_BANDS,
  FIT_SEGMENTS,
} from "@/lib/reasoning-engine/fit";
import { FEATURE_IMPORTANCE } from "@/lib/reasoning-engine/constants";
import { formatEUR, formatKm, formatNumber } from "@/lib/reasoning-engine";

import {
  configurationDetail,
  configurationName,
  describeCoverage,
} from "@/lib/car-labels";
import {
  DEFAULTS_ACTION,
  DEFAULTS_BODY,
  DEFAULTS_TITLE,
} from "@/lib/personalisation";

import {
  CHEVRON_DOWN,
  el,
  empty,
  fragment,
  icon,
  INFORMATION_CIRCLE,
} from "./dom";
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

export function fitHeader(
  analysis: FitAnalysis,
  usingDefaults = false,
): HTMLElement {
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
       *
       * Which settings, though, has to be true. Saying "your saved settings"
       * to a reader who has saved none — which is now a reader who still gets
       * a full reading — would be the panel asserting the one thing the
       * notice above it exists to deny.
       */
      el("p", {
        class: "mt-3 text-[11px] leading-4 text-finn-iron",
        text: usingDefaults
          ? "Measured against the priorities and picks Lens starts you on, not ones you have given it. Someone with different settings would see a different answer."
          : "Measured against your saved Lens settings — your priorities, their order, and the features you picked out. Someone with different settings would see a different answer.",
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
 * One priority, open, and closable.
 *
 * These were once rows that opened, and that was wrong: a reader who has
 * opened this panel has already asked "how does it fit me", and the answer is
 * precisely the evidence — which features, which figures. Charging a click for
 * each of five priorities to read the thing they came for is a toll.
 *
 * So every priority starts open, and the disclosure runs the other way: the
 * header is a button that folds the evidence away once it has been read. Five
 * priorities of features is a long scroll, and a reader comparing the third
 * against the fourth should be able to shorten it without losing the header
 * that carries the rank, the name and the band.
 */
let sectionIds = 0;

function prioritySection(priority: FitPriority): HTMLElement {
  const id = `finn-lens-priority-${(sectionIds += 1)}`;

  const sentences = priority.impact
    ? [describeEnvironment(priority.impact)]
    : priority.sentences;

  const body = el(
    "div",
    { class: "flex flex-col gap-3 px-5 pb-4", attrs: { id } },
    [
      sentences.length
        ? el(
            "div",
            { class: "flex flex-col gap-1.5" },
            sentences.map((line) =>
              el("p", {
                class: "text-[12px] leading-[18px] text-finn-iron",
                text: line,
              }),
            ),
          )
        : null,

      priority.impact ? impactBreakdown(priority.impact) : null,

      featureGroups(priority),

      priority.measurements.length && !priority.impact
        ? el(
            "dl",
            { class: "flex flex-wrap gap-x-4 gap-y-1" },
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
            class: "text-[12px] leading-[18px] text-finn-iron",
            text: "FINN's data doesn't carry anything we can judge this priority on for this car.",
          })
        : null,
    ],
  );

  const chevron = icon(
    CHEVRON_DOWN,
    "mt-1 h-4 w-4 shrink-0 rotate-180 text-finn-iron transition-transform",
  );

  const header = el(
    "button",
    {
      class: [
        "flex w-full items-start gap-2.5 px-5 py-4 text-left",
        "transition-colors hover:bg-finn-snow",
      ].join(" "),
      attrs: {
        type: "button",
        "aria-expanded": "true",
        "aria-controls": id,
      },
      on: {
        click: () => {
          const closed = body.classList.toggle("hidden");

          body.classList.toggle("flex", !closed);
          header.setAttribute("aria-expanded", String(!closed));
          chevron.classList.toggle("rotate-180", !closed);
        },
      },
    },
    [
      el("span", {
        class: "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-finn-pale-blue text-sm",
        attrs: { "aria-hidden": "true" },
        text: priority.icon,
      }),

      el("span", { class: "min-w-0 flex-1" }, [
        el("span", {
          class: "block text-[10px] font-black uppercase tracking-[0.14em] text-finn-accent-blue",
          text: `Your priority #${priority.rank}`,
        }),

        el("span", {
          class: "mt-0.5 block text-[15px] font-black leading-5 text-finn-black",
          /* A button may not contain an h3, so the heading is a role. */
          attrs: { role: "heading", "aria-level": "3" },
          text: priority.label,
        }),

        el("span", {
          class: "mt-0.5 block text-[11px] leading-4 text-finn-iron",
          text: describeCoverage(priority),
        }),
      ]),

      /*
       * The band and the chevron travel together, tight, so the header's
       * text column keeps as much of a 26rem panel as it can.
       */
      el("span", { class: "flex shrink-0 items-start gap-1" }, [
        bandChip(priority.band.level, priority.band.label),
        chevron,
      ]),
    ],
  );

  return el("section", { class: "border-t border-finn-cotton" }, [
    header,
    body,
  ]);
}

/** One reading, with its figure and what the figure means. */
function readout(
  label: string,
  value: string,
  meaning: string | null = null,
): HTMLElement {
  return el("div", { class: "min-w-0" }, [
    el("p", {
      class: "text-[10px] font-black uppercase tracking-[0.1em] text-finn-iron",
      text: label,
    }),

    el("p", {
      class: "mt-0.5 text-[13px] font-black leading-5 text-finn-black",
      text: value,
    }),

    meaning
      ? el("p", {
          class: "text-[11px] leading-4 text-finn-iron",
          text: meaning,
        })
      : null,
  ]);
}

/**
 * The emissions reading: three plain figures, and the method folded away.
 *
 * This used to be four scored components with a mark out of a hundred beside
 * each and an average underneath. Those numbers are gone because three of the
 * four were the same measurement — see `assessEnvironment` — and because a
 * figure a reader can't explain to themselves is worse than no figure. What is
 * left is what the car actually is: what it emits, how frugally it uses what
 * it burns, and what it burns.
 *
 * The CO₂ class sits with the CO₂ figure rather than on a line of its own,
 * because it is that figure written in the form FINN's own page uses and not a
 * second fact about the car.
 */
function impactBreakdown(impact: EnvironmentalAssessment): HTMLElement {
  const method = el(
    "div",
    { class: "mt-2 hidden flex-col gap-2" },
    ENVIRONMENTAL_METHOD.map((note) =>
      el("div", { class: "rounded-lg bg-white px-2.5 py-2" }, [
        el("p", {
          class: "text-[11px] font-black text-finn-black",
          text: note.heading,
        }),
        el("p", {
          class: "mt-0.5 text-[11px] leading-4 text-finn-iron",
          text: note.body,
        }),
      ]),
    ),
  );

  const toggle = el("button", {
    class: [
      "mt-3 text-[11px] font-bold text-finn-iron underline-offset-2",
      "transition-colors hover:text-finn-black hover:underline",
    ].join(" "),
    attrs: { type: "button", "aria-expanded": "false" },
    text: "How this is judged",
    on: {
      click: () => {
        const open = method.classList.toggle("hidden");

        method.classList.toggle("flex", !open);
        toggle.setAttribute("aria-expanded", String(!open));
      },
    },
  });

  return el("div", { class: "rounded-xl bg-finn-snow p-3" }, [
    el("div", { class: "flex flex-col gap-2.5" }, [
      impact.co2
        ? readout(
            "CO₂ emissions",
            `${impact.co2.display} · Class ${impact.co2.className}`,
          )
        : readout("CO₂ emissions", "Not published by FINN"),

      impact.efficiency
        ? readout(
            impact.powertrain === "Electric"
              ? "Energy efficiency"
              : "Fuel efficiency",
            `${impact.efficiency.label} · ${impact.efficiency.display}`,
            impact.efficiency.explanation,
          )
        : null,

      /*
       * A plug-in hybrid's consumption is shown and not graded. One weighted
       * figure covering two energy sources has no cohort to be frugal within,
       * and FINN publishes no separate electric consumption to build one from.
       */
      !impact.efficiency && impact.powertrain === "Plug-in Hybrid"
        ? readout(
            "Consumption",
            "One combined figure",
            "FINN publishes a single weighted figure for plug-in hybrids, which can't be compared with either petrol or electric cars on its own.",
          )
        : null,

      impact.powertrain
        ? readout("Powertrain", impact.powertrain)
        : null,
    ]),

    ...impact.caveats.map((caveat) =>
      el("p", {
        class: "mt-2.5 text-[11px] leading-4 text-finn-iron",
        text: caveat,
      }),
    ),

    impact.missing.length
      ? el("p", {
          class: "mt-2 text-[11px] leading-4 text-finn-iron",
          text: `FINN didn't supply ${impact.missing.join(" or ")} for this car.`,
        })
      : null,

    toggle,
    method,
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
 *
 * Each group is its own block rather than a heading over a list. Four labels
 * of the same size, a line apart, in a column 26rem wide, are read as one
 * long list with words in it: the distinction the grouping exists to make was
 * being lost in the layout that carried it. A tinted card and a coloured mark
 * on the label say "different answer" before either is read.
 */
function featureGroups(priority: FitPriority): HTMLElement | null {
  const has = (feature: FitFeature) => feature.state === "present";
  const hasnt = (feature: FitFeature) => feature.state === "absent";
  const unknown = (feature: FitFeature) => feature.state === "unknown";

  const asked = priority.picked;
  const rest = priority.alsoCounted;

  const groups = [
    featureGroup("You gave extra influence, and it has", asked.filter(has), {
      mark: "present",
      picked: true,
    }),
    featureGroup(
      "You gave extra influence, but it doesn't have",
      asked.filter(hasnt),
      { mark: "absent", picked: true },
    ),
    featureGroup(
      asked.length ? "Also counted here, and it has" : "It has",
      rest.filter(has),
      { mark: "present", picked: false },
    ),
    featureGroup(
      asked.length
        ? "Also counted here, but it doesn't have"
        : "It doesn't have",
      rest.filter(hasnt),
      { mark: "absent", picked: false },
    ),
    featureGroup(
      "FINN didn't say either way",
      [...asked, ...rest].filter(unknown),
      { mark: "unknown", picked: false },
    ),
  ].filter((group): group is HTMLElement => group !== null);

  if (!groups.length) return null;

  return el("div", { class: "flex flex-col gap-2.5" }, groups);
}

/** The mark on a group's label, in the colour its answer already uses. */
const GROUP_MARK: Record<FitFeature["state"], string> = {
  present: "bg-finn-influence-emerald",
  absent: "bg-finn-warning",
  unknown: "bg-finn-iron",
};

function featureGroup(
  label: string,
  features: FitFeature[],
  tone: { mark: FitFeature["state"]; picked: boolean },
): HTMLElement | null {
  if (!features.length) return null;

  /*
   * One explanation at a time, under the whole group rather than under one
   * chip. Chips wrap, so there is no "under this one" to open into — and a
   * floating layer would need positioning, portalling and a pointer inside a
   * 26rem shadow root that doesn't own the page.
   */
  const slot = el("div", {
    class: "mt-2 hidden rounded-lg bg-white px-2.5 py-2",
    attrs: { id: `finn-lens-explains-${(infoIds += 1)}` },
  });

  let openFor: HTMLElement | null = null;

  const close = () => {
    slot.classList.add("hidden");

    openFor?.setAttribute("aria-expanded", "false");
    openFor?.classList.remove("text-finn-accent-blue");
    openFor = null;
  };

  const explain = (button: HTMLElement, feature: FitFeature) => {
    if (openFor === button) {
      close();
      return;
    }

    close();
    empty(slot);

    slot.append(
      el("p", {
        class: "text-[11px] font-black text-finn-black",
        text: feature.label,
      }),
      el("p", {
        class: "mt-0.5 text-[11px] leading-4 text-finn-iron",
        text: feature.explanation ?? "",
      }),
    );

    slot.classList.remove("hidden");
    button.setAttribute("aria-expanded", "true");
    button.classList.add("text-finn-accent-blue");
    openFor = button;
  };

  return el("div", { class: "rounded-xl bg-finn-snow px-3 py-2.5" }, [
    el(
      "p",
      {
        class: "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-finn-iron",
      },
      [
        el("span", {
          class: `h-1.5 w-1.5 shrink-0 rounded-full ${GROUP_MARK[tone.mark]}`,
          attrs: { "aria-hidden": "true" },
        }),
        el("span", { text: `${label} (${features.length})` }),
      ],
    ),

    el(
      "ul",
      { class: "mt-2 flex flex-wrap gap-1.5" },
      features.map((feature) =>
        el("li", {}, [
          featureChip(feature, tone.picked, slot.id, explain),
        ]),
      ),
    ),

    slot,
  ]);
}

/* -------------------------------------------------------------------------- */
/* Feature chips                                                              */
/* -------------------------------------------------------------------------- */

const STATE_LABEL: Record<FitFeature["state"], string> = {
  present: "has it",
  absent: "doesn't have it",
  unknown: "not available",
};

/**
 * The chip's colour: what the car does about this, and whether the reader
 * asked for it.
 *
 * Two axes rather than one. A pick the car is missing is the loudest thing in
 * the group and gets the warning tint; the same gap in equipment nobody asked
 * about is a fact, not a problem, and stays quiet. The reader's own picks
 * carry the accent either way, because those are the ones they wrote.
 */
function chipClass(feature: FitFeature, picked: boolean): string {
  if (feature.state === "present") {
    return picked
      ? "bg-finn-pale-blue text-finn-highlight-navy"
      : "bg-white text-finn-iron";
  }

  if (feature.state === "absent" && picked) {
    return "bg-finn-warning/10 text-finn-warning";
  }

  return "bg-white text-finn-iron";
}

/**
 * One feature, as the Advice page draws it.
 *
 * This was a list of ticks and crosses with the level bolted on the end. The
 * Advice page had already settled the same problem better: a chip carrying
 * the name, a dot in the colour of the level the reader gave it, and its own
 * "i" — read as one object rather than as a row of columns, and small enough
 * that a dozen of them fit a 26rem column. The two surfaces describe the same
 * analysis, so they now describe it in the same shapes.
 *
 * What is missing is struck through rather than crossed off in a column of
 * its own, and the group's label and colour say which of the four answers
 * this is.
 */
function featureChip(
  feature: FitFeature,
  picked: boolean,
  slotId: string,
  onExplain: (button: HTMLElement, feature: FitFeature) => void,
): HTMLElement {
  const level = feature.importance
    ? FEATURE_IMPORTANCE[feature.importance]
    : null;

  const info = feature.explanation
    ? el(
        "button",
        {
          class: [
            "-mr-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center",
            "rounded-full align-middle opacity-70 transition-colors",
            "hover:opacity-100",
          ].join(" "),
          attrs: {
            type: "button",
            "aria-label": `What is ${feature.label}?`,
            "aria-expanded": "false",
            "aria-controls": slotId,
          },
        },
        [icon(INFORMATION_CIRCLE, "h-4 w-4")],
      )
    : null;

  if (info) {
    info.addEventListener("click", (event) => {
      event.stopPropagation();
      onExplain(info, feature);
    });
  }

  return el(
    "span",
    {
      class: [
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
        "text-[11px] font-bold",
        chipClass(feature, picked),
      ].join(" "),
    },
    [
      level
        ? el("span", {
            class: `h-2 w-2 shrink-0 rounded-full ${level.dotClass}`,
            attrs: {
              title: `You said this should count ${level.inSentence}`,
            },
          })
        : null,

      el("span", {
        class: feature.state === "absent" ? "line-through" : "",
        text: feature.label,
      }),

      /*
       * Only the top level is spelled out. Which of the three a reader chose
       * matters most at the top, and writing the level on every chip is the
       * noise the row layout was already making.
       */
      feature.importance === "high"
        ? el("span", {
            class: "text-[9px] font-black uppercase tracking-wide opacity-70",
            attrs: {
              title: "You said this should have the most influence",
            },
            text: FEATURE_IMPORTANCE.high.badgeLabel,
          })
        : null,

      info,

      el("span", { class: "sr-only", text: STATE_LABEL[feature.state] }),
    ],
  );
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
/**
 * Whose assumptions this reading came from, when they aren't the reader's.
 *
 * Above the verdict rather than below it. The panel used to refuse to draw
 * anything at all without saved settings, and the reason was sound — a
 * verdict measured against defaults nobody has seen is not their verdict.
 * What replaced the refusal is this: the answer, with the assumption named
 * before it is read rather than after.
 */
export function defaultsNotice(onPersonalise: () => void): HTMLElement {
  return el(
    "section",
    { class: "border-b border-finn-cotton bg-finn-pale-blue px-5 py-4" },
    [
      el("p", {
        class: "text-[13px] font-black text-finn-highlight-navy",
        text: DEFAULTS_TITLE,
      }),

      el("p", {
        class: "mt-1 text-[12px] leading-[18px] text-finn-highlight-navy/80",
        text: DEFAULTS_BODY,
      }),

      el("button", {
        class: [
          "mt-3 rounded-full bg-finn-accent-blue px-4 py-2",
          "text-[12px] font-black text-white",
        ].join(" "),
        attrs: { type: "button" },
        text: DEFAULTS_ACTION,
        on: { click: onPersonalise },
      }),
    ],
  );
}

export function analysisBody(
  analysis: FitAnalysis,
  back: Node | null = null,
  notice: Node | null = null,
): DocumentFragment {
  return fragment([
    back,
    notice,
    fitHeader(analysis, notice != null),
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
