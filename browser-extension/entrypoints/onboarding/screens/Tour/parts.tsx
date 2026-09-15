import {
    FIT_BANDS,
    FIT_METER_SEGMENTS,
    FIT_SEGMENTS,
    type FitLevel,
} from "@/lib/reasoning-engine/fit";
import Logo from "/icon/128.png";
import { BRAND_IDLE_SPIN } from "@/lib/brand-spinner";

export { CarSilhouette } from "@/components/CarSilhouette";

/**
 * The pieces the mocks are built out of, kept in one file so a change to the
 * real control has one place to land here.
 *
 * Every one of these is a React copy of something the content script draws
 * with hand-written DOM on finn.com — `brandMark` and `meter` in
 * `lens-panel/dom.ts` and `lens-panel/card-badges.ts`. The copies are
 * deliberate rather than lazy: those files run inside somebody else's page
 * and cannot import React, and this screen cannot import them without pulling
 * `browser.runtime` into an extension page that has no content script. So the
 * two exist side by side, and the shared constants — `FIT_BANDS`,
 * `FIT_SEGMENTS`, the class strings — are what keep them from drifting into
 * two different-looking products.
 */

/**
 * Lens's own mark on its white disc.
 *
 * The same lockup as `brandMark`, for the same reason: on finn.com's page
 * this is the only thing saying whose opinion the pill carries. A reader who
 * meets the disc here recognises it there.
 */
export function BrandDisc({
    size,
    className = "",
}: {
    size: number;
    className?: string;
}) {
    const inner = Math.round(size * 0.8);

    return (
        <span
            className={`inline-flex shrink-0 items-center justify-center rounded-full bg-white shadow-sm ${className}`}
            style={{ width: size, height: size }}
        >
            <img
                src={Logo}
                alt=""
                aria-hidden="true"
                className={`block object-contain ${BRAND_IDLE_SPIN}`}
                style={{ width: inner, height: inner }}
            />
        </span>
    );
}

/**
 * The five-segment meter, at the two sizes it is drawn at.
 *
 * `card` is the one on the pill over the photograph; `panel` is the taller
 * one inside the drawer. Both fill from `FIT_SEGMENTS`, so a mock can never
 * show a band lit to a different length than the real thing would.
 */
export function FitMeter({
    level,
    size = "card",
}: {
    /** null is the pill before a verdict has been worked out. */
    level: FitLevel | null;
    size?: "card" | "panel";
}) {
    const band = level ? FIT_BANDS[level] : null;
    const filled = level ? FIT_SEGMENTS[level] : 0;

    return (
        <span
            aria-hidden="true"
            className={
                size === "card"
                    ? "flex items-center gap-[2px]"
                    : "inline-flex items-center gap-[3px]"
            }
        >
            {Array.from({ length: FIT_METER_SEGMENTS }, (_, index) => (
                <span
                    key={index}
                    className={[
                        "block w-[3px] rounded-full",
                        size === "card" ? "h-2.5" : "h-3",
                        !band
                            ? "bg-finn-accent-blue/25"
                            : index < filled
                                ? band.barClass
                                : band.emptyBarClass,
                    ].join(" ")}
                />
            ))}
        </span>
    );
}

/** The verdict chip, as the panel draws it over the photograph. */
export function BandChip({
    level,
    label,
}: {
    level: FitLevel;
    label: string;
}) {
    return (
        <span
            className={[
                "inline-flex items-center gap-2 rounded-full px-2.5 py-1",
                "text-[11px] font-bold whitespace-nowrap",
                "ring-1 ring-white",
                "shadow-[0_1px_6px_rgba(0,0,0,0.12)]",
                FIT_BANDS[level].chipClass,
            ].join(" ")}
        >
            <FitMeter level={level} size="panel" />
            {label}
        </span>
    );
}
