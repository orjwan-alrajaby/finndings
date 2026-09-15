import type { RefObject } from "react";
import { Pin } from "lucide-react";

import {
    FIT_BADGE_BASE,
    FIT_BADGE_NEUTRAL_LABEL,
    fitBadgeStateClass,
    pinButtonClasses,
} from "@/lib/card-controls";
import { configurationDetail } from "@/lib/car-labels";
import { formatEUR } from "@/lib/reasoning-engine";
import type { FitLevel } from "@/lib/reasoning-engine/fit";
import type { PinnedFinnCar } from "@/lib/types";

import { BrandDisc, CarSilhouette, FitMeter } from "./parts";

/**
 * One of FINN's listing cards, with Lens on it, doing what it really does.
 *
 * The point of the whole screen is that a reader meets these two controls
 * *before* the first time they matter, so a control that is nearly right is
 * worse than none: they would learn to look for something that isn't there.
 * Both therefore take their classes from `lib/card-controls.ts`, which is the
 * same module the content script dresses the real ones from — the pin's
 * corner, size, border and both its states, and the pill's shape and every
 * band colour it can take. Nothing about how these look is decided here, so
 * there is nothing here to go stale when the real controls move.
 *
 * **The card under them is FINN's card, not a card.** It was drawn as a white
 * panel with a ring and a shadow, which is what a card looks like in this
 * product and nothing like what one looks like on finn.com: theirs has no
 * chrome at all. A rounded tinted block holds the photograph, and the model,
 * the configuration line and the price sit underneath it directly on the
 * page, in a `mt-2 grid gap-1`. The controls hang off the photo block, which
 * is the one positioned thing in the whole card — the same block `cardPhoto`
 * finds and `anchor` guarantees can hold them.
 *
 * FINN's own promotional line above the model name is left out. It is the one
 * part of their card that changes per listing and per campaign, and inventing
 * a payment offer on a drawing of somebody else's shop is not a detail worth
 * having.
 *
 * The markup is this file's own, because it has to be: on finn.com these are
 * built out of hand-written DOM by a script that carries no React.
 */
export function MockCard({
    car,
    level,
    label,
    pinned,
    open,
    onTogglePin,
    onOpenPanel,
    pinRef,
    badgeRef,
}: {
    car: PinnedFinnCar;
    /** null while the reader has chosen no priorities — the neutral pill. */
    level: FitLevel | null;
    label: string;
    pinned: boolean;
    /** True when the panel is currently open on this car. */
    open: boolean;
    onTogglePin: () => void;
    onOpenPanel: () => void;
    /**
     * Handed to the one card the guide walks, so its two controls are things
     * the guide can point at. Absent on the other two, which are here to say
     * that these controls are on every listing rather than on this one.
     */
    pinRef?: RefObject<HTMLButtonElement | null>;
    badgeRef?: RefObject<HTMLButtonElement | null>;
}) {
    const price = car.pricing?.customerMonthly?.price;
    const was = car.pricing?.customerMonthly?.oldPrice;

    return (
        <article
            className={[
                /* The padding is constant and the plate is not, so the open
                   card can be lifted without anything on the row moving. */
                "relative flex flex-col rounded-[18px] p-2 transition",
                open ? "bg-white shadow-md ring-1 ring-finn-accent-blue/40" : "",
            ].join(" ")}
        >
            {/*
              * The photograph's block, and the only positioned thing here:
              * `cardPhoto` finds this on the real page and `anchor` makes sure
              * it can hold an absolutely positioned child. Both controls hang
              * off it.
              */}
            <div className="relative">
                <div className="relative aspect-5/3 min-h-[120px] overflow-hidden rounded bg-finn-pale-blue">
                    <CarSilhouette className="absolute inset-0 m-auto h-auto w-[78%] text-finn-accent-blue/30" />
                </div>

                <button
                    ref={pinRef}
                    type="button"
                    onClick={onTogglePin}
                    aria-pressed={pinned}
                    aria-label={
                        pinned
                            ? `Remove ${car.name} from comparison`
                            : `Pin ${car.name} for comparison`
                    }
                    className={pinButtonClasses(pinned)}
                >
                    <Pin
                        aria-hidden="true"
                        className={pinned ? "size-3.5 fill-current" : "size-3.5"}
                    />
                </button>

                <button
                    ref={badgeRef}
                    type="button"
                    onClick={onOpenPanel}
                    aria-label={
                        level
                            ? `Finn Lens: ${label} for ${car.name}. See how it fits you.`
                            : `Finn Lens: see how ${car.name} fits you.`
                    }
                    className={[
                        FIT_BADGE_BASE,
                        fitBadgeStateClass(level),
                    ].join(" ")}
                >
                    <BrandDisc size={16} />

                    <FitMeter level={level} />

                    <span className="min-w-0 truncate text-[11px] font-black">
                        {label}
                    </span>

                    <span
                        aria-hidden="true"
                        className="flex shrink-0 items-center gap-0.5 border-l border-current/25 pl-1.5 text-[11px] font-bold opacity-70"
                    >
                        Why ›
                    </span>
                </button>

            </div>

            {/* FINN's own text block: no panel, no rule, just a grid. */}
            <div className="mt-2 grid gap-1">
                <h3 className="truncate py-1 text-sm font-semibold text-finn-black sm:text-base">
                    {car.name}
                </h3>

                <span className="py-0.5">
                    <p className="line-clamp-2 text-xs font-light leading-4 text-finn-black sm:text-sm">
                        {configurationDetail(car, { withPrice: false })}
                    </p>
                </span>

                <div className="flex flex-wrap items-center gap-x-1 py-1 text-sm font-semibold text-finn-black sm:text-base">
                    <span>from</span>

                    {/*
                      * FINN strikes the old price through when there is one.
                      * The demonstration's cars carry no `oldPrice`, so this
                      * draws nothing for them — a discount is not a thing to
                      * invent on three cars that do not exist.
                      */}
                    {was != null && (
                        <span className="text-finn-iron line-through">
                            {formatEUR(was)}
                        </span>
                    )}

                    <span>{price == null ? "—" : formatEUR(price)}</span>

                    <span className="text-xs font-light text-finn-black sm:text-sm">
                        per month
                    </span>
                </div>
            </div>
        </article>
    );
}

/**
 * The row under the fold, so the frame reads as a page rather than a shelf.
 *
 * Three cards and then white space is not what finn.com looks like, and the
 * gap it left was doing two things wrong at once: it made the frame look
 * broken when the drawer was closed, and it quietly undercut the claim the
 * screen is making — that these controls are on *every* car, not on the three
 * that happened to be drawn. So the page carries on, cropped by the frame the
 * way a page is cropped by a window.
 *
 * Photo blocks only, inert, and hidden from screen readers: there is nothing
 * here to read or press, and a reader tabbing through the mock should reach
 * the three real cards and then leave.
 */
export function ContinuingRow() {
    return (
        <div
            aria-hidden="true"
            className="pointer-events-none grid gap-3 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-3"
        >
            {[0, 1, 2].map((index) => (
                <div key={index} className="p-2">
                    <div className="relative">
                        <div className="relative aspect-5/3 min-h-[120px] overflow-hidden rounded bg-finn-pale-blue">
                            <CarSilhouette className="absolute inset-0 m-auto h-auto w-[78%] text-finn-accent-blue/30" />
                        </div>

                        <span className={pinButtonClasses(false)}>
                            <Pin className="size-3.5" />
                        </span>

                        <span
                            className={[
                                FIT_BADGE_BASE,
                                fitBadgeStateClass(null),
                            ].join(" ")}
                        >
                            <BrandDisc size={16} />

                            <FitMeter level={null} />

                            <span className="text-[11px] font-black">
                                {FIT_BADGE_NEUTRAL_LABEL}
                            </span>
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}
