import type {
  FitAnalysis,
  FitBand,
  FitFeature,
  FitLevel,
  FitPriority,
} from "@/lib/reasoning-engine/fit";
import type { CostBreakdown, CostLine } from "@/lib/reasoning-engine/types";
import type { EnvironmentalAssessment } from "@/lib/reasoning-engine/environmental";
import type { FuelType } from "@/lib/types";
import {
  readEnvironment,
  type ComparisonReading,
  type EnvironmentFigure,
  type EnvironmentReading,
  type EnvironmentRow,
  type RowRelation,
  type UsagePointer,
} from "@/lib/environment-copy";
import type { Tradeoff } from "@/lib/reasoning-engine/narrative/types";
import { ROW_TONE, type RowTone } from "@/lib/row-tone";
import {
  featureGroupsOf,
  FEATURE_CHIP_TONE,
  type FeatureGroup,
  type InfluenceBand,
} from "@/lib/feature-copy";
import { readTradeoff } from "@/lib/tradeoff-copy";

import {
  FIT_BANDS,
  FIT_METER_SEGMENTS,
  FIT_SEGMENTS,
} from "@/lib/reasoning-engine/fit";
import { FEATURE_IMPORTANCE } from "@/lib/reasoning-engine/constants";
import { MARK_TONES, NEUTRAL_TONE } from "@/lib/priority-marks";
import { formatEUR, formatNumber } from "@/lib/reasoning-engine";
import {
  advertisedGap,
  contractTag,
  costIcon,
  costLead,
  COST_SOURCE_LABEL,
  COST_SOURCE_TONE,
} from "@/lib/cost-copy";
import { readUsage } from "@/lib/usage-copy";
import { goToUsage, USAGE_SECTION } from "@/lib/usage-anchor";

/**
 * The two tone classes for one mark, in the order the stylesheet expects.
 *
 * The panel draws its priority marks exactly as `PriorityIcon` does — a dark
 * line and a pale inside of the same hue — because they are the same marks and
 * a reader moving between the panel and the compare page should not have to
 * notice they have crossed a boundary.
 */
function toneClasses(mark: string): string {
  const tone = MARK_TONES[mark] ?? NEUTRAL_TONE;

  return `${tone.line} ${tone.fill}`;
}

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
  el,
  empty,
  fragment,
  icon,
} from "./dom";

/**
 * The analysis, drawn.
 *
 * Every string on the page comes out of the reasoning engine or off the car.
 * Nothing here decides anything: if a sentence isn't in `analysis`, it isn't
 * on the panel. That is deliberate — the moment this file starts writing its
 * own copy is the moment the panel can say something the engine can't back up.
 *
 * The order is what this panel can tell a reader that the page underneath it
 * cannot: the verdict, then what the car costs *them* at their own mileage,
 * then how much energy it uses for its kind, and only then the equipment audit
 * behind the verdict and what they would be giving up. See `analysisBody`.
 */

/* -------------------------------------------------------------------------- */
/* Shared parts                                                               */
/* -------------------------------------------------------------------------- */

/**
 * How full the band is, as five segments.
 *
 * A band is a summary of a score the reader is deliberately never shown, so
 * the indicator has to read as "how much of this" without reading as a mark
 * out of ten. Five segments do that; a number or a letter grade would not.
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
    Array.from({ length: FIT_METER_SEGMENTS }, (_, index) =>
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
        /* See `FIT_BADGE_BASE`: the strong band and the photograph's ground
           are the same pale blue, so the chip needs an edge of its own. */
        "ring-1 ring-white",
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
 * The "i" on a feature chip or a cost line: a small button that opens a dark
 * tooltip beside it. The figures in "How much it uses" and the environmental
 * table explain themselves in place instead; see `explainedRow`.
 *
 * These used to open a block of text under the row, on the reasoning that a
 * floating layer would need positioning, portalling and a pointer inside a
 * 26rem shadow root on a page this panel doesn't own. That pushed every
 * explanation into the layout, so reading one moved everything beneath it,
 * and the Advice page and pinned cards, which use a tooltip, behaved
 * differently from the panel.
 *
 * So all three problems are handled here once:
 *
 * - **Portalling.** The layer is appended to the panel's shadow root, outside
 *   the scrolling column, so the column can't clip it.
 * - **Positioning.** It is `position: fixed` and placed from the button's own
 *   box each time it opens or the column scrolls: above the button where
 *   there's room, below where there isn't, and kept inside the panel's width.
 *   The host is fixed with no transform, so fixed means the viewport.
 * - **Pointer and thumb.** It opens on hover and focus, stays open when
 *   clicked or tapped, and closes on a second click, Escape, or a tap anywhere
 *   else. The same behaviour as the React `Tip`, and only one is open at once.
 */
let infoIds = 0;

let closeOpenTip: (() => void) | null = null;

function infoTip(options: {
  /** What the button is called, for a screen reader: the question it answers. */
  label: string;
  /** Bold first line of the tooltip, when there is one. */
  title: string | null;
  body: string;
  buttonClass: string;
  /** Swapped rather than stacked: with both present, the stylesheet's order wins. */
  idleClass: string;
  activeClass: string;
}): HTMLElement {
  const id = `finn-lens-info-${(infoIds += 1)}`;

  const tip = el(
    "div",
    {
      class: [
        "fixed z-10 hidden w-max max-w-[17rem] rounded-xl bg-finn-black px-3 py-2",
        "text-left shadow-[0_8px_24px_rgba(0,0,0,0.18)]",
      ].join(" "),
      attrs: { id, role: "tooltip" },
    },
    [
      options.title
        ? el("p", { class: "text-[11px] font-black leading-4 text-white", text: options.title })
        : null,
      el("p", {
        class: `${options.title ? "mt-0.5 " : ""}text-[11px] font-normal leading-4 text-white/85`,
        text: options.body,
      }),
    ],
  );

  const button = el(
    "button",
    {
      class: `${options.buttonClass} ${options.idleClass}`,
      attrs: {
        type: "button",
        "aria-label": options.label,
        "aria-expanded": "false",
        "aria-controls": id,
        "aria-describedby": id,
      },
    },
    [icon("info", "h-4 w-4")],
  );

  let hovered = false;
  let pinned = false;

  /* The shadow root in the panel; the detached tree in a test; the body on a page. */
  const rootOf = (): ParentNode => {
    let node: Node = button;

    while (node.parentNode) node = node.parentNode;

    return (node as Document).body ?? (node as unknown as ParentNode);
  };

  const place = () => {
    if (typeof window === "undefined" || typeof button.getBoundingClientRect !== "function") return;

    const anchor = button.getBoundingClientRect();
    const box = tip.getBoundingClientRect();

    if (!box.width) return;

    const host = (rootOf() as unknown as ShadowRoot).host as HTMLElement | undefined;
    const bounds = host ? host.getBoundingClientRect() : { left: 0, right: window.innerWidth };
    const edge = 8;
    const gap = 6;

    const left = Math.max(
      bounds.left + edge,
      Math.min(anchor.left + anchor.width / 2 - box.width / 2, bounds.right - edge - box.width),
    );

    const above = anchor.top - gap - box.height;

    tip.style.left = `${Math.round(left)}px`;
    tip.style.top = `${Math.round(above >= edge ? above : anchor.bottom + gap)}px`;
  };

  const onOutside = (event: Event) => {
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];

    if (path.includes(button) || path.includes(tip)) return;

    close();
  };

  const onKey = (event: Event) => {
    if ((event as KeyboardEvent).key === "Escape") close();
  };

  function open() {
    if (closeOpenTip && closeOpenTip !== close) closeOpenTip();

    closeOpenTip = close;

    const root = rootOf();

    if (!tip.parentNode) root.append(tip);

    tip.classList.remove("hidden");
    button.setAttribute("aria-expanded", "true");
    button.classList.remove(...options.idleClass.split(" "));
    button.classList.add(...options.activeClass.split(" "));

    place();

    /*
     * A tap or a key anywhere, including on the page beside the panel, reaches
     * the document; it only reaches the shadow root when it lands inside the
     * panel. Scrolling doesn't cross the shadow boundary, so that one listens
     * on the root, where the column scrolls.
     */
    button.ownerDocument.addEventListener("pointerdown", onOutside, true);
    button.ownerDocument.addEventListener("keydown", onKey, true);
    root.addEventListener("scroll", place, true);
  }

  function close() {
    hovered = false;
    pinned = false;

    tip.classList.add("hidden");
    button.setAttribute("aria-expanded", "false");
    button.classList.remove(...options.activeClass.split(" "));
    button.classList.add(...options.idleClass.split(" "));

    if (closeOpenTip === close) closeOpenTip = null;

    const root = rootOf();

    button.ownerDocument.removeEventListener("pointerdown", onOutside, true);
    button.ownerDocument.removeEventListener("keydown", onKey, true);
    root.removeEventListener("scroll", place, true);
  }

  const sync = () => (pinned || hovered ? open() : close());

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    pinned = !pinned;
    if (!pinned) hovered = false;
    sync();
  });

  button.addEventListener("mouseenter", () => {
    hovered = true;
    sync();
  });

  button.addEventListener("mouseleave", () => {
    hovered = false;
    sync();
  });

  button.addEventListener("focus", () => {
    hovered = true;
    sync();
  });

  button.addEventListener("blur", () => {
    hovered = false;
    sync();
  });

  return button;
}

/** "More about fuel use", leaving "CO₂ while driving" alone. */
function moreAbout(label: string): string {
  const second = label.charAt(1);

  return `More about ${second === second.toLowerCase() ? label.charAt(0).toLowerCase() + label.slice(1) : label}`;
}

/**
 * A row that explains itself: what it shows, an "i" at the far right where an
 * accordion's arrow would sit, and the row's explanations under it once the
 * "i" is clicked. A second click closes it.
 *
 * These were tooltips. A tooltip covers whatever is around it, closes when the
 * pointer drifts, and is a cramped place to read a short paragraph, which is
 * what these explanations are. Opening them under the row keeps them next to
 * the numbers they're about.
 *
 * The "i" is always at the far right, so every explanation opens from the same
 * place. A row with nothing to explain keeps the space, so the table's columns
 * still line up. The React twin is `components/ExplainedRow`.
 */
function explainedRow(options: {
  /** What the row is, for the button's name when it opens more than one answer. */
  label: string;
  explanations: { title: string; body: string }[];
  content: (Node | null)[];
  rowClass: string;
  attrs?: Record<string, string>;
}): HTMLElement {
  const { explanations } = options;
  const [only] = explanations;
  const id = `finn-lens-explain-${(infoIds += 1)}`;

  const idle = "text-finn-iron hover:bg-finn-pale-blue hover:text-finn-accent-blue";
  const active = "bg-finn-accent-blue text-white";

  const answers = only
    ? el(
        "div",
        {
          class: "mt-2.5 hidden space-y-2 rounded-xl bg-finn-pale-blue/60 px-3 py-2.5 text-[12px] leading-[18px]",
          attrs: { id },
        },
        /*
         * The question, only where there is more than one answer to tell
         * apart. A row with a single explanation has already asked it twice —
         * as the row's own label, and as the name of the "i" the reader just
         * clicked — so printing it a third time above the answer is the panel
         * talking to itself. The React twin is `components/ExplainedRow`.
         */
        explanations.map((explanation) =>
          el("div", {}, [
            explanations.length > 1
              ? el("p", { class: "font-black text-finn-black", text: explanation.title })
              : null,
            /* A blank line in the body starts a new paragraph. */
            ...explanation.body.split("\n\n").map((paragraph, index) =>
              el("p", { class: index > 0 ? "mt-1.5 text-finn-iron" : "text-finn-iron", text: paragraph }),
            ),
          ]),
        ),
      )
    : null;

  const toggle = only
    ? el(
        "button",
        {
          class: `inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${idle}`,
          attrs: {
            type: "button",
            "aria-label": explanations.length === 1 ? only.title : moreAbout(options.label),
            "aria-expanded": "false",
            "aria-controls": id,
          },
        },
        [icon("info", "h-4 w-4")],
      )
    : el("span", { class: "h-6 w-6 shrink-0", attrs: { "aria-hidden": "true" } });

  if (answers) {
    toggle.addEventListener("click", (event) => {
      event.stopPropagation();

      const opening = answers.classList.contains("hidden");

      if (opening) answers.classList.remove("hidden");
      else answers.classList.add("hidden");

      toggle.setAttribute("aria-expanded", String(opening));
      toggle.classList.remove(...(opening ? idle : active).split(" "));
      toggle.classList.add(...(opening ? active : idle).split(" "));
    });
  }

  return el("div", { class: options.rowClass, attrs: options.attrs ?? {} }, [
    el("div", { class: "flex items-start gap-2" }, [
      el("div", { class: "min-w-0 flex-1" }, options.content),
      toggle,
    ]),
    answers,
  ]);
}

/** A short line of plain prose, as the engine wrote it. */
function prose(text: string, tone = "text-finn-black"): HTMLElement {
  return el("p", { class: `text-[13px] leading-5 ${tone}`, text });
}

/**
 * The shape every section that reports a list of facts is drawn in: one white
 * card with a hairline border, its rows divided, each row edged in the colour
 * of what it says, and an optional line of small print under the last of them.
 *
 * The environmental result was the first to use it, "How much it uses" took the
 * same table so a car's consumption wouldn't look like a different kind of fact
 * depending on where a reader met it, and the tradeoffs and feature groups use
 * it now, having been soft grey boxes that said nothing by being grey. The
 * React twin is `components/FactTable`.
 */
function factTable(
  rows: (Node | null)[],
  options: { header?: Node | null; source?: string } = {},
): HTMLElement {
  /* Square, as the React twin explains: a coloured edge bends round a rounded corner. */
  return el("div", { class: "overflow-hidden border border-finn-cotton bg-white" }, [
    options.header ?? null,

    el("div", { class: "divide-y divide-finn-cotton" }, rows),

    options.source
      ? el("p", {
          class: "border-t border-finn-cotton px-3.5 py-2 text-[11px] leading-4 text-finn-iron",
          text: options.source,
          attrs: { "data-disclaimer": "" },
        })
      : null,
  ]);
}

/** A row's coloured edge: 4px, in the tone of what the row says. */
const rowEdge = (tone: RowTone) => `border-l-4 ${ROW_TONE[tone].edge}`;

/* -------------------------------------------------------------------------- */
/* 1. Overall fit                                                             */
/* -------------------------------------------------------------------------- */

function fitHeader(analysis: FitAnalysis): HTMLElement {
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
        /*
         * Without the power, which decides nothing the panel goes on to say,
         * and without the fuel type, which has moved to "How much it uses" —
         * what a car runs on is what decides the cohort its consumption is
         * judged against, so it belongs beside that judgement.
         */
        text: configurationDetail(vehicle, {
          withPower: false,
          withFuel: false,
        }),
      }),

      /*
       * The tally that used to sit here — "a good or strong match on 3 of the
       * 5 priorities you set, led by safety & driver assistance, your #1" —
       * is gone. The band chip over the photograph already gives the verdict,
       * and every claim the sentence made is made again, with its evidence,
       * by the priority sections underneath: the count, the order, and which
       * one led. It was a summary of the page placed at the top of the page.
       */
    ]),
  ]);
}

/**
 * What the verdict was measured against.
 *
 * Requirement, not decoration. The same car opened by somebody else gets a
 * different word, and a panel that says "Strong match" without saying what it
 * is a match *with* invites being read as a verdict on the car.
 *
 * Which settings, though, has to be true. Saying "your saved settings" to a
 * reader who has saved none — which is now a reader who still gets a full
 * reading — would be the panel asserting the one thing `defaultsNotice`
 * exists to deny.
 *
 * It sits under "Why it fits" rather than in the header. At the top it was a
 * disclaimer standing between the reader and the answer, read before there was
 * anything to qualify; under the reasons it is the last word on them, which is
 * where a caveat is worth reading.
 */
function basisNote(usingDefaults: boolean): HTMLElement {
  return el("p", {
    class: "mt-3 text-[11px] leading-4 text-finn-iron",
    text: usingDefaults
      ? "Measured against the priorities and picks Lens starts you on, not ones you have given it. Someone with different settings would see a different answer."
      : "Measured against your saved Lens settings — your priorities, their order, and the features you picked out. Someone with different settings would see a different answer.",
  });
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
        /* Pale blue rather than snow. A photograph of a car is cut out on
           white, so on a near-white ground it floated in an undefined space
           that read as an image still loading; the tint gives it a stage.
           The same ground is used by the setup flow's mock of this panel and
           by the cards on finn.com, so the three are one picture. */
        "border-b border-finn-cotton bg-finn-pale-blue",
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

function strengthsSection(
  analysis: FitAnalysis,
  usingDefaults = false,
): HTMLElement {
  /*
   * A car that serves nothing the reader ranked has no reasons to list, and a
   * "Why it fits" heading over nothing would be the panel insisting. The note
   * still has to appear — it is what the verdict above was measured against —
   * so it keeps its place in the flow without a heading it can't earn.
   */
  if (!analysis.strengths.length) {
    return el("div", { class: "border-t border-finn-cotton px-5 py-4" }, [
      basisNote(usingDefaults),
    ]);
  }

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

    basisNote(usingDefaults),
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

  /*
   * Environmental impact writes its own block, prose included, so that the
   * result, the figures and the caveats stay in one order that one piece of
   * code controls. Keyed on the priority rather than on having an
   * assessment: a car FINN published no CO₂ figure for still gets the block,
   * saying there's no data, instead of a generic line or nothing at all.
   */
  const environmental = priority.priority === "environmental";
  const sentences = environmental ? [] : priority.sentences;

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

      environmental ? impactBreakdown(priority.impact, priority.band) : null,

      featureGroups(priority),

      /*
       * Only when the prose above is absent. The engine writes the same facts
       * into a sentence — "It has 5 seats and 400 L of boot space" — and this
       * list was repeating it verbatim two lines below, in a section that is
       * already long. Where there is no sentence (a car FINN sent no equipment
       * list for), this is the only place the figures appear, so it stays.
       */
      priority.measurements.length && !environmental && !sentences.length
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

      !priority.hasEvidence && !environmental
        ? el("p", {
            class: "text-[12px] leading-[18px] text-finn-iron",
            text: "FINN's data doesn't carry anything we can judge this priority on for this car.",
          })
        : null,
    ],
  );

  const chevron = icon(
    "chevron-down",
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
      /*
       * The priority's mark, drawn from the same shapes and in the same
       * colour the React
       * surfaces use. It was the emoji held in the priority's `icon`, which
       * is now the *name* of a shape — rendering it as text here would put
       * the word "shield" in the box.
       */
      el(
        "span",
        {
          class:
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-finn-pale-blue text-finn-accent-blue",
          attrs: { "aria-hidden": "true" },
        },
        [icon(priority.icon, `h-4 w-4 ${toneClasses(priority.icon)}`)],
      ),

      el("span", { class: "min-w-0 flex-1" }, [
        el("span", {
          class: "block text-[10px] font-black uppercase tracking-[0.14em] text-finn-accent-blue",
          text: `Your priority #${priority.rank}`,
        }),

        el("span", {
          class: "mt-0.5 block text-[15px] font-black leading-5 text-finn-black",
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

  /*
   * The heading wraps the button rather than sitting inside it.
   *
   * The priority's name used to be a span carrying `role="heading"` inside
   * the trigger, on the reasoning that a button may not contain an h3 — which
   * is true, and was the sign that the nesting was the wrong way round. A
   * heading inside a control is read out and then left out of the document
   * outline, so a reader navigating this panel by heading could not reach any
   * of the five priorities. The `h3` holds the button, and the button holds
   * the name; both facts survive and neither is nested in the other's role.
   */
  return el("section", { class: "border-t border-finn-cotton" }, [
    el("h3", { class: "m-0" }, [header]),
    body,
  ]);
}

/**
 * The environmental result, in the order a reader asks for it: the verdict in
 * plain words, the plug-in hybrid note where it applies, the CO₂ card against
 * the FINN Lens benchmark, then why that is the match, then — for a petrol or
 * diesel car — one line on where its fuel use meets the result.
 *
 * The card keeps the class pill beside its name, an "i" at the far right that
 * opens what its numbers mean, a bar under its two figures, and a short
 * disclaimer. How much the car uses is its own section, `efficiencySection`. Every word comes from `readEnvironment`;
 * the React twin is `components/EnvironmentalResult`.
 *
 * No CO₂ number or band here: the priority's header above already carries both.
 */
function impactBreakdown(impact: EnvironmentalAssessment | null, band: FitBand): HTMLElement {
  const reading = readEnvironment(impact, band);

  return el("div", { class: "@container flex flex-col gap-4" }, [
    verdictCard(reading),

    reading.note
      ? el("div", { class: "rounded-[20px] bg-finn-warning-lift/60 px-4 py-3.5" }, [
          el("p", {
            class: "text-[12px] font-black text-finn-warning-ink",
            text: reading.note.title,
          }),
          el("p", {
            class: "mt-1.5 text-[12px] leading-[18px] text-finn-warning-ink/90",
            text: reading.note.body,
          }),
        ])
      : null,

    comparisonTable(reading),

    ...reading.meaning.map((line) =>
      el("p", { class: "text-[13px] leading-5 text-finn-black", text: line }),
    ),

    /*
     * Where fuel use meets this result: a pointer to "How much it uses", not a
     * copy, with the section's name scrolling the drawer up to it.
     */
    reading.usage ? usagePointer(reading.usage) : null,
  ]);
}

/**
 * The usage line, with its last words as a link that scrolls the drawer up to
 * "How much it uses". The React twin is in `components/EnvironmentalResult`.
 */
function usagePointer(usage: UsagePointer): HTMLElement {
  return el(
    "p",
    { class: "text-[12px] leading-[18px] text-finn-iron", attrs: { "data-usage": "" } },
    [
      `${usage.text} `,
      el("button", {
        class:
          "cursor-pointer font-bold text-finn-accent-blue underline underline-offset-2 hover:text-finn-highlight-navy",
        text: usage.section,
        attrs: { type: "button", "data-usage-link": "" },
        on: { click: (event) => goToUsage(event.currentTarget as Element) },
      }),
      ".",
    ],
  );
}

/**
 * The answer, before any of the working, and the largest thing in the section:
 * the figure read back in words at the size of a heading, over one plain
 * sentence, on a filled card in the tone's own pale ground.
 *
 * No coloured edge. The card is already a field of the tone, and a 4px rule
 * down the side of a filled card is the visual language of a documentation
 * callout. The React twin is `Verdict` in `components/EnvironmentalResult`.
 */
function verdictCard(reading: EnvironmentReading): HTMLElement {
  const tone = ROW_TONE[reading.verdict.tone];

  return el("div", { class: `rounded-[22px] ${tone.ground} px-4 py-4` }, [
    el("p", {
      class: `text-[18px] font-black leading-6 tracking-[-0.015em] ${tone.ink}`,
      text: reading.verdict.words,
    }),
    el("p", {
      class: "mt-2 text-[13px] leading-5 text-finn-black/85",
      text: reading.verdict.plain,
    }),
  ]);
}

/** Lucide shapes, drawn from the panel's generated set. */
const ROW_ICON: Record<EnvironmentRow["icon"], string> = {
  co2: "cloud",
  fuel: "fuel",
  electricity: "zap",
};

/** The one micro-caption size, for the two things a figure can be. */
const CAPTION = "text-[10px] font-black uppercase tracking-[0.12em]";

/**
 * This car against the FINN Lens benchmark, one card per measure.
 *
 * A card each, not rows of a table. What this replaces was a column header
 * strip reading MEASURE / THIS CAR / FINN LENS BENCHMARK over divided rows
 * with a 4px edge and five sizes of type in each — a spreadsheet with fine
 * print, which is what a reader who doesn't know whether 126 g/km is good or
 * bad least needs. The React twin is `components/ComparisonTable`.
 */
function comparisonTable(reading: ComparisonReading): HTMLElement {
  return el("div", { class: "@container/table flex flex-col gap-2.5" }, [
    ...reading.rows.map((row, index) =>
      comparisonCard(row, index === 0 ? reading.rating : null),
    ),

    reading.source
      ? el("p", {
          class: "px-1 text-[11px] leading-4 text-finn-iron",
          text: reading.source,
          attrs: { "data-disclaimer": "" },
        })
      : null,
  ]);
}

function comparisonCard(row: EnvironmentRow, rating: ComparisonReading["rating"]): HTMLElement {
  const tone = ROW_TONE[row.tone];

  /* Everything this card's numbers can be asked about, in the order they sit. */
  const explanations = [rating?.info, row.car.info, row.reference.info].filter(
    (info): info is { title: string; body: string } => info != null,
  );

  return explainedRow({
    label: row.label,
    explanations,
    rowClass: "rounded-[20px] bg-white p-4 ring-1 ring-finn-cotton",
    /* The tone as data as well as colour, so what a card claims is checkable. */
    attrs: { "data-row": row.id, "data-tone": row.tone },
    content: [
      el("div", { class: "flex flex-wrap items-center gap-x-2 gap-y-1" }, [
        /*
         * The measure's own mark, in its own colour, on the colour's palest
         * ground. Small and quiet: it says which of the two questions this
         * card answers, and nothing else.
         */
        el(
          "span",
          { class: `inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${tone.ground}` },
          [icon(ROW_ICON[row.icon], `h-3.5 w-3.5 ${tone.ink}`)],
        ),

        el("p", { class: "text-[13px] font-black leading-5 text-finn-black", text: row.label }),

        /*
         * The class, beside the measure it is a restatement of. It is the CO₂
         * number said as a letter, so it belongs here and not above the
         * answer; what the letter means opens from the card's "i".
         */
        rating
          ? el("span", {
              class: `ml-auto inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-black ${ROW_TONE[rating.tone].pill}`,
              text: rating.label,
              attrs: { "data-rating": "" },
            })
          : null,

        /*
         * What it runs on, beside the use it decides the benchmark for — the
         * same pill the class is on the CO₂ card, in the same place, tinted in
         * this card's own tone.
         */
        row.fuel
          ? el("span", {
              class: `ml-auto inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-black ${tone.pill}`,
              text: row.fuel,
              attrs: { "data-fuel": "" },
            })
          : null,
      ]),

      el("p", { class: "mt-1 text-[11px] leading-4 text-finn-iron", text: row.note }),

      /*
       * The two figures bracket the card: this car on the left, the benchmark
       * hard right, and the bar running between them underneath, so the blue
       * label sits roughly over the blue notch it names. Stacked and both
       * left-aligned when the card is too narrow to hold them apart.
       */
      el(
        "div",
        {
          class:
            "mt-3.5 flex flex-col gap-3 @sm/table:flex-row @sm/table:items-start @sm/table:justify-between @sm/table:gap-6",
        },
        [
          comparisonFigure({
            caption: "This car",
            captionClass: "text-finn-iron",
            figure: row.car,
            valueClass:
              "text-[20px] font-black leading-6 tracking-[-0.01em] tabular-nums text-finn-black",
            beside: row.comparison
              ? el("span", {
                  class: `text-[12px] font-black leading-5 ${tone.ink}`,
                  text: row.comparison,
                })
              : null,
          }),

          comparisonFigure({
            caption: "FINN Lens benchmark",
            captionClass: "text-finn-accent-blue",
            figure: row.reference,
            valueClass: "text-[15px] font-black leading-6 tabular-nums text-finn-accent-blue",
            class: "@sm/table:shrink-0 @sm/table:text-right",
          }),
        ],
      ),

      row.relation ? relationBar(row.relation, tone.bar) : null,
    ],
  });
}

/**
 * The two figures as one picture, and the thing the eye should land on.
 *
 * The car's figure fills the track in the card's own colour; the benchmark is
 * notched across it in blue, ringed in white so it stays legible wherever it
 * lands on the fill. Thick enough to read as a chart rather than as a rule
 * under the numbers.
 *
 * Hidden from a screen reader: both figures and the sentence under the bar are
 * already in the text. The React twin is `RelationBar` in
 * `components/ComparisonTable`.
 */
function relationBar(relation: RowRelation, fill: string): HTMLElement {
  const filled = el("div", { class: `h-2.5 rounded-full ${fill}` });
  const marker = el("span", {
    class:
      "absolute -top-[5px] h-5 w-[3px] -translate-x-1/2 rounded-full bg-finn-accent-blue ring-2 ring-white",
  });

  filled.style.width = `${relation.car}%`;
  marker.style.left = `${relation.reference}%`;

  return el("div", { class: "mt-4" }, [
    el(
      "div",
      {
        class: "relative h-2.5 w-full rounded-full bg-finn-cotton",
        attrs: { "aria-hidden": "true" },
      },
      [filled, marker],
    ),
    el("p", {
      class: "mt-2.5 text-[11px] font-bold leading-4 text-finn-black",
      text: relation.words,
    }),
  ]);
}

/** A figure: its caption, its value, and what the value means underneath. */
function comparisonFigure(options: {
  caption: string;
  captionClass: string;
  figure: EnvironmentFigure;
  valueClass: string;
  /** The verdict, in words, on the same baseline as the number. */
  beside?: HTMLElement | null;
  class?: string;
}): HTMLElement {
  const { figure } = options;

  return el("div", { class: `min-w-0 ${options.class ?? ""}` }, [
    el("p", { class: `${CAPTION} ${options.captionClass}`, text: options.caption }),
    /*
     * `justify-end` only bites where the block is right-aligned: the
     * benchmark's value has to sit against the same edge its caption does.
     */
    el("p", { class: "mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 @sm/table:[.text-right_&]:justify-end" }, [
      el("span", { class: options.valueClass, text: figure.value }),
      options.beside ?? null,
    ]),
    figure.meaning
      ? el("p", { class: "mt-0.5 text-[11px] leading-4 text-finn-iron", text: figure.meaning })
      : null,
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
 * being lost in the layout that carried it.
 *
 * So each block is tinted in the colour of the answer it carries, in the same
 * hues the Advice page uses for the same four facts — the reader's own picks
 * met in blue, a gap in one of them in amber, equipment that counted anyway
 * in green, and everything unanswered in grey. They were five identical snow
 * cards before, which is a grouping a reader has to read to see. Now the
 * shape of the section is legible before a single word of it is.
 */
function featureGroups(priority: FitPriority): HTMLElement | null {
  const groups = featureGroupsOf(priority);

  if (!groups.length) return null;

  return factTable(groups.map(featureGroup));
}

/**
 * One group of features, as a row of that table.
 *
 * This was five tinted cards, each with its own ground, label ink, dot and
 * chip colour — four things to keep in agreement per group, and a pale blue
 * chip that vanished into the pale blue block around it. The row keeps one
 * colour, on its edge, and the chips take the tint that goes with it on the
 * white the row is drawn on.
 *
 * The five titles and their colours come from `lib/feature-copy`, shared with
 * the pinned car's card so the two surfaces answer the same five questions.
 */
function featureGroup(group: FeatureGroup): HTMLElement {
  return el(
    "div",
    /* A row carrying three headings and three clouds of chips needs more room
       than one carrying a label and a line of them. */
    {
      class: `${rowEdge(group.tone)} px-3.5 ${group.bands ? "py-4" : "py-3"}`,
      attrs: { "data-group": group.id },
    },
    [
      el("p", {
        class: "text-[10px] font-black uppercase tracking-[0.1em] text-finn-iron",
        text: `${group.title} (${group.features.length})`,
      }),

      /*
       * The picks the car hasn't got are sorted under the level the reader
       * gave each one; every other group is one cloud of chips. Each chip's
       * "i" opens its own tooltip, so nothing opens under the group.
       */
      group.bands
        ? /*
           * Room to breathe. Three headings, three clouds of chips and the
           * group's own title at 10px were stacked a few pixels apart, which
           * read as one block of small type rather than as four things — and
           * the grouping is the whole point of it.
           */
          el(
            "div",
            { class: "mt-3.5 flex flex-col gap-4" },
            group.bands.map(influenceBand),
          )
        : el(
            "ul",
            { class: "mt-2.5 flex flex-wrap gap-1.5" },
            group.features.map((feature) =>
              /* The chip strikes a missing feature through from its own state. */
              el("li", {}, [featureChip(feature, FEATURE_CHIP_TONE[group.chip])]),
            ),
          ),
    ],
  );
}

/**
 * One level of influence, and the picks the car is missing at that level.
 *
 * The heading says the level in the picker's own words and the "i" beside it
 * says what the level actually does to the result — which is the question a
 * reader has at exactly this moment, having just been told the car misses
 * something they called highly influential. The chips take the level's own
 * colour, so the three bands are told apart before they are read.
 */
function influenceBand(band: InfluenceBand): HTMLElement {
  return el("div", { attrs: { "data-band": band.level } }, [
    el(
      "p",
      { class: `flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.1em] ${band.accent}` },
      [
        el("span", { text: `${band.title} (${band.features.length})` }),

        infoTip({
          label: `What is ${band.title}?`,
          title: band.title,
          body: band.meaning,
          buttonClass: [
            "inline-flex h-4 w-4 shrink-0 items-center justify-center",
            "rounded-full align-middle transition-colors hover:text-finn-accent-blue",
          ].join(" "),
          idleClass: "opacity-60",
          activeClass: "opacity-100",
        }),
      ],
    ),

    el(
      "ul",
      { class: "mt-2 flex flex-wrap gap-1.5" },
      band.features.map((feature) =>
        el("li", {}, [featureChip(feature, FEATURE_CHIP_TONE[band.level], false)]),
      ),
    ),
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

/* -------------------------------------------------------------------------- */
/* Efficiency                                                                 */
/* -------------------------------------------------------------------------- */

/** A small coloured label carrying a verdict the text then justifies. */
function verdictChip(label: string, className: string): HTMLElement {
  return el("span", {
    class: [
      "inline-flex shrink-0 items-center rounded-full px-2.5 py-1",
      "text-[11px] font-black",
      className,
    ].join(" "),
    text: label,
  });
}

/**
 * How much energy this car uses, for every car and every reader.
 *
 * One of three renderings of `readUsage` — this panel, the pinned car's card,
 * and the advice page's `EnergyUse`. Which of the three answers a car gets,
 * and the words it gets them in, are decided there; this only lays them out.
 *
 * The reading used to be written only inside the environmental-impact
 * priority, so whether a reader was told a car drinks 9 L/100km depended on
 * whether they had ranked the environment — when it is on their bill every
 * month either way. It is always here now, straight after the cost, whether or
 * not the environment is ranked: the environmental result carries only CO₂,
 * and says in one line where fuel use meets it.
 *
 * What a car runs on decides which reference the figure is measured against,
 * in what unit, and whether it can be graded at all. Where there is a table it
 * is the pill beside the row's name, tinted in the row's tone, as the class is
 * on the environmental result's CO₂ card; where there isn't, it leads the
 * section beside the chip standing in for a verdict.
 */
function efficiencySection(analysis: FitAnalysis): HTMLElement {
  const drawn = efficiencyContent(analysis);

  /* What the environmental result's "How much it uses" link scrolls to. */
  drawn.setAttribute("data-section", USAGE_SECTION);
  drawn.classList.add("outline-none");

  return drawn;
}

function efficiencyContent(analysis: FitAnalysis): HTMLElement {
  const reading = readUsage(analysis.vehicle);

  /*
   * With no table to carry what it runs on as the row's pill, it leads here,
   * beside the chip standing in for a verdict.
   */
  if (reading.kind !== "graded") {
    return section(
      "How much it uses",
      el("div", { class: "mt-2 flex flex-wrap items-center gap-2" }, [
        reading.fuel
          ? verdictChip(reading.fuel, "bg-finn-highlight-navy text-white")
          : null,
        verdictChip(reading.verdict, "bg-finn-cotton text-finn-iron"),
      ]),
      el("p", {
        class: "mt-3 text-[12px] leading-[18px] text-finn-black",
        text: reading.body,
      }),
    );
  }

  return section(
    "How much it uses",

    el("p", {
      class: "mt-2 text-[12px] leading-[18px] text-finn-black",
      text: reading.efficiency.reasoning,
    }),

    /*
     * The environmental result's own table, with the one row this section has:
     * the figure, the FINN Lens benchmark beside it, the verdict in its
     * colour, what it runs on as the pill beside the row's name, and the test
     * disclaimer under it. What each number means opens from the row's "i".
     */
    el("div", { class: "@container mt-3" }, [comparisonTable(reading.table)]),
  );
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
 * this is — which is also where the chip's own colour comes from now, handed
 * down rather than worked out again from facts the group already knew.
 */
/**
 * `withLevel` is false where the chips are already sorted under a heading
 * naming their level and tinted in its colour: a dot and a badge saying the
 * same thing a third time is noise, not emphasis.
 */
function featureChip(
  feature: FitFeature,
  chipClass: string,
  withLevel = true,
): HTMLElement {
  const level =
    withLevel && feature.importance ? FEATURE_IMPORTANCE[feature.importance] : null;

  const info = feature.explanation
    ? infoTip({
        label: `What is ${feature.label}?`,
        title: feature.label,
        body: feature.explanation,
        buttonClass: [
          "-mr-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center",
          "rounded-full align-middle transition-opacity hover:opacity-100",
        ].join(" "),
        idleClass: "opacity-70",
        activeClass: "opacity-100",
      })
    : null;

  return el(
    "span",
    {
      class: [
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
        "text-[11px] font-bold",
        chipClass,
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
      withLevel && feature.importance === "high"
        ? el("span", {
            class: "text-[10px] font-black opacity-70",
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

/**
 * One line of the bill: its mark, what it is, where the number came from, the
 * number, and an "i" that opens the engine's account of it under the row.
 *
 * The mark sits in a circle tinted by where the number came from, so the three
 * kinds of figure are told apart at a glance and the colour agrees with the
 * words under the label rather than replacing them.
 *
 * The "i" is the same one "How much it uses" carries, in the same place: at the
 * far right of the row, opening under it and staying open until it is closed
 * again. It used to be a tooltip pinned to the label, which covered the row
 * below it, closed when the pointer drifted, and put a paragraph in a place
 * meant for a phrase — and it meant the panel had two different affordances
 * for one idea, a few hundred pixels apart.
 */
function costRow(line: CostLine, breakdown: CostBreakdown, fuelType: FuelType | null): HTMLElement {
  const contract = contractTag(line, breakdown.contractType);

  return explainedRow({
    label: line.label,
    /*
     * The engine writes a full account of every line — where the number came
     * from, which of the reader's assumptions went into it, and why it is
     * missing when it is. Titled as the question it answers, which is also
     * what the "i" is named for a screen reader.
     */
    explanations: [{ title: `What is ${line.label}?`, body: line.explanation }],
    rowClass: "rounded-2xl bg-finn-snow px-3 py-2.5",
    attrs: { "data-line": line.id },
    content: [
      el("div", { class: "flex items-start gap-3" }, [
        el(
          "span",
          {
            class: `flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${COST_SOURCE_TONE[line.source]}`,
            attrs: { "aria-hidden": "true" },
          },
          [icon(costIcon(line, fuelType), "h-4 w-4")],
        ),

        el("div", { class: "min-w-0 flex-1" }, [
          el("div", { class: "flex items-baseline justify-between gap-3" }, [
            el("span", { class: "flex min-w-0 flex-wrap items-center gap-1.5" }, [
              el("span", {
                class: "text-[12px] font-bold leading-4 text-finn-black",
                text: line.label,
              }),

              /*
               * Which of FINN's two prices this is, in the tint that means
               * "you chose this" everywhere else in the bill.
               */
              contract
                ? el("span", {
                    class: `rounded-full px-2 py-0.5 text-[10px] font-black leading-4 ${COST_SOURCE_TONE.user}`,
                    text: contract,
                    attrs: { "data-contract": "" },
                  })
                : null,
            ]),

            el("span", {
              class: [
                "shrink-0 text-[13px] font-black tabular-nums",
                line.available ? "text-finn-black" : "text-finn-iron",
              ].join(" "),
              text: line.available && line.amount != null
                ? formatEUR(line.amount)
                : "Not available",
            }),
          ]),

          el("span", {
            class: "mt-0.5 block text-[10px] font-black uppercase tracking-[0.1em] text-finn-iron",
            text: COST_SOURCE_LABEL[line.source],
          }),
        ]),
      ]),
    ],
  });
}

/**
 * The gap between the price on FINN's page and the price for this reader.
 *
 * The one number in this section that is genuinely news. The subscription is
 * on the listing the panel is standing on; the reader has already read it, and
 * repeating it is the panel spending its most valuable space saying something
 * already known. What they cannot see anywhere on FINN is that their own
 * mileage and their own energy prices turn that number into a bigger one.
 *
 * Amber rather than red. Going over the included allowance is not a fault or a
 * warning — it is the ordinary consequence of driving more than the base
 * contract assumes, and most readers will. Red is kept for the budget line,
 * where the reader has actually set a limit and this car has passed it.
 */
function costGapChip(analysis: FitAnalysis): HTMLElement | null {
  const gap = advertisedGap(analysis);

  if (gap == null) return null;

  return verdictChip(
    `${formatEUR(gap)} a month more than the advertised price`,
    "bg-finn-warning-lift text-finn-warning-deep",
  );
}

/**
 * The budget verdict, marked as well as coloured.
 *
 * Over a budget the reader set is the one outcome here worth a warning, and it
 * gets the same triangle the caveats use. Within it gets a tick rather than
 * nothing, because the sentence is worth reading as an answer — a reader who
 * set a budget asked this question. An unknown status is not a verdict, so it
 * is left as plain grey prose with no mark at all.
 */
function budgetLine(sentence: string, status: CostBreakdown["budgetStatus"]): HTMLElement {
  const tone =
    status === "over"
      ? "text-finn-influence-red"
      : status === "unknown"
        ? "text-finn-iron"
        : "text-finn-influence-emerald";

  const mark =
    status === "over" ? "triangle-alert" : status === "unknown" ? null : "circle-check";

  return el("p", { class: `mt-2 flex items-start gap-2 text-[12px] leading-[18px] font-bold ${tone}` }, [
    mark ? icon(mark, "mt-0.5 h-3.5 w-3.5 shrink-0") : null,
    el("span", { text: sentence }),
  ]);
}

function costSection(analysis: FitAnalysis): HTMLElement {
  const { cost } = analysis;
  const { breakdown } = cost;

  const gap = costGapChip(analysis);

  return section(
    "What it costs you",

    /*
     * The total, with the mark of the thing it is: a wallet, solid navy, the
     * way "How much it uses" leads on what a car runs on. It names the
     * subject of the section rather than passing a verdict on it — the
     * verdicts here are the amber gap chip and the budget line, and both are
     * coloured for what they mean.
     */
    el("div", { class: "mt-2 flex items-center gap-3" }, [
      el(
        "span",
        {
          class: "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-finn-highlight-navy text-white",
          attrs: { "aria-hidden": "true" },
        },
        [icon("wallet", "h-5 w-5")],
      ),

      el("div", { class: "min-w-0" }, [
        el("p", {
          class: "text-2xl font-black leading-7 text-finn-black tabular-nums",
          text: formatEUR(breakdown.totalMonthly),
        }),
        el("p", {
          class: "text-[11px] leading-4 text-finn-iron",
          text: breakdown.complete
            ? "estimated per month"
            : "per month, and incomplete",
        }),
      ]),
    ]),

    gap
      ? el("div", { class: "mt-2 flex flex-wrap items-center gap-2" }, [gap])
      : null,

    el("p", {
      class: "mt-2 text-[12px] leading-[18px] text-finn-black",
      text: costLead(analysis),
    }),

    el(
      "div",
      { class: "mt-2.5 flex flex-col gap-2" },
      cost.lines.map((line) => costRow(line, breakdown, analysis.vehicle.fuelType ?? null)),
    ),

    cost.budgetSentence ? budgetLine(cost.budgetSentence, breakdown.budgetStatus) : null,

    /* Each caveat marked as one, rather than greyed out with the small print. */
    ...cost.caveats.map((caveat) =>
      el("p", { class: "mt-2 flex items-start gap-2 text-[11px] leading-4 text-finn-iron" }, [
        icon("triangle-alert", "mt-px h-3.5 w-3.5 shrink-0 text-finn-warning-deep"),
        el("span", { text: caveat }),
      ]),
    ),

    /*
     * The estimate disclaimer, with the estimates.
     *
     * It used to close the whole panel, several screens below the only numbers
     * it qualifies — so a reader who had finished with the cost and moved on to
     * the equipment never met it, and one who reached it had long since stopped
     * looking at the figures it was about. A caveat is worth reading next to
     * the thing it is a caveat about.
     */
    el("p", {
      class: "mt-3 border-t border-finn-cotton pt-3 text-[11px] leading-4 text-finn-iron",
      text: cost.disclaimer,
    }),
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Tradeoffs                                                               */
/* -------------------------------------------------------------------------- */

/**
 * One compromise, as a row of the tradeoff table.
 *
 * Marked with the priority it costs — the shield for safety, the leaf for the
 * environment, the wallet for a budget the reader set directly — and edged in
 * how loudly the engine decided to say it: orange where the loss lands near
 * the top of their order, amber further down. Red, edge and pill, for
 * equipment the reader gave extra influence and the car doesn't have, matching
 * that group in the feature table.
 *
 * The React twin is `components/FitAnalysisView/TradeoffRow`.
 */
function tradeoffRow(tradeoff: Tradeoff): HTMLElement {
  const reading = readTradeoff(tradeoff);

  return el(
    "div",
    { class: `${rowEdge(reading.tone)} px-3.5 py-3`, attrs: { "data-tradeoff": tradeoff.kind } },
    [
      el("div", { class: "flex items-start gap-2.5" }, [
        icon(reading.icon, "mt-0.5 h-4 w-4 shrink-0 text-finn-iron"),

        el("div", { class: "min-w-0 flex-1" }, [
          el("div", { class: "flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1" }, [
            el("p", {
              class: "text-[12px] font-black leading-[18px] text-finn-black",
              text: tradeoff.headline,
            }),

            /*
             * Which part of their answer this costs, and where they put it. A
             * compromise on the thing they ranked first is different news from
             * the same compromise on their fifth, and the row said so only in
             * the last of its three lines.
             */
            el("span", {
              class: `shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black leading-4 ${ROW_TONE[reading.tone].pill}`,
              text: reading.pill,
            }),
          ]),

          el("p", {
            class: "mt-0.5 text-[11px] leading-4 text-finn-iron",
            text: tradeoff.evidence,
          }),

          el("p", {
            class: "mt-1 text-[11px] leading-4 text-finn-iron",
            text: tradeoff.relevance,
          }),
        ]),
      ]),
    ],
  );
}

function tradeoffsSection(analysis: FitAnalysis): HTMLElement | null {
  if (!analysis.tradeoffs.length) return null;

  return section(
    "Things to consider",
    el("div", { class: "mt-2" }, [factTable(analysis.tradeoffs.map(tradeoffRow))]),
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
  notice: Node | null = null,
): DocumentFragment {
  return fragment([
    notice,
    fitHeader(analysis),

    /*
     * Money first, then what drives it, then the fit.
     *
     * The panel opens over a listing the reader has already read, so its first
     * screen has to earn its place by saying something that page does not. The
     * five priority sections are the most *detailed* thing here and were the
     * first thing here, which put a long audit of equipment — much of which
     * the reader can see in FINN's own spec list — in front of the two answers
     * only this extension can give: what the car actually costs at their
     * mileage, and whether it is a thirsty example of its kind.
     *
     * The header still carries the verdict, so a reader who wants only the
     * fit answer has it before any of this. What follows is the working, in
     * the order it is worth reading: the cost, the consumption that explains
     * part of the cost, why it fits, each priority in turn, and last what they
     * would be giving up.
     */
    costSection(analysis),
    efficiencySection(analysis),

    strengthsSection(analysis, notice != null),
    ...analysis.priorities.map(prioritySection),
    tradeoffsSection(analysis),
  ]);
}
