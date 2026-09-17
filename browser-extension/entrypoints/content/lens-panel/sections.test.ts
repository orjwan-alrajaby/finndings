import { beforeEach, describe, expect, it } from "vitest";
import { parseHTML } from "linkedom";

import { buildFitAnalysis } from "@/lib/reasoning-engine/fit";
import {
  DEFAULT_PREFERENCES,
  PROFILES,
  profileEmphasis,
} from "@/lib/reasoning-engine/constants";
import { makeCar } from "@/lib/reasoning-engine/test-fixtures";
import type { PinnedFinnCar } from "@/lib/types";

import { CATEGORIES, FEATURES, FEATURE_IMPORTANCE, IMPORTANCE_LEVELS } from "@/lib/reasoning-engine/constants";
import { analysisBody, closeInfoTip } from "./sections";

/**
 * The panel's priorities, as disclosures that start open.
 *
 * Open is the default and stays the default: a reader who opened this panel
 * asked how the car fits them, and the evidence is the answer. What the
 * header buys them is the ability to fold a priority away once it has been
 * read — five of these is a long scroll in a 26rem column.
 */

let root: HTMLElement;

function render(): HTMLElement {
  const car: PinnedFinnCar = {
    ...makeCar({
      id: 1,
      name: "BYD Dolphin Surf",
      featuresSupplied: true,
      features: [
        "hasIsofix",
        "hasEmergencyBrakingAssist",
        "hasAppleCarPlaySlashAndroidAuto",
        "hasSplitFoldingRearSeats",
        "hasHeatedSeats",
        "hasRainSlashLightSensors",
        "hasRearCrosswalkWarning",
      ],
    }),
    pinnedAt: "2026-01-01",
  };

  /*
   * Nervous Driver, because its emphasis raises items at more than one level:
   * blind spot warning and rear cross-traffic alert highly, matrix LED
   * somewhat. This car has the cross-traffic alert and not the other two, so
   * its first priority shows a pick it meets and misses at two levels.
   */
  const analysis = buildFitAnalysis(
    car,
    [...PROFILES.nervous.priorities],
    DEFAULT_PREFERENCES,
    profileEmphasis("nervous"),
  );

  const host = document.createElement("div");

  host.append(analysisBody(analysis));

  return host;
}

beforeEach(() => {
  const { document: doc } = parseHTML(
    "<!doctype html><html><body></body></html>",
  );

  /*
   * `analysisBody` builds a pin control, which subscribes to storage so that
   * pinning from the card behind the panel reaches it. That subscription is
   * synchronous, so the panel can no longer be rendered in a world with no
   * extension APIs at all — which this test was previously getting away with
   * only because the control's other browser call is a promise whose rejection
   * it already swallows.
   */
  Object.assign(globalThis, {
    document: doc,
    browser: {
      storage: {
        local: { get: async () => ({}), set: async () => {} },
        onChanged: { addListener: () => {}, removeListener: () => {} },
      },
    },
  });

  root = render();
});

/** The header of the first priority, and the body it controls. */
function firstPriority(): { header: HTMLElement; body: HTMLElement } {
  const header = root.querySelector<HTMLElement>(
    'button[aria-controls^="finn-lens-priority-"]',
  );

  if (!header) throw new Error("no priority header");

  const id = header.getAttribute("aria-controls") ?? "";
  const body = root.querySelector<HTMLElement>(`#${id}`);

  if (!body) throw new Error("no priority body");

  return { header, body };
}

describe("prioritySection", () => {
  it("starts open, with the evidence on the page", () => {
    const { header, body } = firstPriority();

    expect(header.getAttribute("aria-expanded")).toBe("true");
    expect(body.classList.contains("hidden")).toBe(false);
    expect(body.textContent).toContain("Blind spot warning");
  });

  it("folds away when the header is clicked", () => {
    const { header, body } = firstPriority();

    header.click();

    expect(header.getAttribute("aria-expanded")).toBe("false");
    expect(body.classList.contains("hidden")).toBe(true);
    expect(body.classList.contains("flex")).toBe(false);
  });

  it("comes back, laid out the way it was", () => {
    const { header, body } = firstPriority();

    header.click();
    header.click();

    expect(header.getAttribute("aria-expanded")).toBe("true");
    expect(body.classList.contains("hidden")).toBe(false);
    /* Tailwind's `hidden` and `flex` are the same property: both must move. */
    expect(body.classList.contains("flex")).toBe(true);
  });

  it("keeps the rank, the name and the band visible while closed", () => {
    const { header } = firstPriority();

    header.click();

    expect(header.textContent).toContain("Your priority #1");
    expect(header.textContent).toContain("Safety & Driver Assistance");
  });

  it("heads each priority with a real h3 around the trigger", () => {
    const { header } = firstPriority();

    /*
     * Around, not inside. A heading nested in a button is read out and then
     * left out of the outline, so a reader navigating by heading could not
     * reach a single priority.
     */
    expect(header.parentElement?.tagName.toLowerCase()).toBe("h3");
    expect(header.querySelector('[role="heading"]')).toBeNull();
  });
});

describe("the feature table", () => {
  /*
   * A summary, then a card per section, each in its own colour: what you
   * raised gold, other counted items green when listed and red when not, and
   * the standard equipment blue.
   */
  it("draws a summary and a coloured card per section, in order", () => {
    const sections = [...root.querySelectorAll<HTMLElement>("[data-group]")];
    const order = ["raised", "countedListed", "countedUnlisted", "countedUnknown", "standard"];
    const palette = {
      raised: "gold",
      countedListed: "green",
      countedUnlisted: "red",
      countedUnknown: "grey",
      standard: "blue",
    } as const;

    expect(root.querySelector("[data-tally]")?.textContent).toMatch(/\d+ listed/);

    for (const table of root.querySelectorAll("[data-feature-table]")) {
      const ids = [...table.querySelectorAll("[data-group]")].map((section) => section.getAttribute("data-group"));
      expect(ids).toEqual(order.filter((id) => ids.includes(id)));
    }

    for (const section of sections) {
      const id = section.getAttribute("data-group") as keyof typeof palette;

      expect(section.getAttribute("data-palette")).toBe(palette[id]);
      expect(section.tagName.toLowerCase()).toBe("section");
    }

    const card = (id: string) => root.querySelector(`[data-group="${id}"]`)?.getAttribute("class") ?? "";

    expect(card("raised")).toContain("bg-amber-50");
    expect(card("standard")).toContain("bg-blue-50");
    expect(card("countedListed")).toContain("bg-emerald-50");
    expect(card("countedUnlisted")).toContain("bg-rose-50");
  });

  it("calls the raised section \"You raised\", whoever set the raises", () => {
    expect(root.querySelector('[data-group="raised"] h4')?.textContent).toBe("You raised");
  });

  it("keeps each counted section to one state, and tallies the mixed ones", () => {
    const states = (id: string) =>
      [...root.querySelectorAll(`[data-group="${id}"] [data-state]`)].map((chip) => chip.getAttribute("data-state"));

    for (const state of states("countedListed")) expect(state).toBe("listed");
    for (const state of states("countedUnlisted")) expect(state).toBe("unlisted");

    for (const section of root.querySelectorAll<HTMLElement>('[data-group="raised"], [data-group="standard"]')) {
      const chips = [...section.querySelectorAll("[data-state]")];
      const listed = chips.filter((chip) => chip.getAttribute("data-state") === "listed").length;
      const unlisted = chips.filter((chip) => chip.getAttribute("data-state") === "unlisted").length;

      if (listed + unlisted) expect(section.textContent).toContain(`${listed} of ${listed + unlisted} listed`);
    }
  });

  it("marks each chip's state with its icon, and strikes nothing", () => {
    for (const chip of root.querySelectorAll<HTMLElement>("[data-state]")) {
      const icon = chip.querySelector("svg")?.getAttribute("class") ?? "";

      if (chip.getAttribute("data-state") === "listed") expect(icon).toContain("text-emerald-600");
      if (chip.getAttribute("data-state") === "unlisted") expect(icon).toContain("text-rose-600");
    }

    expect(root.querySelector(".line-through")).toBeNull();
  });

  it("shows the level a raised item was given as a badge, and only on raised items", () => {
    expect(root.querySelector('[data-group="raised"] [title^="You said this should count"]')).not.toBeNull();

    for (const section of root.querySelectorAll('[data-group]:not([data-group="raised"])')) {
      expect(section.querySelector('[title^="You said this should count"]')).toBeNull();
    }
  });
});

/**
 * The explanations, one at a time, under the group they belong to.
 *
 * Chips wrap, so there is no "under this one" to open into — the group holds
 * a single slot and the chips take turns in it. Which means the slot has to
 * swap rather than stack, and the "i" that opened it has to be able to close
 * it again.
 */
describe("chip explanations", () => {
  /** The "i" buttons of the first chip group holding more than one of them. */
  function infoButtons(): HTMLElement[] {
    for (const group of root.querySelectorAll<HTMLElement>("ul")) {
      const buttons = [
        ...group.querySelectorAll<HTMLElement>('button[aria-label^="What is"]'),
      ];

      if (buttons.length > 1) return buttons;
    }

    throw new Error("no group with two explanations");
  }

  /* The tooltip is added to the panel the first time it opens. */
  const tipFor = (button: HTMLElement) =>
    root.querySelector<HTMLElement>(`#${button.getAttribute("aria-controls") ?? "missing"}`);

  it("says nothing until asked", () => {
    const [first] = infoButtons();

    expect(first).toBeDefined();
    expect(tipFor(first!)).toBeNull();
    expect(first!.getAttribute("aria-expanded")).toBe("false");
  });

  it("opens a tooltip naming what it is explaining", () => {
    const [first] = infoButtons();

    first!.click();

    const tip = tipFor(first!);

    expect(tip?.getAttribute("role")).toBe("tooltip");
    expect(tip?.classList.contains("hidden")).toBe(false);
    expect(first!.getAttribute("aria-expanded")).toBe("true");
    expect(tip?.textContent).toContain(
      first!.getAttribute("aria-label")?.replace("What is ", "").replace("?", "") ?? "",
    );

    first!.click();
  });

  it("swaps rather than stacks when a second is asked about", () => {
    const [first, second] = infoButtons();

    first!.click();
    second!.click();

    expect(first!.getAttribute("aria-expanded")).toBe("false");
    expect(second!.getAttribute("aria-expanded")).toBe("true");
    expect(
      [...root.querySelectorAll('[role="tooltip"]')].filter((tip) => !tip.classList.contains("hidden")),
    ).toHaveLength(1);

    second!.click();
  });

  it("closes again on the one that opened it", () => {
    const [first] = infoButtons();

    first!.click();
    first!.click();

    /* Taken off the panel, so closed tips can't collect in the shadow root. */
    expect(tipFor(first!)).toBeNull();
    expect(first!.getAttribute("aria-expanded")).toBe("false");
  });

  /*
   * The panel redraws when settings change, and a tip lives outside the
   * content that is replaced. Left open, it floated on over the new reading.
   */
  it("can be closed from outside, as the panel does before it redraws", () => {
    const [first] = infoButtons();

    first!.click();
    expect(tipFor(first!)).not.toBeNull();

    closeInfoTip();

    expect(tipFor(first!)).toBeNull();
    expect(first!.getAttribute("aria-expanded")).toBe("false");
  });
});


describe("standard equipment", () => {
  it("lists every standard item under a priority, each with this car's answer", () => {
    const { body } = firstPriority();
    const block = body.querySelector<HTMLElement>('[data-group="standard"]');

    if (!block) throw new Error("no standard equipment row");

    const states = Object.fromEntries(
      [...block.querySelectorAll("[data-state]")].map((chip) => [
        chip.querySelector("span")?.textContent,
        chip.getAttribute("data-state"),
      ]),
    );

    /* Safety's five, less any the profile raised: this car lists emergency braking. */
    expect(block.querySelectorAll("[data-state]").length).toBe(CATEGORIES.safetyAssistance.expected.length);
    expect(states[FEATURES.hasEmergencyBrakingAssist.label]).toBe("listed");
    expect(states[FEATURES.hasLaneKeepingAssist.label]).toBe("unlisted");
    expect(block.textContent).not.toMatch(/counts against|FINN Lens counted|%/i);
  });

  it("opens where standard comes from in place, with the laws linked", () => {
    const block = firstPriority().body.querySelector<HTMLElement>('[data-group="standard"]')!;
    const toggle = block.querySelector<HTMLButtonElement>(
      'button[aria-label="Where does standard equipment come from?"]',
    )!;
    const panel = block.querySelector<HTMLElement>(`#${toggle.getAttribute("aria-controls")}`)!;

    expect(panel.classList.contains("hidden")).toBe(true);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    toggle.click();

    expect(panel.classList.contains("hidden")).toBe(false);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(panel.textContent).toMatch(/nearly every car on finn\.com comes with it/);
    expect([...panel.querySelectorAll("a")].map((link) => link.getAttribute("href"))).toContain(
      "https://eur-lex.europa.eu/eli/reg/2019/2144/oj",
    );

    toggle.click();

    expect(panel.classList.contains("hidden")).toBe(true);
  });
});
