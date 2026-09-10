import type { ReactNode } from "react";
import {
    ChevronLeft,
    ChevronRight,
    Lock,
    Pin,
    Plus,
    Puzzle,
    RotateCw,
    Scale,
    SlidersHorizontal,
    X,
} from "lucide-react";

import { BrandDisc, Marker, type StepStatus } from "./parts";

/**
 * A browser, drawn around the mock so the controls have somewhere to be.
 *
 * Not decoration. Two of the three things this screen has to teach are
 * questions about *place* — where on a card the pin sits, and where in the
 * browser Lens itself sits — and neither can be answered by a floating card
 * on a white background. The frame is what makes "top right of the photo" and
 * "up here, next to the address bar" mean anything.
 *
 * **It has to be recognised as a browser in the first half-second, or it does
 * none of that.** The first version was a rounded panel with three grey dots
 * and a pill of text, which is the shape of a browser to somebody who already
 * knows they are looking at one — and this screen is shown to somebody who
 * does not. So it is drawn as the window a reader actually has in front of
 * them: macOS traffic lights in their own colours, a tab strip with the page
 * named on the active tab, and a toolbar row with back, forward and reload
 * before the address bar. Every one of those is inert. They are here to be
 * recognised, not used.
 *
 * The one exception is the Lens button, which is the third annotated control
 * rather than chrome: it is where every other surface of this product is
 * reached from, and a reader who finishes setup without knowing that has an
 * extension they can only find by accident.
 *
 * The greys below are raw hex rather than Lens tokens, deliberately. They are
 * not this product's colours — they are a drawing of somebody else's window,
 * and pulling them towards the brand palette would make the frame read as
 * more Lens furniture, which is the one thing it must not be.
 */

/** macOS window controls, in their own colours. */
const TRAFFIC_LIGHTS = ["#ff5f57", "#febc2e", "#28c840"];

/** The grey Chrome puts behind its tabs. */
const TAB_STRIP = "#e3e5e8";

export function BrowserFrame({
    children,
    lensFocused,
    lensOpen,
    onLensClick,
    popover,
    callout,
    lensSpotlit,
    lensStatus = "upcoming",
    scrim,
}: {
    children: ReactNode;
    /** True while the reader is reading the paragraph about the toolbar. */
    lensFocused?: boolean;
    lensOpen?: boolean;
    onLensClick: () => void;
    /** The popup replica, shown hanging under the button when open. */
    popover?: ReactNode;
    /**
     * The tour's bubble for the menu step, drawn over the page.
     *
     * Inside the frame rather than beside it. It lived in the margin for a
     * while, which fitted on a wide monitor and on a 1440 one put it hard
     * against the edge of the screen with its own corner clipped off — the
     * page had run out of room and the bubble was the thing paying for it.
     */
    callout?: ReactNode;
    /** True while the tour is standing on the toolbar button. */
    lensSpotlit?: boolean;
    /** How far the reader has got with the toolbar step. */
    lensStatus?: StepStatus;
    /**
     * Dims the page while the tour is running.
     *
     * Only the page — never the chrome. The toolbar is where step three's
     * control lives, and a scrim that covered it would put the tour's own
     * target behind a curtain.
     */
    scrim?: boolean;
}) {
    return (
        <div
            className={[
                "overflow-hidden rounded-[14px] bg-white ring-1 ring-black/10",
                /* A window floats above the page it is drawn on; a flat card
                   sits in it. The lift is most of what says "window". */
                "shadow-[0_24px_60px_-24px_rgba(0,0,0,0.45)]",
            ].join(" ")}
        >
            {/* The tab strip. */}
            <div
                className="flex items-end gap-2 px-3 pt-2.5"
                style={{ backgroundColor: TAB_STRIP }}
            >
                <span aria-hidden="true" className="mb-2.5 flex shrink-0 gap-2">
                    {TRAFFIC_LIGHTS.map((colour) => (
                        <span
                            key={colour}
                            className="block h-3 w-3 rounded-full"
                            style={{ backgroundColor: colour }}
                        />
                    ))}
                </span>

                {/*
                  * The page, named on its own tab.
                  *
                  * The address bar below says finn.com, which is the machine's
                  * answer; the tab is where a person reads what they have
                  * open. Naming it is also the cheapest way to say that this
                  * is a listing page rather than one car.
                  */}
                <span
                    aria-hidden="true"
                    className="flex h-8 min-w-0 max-w-[240px] flex-1 items-center gap-2 rounded-t-lg bg-white px-3"
                >
                    <span className="h-3 w-3 shrink-0 rounded-sm bg-finn-cotton" />

                    <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-finn-black">
                        Car subscriptions — FINN
                    </span>

                    <X className="h-3 w-3 shrink-0 text-finn-iron/60" />
                </span>

                <span
                    aria-hidden="true"
                    className="hidden h-8 min-w-0 max-w-[180px] flex-1 items-center rounded-t-lg bg-black/5 px-3 text-[11px] text-finn-iron sm:flex"
                >
                    <span className="truncate">New tab</span>
                </span>

                <Plus
                    aria-hidden="true"
                    className="mb-2 h-3.5 w-3.5 shrink-0 text-finn-iron"
                />
            </div>

            {/* The toolbar. */}
            <div className="flex items-center gap-2 border-b border-finn-cotton bg-white px-3 py-2">
                <span
                    aria-hidden="true"
                    className="flex shrink-0 items-center gap-1 text-finn-iron/60"
                >
                    <ChevronLeft className="h-4 w-4" />
                    <ChevronRight className="h-4 w-4" />
                    <RotateCw className="h-3.5 w-3.5" />
                </span>

                <span className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full bg-finn-snow px-3 py-1.5 ring-1 ring-finn-cotton">
                    <Lock
                        aria-hidden="true"
                        className="h-3 w-3 shrink-0 text-finn-iron"
                    />

                    <span className="truncate text-[11px] text-finn-iron">
                        finn.com
                    </span>
                </span>

                <div className="relative flex shrink-0 items-center gap-1">
                    {/* The browser's own extensions menu, drawn and inert —
                        it is where a reader whose toolbar has no Lens button
                        has to go, so step 3 can point at it by name. */}
                    <Puzzle
                        aria-hidden="true"
                        className="h-4 w-4 text-finn-iron/50"
                    />

                    <span className="relative">
                        {/* Below the button rather than over it. A marker on
                            top of the mark hides the one thing a reader has
                            to learn to recognise. */}
                        <Marker
                            index={3}
                            status={lensStatus}
                            focused={lensFocused}
                            className="-right-2 -bottom-2"
                        />

                        <button
                            type="button"
                            onClick={onLensClick}
                            aria-expanded={lensOpen}
                            aria-label="Finn Lens, example toolbar button"
                            className={[
                                "flex h-8 w-8 items-center justify-center rounded-lg",
                                "transition hover:bg-finn-cotton",
                                lensOpen ? "bg-finn-cotton" : "",
                                lensFocused
                                    ? "ring-4 ring-finn-accent-blue/40"
                                    : "",
                                lensSpotlit ? "finn-lens-beckon" : "",
                            ].join(" ")}
                        >
                            <BrandDisc size={22} />
                        </button>
                    </span>

                    {popover}
                </div>
            </div>

            {/*
              * The page. `relative` because the drawer and the toast are
              * absolutely positioned against it, which is what they do on the
              * real page too — the drawer sits beside finn.com rather than
              * over the whole screen.
              */}
            <div className="relative max-h-[520px] overflow-hidden bg-finn-snow">
                {children}

                {scrim && (
                    <div
                        aria-hidden="true"
                        className="absolute inset-0 z-20 bg-finn-black/45"
                    />
                )}

                {callout}
            </div>
        </div>
    );
}

/**
 * What the toolbar button opens, in miniature.
 *
 * The popup's real job is to be the way back in — it carries the
 * getting-started checklist, the pinned count and the buttons to the two
 * pages — so the replica lists exactly those and nothing invented. See
 * `entrypoints/popup/`.
 */
/**
 * How far down the page the open menu reaches, as a Tailwind top offset.
 *
 * The menu hangs from the toolbar and the tour's bubble has to clear it, and
 * the two are drawn by different components — so the number lives here, next
 * to the thing it measures. Add a row to the menu below and this moves with
 * it.
 *
 * `mt-2` under a toolbar whose icons end a few pixels above the page, plus a
 * `p-3` card of a header, a status line and three rows, comes to a little
 * under 200px. `top-52` is 208, which leaves the bubble a clear gap rather
 * than butting it against the menu's shadow.
 */
export const MENU_CLEARANCE = "top-52";

export function LensPopover({ pinnedCount }: { pinnedCount: number }) {
    return (
        <div className="absolute top-full right-0 z-50 mt-2 w-60 rounded-2xl bg-white p-3 shadow-xl ring-1 ring-finn-cotton">
            <div className="flex items-center gap-2">
                <BrandDisc size={22} />

                <p className="text-[12px] font-black text-finn-black">
                    Finn Lens
                </p>
            </div>

            <p className="mt-2 rounded-xl bg-finn-pale-blue px-2.5 py-2 text-[11px] font-bold leading-4 text-finn-highlight-navy">
                {pinnedCount === 0
                    ? "No cars pinned yet"
                    : pinnedCount === 1
                        ? "1 car pinned — Lens needs two"
                        : `${pinnedCount} cars pinned`}
            </p>

            <ul className="mt-2 flex flex-col gap-1">
                {[
                    { label: "Your pinned cars", Icon: Pin },
                    { label: "See your recommendation", Icon: Scale },
                    { label: "Set your settings", Icon: SlidersHorizontal },
                ].map(({ label, Icon }) => (
                    <li
                        key={label}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] font-bold text-finn-black"
                    >
                        <Icon
                            aria-hidden="true"
                            className="h-3 w-3 shrink-0 text-finn-accent-blue"
                        />
                        {label}
                    </li>
                ))}
            </ul>
        </div>
    );
}
