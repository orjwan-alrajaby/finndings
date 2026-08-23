import { ChevronRightIcon } from "@heroicons/react/24/outline";

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
    url: string;
    imgUrl: string;
    pinnedAt: string;
    accent?: boolean;
}) {
    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`group flex w-full items-center gap-3 rounded-[18px] border text-left transition-all duration-200 border-finn-accent-blue/10 bg-white shadow-sm hover:shadow-md active:scale-[0.99] p-2.5 sm:p-3 ${accent ? "hover:border-finn-accent-blue/30" : ""
                }`}
        >
            <div className="flex-1/3 h-full overflow-hidden rounded-[18px] bg-finn-pale-blue">
                <img
                    src={imgUrl}
                    alt={name}
                    className="h-full w-full object-cover scale-150 transition-transform group-hover:scale-135"
                />
            </div>
            <div className="min-w-0 flex-2/3 flex flex-col">
                <h4 className="truncate text-sm font-bold text-finn-black">{name}</h4>
                <p className="mt-0.5 font-mono text-xs font-bold text-finn-black">
                    €{price?.toLocaleString("de-DE")}
                    {period ? <span className="font-sans font-normal text-finn-iron">{` / ${period}`}</span> : ""}
                </p>
                <p className="mt-0.5 text-[11px] text-finn-iron">pinned {pinnedAt}</p>
            </div>

            <ChevronRightIcon
                className={`h-4 w-4 shrink-0 text-finn-cotton transition-transform group-hover:translate-x-0.5 ${accent ? "group-hover:text-finn-accent-blue" : "group-hover:text-finn-black"
                    }`}
            />
        </a>
    );
}