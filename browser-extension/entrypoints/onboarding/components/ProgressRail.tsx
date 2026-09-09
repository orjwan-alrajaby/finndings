import { Check } from "lucide-react";

import {
    SCREEN_LABEL,
    SCREEN_ORDER,
    type OnboardingScreen,
} from "../types";

/**
 * Where the reader is, and how much is left.
 *
 * A setup flow with no visible end is a flow people abandon, so the count is
 * stated rather than implied — five short screens, two of which ask for
 * anything. Screens already seen stay clickable in both directions: nothing
 * here is validated or gated, so there is nothing to protect the reader from
 * by making them walk forward through it again.
 *
 * All five segments are drawn to be seen, including the ones not reached yet.
 * They were `finn-cotton` against a `finn-snow` bar — a 1.04:1 contrast ratio,
 * which read as three segments and two gaps rather than as five steps of which
 * two are done. How far there is left to go is half of what a progress rail is
 * for.
 */
export function ProgressRail({
    current,
    onGoTo,
}: {
    current: OnboardingScreen;
    onGoTo: (screen: OnboardingScreen) => void;
}) {
    const index = SCREEN_ORDER.indexOf(current);

    return (
        <div className="max-w-5xl min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
                <p className="truncate text-xs font-black text-finn-black">
                    {SCREEN_LABEL[current]}
                </p>

                <p className="shrink-0 text-[11px] font-bold text-finn-iron">
                    {index + 1} of {SCREEN_ORDER.length}
                </p>
            </div>

            <div className="mt-2 flex items-center gap-1.5">
                {SCREEN_ORDER.map((screen, position) => {
                    const done = position < index;
                    const active = position === index;
                    const walkable = position <= index;

                    return (
                        <button
                            key={screen}
                            type="button"
                            disabled={!walkable}
                            onClick={() => onGoTo(screen)}
                            aria-current={active ? "step" : undefined}
                            aria-label={`${SCREEN_LABEL[screen]} — step ${position + 1} of ${SCREEN_ORDER.length}`}
                            className={[
                                "group flex h-1.5 flex-1 items-center rounded-full transition-colors",
                                active
                                    ? "bg-finn-accent-blue"
                                    : done
                                        ? "cursor-pointer bg-finn-accent-blue/45 hover:bg-finn-accent-blue/70"
                                        /* `finn-cotton` is #f3f3f3 on a #f8f8f8
                                           bar — a segment nobody can see is a
                                           rail with a missing tooth rather
                                           than a step still to come. */
                                        : "cursor-default bg-finn-iron/25",
                            ].join(" ")}
                        >
                            {/* The check is for screen readers; the rail itself carries the state visually. */}
                            {done && (
                                <Check aria-hidden="true" className="sr-only h-3 w-3" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
