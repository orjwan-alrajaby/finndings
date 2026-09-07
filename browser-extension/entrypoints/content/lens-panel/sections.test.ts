import { beforeEach, describe, expect, it } from "vitest";
import { parseHTML } from "linkedom";

import { buildFitAnalysis } from "@/lib/reasoning-engine/fit";
import {
  DEFAULT_PREFERENCES,
  DEFAULT_PRIORITIES,
} from "@/lib/reasoning-engine/constants";
import { makeCar } from "@/lib/reasoning-engine/test-fixtures";
import type { PinnedFinnCar } from "@/lib/types";

import { FEATURE_IMPORTANCE } from "@/lib/reasoning-engine/constants";
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

  Object.assign(globalThis, { document: doc });

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
   * The level the reader gave a feature, shown the way the Advice page shows
   * it: a dot in the level's colour, not a filled pill spelling the level out
   * on every chip.
   */
  it("carries the reader's level as a dot, with the words only at the top", () => {
    const dot = root.querySelector('[title^="You said this should count"]');

    expect(dot?.getAttribute("title")).toBe(
      "You said this should count highly",
    );

    /* Read from the constant rather than spelled out, so rewording the scale
       is a rewording rather than a broken test. */
    expect(root.textContent).toContain(FEATURE_IMPORTANCE.high.badgeLabel);
    expect(root.textContent).not.toContain(
      FEATURE_IMPORTANCE.medium.badgeLabel,
    );
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
  /** The "i" buttons of the first group holding more than one of them. */
  function infoButtons(): HTMLElement[] {
    const groups = [
      ...root.querySelectorAll<HTMLElement>('[id^="finn-lens-explains-"]'),
    ].map((slot) => slot.parentElement);

    for (const group of groups) {
      const buttons = [
        ...(group?.querySelectorAll<HTMLElement>(
          'button[aria-label^="What is"]',
        ) ?? []),
      ];

      if (buttons.length > 1) return buttons;
    }

    throw new Error("no group with two explanations");
  }

  function slotFor(button: HTMLElement): HTMLElement {
    const id = button.getAttribute("aria-controls") ?? "";
    const slot = root.querySelector<HTMLElement>(`#${id}`);

    if (!slot) throw new Error("no explanation slot");

    return slot;
  }

  it("says nothing until asked", () => {
    const [first] = infoButtons();

    expect(first).toBeDefined();
    expect(slotFor(first!).classList.contains("hidden")).toBe(true);
  });

  it("opens under the group, naming what it is explaining", () => {
    const [first] = infoButtons();
    const slot = slotFor(first!);

    first!.click();

    expect(slot.classList.contains("hidden")).toBe(false);
    expect(first!.getAttribute("aria-expanded")).toBe("true");
    expect(slot.textContent).toContain(
      first!.getAttribute("aria-label")?.replace("What is ", "").replace("?", "") ?? "",
    );
  });

  it("swaps rather than stacks when a second is asked about", () => {
    const [first, second] = infoButtons();
    const slot = slotFor(first!);

    first!.click();
    second!.click();

    expect(first!.getAttribute("aria-expanded")).toBe("false");
    expect(second!.getAttribute("aria-expanded")).toBe("true");
    expect(slot.querySelectorAll("p")).toHaveLength(2);
  });

  it("closes again on the one that opened it", () => {
    const [first] = infoButtons();
    const slot = slotFor(first!);

    first!.click();
    first!.click();

    expect(slot.classList.contains("hidden")).toBe(true);
    expect(first!.getAttribute("aria-expanded")).toBe("false");
  });
});
