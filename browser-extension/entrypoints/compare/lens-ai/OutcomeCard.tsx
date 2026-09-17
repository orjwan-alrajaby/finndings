import type { ReactNode } from "react";
import { ArrowRight, Equal } from "lucide-react";

import { formatEUR } from "@/lib/reasoning-engine";
import type { Outcome, OutcomeCar } from "@/lib/lens-ai/outcome";

/**
 * "Here's what changed" — the engine's before and after, side by side.
 *
 * Drawn entirely from `compareOutcomes`, which reads two real recommendations.
 * The navy tile is the result under the new answers, in the colour the hero
 * uses for a recommendation, so the eye lands on the answer first.
 */
export function OutcomeCard({
    outcome,
    eyebrow = "Here's what changed",
    children,
}: {
    outcome: Outcome;
    eyebrow?: string;
    children?: ReactNode;
}) {
    return (
        <div className="rounded-[22px] bg-finn-snow p-5 sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-finn-accent-blue">
                {eyebrow}
            </p>

            <h3 className="mt-1 text-lg font-black text-finn-black">{outcome.headline}</h3>

            {outcome.cause && (
                <p className="mt-1 text-sm leading-6 text-finn-iron">{outcome.cause}</p>
            )}

            <div className="mt-4 grid items-stretch gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                <Tile car={outcome.before} label="Before" />

                <div className="flex items-center justify-center text-finn-iron">
                    {outcome.winnerChanged ? (
                        <ArrowRight aria-hidden="true" className="h-5 w-5 rotate-90 sm:rotate-0" />
                    ) : (
                        <Equal aria-hidden="true" className="h-5 w-5" />
                    )}
                </div>

                <Tile car={outcome.after} label="With this change" highlight />
            </div>

            {outcome.details.length > 0 && (
                <ul className="mt-4 space-y-1.5">
                    {outcome.details.map((detail) => (
                        <li
                            key={detail}
                            className="flex gap-2 text-sm leading-6 text-finn-black"
                        >
                            <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-finn-accent-blue" />
                            {detail}
                        </li>
                    ))}
                </ul>
            )}

            <p className="mt-3 text-[11px] leading-4 text-finn-iron">
                Worked out by Lens's own scoring, the same as the recommendation above.
            </p>

            {children && (
                <div className="mt-4 flex flex-wrap items-center gap-2">{children}</div>
            )}
        </div>
    );
}

function Tile({
    car,
    label,
    highlight = false,
}: {
    car: OutcomeCar;
    label: string;
    highlight?: boolean;
}) {
    return (
        <div
            className={[
                "flex items-center gap-3 rounded-2xl p-3",
                highlight ? "bg-finn-highlight-navy text-white" : "bg-white text-finn-black",
            ].join(" ")}
        >
            {car.image && (
                <img
                    src={car.image}
                    alt=""
                    className={[
                        "h-12 w-16 shrink-0 rounded-xl object-cover",
                        highlight ? "bg-finn-accent-blue/40" : "bg-finn-pale-blue",
                    ].join(" ")}
                />
            )}

            <div className="min-w-0">
                <p
                    className={[
                        "text-[10px] font-bold uppercase tracking-[0.14em]",
                        highlight ? "text-white/70" : "text-finn-iron",
                    ].join(" ")}
                >
                    {label}
                </p>

                <p className="truncate text-sm font-black">{car.name}</p>

                <p
                    className={[
                        "text-[11px] font-bold",
                        highlight ? "text-white/75" : "text-finn-iron",
                    ].join(" ")}
                >
                    Match {car.total} · ~{formatEUR(car.monthly)}/month
                    {car.isFallback ? " · not confirmed in budget" : ""}
                </p>
            </div>
        </div>
    );
}
