import { SlidersHorizontal } from "lucide-react";

import {
    DEFAULTS_ACTION,
    DEFAULTS_BODY,
    DEFAULTS_SHORT,
    DEFAULTS_TITLE,
} from "@/lib/personalisation";

/**
 * Whose assumptions the reader is looking at.
 *
 * Shown wherever Lens has produced a verdict without the reader having told
 * it anything. It is not an upsell and it is not an error: the answer beside
 * it is real and was really measured. What it says is which assumptions it
 * was measured against, because that is the one thing the reader cannot see
 * from the answer itself and the one thing that would make the answer
 * misleading if left out.
 *
 * Rendered in the product's ordinary blue rather than a warning colour, for
 * the same reason. Nothing has gone wrong.
 */
export function UsingDefaultsNotice({
    onPersonalise,
    compact,
}: {
    onPersonalise: () => void;
    /** One line, for places that can't spare a paragraph. */
    compact?: boolean;
}) {
    if (compact) {
        return (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl bg-finn-pale-blue px-4 py-2.5 text-[11px] leading-4 text-finn-highlight-navy">
                <SlidersHorizontal aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                {DEFAULTS_SHORT}
                <button
                    type="button"
                    onClick={onPersonalise}
                    className="font-black underline underline-offset-2"
                >
                    {DEFAULTS_ACTION}
                </button>
            </p>
        );
    }

    return (
        <section className="flex flex-wrap items-start gap-3 rounded-[22px] bg-finn-pale-blue px-5 py-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-finn-accent-blue">
                <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
            </span>

            <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-finn-highlight-navy">
                    {DEFAULTS_TITLE}
                </p>

                <p className="mt-1 max-w-2xl text-xs leading-5 text-finn-highlight-navy/80">
                    {DEFAULTS_BODY}
                </p>
            </div>

            <button
                type="button"
                onClick={onPersonalise}
                className="shrink-0 rounded-full bg-finn-accent-blue px-4 py-2.5 text-xs font-black text-white transition hover:bg-finn-highlight-navy"
            >
                {DEFAULTS_ACTION}
            </button>
        </section>
    );
}
