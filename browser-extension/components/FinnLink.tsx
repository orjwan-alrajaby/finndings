import { Fragment, type ReactNode } from "react";

import { FINN_BASE_URL } from "@/lib/constants";

/**
 * "finn.com", as the link it is describing.
 *
 * The extension names finn.com constantly — it is the whole subject — and
 * every one of those was flat text. A reader being told to go and pin some
 * cars, or that the browsing cache refills as they browse, is being told
 * about a place; naming a place and not offering to take them there is a
 * small failure repeated in a dozen files.
 *
 * Deliberately the bare domain and not the locale path. `FINN_BASE_URL`
 * carried `/de-DE`, which sent a reader to the German site whatever their
 * own is and made the popup's "are we on finn.com?" check fail on every
 * other locale.
 */
export function FinnLink({ className }: { className?: string }) {
    return (
        <a
            href={FINN_BASE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={
                className ??
                "font-bold text-finn-accent-blue underline underline-offset-2 hover:text-finn-highlight-navy"
            }
        >
            finn.com
        </a>
    );
}

/**
 * The same, for copy that arrives as a plain string.
 *
 * A lot of this extension's prose lives in data — a checklist item, a
 * description of what a storage key holds, the body of a card. Widening every
 * one of those to `ReactNode` to carry one link would push React into
 * modules that have no business importing it, so the string stays a string
 * and the component that renders it linkifies at the last moment.
 *
 * Split rather than parsed: there is exactly one token to find, it is a
 * literal, and a regex that tried to be cleverer about URLs would eventually
 * find one where the copy meant a sentence.
 */
export function withFinnLinks(
    text: string,
    linkClassName?: string,
): ReactNode {
    const parts = text.split("finn.com");

    if (parts.length === 1) return text;

    return parts.map((part, index) => (
        <Fragment key={`${part}-${index}`}>
            {index > 0 && <FinnLink className={linkClassName} />}
            {part}
        </Fragment>
    ));
}
