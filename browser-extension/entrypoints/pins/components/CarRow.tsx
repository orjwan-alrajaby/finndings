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
 */
export function CarRow({
    car,
    band,
    selected,
    checked,
    onOpen,
    onToggleChecked,
    onUnpin,
}: {
    car: PinnedFinnCar;
    /** Null while the analysis is still being worked out, or ungated. */
    band: FitBand | null;
    /** True when this is the car whose analysis is open. */
    selected: boolean;
    /** True when it is ticked for a bulk unpin. */
    checked: boolean;
    onOpen: () => void;
    onToggleChecked: () => void;
    onUnpin: () => void;
}) {
    const price = car.pricing?.customerMonthly?.price;

    return (
        <li
            className={[
                "flex items-start gap-3 rounded-[22px] p-3 transition",
                selected
                    ? "bg-white shadow-[0_0_0_2px] shadow-finn-accent-blue"
                    : "bg-white shadow-sm hover:shadow-md",
            ].join(" ")}
        >
            <input
                type="checkbox"
                checked={checked}
                onChange={onToggleChecked}
                aria-label={`Select ${car.name}`}
                className="mt-8 h-4 w-4 shrink-0 accent-finn-accent-blue"
            />

            {/*
              * The whole card opens the analysis, because "tell me about this
              * one" is what a reader wants from a row far more often than
              * anything else on it.
              */}
            <button
                type="button"
                onClick={onOpen}
                aria-current={selected ? "true" : undefined}
                className="flex min-w-0 flex-1 items-start gap-3 text-left"
            >
                {car.images?.thumbnail ? (
                    <img
                        src={car.images.thumbnail}
                        alt=""
                        className="h-16 w-24 shrink-0 rounded-2xl bg-finn-snow object-cover"
                    />
                ) : (
                    <span className="flex h-16 w-24 shrink-0 items-center justify-center rounded-2xl bg-finn-snow text-finn-iron/40">
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

                    <span className="mt-0.5 block truncate text-[11px] text-finn-iron">
                        {configurationDetail(car)}
                    </span>

                    <span className="mt-1.5 flex flex-wrap items-center gap-2">
                        {band ? (
                            <BandChip
                                level={band.level}
                                label={band.label}
                                compact
                            />
                        ) : null}

                        {price ? (
                            <span className="text-[11px] font-bold text-finn-black">
                                {formatEUR(price)}/mo
                            </span>
                        ) : null}
                    </span>
                </span>
            </button>

            <span className="flex shrink-0 flex-col items-center gap-1">
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
