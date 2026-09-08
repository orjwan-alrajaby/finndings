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
 * Colour is left to the class, which is why there is no parameter for it. The
 * priority marks come in on a `text-*`/`fill-*` pair out of `MARK_TONES`, and
 * the controls come in with neither and inherit — the `fill="none"` set here
 * is what they keep, and a `fill-*` utility is what overrides it when a mark
 * wants an inside. A filled chevron or close cross would be meaningless or
 * wrong, so no control asks for one.
 */
export function icon(name: string, className: string): SVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");

  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", className);

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

/**
 * Lens's own mark, for the places that have to say whose they are.
 *
 * Everything else this file draws is lucide, and a lucide magnifier is what
 * the badge and the panel header used to open with. On finn.com that is the
 * wrong picture twice over: a magnifier on a car listing reads as *search*,
 * which is FINN's own control at the top of the page, and a generic glyph
 * over FINN's photography reads as FINN's. A reader has no way to tell that
 * the pill on the card and the panel it opens are a different party's
 * opinion — which is the one thing they most need to know, because Lens
 * ranks these cars against what the reader said and FINN does not.
 *
 * So the surfaces that sit inside FINN's page carry the mark instead. The
 * panel's inner furniture stays lucide: once the reader is in the panel the
 * question of whose it is has been answered, and a brand mark on every
 * section would be noise.
 *
 * It is the shipped PNG rather than a drawn shape because that is the only
 * form the mark exists in — public/icon/ is raster, and the SVG masters in
 * design/ are five earlier concepts, none of them this aperture. 128 is the
 * only size asked for anywhere here: these slots are 16-28px, so even a 3x
 * display is drawing it down, and one URL means the browser decodes it once
 * for a page of forty cards rather than once per size.
 *
 * **The white disc is part of the mark, not decoration.** It is the same
 * lockup the onboarding's first screen and the popup's brand row use — a
 * circle of white with a soft shadow, the artwork inset inside it — and the
 * reason to repeat it here is that these are the surfaces where the mark has
 * the least help. In the popup it sits under the word "Finn Lens"; on
 * finn.com it is alone, at 16px, over somebody else's photograph of a car.
 * The disc gives it a consistent ground to sit on whatever it lands over,
 * the shadow lifts it off a chip whose colour changes with the verdict, and
 * a reader who met the mark during setup meets the same object here.
 *
 * `alt` is empty on purpose. Every caller sits inside a control that already
 * names Lens in its own accessible name — the badge's `aria-label`, the
 * panel's heading — so a second announcement here would only repeat it.
 */
export function brandMark(size: number, className = ""): HTMLElement {
  const disc = document.createElement("span");
  const img = document.createElement("img");

  /*
   * Reachable from finn.com only because `icon/*` is a web-accessible
   * resource; see wxt.config.ts. Without that the browser blocks it and
   * these controls lose their mark with nothing in its place.
   */
  img.src = browser.runtime.getURL("/icon/128.png");
  img.alt = "";
  img.setAttribute("aria-hidden", "true");

  /*
   * Styled inline rather than by utility classes, which is the one thing here
   * that is not a style preference. The badge hangs in FINN's own card in the
   * light DOM, so FINN's stylesheet reaches it, and a listing rule as ordinary
   * as `.card img { width: 100% }` outranks `w-3` on specificity and would
   * blow the mark up to the width of the photograph. An inline declaration is
   * the one thing a page rule cannot outrank without `!important`.
   *
   * `size` is the disc, in px — the whole object, so callers size the thing
   * they are actually placing. The artwork is inset to 0.8 of it, which is
   * the same proportion as the 20-in-24 on the onboarding screen; the ring of
   * white left around it is what keeps the aperture from touching the edge
   * and reading as a cropped circle rather than a mark on a disc.
   */
  const inner = Math.round(size * 0.8);

  disc.className = className;
  disc.style.cssText = [
    "display:inline-flex",
    "align-items:center",
    "justify-content:center",
    `width:${size}px`,
    `height:${size}px`,
    "flex-shrink:0",
    "border-radius:9999px",
    "background:#fff",
    /* Tailwind's own `shadow-sm`, spelled out — the panel is in a shadow root
       and the badge is on FINN's page, and neither can rely on a class here. */
    "box-shadow:0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  ].join(";");

  img.style.cssText = [
    `width:${inner}px`,
    `height:${inner}px`,
    "flex-shrink:0",
    "object-fit:contain",
    /* FINN sets `img { display: block }` in places; the disc centres either
       way, but this keeps the box from picking up a text baseline gap. */
    "display:block",
  ].join(";");

  disc.append(img);

  return disc;
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
