import type { ReactNode } from "react";
import { Eye, MessageCircleQuestion, Pin, Rows3, Scale } from "lucide-react";

import { PriorityIcon } from "@/components/PriorityIcon";
import { formatEUR } from "@/lib/reasoning-engine";
import { FIT_BANDS } from "@/lib/reasoning-engine/fit";
import type { CarLine, MatchSummary, WhyExplanation } from "@/lib/lens-chat/run";

/**
 * The chat's readings of a Lens result, drawn in the advice page's language:
 * the fit bands and their colours, blue for the case for a car, amber for the
 * other side of it, grey for the reader's own answers read back.
 */

export function BandChip({ car }: { car: Pick<CarLine, "band" | "bandLabel"> }) {
    return (
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${FIT_BANDS[car.band].chipClass}`}>
            {car.bandLabel}
        </span>
    );
}

export function SmallButton({
    children,
    onClick,
    tone = "quiet",
    pressed,
    disabled,
}: {
    children: ReactNode;
    onClick: () => void;
    tone?: "solid" | "quiet";
    pressed?: boolean;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-pressed={pressed}
            className={[
                "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-black transition disabled:cursor-not-allowed disabled:opacity-50",
                tone === "solid"
                    ? "bg-finn-accent-blue text-white hover:bg-finn-highlight-navy"
                    : "bg-white text-finn-black ring-1 ring-finn-cotton hover:bg-finn-pale-blue",
            ].join(" ")}
        >
            {children}
        </button>
    );
}

const budgetText: Record<CarLine["budget"], string | null> = {
    within: null,
    notSet: null,
    over: "over budget",
    unknown: "can't confirm budget",
};

const rentalText: Record<CarLine["rental"], string | null> = {
    fits: null,
    notSet: null,
    doesNotFit: "doesn't fit your dates",
    unknown: "dates unconfirmed",
};

function Flags({ car }: { car: CarLine }) {
    const flags = [budgetText[car.budget], rentalText[car.rental]].filter(Boolean);

    if (!flags.length) return null;

    return (
        <span className="text-[10px] font-bold text-finn-warning-deep">{flags.join(" · ")}</span>
    );
}

export interface CarActions {
    pinnedIds: Set<number>;
    onPin: (carId: number, pinned: boolean) => void;
    /** Present only for cars the page actually draws. */
    canShow: (carId: number) => boolean;
    onShow: (carId: number) => void;
}

function PinButton({ carId, actions, label = "Pin this car" }: { carId: number; actions: CarActions; label?: string }) {
    const pinned = actions.pinnedIds.has(carId);

    return (
        <SmallButton
            tone={pinned ? "quiet" : "solid"}
            pressed={pinned}
            onClick={() => actions.onPin(carId, !pinned)}
        >
            <Pin aria-hidden="true" className={`h-3.5 w-3.5 ${pinned ? "fill-current" : ""}`} />
            {pinned ? "Pinned" : label}
        </SmallButton>
    );
}

/* -------------------------------------------------------------------------- */

export function MatchCard({
    match,
    actions,
    onWhy,
    onCompare,
}: {
    match: MatchSummary;
    actions: CarActions;
    onWhy: () => void;
    onCompare: () => void;
}) {
    const { car } = match;

    return (
        <section className="overflow-hidden rounded-[22px] bg-finn-pale-blue">
            <div className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-finn-accent-blue">
                    {match.eyebrow}
                </p>

                <div className="mt-2 flex items-start gap-3">
                    {car.image && (
                        <img
                            src={car.image}
                            alt=""
                            /* A photo FINN's CDN won't serve is a white box; better no photo at all. */
                            onError={(event) => {
                                event.currentTarget.style.display = "none";
                            }}
                            className="h-12 w-[72px] shrink-0 rounded-xl bg-white object-cover"
                        />
                    )}

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <h3 className="text-base font-black leading-5 text-finn-black">{car.name}</h3>
                            <BandChip car={car} />
                        </div>

                        <p className="mt-0.5 text-[11px] leading-4 text-finn-iron">
                            {[
                                car.configuration,
                                `${car.costComplete ? "~" : "from "}${formatEUR(car.monthly)}/month`,
                                match.term
                                    ? `${match.term.months}-month term${match.term.extraMonths ? ` (+${match.term.extraMonths} mo)` : ""}`
                                    : null,
                            ]
                                .filter(Boolean)
                                .join(" · ")}
                        </p>
                        <Flags car={car} />
                    </div>
                </div>

                {match.reason && (
                    <p className="mt-3 text-[13px] font-semibold leading-5 text-finn-black">{match.reason}</p>
                )}

                {match.note && (
                    <p className="mt-2 border-l-2 border-finn-accent-blue/30 pl-2.5 text-xs leading-5 text-finn-iron">
                        {match.note}
                    </p>
                )}
            </div>

            {match.tradeoff && (
                <div className="bg-finn-warning/10 px-4 py-3">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-finn-warning-deep">
                        <Scale aria-hidden="true" className="h-3 w-3" />
                        Main trade-off
                    </p>
                    <p className="mt-1 text-xs font-black text-finn-black">{match.tradeoff.headline}</p>
                    <p className="mt-0.5 text-xs leading-5 text-finn-iron">{match.tradeoff.text}</p>
                </div>
            )}

            {match.alternatives.length > 0 && (
                <div className="bg-white px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-wide text-finn-iron">
                        Closest alternatives
                    </p>

                    <ul className="mt-1.5 divide-y divide-finn-cotton">
                        {match.alternatives.map((alt) => (
                            <li key={alt.id} className="py-1.5">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="min-w-0 truncate text-xs font-black text-finn-black">{alt.name}</span>
                                    <span className="flex shrink-0 items-center gap-1.5">
                                        {alt.costDifference != null && Math.abs(alt.costDifference) >= 1 && (
                                            <span className="text-[10px] font-bold text-finn-iron">
                                                {alt.costDifference > 0 ? "+" : "−"}
                                                {formatEUR(Math.abs(alt.costDifference))}/mo
                                            </span>
                                        )}
                                        <BandChip car={alt} />
                                    </span>
                                </div>
                                {alt.hook && <p className="text-[11px] leading-4 text-finn-iron">{alt.hook}</p>}
                                <Flags car={alt} />
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="flex flex-wrap gap-1.5 border-t border-white/60 bg-white px-4 py-3">
                <PinButton carId={car.id} actions={actions} />
                <SmallButton onClick={onWhy}>
                    <MessageCircleQuestion aria-hidden="true" className="h-3.5 w-3.5" />
                    Why this car?
                </SmallButton>
                {!match.singleCar && (
                    <SmallButton onClick={onCompare}>
                        <Rows3 aria-hidden="true" className="h-3.5 w-3.5" />
                        Compare alternatives
                    </SmallButton>
                )}
                {actions.canShow(car.id) && (
                    <SmallButton onClick={() => actions.onShow(car.id)}>
                        <Eye aria-hidden="true" className="h-3.5 w-3.5" />
                        Show on page
                    </SmallButton>
                )}
            </div>

            <p className="bg-white px-4 pb-3 text-[10px] leading-4 text-finn-iron">
                Ranked by Lens's own scoring across {match.candidateCount}{" "}
                {match.candidateCount === 1 ? "car" : "cars"}. Nothing is pinned unless you pin it.
            </p>
        </section>
    );
}

/* -------------------------------------------------------------------------- */

function WhySection({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="border-t border-finn-cotton px-4 py-3 first:border-t-0">
            <p className="text-[10px] font-black uppercase tracking-wide text-finn-accent-blue">{label}</p>
            <div className="mt-1 space-y-1 text-xs leading-5 text-finn-black">{children}</div>
        </div>
    );
}

export function WhyCard({ why, inShort }: { why: WhyExplanation; inShort: string | null | undefined }) {
    return (
        <section className="overflow-hidden rounded-[22px] bg-white ring-1 ring-finn-cotton">
            <div className="bg-finn-pale-blue px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-finn-accent-blue">Why this car</p>
                <h3 className="mt-0.5 text-sm font-black text-finn-black">{why.carName}</h3>
                {inShort === undefined ? null : inShort ? (
                    <p className="mt-1 text-xs leading-5 text-finn-black">{inShort}</p>
                ) : null}
            </div>

            <WhySection label="You told me">
                {why.toldMe.length ? (
                    why.toldMe.map((said) => (
                        <p key={said} className="italic text-finn-iron">
                            "{said}"
                        </p>
                    ))
                ) : (
                    <p className="text-finn-iron">
                        Nothing yet in this conversation — this uses your Lens settings.
                    </p>
                )}
                {why.understood && <p>{why.understood}</p>}
            </WhySection>

            <WhySection label="Lens prioritised">
                <ol className="flex flex-wrap gap-1.5">
                    {why.prioritised.map((item) => (
                        <li
                            key={item.label}
                            className="inline-flex items-center gap-1 rounded-full bg-finn-snow px-2 py-1 text-[11px] font-bold"
                        >
                            <span className="text-finn-accent-blue">#{item.rank}</span>
                            <PriorityIcon name={item.icon} className="h-3 w-3" />
                            {item.label}
                            <span className="text-finn-iron">{item.percent}%</span>
                        </li>
                    ))}
                </ol>
            </WhySection>

            <WhySection label="This car matched because">
                {why.matched.map((line) => (
                    <p key={line}>{line}</p>
                ))}
            </WhySection>

            <WhySection label="The trade-off">
                {why.tradeoffs.map((line) => (
                    <p key={line} className="text-finn-iron">
                        {line}
                    </p>
                ))}
            </WhySection>

            {why.caveats.length > 0 && (
                <WhySection label="Worth knowing">
                    {why.caveats.map((line) => (
                        <p key={line} className="text-finn-iron">
                            {line}
                        </p>
                    ))}
                </WhySection>
            )}
        </section>
    );
}

/* -------------------------------------------------------------------------- */

export function CompareCard({
    rows,
    headline,
    actions,
}: {
    rows: (CarLine & { isMatch: boolean; rank: number })[];
    headline: string;
    actions: CarActions;
}) {
    const unpinned = rows.filter((row) => !actions.pinnedIds.has(row.id));

    return (
        <section className="overflow-hidden rounded-[22px] bg-white ring-1 ring-finn-cotton">
            <div className="px-4 pt-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-finn-accent-blue">Compared by Lens</p>
                <p className="mt-0.5 text-xs text-finn-iron">{headline}</p>
            </div>

            <ul className="mt-2 divide-y divide-finn-cotton">
                {rows.map((row) => (
                    <li key={row.id} className={`px-4 py-2 ${row.isMatch ? "bg-finn-pale-blue/60" : ""}`}>
                        <div className="flex items-center gap-2">
                            <span className="w-5 shrink-0 text-[10px] font-black text-finn-iron">#{row.rank}</span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-black text-finn-black">
                                    {row.name}
                                    {row.isMatch && <span className="ml-1.5 text-[10px] text-finn-accent-blue">your match</span>}
                                </p>
                                <p className="text-[10px] text-finn-iron">
                                    Match {row.total} · {row.costComplete ? "~" : "from "}
                                    {formatEUR(row.monthly)}/mo
                                </p>
                                <Flags car={row} />
                            </div>
                            <BandChip car={row} />
                            <button
                                type="button"
                                aria-pressed={actions.pinnedIds.has(row.id)}
                                aria-label={actions.pinnedIds.has(row.id) ? `Unpin ${row.name}` : `Pin ${row.name}`}
                                onClick={() => actions.onPin(row.id, !actions.pinnedIds.has(row.id))}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-finn-accent-blue transition hover:bg-finn-pale-blue"
                            >
                                <Pin aria-hidden="true" className={`h-3.5 w-3.5 ${actions.pinnedIds.has(row.id) ? "fill-current" : ""}`} />
                            </button>
                        </div>
                    </li>
                ))}
            </ul>

            {unpinned.length > 1 && (
                <div className="border-t border-finn-cotton px-4 py-3">
                    <SmallButton onClick={() => unpinned.forEach((row) => actions.onPin(row.id, true))}>
                        <Pin aria-hidden="true" className="h-3.5 w-3.5" />
                        Pin these {unpinned.length} cars
                    </SmallButton>
                </div>
            )}
        </section>
    );
}
