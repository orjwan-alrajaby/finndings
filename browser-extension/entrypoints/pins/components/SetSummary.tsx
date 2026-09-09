import type { ReactNode } from "react";

import { formatEUR } from "@/lib/reasoning-engine";
import type { FitAnalysis } from "@/lib/reasoning-engine/fit";
import type { PinnedFinnCar } from "@/lib/types";

import { bestMatch, cheapestPrice } from "../utils/sorting";

/**
 * The set, said out loud, before any single car is read.
 *
 * This was a paragraph of standing copy and three identical white cards —
 * Pinned, Best match, Cheapest — laid on the same grey the rest of the page
 * sits on. Everything about it was true and none of it had a shape: four
 * boxes of equal weight at the top of a page made of boxes of equal weight,
 * with the one genuinely interesting fact (which car is ahead, and by how
 * much) reduced to a caption under a grey label.
 *
 * It is one banner now, and it *says* the thing rather than tabulating it.
 * The sentence underneath the title is written from the same analyses the
 * cards below are drawn from, so the page opens by telling the reader where
 * their shortlist actually stands — which car leads, which is cheapest, and
 * what that costs — instead of asking them to work it out by reading three
 * figures and doing the subtraction.
 *
 * Navy, because a page whose entire content is white cards on grey has no
 * top. This is the one dark thing on it, it holds the title, and it is page
 * furniture rather than a verdict about a car — the advice page's navy hero
 * is a claim about one car, and this is the banner of a page.
 */
export function SetSummary({
    cars,
    analyses,
}: {
    cars: PinnedFinnCar[];
    analyses: Map<number, FitAnalysis>;
}) {
    const best = bestMatch(cars, analyses);
    const cheapest = cheapestPrice(cars);

    return (
        <section className="overflow-hidden rounded-[28px] bg-finn-highlight-navy px-6 py-6 text-white sm:px-8 sm:py-7">
            <h1 className="text-3xl font-black tracking-tight">Pinned cars</h1>

            <p className="mt-2.5 max-w-2xl text-sm leading-6 text-white/75">
                {standing(cars, best, cheapest)}
            </p>

            <dl className="mt-6 grid gap-x-8 gap-y-4 border-t border-white/15 pt-5 sm:grid-cols-3">
                <Figure
                    label="On your board"
                    value={`${cars.length} ${cars.length === 1 ? "car" : "cars"}`}
                    detail={
                        cars.length < 2
                            ? "One more and Lens can rank them"
                            : "Ready to rank"
                    }
                />

                <Figure
                    label="Ahead on your ranking"
                    value={best?.car.name ?? "Not scored yet"}
                    detail={
                        best
                            ? best.band.label
                            : "FINN published no equipment for these"
                    }
                    lead
                />

                <Figure
                    label="Cheapest"
                    value={
                        cheapest ? `${formatEUR(cheapest.price)}/mo` : "—"
                    }
                    detail={cheapest?.name ?? "No prices published"}
                />
            </dl>
        </section>
    );
}

/**
 * Where the shortlist stands, in a sentence.
 *
 * Written rather than tabulated because the interesting part is the
 * *relationship* between the figures — the leader costs this much more than
 * the floor — and a relationship is a sentence. Every branch is guarded on
 * the fact it names: a set with no scores says so, a set of one says what is
 * missing, and the gap is only mentioned when the leader is not itself the
 * cheapest.
 */
function standing(
    cars: PinnedFinnCar[],
    best: ReturnType<typeof bestMatch>,
    cheapest: ReturnType<typeof cheapestPrice>,
): ReactNode {
    if (cars.length === 1) {
        return "One car kept. Pin a second and Lens can tell you which of them fits you better — and what the difference costs.";
    }

    if (!best) {
        return "Everything you kept while browsing. FINN has published no equipment for these yet, so there is nothing to rank them on — the prices below are still yours to compare.";
    }

    const leaderPrice = best.car.pricing?.customerMonthly?.price;
    const gap =
        leaderPrice && cheapest ? leaderPrice - cheapest.price : null;

    return (
        <>
            <strong className="font-black text-white">
                {best.car.name}
            </strong>{" "}
            is ahead on your ranking, a {best.band.label.toLowerCase()}.
            {gap != null && gap > 0 ? (
                <>
                    {" "}
                    It is{" "}
                    <strong className="font-black text-white">
                        {formatEUR(gap)} a month
                    </strong>{" "}
                    more than {cheapest?.name}, the cheapest of the{" "}
                    {cars.length}.
                </>
            ) : (
                <> It is also the cheapest of the {cars.length}.</>
            )}
        </>
    );
}

function Figure({
    label,
    value,
    detail,
    lead,
}: {
    label: string;
    value: string;
    detail: string;
    /** Marks the one figure that is a verdict rather than a count. */
    lead?: boolean;
}) {
    return (
        <div className="min-w-0">
            <dt className="text-[10px] font-black uppercase tracking-[0.14em] text-white/50">
                {label}
            </dt>

            <dd
                className={[
                    "mt-1 truncate text-base font-black",
                    lead ? "text-finn-pale-blue" : "text-white",
                ].join(" ")}
            >
                {value}
            </dd>

            <dd className="mt-0.5 truncate text-[11px] leading-4 text-white/60">
                {detail}
            </dd>
        </div>
    );
}
