import { Check } from "lucide-react";

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

/**
 * Where the reader stands on one of the three steps.
 *
 * Lives here rather than beside the cards because three things draw it now —
 * the numbers on the mock, the nodes on the rail, and the numbers inside the
 * cards on a narrow screen — and they have to be one picture of one fact.
 */
export type StepStatus = "done" | "current" | "upcoming";

/**
 * The colours of a numbered mark, wherever it is drawn.
 *
 * Two colours and three states, and which colour means what is the whole
 * scheme:
 *
 * - **Navy is "you are here".** It is the tour's own colour — the coach mark
 *   hanging off the control is navy — so the mark on the control it is
 *   pointing at is navy too, and the pair reads as one object. This is what
 *   the mark used to get wrong: it went accent blue while the bubble beside
 *   it was navy, so the two halves of a single gesture were in two different
 *   colours.
 * - **Accent blue is the step itself**, filled once the step is done and
 *   drawn as an outline — white ground, accent numeral — while it is still
 *   ahead. Those two are deliberately inverses of each other, so a finished
 *   step and an unstarted one are the same shape in the same hue and cannot
 *   be confused with the one being asked for.
 *
 * Green used to mean "done" here, which put a third hue into a three-state
 * indicator for no gain. It still means something on this screen — the toast
 * that confirms a pin, and the line that says two cars is enough to compare —
 * where it marks a thing that succeeded rather than a step that was walked.
 */
export function stepToneClasses(status: StepStatus): string {
    if (status === "done") {
        return "bg-finn-accent-blue text-white";
    }

    if (status === "current") {
        return "bg-finn-highlight-navy text-white";
    }

    return "bg-white text-finn-accent-blue";
}

/**
 * The number that ties a control on the mock to the card explaining it.
 *
 * Positioned by the caller, because each one hangs off a different corner of
 * a different control — and it has to stay a legible disc over a photograph,
 * a coloured pill and a white browser toolbar alike. A filled mark gets a
 * ring of white for that; the unstarted one is already white, so it takes a
 * ring of its own ink instead.
 */
export function Marker({
    index,
    status,
    className = "",
    focused,
}: {
    index: number;
    status: StepStatus;
    className?: string;
    /** Lifted while the reader is reading the card it belongs to. */
    focused?: boolean;
}) {
    return (
        <span
            aria-hidden="true"
            className={[
                "pointer-events-none absolute z-30 flex h-6 w-6 items-center",
                "justify-center rounded-full text-[11px] font-black",
                "shadow-md transition-transform",
                stepToneClasses(status),
                status === "upcoming"
                    ? "ring-2 ring-finn-accent-blue/25"
                    : "ring-2 ring-white",
                focused ? "scale-110" : "",
                className,
            ].join(" ")}
        >
            {status === "done" ? (
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
            ) : (
                index
            )}
        </span>
    );
}
