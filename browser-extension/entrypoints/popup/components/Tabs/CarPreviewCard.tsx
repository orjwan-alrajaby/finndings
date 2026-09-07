import { ChevronRight } from "lucide-react";

/**
 * One pinned car, in the popup's list.
 *
 * A link when the car has a page and a plain card when it doesn't. FINN
 * doesn't supply a URL for every car — one pinned from a card the
 * interceptor never saw a response for carries an empty string — and an
 * anchor with `href=""` resolves to the document it is in, so a card like
 * that used to reload the popup when it was clicked. Worse than doing
 * nothing, and it looked identical to the ones that work.
 *
 * So the affordances go with the link: no chevron, no lift on hover, no
 * pointer. The card still says what was pinned; it just doesn't promise to
 * take the reader anywhere.
 */
export function CarPreviewCard({
    name,
    price,
    period,
    url,
    imgUrl,
    pinnedAt,
    accent,
}: {
    name: string;
    price: number;
    period: string;
    /** Absent for cars FINN never gave us a page for. */
    url?: string;
    imgUrl: string;
    pinnedAt: string;
    accent?: boolean;
}) {
    const lift = accent
        ? "hover:border-finn-accent-blue/30 hover:shadow-md active:scale-[0.99]"
        : "hover:shadow-md active:scale-[0.99]";

    const shell = [
        "group flex w-full items-center gap-3 rounded-[18px] border text-left",
        "border-finn-accent-blue/10 bg-white p-2.5 shadow-sm sm:p-3",
        url ? `transition-all duration-200 ${lift}` : "",
    ].join(" ");

    const body = (
        <>
            <div className="flex-1/3 h-full overflow-hidden rounded-[18px] bg-finn-pale-blue">
                <img
                    src={imgUrl}
                    alt={name}
                    className={[
                        "h-full w-full scale-150 object-cover transition-transform",
                        url ? "group-hover:scale-135" : "",
                    ].join(" ")}
                />
            </div>

            <div className="min-w-0 flex-2/3 flex flex-col">
                <h4 className="truncate text-sm font-bold text-finn-black">
                    {name}
                </h4>

                <p className="mt-0.5 font-mono text-xs font-bold text-finn-black">
                    €{price?.toLocaleString("de-DE")}
                    {period ? (
                        <span className="font-sans font-normal text-finn-iron">{` / ${period}`}</span>
                    ) : (
                        ""
                    )}
                </p>

                <p className="mt-0.5 text-[11px] text-finn-iron">
                    pinned {pinnedAt}
                </p>
            </div>

            {url && (
                <ChevronRight
                    aria-hidden="true"
                    className={`h-4 w-4 shrink-0 text-finn-cotton transition-transform group-hover:translate-x-0.5 ${
                        accent
                            ? "group-hover:text-finn-accent-blue"
                            : "group-hover:text-finn-black"
                    }`}
                />
            )}
        </>
    );

    if (!url) {
        return <div className={shell}>{body}</div>;
    }

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={shell}
        >
            {body}
        </a>
    );
}
