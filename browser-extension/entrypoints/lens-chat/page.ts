import type {
    ChatHandshake,
    ChatToPage,
    PageChanged,
    PageContext,
    VerifyChat,
} from "@/lib/lens-chat/messages";

/**
 * The chat's side of the page bridge.
 *
 * Every request goes to the background script, which forwards it to the top
 * frame of the tab this chat is framed into. Each call resolves — to the
 * page's answer or to null — so a page that has navigated away, or a chat
 * opened outside finn.com while developing, degrades instead of throwing.
 */

/**
 * The token this chat proves itself with, once the page has handed it over.
 *
 * Handed over by postMessage from the page this frame is in — but finn.com's
 * own scripts share that origin and could post a token too. So every token
 * offered is checked with the background script, which knows the one this
 * tab's content script registered, and only a confirmed one is kept. A forged
 * token can at most leave a forged frame unable to act; it can never give one
 * the page.
 */
let confirmed: string | null = null;
let resolveToken: (token: string) => void = () => {};
const tokenReady = new Promise<string>((resolve) => {
    resolveToken = resolve;
});

window.addEventListener("message", (event: MessageEvent<ChatHandshake>) => {
    if (confirmed || event.source !== window.parent) return;
    if (event.origin !== "https://www.finn.com" || event.data?.source !== "finn-lens-chat") return;

    const offered = event.data.token;
    if (typeof offered !== "string") return;

    void browser.runtime
        .sendMessage({ type: "LENS_CHAT_VERIFY", token: offered } satisfies VerifyChat)
        .then((valid) => {
            if (valid && !confirmed) {
                confirmed = offered;
                resolveToken(offered);
            }
        })
        .catch(() => {});
});

/** Waits briefly for the handshake; a chat opened anywhere else gets no page. */
function withToken(): Promise<string | null> {
    return Promise.race([
        tokenReady,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
    ]);
}

type Request = ChatToPage extends infer M ? (M extends ChatToPage ? Omit<M, "token"> : never) : never;

async function send<T>(message: Request): Promise<T | null> {
    const token = await withToken();

    if (!token) return null;

    try {
        return ((await browser.runtime.sendMessage({ ...message, token })) as T) ?? null;
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
        if (message?.type === "LENS_CHAT_PAGE_CHANGED" && confirmed && message.token === confirmed) {
            handler();
        }
    };

    browser.runtime.onMessage.addListener(listener);

    return () => browser.runtime.onMessage.removeListener(listener);
}
