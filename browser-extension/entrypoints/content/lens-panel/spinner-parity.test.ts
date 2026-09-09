import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parseHTML } from "linkedom";

import { spinner } from "./dom";
import { Spinner } from "@/components/Spinner";

/**
 * One loader, drawn twice.
 *
 * The extension's pages are React; the panel injected into finn.com builds its
 * DOM by hand, because carrying React into a shadow root on somebody else's
 * site would cost most of a megabyte for one drawer. So the wheel has two
 * renderers, and the thing worth protecting is that they draw the same wheel.
 *
 * `lib/brand-spinner` already stops the *figures* drifting — both read the
 * same path, radii and angles from it. What it cannot stop is the two
 * assembling those figures differently: a spoke group nested one level deeper,
 * the hub painted before the tyre, a rotation applied to the wrong shape. This
 * compares the structures the two actually produce.
 */
function shapesOf(svg: Element): string[] {
  return [...svg.querySelectorAll("circle, path")].map((node) =>
    [
      node.tagName.toLowerCase(),
      node.getAttribute("d") ?? "",
      node.getAttribute("r") ?? "",
      node.getAttribute("transform") ?? "",
      /* Inherited from the group in both, so read it off the element's own
         attribute only where it is set on the element. */
      node.getAttribute("fill") ?? "",
    ].join("|"),
  );
}

function reactSpinner(): Element {
  const html = renderToStaticMarkup(
    createElement(Spinner, { className: "h-4 w-4" }),
  );

  const { document } = parseHTML(`<!doctype html><html><body>${html}</body></html>`);

  return document.querySelector("svg") as unknown as Element;
}

function panelSpinner(): Element {
  const { document } = parseHTML("<!doctype html><html><body></body></html>");

  Object.assign(globalThis, { document });

  return spinner("h-4 w-4") as unknown as Element;
}

describe("the two spinners are one spinner", () => {
  it("draws the same shapes in the same order", () => {
    expect(shapesOf(panelSpinner())).toEqual(shapesOf(reactSpinner()));
  });

  it("draws all six spokes", () => {
    const spokes = shapesOf(reactSpinner()).filter((shape) =>
      shape.startsWith("path|"),
    );

    expect(spokes).toHaveLength(6);
    /* Five rotations and one at rest — a repeated angle would stack two
       spokes on top of each other and leave a gap in the wheel. */
    expect(new Set(spokes).size).toBe(6);
  });

  it("spins, and slows rather than stops when motion is unwelcome", () => {
    for (const svg of [reactSpinner(), panelSpinner()]) {
      const className = svg.getAttribute("class") ?? "";

      expect(className).toContain("animate-spin");
      expect(className).toContain("motion-reduce:[animation-duration:3s]");
    }
  });

  /* The words beside it carry the message; the wheel is decoration. */
  it("stays out of the accessibility tree", () => {
    for (const svg of [reactSpinner(), panelSpinner()]) {
      expect(svg.getAttribute("aria-hidden")).toBe("true");
    }
  });
});
