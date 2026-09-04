import {
    ArrowTopRightOnSquareIcon,
    PhotoIcon,
    TrashIcon,
} from "@heroicons/react/24/outline";

import { BandChip } from "@/components/FitAnalysisView";
import { configurationDetail, configurationName } from "@/lib/car-labels";
import type { FitBand } from "@/lib/reasoning-engine/fit";
import { formatEUR } from "@/lib/reasoning-engine";
import type { PinnedFinnCar } from "@/lib/types";

/**
 * One pinned car, in the list.
 *
 * The row answers the three questions a reader scanning their pinned set
 * has — which car is this, how does it suit me, and what does it cost — and
 * offers the two actions the page exists for: open it, or unpin it. Its band
 * comes from the same analysis the detail panel shows, so the chip in the
 * list and the chip on the reading can never disagree.
 *
 * Laid out in three columns rather than as one paragraph of details, because
 * a list is read down its columns: picture, identity, then verdict and price
 * flush right where the eye can run a finger down them. The price appears
 * only there — the spec line drops it — so the row says each thing once.
 *
 * The row's own controls — unpin, open on finn.com — stay out of that scan
 * until the pointer arrives, since they are per-car housekeeping and not what anyone is
 * comparing. They come back for the keyboard the moment focus lands inside.
 */
export function CarRow({
    car,
    band,
    selected,
    checked,
    selecting,
    onOpen,
    onToggleChecked,
    onUnpin,
}: {
    car: PinnedFinnCar;
    /** Null while the analysis is still being worked out. */
    band: FitBand | null;
    /** True when this is the car whose analysis is open. */
    selected: boolean;
    /** True when it is ticked for a bulk unpin. */
    checked: boolean;
    /**
     * Whether the reader is picking cars off for a bulk unpin. The tick boxes
     * are a mode, not furniture: a set of five cars does not need five
     * checkboxes on screen to be read.
     */
    selecting: boolean;
    onOpen: () => void;
    onToggleChecked: () => void;
    onUnpin: () => void;
}) {
    const price = car.pricing?.customerMonthly?.price;

    return (
        <li
            className={[
                "group relative flex items-stretch gap-1 rounded-[22px] bg-white",
                "transition-shadow",
                selected
                    ? "shadow-[0_0_0_2px] shadow-finn-accent-blue"
                    : "shadow-sm hover:shadow-md",
            ].join(" ")}
        >
            {selecting && (
                <label className="flex shrink-0 cursor-pointer items-center pl-3.5">
                    <input
                        type="checkbox"
                        checked={checked}
                        onChange={onToggleChecked}
                        aria-label={`Select ${car.name}`}
                        className="h-4 w-4 accent-finn-accent-blue"
                    />
                </label>
            )}

            {/*
              * The whole card opens the analysis, because "tell me about this
              * one" is what a reader wants from a row far more often than
              * anything else on it.
              */}
            <button
                type="button"
                onClick={onOpen}
                aria-current={selected ? "true" : undefined}
                className="flex min-w-0 flex-1 items-center gap-3.5 rounded-[22px] p-3 text-left"
            >
                {car.images?.thumbnail ? (
                    <img
                        src={car.images.thumbnail}
                        alt=""
                        className="h-18 w-26 shrink-0 rounded-2xl bg-finn-snow object-cover"
                    />
                ) : (
                    <span className="flex h-18 w-26 shrink-0 items-center justify-center rounded-2xl bg-finn-snow text-finn-iron/40">
                        <PhotoIcon className="h-6 w-6" />
                    </span>
                )}

                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black text-finn-black">
                        {car.name}
                    </span>

                    <span className="mt-0.5 block truncate text-[11px] font-bold text-finn-accent-blue">
                        {configurationName(car)}
                    </span>

                    <span className="mt-0.5 block truncate text-[11px] leading-4 text-finn-iron">
                        {configurationDetail(car, { withPrice: false })}
                    </span>
                </span>

                {/* The two comparable facts, flush right, one under the other. */}
                <span className="flex shrink-0 flex-col items-end gap-1.5 pl-2">
                    {band && (
                        <BandChip
                            level={band.level}
                            label={band.label}
                            compact
                        />
                    )}

                    {price ? (
                        <span className="text-sm font-black text-finn-black">
                            {formatEUR(price)}
                            <span className="text-[11px] font-bold text-finn-iron">
                                /mo
                            </span>
                        </span>
                    ) : (
                        <span className="text-[11px] font-bold text-finn-iron">
                            Price not published
                        </span>
                    )}
                </span>
            </button>

            <span
                className={[
                    "flex shrink-0 flex-col items-center justify-center gap-1 pr-2",
                    "opacity-0 transition-opacity",
                    "group-hover:opacity-100 group-focus-within:opacity-100",
                ].join(" ")}
            >
                <button
                    type="button"
                    onClick={onUnpin}
                    aria-label={`Unpin ${car.name}`}
                    title={`Unpin ${car.name}`}
                    className="rounded-full p-2 text-finn-iron transition hover:bg-finn-error/10 hover:text-finn-error"
                >
                    <TrashIcon className="h-4 w-4" />
                </button>

                {/*
                  * Only rendered when the car actually has a page. Cars
                  * pinned by older builds, and the ones this extension makes
                  * up for its own demonstrations, have no URL to open.
                  */}
                {car.url ? (
                    <a
                        href={car.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${car.name} on finn.com`}
                        title="Open on finn.com"
                        className="rounded-full p-2 text-finn-iron transition hover:bg-finn-snow hover:text-finn-black"
                    >
                        <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                    </a>
                ) : null}
            </span>
        </li>
    );
}
