/**
 * The messages between the Lens chat and the finn.com page it sits on.
 *
 * The chat is an extension page in an iframe; the page facts it needs — which
 * cars are drawn here, which configuration the reader is looking at — are only
 * visible to the content script. The two talk through the background script,
 * which knows which tab a frame belongs to (`sender.tab`), rather than through
 * `window.postMessage`, which finn.com's own scripts could also send.
 */

export type PageKind = "listing" | "details" | "home" | "other";

/** What the content script can honestly say about the page. */
export interface PageContext {
    kind: PageKind;
    url: string;
    /** Config ids of every car card drawn on the page, in page order. */
    pageCarIds: number[];
    /**
     * The configuration a details page is about: FINN's `selected_config` when
     * the URL names one, else the first configuration the page lists. Null
     * anywhere else.
     */
    currentCarId: number | null;
    /** Whether `currentCarId` came from the URL rather than page order. */
    currentFromUrl: boolean;
    /** Links FINN draws on each card, so a pin can store the car's own page. */
    carUrls: Record<number, string>;
}

/** Sent by the chat, relayed by the background script to the tab's top frame. */
export type ChatToPage =
    | { type: "LENS_CHAT_CONTEXT" }
    | { type: "LENS_CHAT_PIN"; carId: number; pinned: boolean }
    | { type: "LENS_CHAT_SHOW_CAR"; carId: number }
    | { type: "LENS_CHAT_CLOSE" };

export const CHAT_TO_PAGE_TYPES = new Set<string>([
    "LENS_CHAT_CONTEXT",
    "LENS_CHAT_PIN",
    "LENS_CHAT_SHOW_CAR",
    "LENS_CHAT_CLOSE",
]);

/** Sent by the content script when what the page shows has changed. */
export interface PageChanged {
    type: "LENS_CHAT_PAGE_CHANGED";
    /** The chat frame this page mounted, so other tabs' chats ignore it. */
    token: string;
}
