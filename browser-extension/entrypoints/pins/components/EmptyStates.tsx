import { Bookmark, CircleCheck, ExternalLink, FileSearch } from "lucide-react";

import { FINN_BASE_URL } from "@/lib/constants";
import { FinnLink, withFinnLinks } from "@/components/FinnLink";

/** The whole page, before anything has been pinned. */
export function NothingPinned() {
    return (
        <div className="mx-auto max-w-xl rounded-[28px] bg-white p-8 text-center shadow-sm">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-finn-pale-blue text-finn-accent-blue">
                <Bookmark aria-hidden="true" className="h-7 w-7" />
            </span>

            <h2 className="mt-5 text-2xl font-black text-finn-black">
                Nothing pinned yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-finn-iron">
                Lens adds a pin button to every car on <FinnLink />. Pin the ones
                you're weighing up and they collect here, ready to compare.
            </p>

            <a
                href={FINN_BASE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-finn-accent-blue px-6 text-sm font-black text-white shadow-sm transition hover:bg-finn-highlight-navy"
            >
                Open finn.com
                <ExternalLink aria-hidden="true" className="h-4 w-4" />
            </a>
        </div>
    );
}

/**
 * The right-hand column before a car is opened.
 *
 * Not an apology for being empty. It is the one place to say what opening a
 * row actually gets you, so the reader knows there is something behind the
 * click — spelled out as the four questions the reading answers, in the
 * order it answers them.
 */
export function NothingOpen({ configured }: { configured: boolean }) {
    return (
        <div className="rounded-[28px] border border-dashed border-finn-cotton bg-white/60 p-8">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-finn-pale-blue text-finn-accent-blue">
                <FileSearch aria-hidden="true" className="h-6 w-6" />
            </span>

            <p className="mt-4 text-center text-sm font-black text-finn-black">
                Open a car to read it
            </p>

            <p className="mx-auto mt-2 max-w-sm text-center text-xs leading-5 text-finn-iron">
                {withFinnLinks(
                    "The same reading the side panel gives you on finn.com, for any car you kept.",
                )}
                {!configured && (
                    <> On Lens's own assumptions until you give it yours.</>
                )}
            </p>

            <ul className="mx-auto mt-5 max-w-xs space-y-2">
                {[
                    "How it does on each of your priorities",
                    "Which of the features you picked out it has",
                    "What it costs you a month, line by line",
                    "What you'd be accepting by taking it",
                ].map((line) => (
                    <li key={line} className="flex items-start gap-2">
                        <CircleCheck
                            aria-hidden="true"
                            className="mt-px h-4 w-4 shrink-0 text-finn-accent-blue"
                        />

                        <span className="text-xs leading-5 text-finn-black">
                            {line}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
