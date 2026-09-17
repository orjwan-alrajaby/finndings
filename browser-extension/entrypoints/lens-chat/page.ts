import type { ChatToPage, PageChanged, PageContext } from "@/lib/lens-chat/messages";

/**
 * The chat's side of the page bridge.
 *
 * Every request goes to the background script, which forwards it to the top
 * frame of the tab this chat is framed into. Each call resolves — to the
 * page's answer or to null — so a page that has navigated away, or a chat
 * opened outside finn.com while developing, degrades instead of throwing.
 */

/** Set by the content script in the frame's URL; names this chat in broadcasts. */
export const chatToken =
    new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";

async function send<T>(message: ChatToPage): Promise<T | null> {
    try {
        return ((await browser.runtime.sendMessage(message)) as T) ?? null;
    } catch (error) {
        if (import.meta.env.DEV) console.debug("[Lens chat] page request failed", message, error);
        return null;
    }
}

export const requestPageContext = () =>
    send<PageContext>({ type: "LENS_CHAT_CONTEXT" });

export const requestPin = (carId: number, pinned: boolean) =>
    send<{ pinned: boolean } | { error: string }>({ type: "LENS_CHAT_PIN", carId, pinned });

export const requestShowCar = (carId: number) =>
    send<{ shown: boolean }>({ type: "LENS_CHAT_SHOW_CAR", carId });

export const requestClose = () => send<{ closed: boolean }>({ type: "LENS_CHAT_CLOSE" });

/** Calls `handler` whenever this chat's page says it changed. */
export function onPageChanged(handler: () => void): () => void {
    const listener = (message: PageChanged) => {
        if (message?.type === "LENS_CHAT_PAGE_CHANGED" && message.token === chatToken) {
            handler();
        }
    };

    browser.runtime.onMessage.addListener(listener);

    return () => browser.runtime.onMessage.removeListener(listener);
}
