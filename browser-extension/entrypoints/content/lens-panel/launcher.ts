import { el, panelStyles } from "./dom";
import { closePanel, openPanel, watchPanelVisibility } from "./panel";
import { detailsPageRoot } from "./currentCar";

/**
 * The way in: one button, on car pages only.
 *
 * Where it goes was the open question. The pin button has an obvious home —
 * it belongs to the card it pins — and this one doesn't belong to anything on
 * the page. The candidates were a slot next to the car's `<h1>` and a control
 * anchored to the viewport, and the second wins on the requirement that
 * matters most here: it works whatever FINN's detail page is laid out like
 * this week, it can't reflow anything, and taking it away on navigation is one
 * `remove()`.
 *
 * It is gated on the details-page root the rest of the content script already
 * uses to recognise a car page, so it never appears anywhere else.
 */

const HOST_ID = "finn-lens-launcher-root";

let host: HTMLElement | null = null;

/**
 * Which page this mount is for.
 *
 * Mounting waits on a stylesheet fetch, and it is kicked off from the mutation
 * observer, so two of them can easily be in flight at once and a reader can
 * navigate away in the middle of one. Bumping the generation on every unmount
 * lets a mount that has come back late notice that the page it was for is
 * gone.
 */
let generation = 0;
let mounting = false;

export async function mountLauncher(): Promise<void> {
  if (host?.isConnected || mounting) return;
  if (!detailsPageRoot()) return;

  const mountedFor = generation;

  mounting = true;

  try {
    await attach(mountedFor);
  } finally {
    mounting = false;
  }
}

async function attach(mountedFor: number): Promise<void> {
  const node = el("div", { attrs: { id: HOST_ID } });

  /*
   * Clear of FINN's own sticky footer on small screens, and below the panel's
   * own layer so that opening one never leaves the button on top of it.
   */
  node.style.cssText =
    "position:fixed;right:16px;bottom:16px;z-index:2147482000;";

  const shadow = node.attachShadow({ mode: "open" });

  shadow.append(el("style", { text: await panelStyles() }));

  const button = el(
    "button",
    {
      class: [
        "flex items-center gap-2 rounded-full pl-3.5 pr-4 py-2.5",
        "bg-white text-finn-black font-sans",
        "border border-finn-cotton shadow-[0_2px_14px_rgba(0,0,0,0.16)]",
        "text-[13px] font-bold whitespace-nowrap cursor-pointer",
        "transition-all duration-150 hover:border-finn-accent-blue",
        "hover:text-finn-accent-blue active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-finn-accent-blue/50",
      ].join(" "),
      attrs: { type: "button" },
      on: { click: () => void openPanel() },
    },
    [
      el("span", {
        class: "text-sm",
        attrs: { "aria-hidden": "true" },
        text: "🔍",
      }),
      el("span", { text: "How does this car fit me?" }),
    ],
  );

  shadow.append(button);

  /*
   * Out of the way while the panel is open.
   *
   * Docked, the panel is the thing on the right of the screen; a floating
   * button offering to open what is already open would sit on top of it and
   * say nothing. Closing brings it back, which is what the panel's own ✕ is
   * for.
   */
  watchPanelVisibility((visible) => {
    node.style.display = visible ? "none" : "";
  });

  /* A slow stylesheet fetch can outlive the page it was for. */
  if (mountedFor !== generation || !detailsPageRoot()) return;

  document.body.append(node);
  host = node;
}

/**
 * Takes the whole feature off the page.
 *
 * Called on every client-side navigation, because FINN moves between cars
 * without reloading and a panel describing the car the reader has just left is
 * worse than no panel.
 */
export function unmountLauncher(): void {
  generation += 1;

  closePanel();

  host?.remove();
  host = null;
}
