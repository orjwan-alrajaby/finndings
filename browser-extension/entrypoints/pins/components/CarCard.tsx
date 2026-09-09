import { Check, ExternalLink, Eye, Trash2 } from "lucide-react";

import { CarSilhouette } from "@/components/CarSilhouette";
import { BandChip } from "@/components/FitAnalysisView/parts";
import { configurationDetail, configurationName } from "@/lib/car-labels";
import type { FitBand } from "@/lib/reasoning-engine/fit";
import { formatEUR } from "@/lib/reasoning-engine";
import type { PinnedFinnCar } from "@/lib/types";

/**
 * One pinned car, as a card rather than a line in a ledger.
 *
 * It was a row: a 72px thumbnail, three lines of text and a rail of grey
 * icons, repeated down a narrow column beside an empty panel. Everything a
 * reader needed was in it and none of it was worth looking at — which matters
 * more here than on most lists, because the thing being listed is a car, and
 * the photograph is how anyone actually recognises one.
 *
 * So the photograph leads, at the size FINN gives it on their own listing and
 * on the same pale blue ground the panel and the setup flow's mock use. The
 * verdict sits on it, bottom left, where the badge sits on finn.com — a
 * reader who met that pill while browsing meets it again here, in the same
 * corner, saying the same thing.
 *
 * **And each card carries the one fact the old row could not.** A price on
 * its own is a number; a price beside the cheapest in the set is a decision.
 * Every card says what it costs *relative to the floor of this shortlist*,
 * which is the comparison the page exists to support and the thing a reader
 * was previously left to do in their head.
 */
export function CarCard({
    car,
    band,
    leading,
    cheapest,
    priceGap,
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
    /** True for the car ahead on the reader's ranking, whatever the sort. */
    leading: boolean;
    /** True for the cheapest published price in the set. */
    cheapest: boolean;
    /** What this costs over the cheapest, in euros. Null when either is unknown. */
    priceGap: number | null;
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
                "group relative flex flex-col overflow-hidden rounded-[24px] bg-white",
                "ring-1 transition",
                selecting && checked
                    ? "shadow-md ring-2 ring-finn-accent-blue"
                    : !selecting && selected
                        ? "shadow-lg ring-2 ring-finn-accent-blue"
                        : "shadow-sm ring-black/[0.06] hover:shadow-md",
            ].join(" ")}
        >
            {/*
              * One target, two jobs — and which one is live is the mode, not
              * a guess.
              *
              * While the reader is picking cars off, the card ticks itself.
              * It used to open the reading instead, so telling the page you
              * wanted to select something and then clicking the something
              * took you to a different view entirely, with a tick box left
              * behind in the corner as the only thing that actually did what
              * you asked. The box is still drawn, because it is what says
              * *this is a selection*, but it is a mark now rather than the
              * one live pixel on the card.
              */}
            <button
                type="button"
                onClick={selecting ? onToggleChecked : onOpen}
                aria-pressed={selecting ? checked : undefined}
                aria-current={!selecting && selected ? "true" : undefined}
                aria-label={selecting ? `Select ${car.name}` : undefined}
                className="flex flex-1 flex-col text-left"
            >
                <span className="relative block aspect-5/3 overflow-hidden bg-finn-pale-blue">
                    {car.images?.thumbnail ? (
                        <img
                            src={car.images.thumbnail}
                            alt=""
                            /*
                             * `contain` and not `cover`. FINN's photographs
                             * are cut out on white with the car centred, so
                             * cropping them to fill a box takes the wheels
                             * off; `mix-blend-multiply` is what drops the
                             * white they are cut out on onto the tint.
                             */
                            className="absolute inset-0 h-full w-full object-contain p-3 mix-blend-multiply"
                        />
                    ) : (
                        <CarSilhouette className="absolute inset-0 m-auto h-auto w-[70%] text-finn-accent-blue/30" />
                    )}

                    {/* Whose verdict, in the corner it lives in on finn.com. */}
                    {band && (
                        <span className="absolute bottom-2.5 left-2.5">
                            <BandChip
                                level={band.level}
                                label={band.label}
                                compact
                            />
                        </span>
                    )}

                    {leading && (
                        <span className="absolute top-2.5 left-2.5 rounded-full bg-finn-highlight-navy px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-white shadow-sm">
                            Ahead
                        </span>
                    )}

                    {selecting && (
                        /*
                         * On the photograph rather than beside the name: the
                         * tick has to be findable in the same place on every
                         * card however long the names run. Inert, and hidden
                         * from screen readers — the card around it is the
                         * control and carries the pressed state.
                         */
                        <span
                            aria-hidden="true"
                            className={[
                                "pointer-events-none absolute top-2.5 right-2.5 flex h-7 w-7",
                                "items-center justify-center rounded-full shadow-sm transition-colors",
                                checked
                                    ? "bg-finn-accent-blue text-white"
                                    : "bg-white text-transparent ring-1 ring-black/10",
                            ].join(" ")}
                        >
                            <Check className="h-4 w-4" strokeWidth={3} />
                        </span>
                    )}
                </span>

                <span className="flex flex-1 flex-col p-4">
                    <span className="truncate text-sm font-black text-finn-black">
                        {car.name}
                    </span>

                    <span className="mt-0.5 truncate text-[11px] font-bold text-finn-accent-blue">
                        {configurationName(car)}
                    </span>

                    <span className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-finn-iron">
                        {configurationDetail(car, { withPrice: false })}
                    </span>

                    <span className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-finn-cotton pt-3">
                        {price ? (
                            <span className="text-lg font-black text-finn-black tabular-nums">
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

                        {cheapest ? (
                            <span className="rounded-full bg-finn-influence-emerald-pale px-2 py-0.5 text-[10px] font-black text-finn-influence-emerald">
                                Cheapest here
                            </span>
                        ) : priceGap != null && priceGap > 0 ? (
                            <span className="text-[11px] font-bold text-finn-iron tabular-nums">
                                +{formatEUR(priceGap)} on the cheapest
                            </span>
                        ) : null}
                    </span>
                </span>
            </button>

            {/*
              * The rail, along the foot rather than down the side. It is
              * always on show — a control that appears only under the pointer
              * cannot be found by looking, and on a touch screen never
              * appears at all — and quiet enough that the name, the verdict
              * and the price are read first.
              */}
            {!selecting && (
                <span className="flex items-center gap-1 border-t border-finn-cotton px-2 py-1.5">
                    <RailButton
                        label={`View ${car.name}`}
                        onClick={onOpen}
                        icon={<Eye aria-hidden="true" className="h-4 w-4" />}
                        text="Read it"
                    />

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
                            className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-bold text-finn-iron transition hover:bg-finn-snow hover:text-finn-black"
                        >
                            <ExternalLink aria-hidden="true" className="h-4 w-4" />
                            finn.com
                        </a>
                    ) : null}

                    <button
                        type="button"
                        onClick={onUnpin}
                        aria-label={`Unpin ${car.name}`}
                        title={`Unpin ${car.name}`}
                        className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-full text-finn-iron/60 transition hover:bg-finn-error/10 hover:text-finn-error"
                    >
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </button>
                </span>
            )}
        </li>
    );
}

function RailButton({
    label,
    text,
    icon,
    onClick,
}: {
    label: string;
    text: string;
    icon: React.ReactNode;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            title={label}
            className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-bold text-finn-iron transition hover:bg-finn-pale-blue hover:text-finn-accent-blue"
        >
            {icon}
            {text}
        </button>
    );
}
