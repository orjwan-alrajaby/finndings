import type { ChatHandshake, ChatToPage, PageContext, PageKind, RegisterChat } from "@/lib/lens-chat/messages";

import { DETAILS_PAGE_SELECTOR, HOME_PAGE_SELECTOR, LISTINGS_PAGE_SELECTOR } from "../constants";
import { brandMark, el, panelStyles } from "../lens-panel/dom";
import { CARD_SELECTORS, cardConfigId, cardForCar, resolveCar } from "../lens-panel/currentCar";
import { highlightConfiguration } from "../lens-panel/highlight";
import { setCarPinned } from "../lens-panel/pin-control";
import { extractConfigId } from "../injectors/inject-pin-button/injectPinCarButtonIntoNode/utils";
import { loadListingCars } from "../injectors/inject-pin-button/injectPinCarButtonIntoNode/api";
import {
    getLoadedCars,
    getPinnedCars,
    mergeLoadedCars,
} from "../injectors/inject-pin-button/injectPinCarButtonIntoNode/storage";
import { mapFinnConfigToAll } from "../manipulateApiData";

/**
 * "Ask Lens" on finn.com: a small bubble, and the chat it opens.
 *
 * Everything here is page plumbing. The conversation itself is a React
 * extension page (`entrypoints/lens-chat`) in an iframe, so none of React, the
 * reasoning engine's UI or the AI client is loaded into finn.com until the
 * reader opens it — and when they do, it runs on the extension's origin, not
 * FINN's. What this file owns is the part only a content script can see: which
 * cars the page draws, which configuration it is about, and pinning a car the
 * same way the card and the panel do.
 *
 * The iframe is created on first open and hidden, not destroyed, on close, so
 * a conversation survives closing the bubble while the reader browses; a full
 * page load starts a new one, which is as much memory as this experiment wants.
 */

const HOST_ID = "finn-lens-chat";

let host: HTMLElement | null = null;
let frame: HTMLIFrameElement | null = null;
let panel: HTMLElement | null = null;
let bubbleLabel: HTMLElement | null = null;
let isOpen = false;

/**
 * The secret this page's chat frame proves itself with.
 *
 * Registered with the background script for this tab, and handed only to the
 * frame this script creates — by a postMessage addressed to the extension's
 * origin, which finn.com's scripts can neither read nor redirect. It lives in
 * the content script's isolated world, never in the DOM.
 */
const token = crypto.randomUUID();

let registered: Promise<unknown> | null = null;

function register(): Promise<unknown> {
    registered ??= browser.runtime
        .sendMessage({ type: "LENS_CHAT_REGISTER", token } satisfies RegisterChat)
        .catch((error: unknown) => console.error("[FinnLens] couldn't register Ask Lens", error));

    return registered;
}

/* -------------------------------------------------------------------------- */
/* What the page shows                                                        */
/* -------------------------------------------------------------------------- */

function pageKind(): PageKind {
    if (document.querySelector(DETAILS_PAGE_SELECTOR)) return "details";
    if (document.querySelector(LISTINGS_PAGE_SELECTOR)) return "listing";
    if (document.querySelector(HOME_PAGE_SELECTOR)) return "home";
    return "other";
}

export function readPageContext(): PageContext {
    const ids: number[] = [];
    const carUrls: Record<number, string> = {};

    for (const card of document.querySelectorAll<HTMLElement>(CARD_SELECTORS)) {
        const id = cardConfigId(card);

        if (id == null || ids.includes(id)) continue;

        ids.push(id);

        const link = card.querySelector<HTMLAnchorElement>("a[href]")?.href;
        if (link) carUrls[id] = link;
    }

    const kind = pageKind();
    let currentCarId: number | null = null;
    let currentFromUrl = false;

    if (kind === "details") {
        const fromUrl = extractConfigId(
            new URL(window.location.href).searchParams.get("selected_config") ?? "",
        );

        const configurations = Array.from(
            document.querySelectorAll<HTMLElement>(`${DETAILS_PAGE_SELECTOR} [id^="product-"]`),
        )
            .map((node) => /^product-(\d+)$/.exec(node.id)?.[1])
            .filter(Boolean)
            .map(Number);

        currentFromUrl = fromUrl != null;
        currentCarId = fromUrl ?? configurations[0] ?? null;
    }

    return {
        kind,
        url: window.location.href,
        pageCarIds: ids,
        currentCarId,
        currentFromUrl,
        carUrls,
    };
}

/** Somewhere worth talking about cars: a page that draws some, or is about one. */
function pageHasCars(): boolean {
    return (
        Boolean(document.querySelector(DETAILS_PAGE_SELECTOR)) ||
        Boolean(document.querySelector(CARD_SELECTORS))
    );
}

/* -------------------------------------------------------------------------- */
/* Getting the page's cars to Lens                                            */
/* -------------------------------------------------------------------------- */

/** Pages already filled in this visit, so reopening the chat asks FINN nothing. */
const filled = new Set<string>();

/**
 * Makes sure the cars this page draws are cars Lens has, before the chat says
 * what it can compare.
 *
 * A car's page asks for its model the way the panel does, which returns every
 * configuration it lists; anything still missing — a listing rendered on FINN's
 * server, a rail of similar cars — comes from one call for FINN's whole list.
 * Two requests at most, and only because the reader opened the chat.
 */
async function fillPageCars(context: PageContext): Promise<void> {
    if (filled.has(context.url)) return;

    const known = async () => {
        const [loaded, pinned] = await Promise.all([getLoadedCars(), getPinnedCars()]);
        return context.pageCarIds.filter((id) => !loaded[id] && !pinned[id]);
    };

    try {
        if (context.currentCarId != null) {
            await resolveCar(context.currentCarId, { fetchIfMissing: true });
        }

        if ((await known()).length) {
            const response = await loadListingCars();
            await mergeLoadedCars(mapFinnConfigToAll(response.results ?? []));
        }

        filled.add(context.url);
    } catch (error) {
        /* The chat says honestly how many cars it has; a failed fill just means fewer. */
        console.error("[FinnLens] couldn't load this page's cars for Ask Lens", error);
    }
}

/* -------------------------------------------------------------------------- */
/* Messages from the chat                                                     */
/* -------------------------------------------------------------------------- */

let listening = false;

async function handle(message: ChatToPage): Promise<unknown> {
    switch (message.type) {
        case "LENS_CHAT_CONTEXT": {
            const context = readPageContext();
            await fillPageCars(context);
            return context;
        }

        case "LENS_CHAT_PIN":
            return pin(message.carId, message.pinned);

        case "LENS_CHAT_SHOW_CAR": {
            const card = cardForCar(message.carId);

            if (!card) return { shown: false };

            card.scrollIntoView({ behavior: "smooth", block: "center" });
            highlightConfiguration(message.carId);
            window.setTimeout(() => highlightConfiguration(null), 2400);

            return { shown: true };
        }

        case "LENS_CHAT_CLOSE":
            setOpen(false);
            return { closed: true };
    }
}

function listen(): void {
    if (listening) return;
    listening = true;

    /*
     * Answered through `sendResponse`, with `true` to keep the channel open,
     * rather than by returning a promise: that is the form every Chromium
     * version honours without a polyfill.
     */
    browser.runtime.onMessage.addListener((message: ChatToPage, sender, sendResponse) => {
        if (!message?.type?.startsWith("LENS_CHAT_") || message.type === ("LENS_CHAT_PAGE_CHANGED" as string)) {
            return undefined;
        }

        /* Only ever relayed by this extension's background, and only with this page's token. */
        if (sender.id !== browser.runtime.id || sender.tab || message.token !== token) {
            return undefined;
        }

        handle(message).then(sendResponse, (error: unknown) => {
            console.error("[FinnLens] Ask Lens request failed", error);
            sendResponse(null);
        });

        return true;
    });
}

/**
 * Pins exactly the car the reader asked for, from what Lens already holds.
 *
 * Never fetches: every car the chat can name came from Lens's own storage, so
 * a car this can't resolve is one the chat couldn't have offered.
 */
async function pin(carId: number, pinned: boolean): Promise<{ pinned: boolean } | { error: string }> {
    const car = await resolveCar(carId);

    if (!car) return { error: "Lens doesn't have this car's data any more." };

    try {
        return { pinned: await setCarPinned(car, pinned) };
    } catch (error) {
        console.error("[FinnLens] chat couldn't change what's pinned", error);
        return { error: "Couldn't update your pinned cars." };
    }
}

/* -------------------------------------------------------------------------- */
/* The bubble and the frame                                                   */
/* -------------------------------------------------------------------------- */

function setOpen(next: boolean): void {
    if (!host || !panel) return;

    isOpen = next;

    if (next && !frame) {
        const src = browser.runtime.getURL("/lens-chat.html" as never) as string;

        frame = el("iframe", {
            class: "block h-full w-full border-0 bg-transparent",
            attrs: { title: "Ask Lens", allow: "" },
        });

        /*
         * The token goes in only once registration has landed, and again on
         * every load of the frame, addressed to the extension's origin so no
         * other document can receive it.
         */
        const handshake = () => {
            void register().then(() => {
                frame?.contentWindow?.postMessage(
                    { source: "finn-lens-chat", token } satisfies ChatHandshake,
                    new URL(src).origin,
                );
            });
        };

        frame.addEventListener("load", handshake);
        void register().then(() => frame?.setAttribute("src", src));

        panel.append(frame);
    }

    panel.style.display = next ? "block" : "none";
    panel.setAttribute("aria-hidden", String(!next));

    if (bubbleLabel) bubbleLabel.textContent = next ? "Close" : "Ask Lens";

    if (next) {
        frame?.focus();
        notifyPageChanged();
    }
}

/**
 * Tells an open chat the page moved on — a new car, more cards loaded — so it
 * can re-read the page before it next says what it is comparing.
 */
export function notifyPageChanged(): void {
    if (!frame) return;

    void browser.runtime
        .sendMessage({ type: "LENS_CHAT_PAGE_CHANGED", token })
        .catch(() => {});
}

/** Adds the bubble where there are cars to talk about; removes it where there aren't. */
export async function syncChatBubble(): Promise<void> {
    listen();

    if (!pageHasCars()) {
        if (host && !isOpen) host.style.display = "none";
        return;
    }

    if (host) {
        /*
         * FINN's own rendering can take the page's top-level nodes with it on
         * a client-side navigation. A bubble that was built once and then
         * quietly detached would never come back, so put it back.
         */
        if (!host.isConnected && panel) document.documentElement.append(host);

        host.style.display = "";
        return;
    }

    /*
     * Claimed before anything is awaited: the mutation observer calls this on
     * every redraw, and a second call arriving while the stylesheet loads must
     * find the host already taken rather than mount a second bubble.
     */
    host = document.getElementById(HOST_ID) ?? document.createElement("div");
    host.id = HOST_ID;

    /*
     * Inline and with a very high stacking order, for the same reason the
     * panel's host is: finn.com's stylesheet reaches the light DOM, and a
     * fixed element here has to stay above FINN's sticky bars.
     */
    host.style.cssText =
        "position:fixed;right:20px;bottom:20px;z-index:2147483600;display:block;";

    const shadow = host.attachShadow({ mode: "open" });

    shadow.append(el("style", { text: await panelStyles() }));

    /*
     * Two shapes. On a phone the chat is a sheet inset evenly from both edges
     * of the screen, sized to the dynamic viewport so browser chrome sliding
     * in doesn't hide its input; from 640px up it is a panel beside the bubble.
     */
    panel = el("div", {
        class: [
            "overflow-hidden rounded-[24px] bg-white shadow-2xl ring-1 ring-black/5",
            "fixed inset-x-3 bottom-[76px] h-[min(680px,calc(100dvh-96px))]",
            "xs:absolute xs:inset-x-auto xs:right-0 xs:bottom-16 xs:w-[420px] xs:h-[min(680px,calc(100vh-110px))]",
        ].join(" "),
        attrs: { role: "dialog", "aria-label": "Ask Lens", "aria-hidden": "true" },
    });
    panel.style.display = "none";

    /* Visible from 640px; on a phone the bubble is the mark alone, covering less of FINN's cards. */
    bubbleLabel = el("span", { class: "max-xs:sr-only", text: "Ask Lens" });

    const bubble = el(
        "button",
        {
            class: [
                "flex h-12 items-center gap-2 rounded-full bg-finn-highlight-navy pl-1.5 pr-4 max-xs:pr-1.5",
                "text-[13px] font-black text-white shadow-xl ring-1 ring-white/10",
                "transition hover:bg-finn-accent-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-finn-accent-blue",
            ].join(" "),
            attrs: { type: "button", "aria-haspopup": "dialog" },
            on: {
                click: () => setOpen(!isOpen),
            },
        },
        [brandMark(36), bubbleLabel],
    );

    shadow.append(el("div", { class: "relative font-sans" }, [panel, bubble]));

    document.documentElement.append(host);
}
