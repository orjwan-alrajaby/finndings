import { beforeEach, describe, expect, it } from "vitest";
import { parseHTML } from "linkedom";

import { buildFitAnalysis } from "@/lib/reasoning-engine/fit";
import {
  DEFAULT_PREFERENCES,
  DEFAULT_PRIORITIES,
} from "@/lib/reasoning-engine/constants";
import { makeCar } from "@/lib/reasoning-engine/test-fixtures";
import type { PinnedFinnCar } from "@/lib/types";

import { FEATURE_IMPORTANCE, IMPORTANCE_LEVELS } from "@/lib/reasoning-engine/constants";
import { analysisBody } from "./sections";

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
      ],
    }),
    pinnedAt: "2026-01-01",
  };

  const analysis = buildFitAnalysis(
    car,
    DEFAULT_PRIORITIES,
    DEFAULT_PREFERENCES,
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
    expect(body.textContent).toContain("Automatic emergency braking");
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

describe("feature groups", () => {
  it("counts what is in each group, in its own block", () => {
    const labels = [...root.querySelectorAll("p")]
      .map((node) => node.textContent ?? "")
      .filter((text) => text.includes("extra influence"));

    expect(labels.length).toBeGreaterThan(0);
    expect(labels.every((text) => /\(\d+\)$/.test(text.trim()))).toBe(true);
  });

  /*
   * These were five tinted cards, each with a ground, a label ink, a dot and a
   * chip colour to keep in agreement — and a pale blue chip that vanished into
   * the pale blue block around it. They are rows of the table the environmental
   * result and "How much it uses" are drawn in: one colour per row, on its
   * edge, and chips that read on the white underneath.
   */
  it("draws the groups as rows of one table, edged in what each one says", () => {
    const { body } = firstPriority();
    const groups = [...body.querySelectorAll("[data-group]")];

    expect(groups.length).toBeGreaterThan(1);

    /* One table for the priority, not one box per group. */
    const tables = new Set(groups.map((group) => group.parentElement));

    expect(tables.size).toBe(1);
    expect([...tables][0]?.parentElement?.getAttribute("class")).toContain(
      "border border-finn-cotton",
    );

    const edge = (id: string) =>
      root.querySelector(`[data-group="${id}"]`)?.getAttribute("class") ?? "";

    /* Blue for a pick it meets, red for one it misses, green for the rest. */
    if (root.querySelector('[data-group="pickedPresent"]')) {
      expect(edge("pickedPresent")).toContain("border-l-finn-accent-blue");
    }

    if (root.querySelector('[data-group="pickedAbsent"]')) {
      expect(edge("pickedAbsent")).toContain("border-l-finn-error");
    }

    if (root.querySelector('[data-group="present"]')) {
      expect(edge("present")).toContain("border-l-finn-success");
    }

    /* And the chips are legible on white, where they used to be white on tint. */
    for (const chip of root.querySelectorAll("[data-group] li > span")) {
      expect(chip.getAttribute("class")).not.toContain("bg-white");
    }
  });

  /*
   * The level the reader gave a feature used to ride on the chip itself — a
   * coloured dot, and the top level also spelled out in a badge. Both groups
   * made of their picks are sorted under headings that name the level now, so
   * the chip saying it again would be the third statement of one fact. It
   * still rides on the chip where nothing else says it: the Advice page's own
   * rows, which are not grouped this way.
   *
   * Read from the constants rather than spelled out here, so rewording the
   * scale is a rewording rather than a broken test.
   */
  it("leaves the level to the heading, rather than repeating it on every chip", () => {
    expect(root.querySelector("[data-band]")).not.toBeNull();
    expect(root.textContent).toContain(FEATURE_IMPORTANCE.high.badgeLabel);

    expect(root.querySelector('[title^="You said this should count"]')).toBeNull();

    for (const chip of root.querySelectorAll("li > span")) {
      for (const level of IMPORTANCE_LEVELS) {
        expect(chip.textContent).not.toContain(FEATURE_IMPORTANCE[level].badgeLabel);
      }
    }
  });

  /*
   * The picks the car hasn't got, under the level the reader gave each one.
   *
   * A flat list of five asks the reader to decode five coloured dots to find
   * out which of the gaps they actually called important. The level is a
   * heading now — so the chips underneath stop repeating it, and the question
   * it raises ("what does highly influential actually do?") is answered by an
   * "i" beside the heading rather than left hanging.
   */
  it("sorts both groups of picks under their level, strongest first", () => {
    /* Both, because the level is what the reader said about the feature —
       true of one they got as much as one they missed. */
    expect(root.querySelector('[data-group="pickedPresent"] [data-band]')).not.toBeNull();

    const group = root.querySelector('[data-group="pickedAbsent"]');
    const bands = [...(group?.querySelectorAll("[data-band]") ?? [])];

    expect(bands.length).toBeGreaterThan(1);
    expect(bands.map((band) => band.getAttribute("data-band"))).toEqual(
      [...IMPORTANCE_LEVELS].filter((level) =>
        bands.some((band) => band.getAttribute("data-band") === level),
      ),
    );

    for (const band of bands) {
      const level = band.getAttribute("data-band") as "high" | "medium" | "low";
      const step = FEATURE_IMPORTANCE[level];

      /* The level, named and counted. */
      expect(band.querySelector("p")?.textContent).toContain(
        `${step.badgeLabel} (${band.querySelectorAll("li").length})`,
      );

      /* The heading in the level's ink, and its chips in the level's tint. */
      expect(band.querySelector("p")?.getAttribute("class")).toContain(step.accentTextClass);

      for (const chip of band.querySelectorAll("li > span")) {
        expect(chip.getAttribute("class")).toContain(step.chipClass);
      }

      expect(band.querySelector('[title^="You said this should count"]')).toBeNull();
      expect(band.querySelector("ul")?.textContent).not.toContain(step.badgeLabel);

      /* And what the level does, behind the heading's own "i". */
      const info = band.querySelector(`button[aria-label="What is ${step.badgeLabel}?"]`) as HTMLElement;

      expect(info).not.toBeNull();

      info.click();

      expect(root.querySelector(`#${info.getAttribute("aria-controls")}`)?.textContent).toContain(
        step.meaning,
      );

      info.click();
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

    expect(tipFor(first!)?.classList.contains("hidden")).toBe(true);
    expect(first!.getAttribute("aria-expanded")).toBe("false");
  });
});

