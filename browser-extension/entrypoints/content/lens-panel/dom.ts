/**
 * The smallest thing that can build a panel.
 *
 * The rest of the extension's UI is React, and none of it runs here: this code
 * is injected into every finn.com page the reader opens, so the whole content
 * script is 37 kB and adding a rendering library to it would be most of a
 * megabyte for one panel that is usually never opened. The panel is built and
 * thrown away in one pass instead, which is all a read-only view needs.
 */

import { LENS_PANEL_ICONS } from "./icons";

type Child = Node | string | null | undefined | false;

interface Options {
  class?: string;
  /** Always text, never markup — every string here escapes on the way in. */
  text?: string;
  attrs?: Record<string, string>;
  on?: Partial<Record<keyof HTMLElementEventMap, (event: Event) => void>>;
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: Options = {},
  children: Child[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);

  if (options.class) node.className = options.class;
  if (options.text != null) node.textContent = options.text;

  for (const [name, value] of Object.entries(options.attrs ?? {})) {
    node.setAttribute(name, value);
  }

  for (const [event, handler] of Object.entries(options.on ?? {})) {
    node.addEventListener(event, handler as EventListener);
  }

  for (const child of children) {
    if (child == null || child === false) continue;
    node.append(child);
  }

  return node;
}

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * An inline icon, built through the DOM rather than pasted in as markup.
 *
 * `el` deliberately has no `innerHTML`, so an icon can't be a string here.
 * A few namespaced elements is a small price for keeping the one function that
 * could inject markup out of the file entirely.
 *
 * Takes a whole icon node rather than a single path because most of these
 * marks are several shapes — twelve strokes for a snowflake — and the two
 * that aren't were the exception. The stroke settings are lucide's own, so a
 * mark drawn here and the same mark drawn by `PriorityIcon` in the React
 * surfaces are the same picture.
 *
 * `color` resolves the `currentColor` the shapes are drawn with, the same way
 * the React component's `color` prop does. Left out, the mark inherits from
 * whatever it sits in, which is what every control on the panel wants.
 *
 * `solid` fills the shape as well as stroking it. It is on for the priority
 * marks and off for the controls, matching `PriorityIcon`: a filled chevron
 * or close cross would be either meaningless or wrong, and the marks are the
 * only things here small enough and shaped right to gain from it.
 */
export function icon(
  name: string,
  className: string,
  { color, solid = false }: { color?: string; solid?: boolean } = {},
): SVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");

  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", solid ? "currentColor" : "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", className);

  if (color) svg.setAttribute("color", color);

  /* An unknown name draws nothing rather than throwing: a missing mark should
     cost the reader an empty box, not the panel. */
  for (const [tag, attrs] of LENS_PANEL_ICONS[name] ?? []) {
    const shape = document.createElementNS(SVG_NS, tag);

    for (const [attr, value] of Object.entries(attrs)) {
      shape.setAttribute(attr, value);
    }

    svg.append(shape);
  }

  return svg;
}

/** A run of elements with no wrapper of their own. */
export function fragment(children: Child[]): DocumentFragment {
  const frame = document.createDocumentFragment();

  for (const child of children) {
    if (child == null || child === false) continue;
    frame.append(child);
  }

  return frame;
}

/** Removes every child without leaving the node itself behind. */
export function empty(node: Element): void {
  while (node.firstChild) node.firstChild.remove();
}

/**
 * The stylesheet the extension already builds, put inside a shadow root.
 *
 * The content script injects this same CSS into finn.com's own document, which
 * is how the pin buttons are styled. That is fine for a 32-pixel button and
 * not fine for a panel: it is a full Tailwind build including a reset, and the
 * more of the page it touches the more chance it has of changing something
 * FINN drew. Inside a shadow root none of it can reach the page, and Tailwind
 * v4 declares its theme on `:root, :host` so the tokens still resolve.
 *
 * Fetched once and cached for the life of the page.
 */
let stylesheet: Promise<string> | null = null;

export function panelStyles(): Promise<string> {
  /*
   * Not one of the entrypoints WXT generates a path type for — it's the CSS
   * the content script itself is built with, listed as a web-accessible
   * resource in wxt.config.ts so it can be fetched from here.
   */
  const href = browser.runtime.getURL(
    "/content-scripts/content.css" as never,
  );

  stylesheet ??= fetch(href)
    .then((response) => response.text())
    .catch((error: unknown) => {
      console.error("[FinnLens] couldn't load panel styles", error);
      return "";
    });

  return stylesheet;
}
