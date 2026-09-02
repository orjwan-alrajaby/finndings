import "@/assets/tailwind.css";
import { CheckBadgeIcon } from "@heroicons/react/24/outline";
import type { CompareStep } from "../types";
import { useShallow } from "zustand/react/shallow";
import {
    isStepReachable,
    STEP_ORDER,
    useCompareStore,
} from "../store";

const STEP_SHORT: Record<CompareStep, string> = {
    priorities: "Your priorities",
    preferences: "Set preferences",
    assumptions: "Set assumptions",
    advice: "Advice",
};

/**
 * The four steps, and the way between them.
 *
 * A step the reader has already opened stays open to them for the rest of
 * the run, in either direction — the flow keeps every answer, so there is
 * nothing to protect them from by making them walk back through it. Only a
 * step they have never reached is closed off, and only until the step
 * before it has been visited.
 */
export function Stepper() {
    const current = useCompareStore((state) => state.step);
    const visited = useCompareStore((state) => state.visited);
    const goTo = useCompareStore((state) => state.goTo);

    const reachable = useCompareStore(
        useShallow((state) =>
            STEP_ORDER.map((step) => isStepReachable(state, step)),
        ),
    );

    return (
        <div className="flex items-center gap-1">
            {STEP_ORDER.map((step, i) => {
                const active = step === current;
                const done = visited.includes(step) && !active;
                const walkable = active || reachable[i] === true;

                return (
                    <div key={step} className="flex items-center">
                        <button
                            type="button"
                            onClick={() => goTo(step)}
                            disabled={!walkable}
                            className={[
                                "flex items-center gap-2 rounded-full px-4 py-2",
                                "text-sm font-bold transition-all",
                                active
                                    ? "bg-finn-accent-blue text-white shadow-md"
                                    : walkable
                                        ? "cursor-pointer bg-finn-pale-blue text-finn-accent-blue hover:bg-finn-accent-blue/15"
                                        : "cursor-default text-finn-iron/50",
                            ].join(" ")}
                        >
                            {done ? (
                                <CheckBadgeIcon className="h-4 w-4 text-finn-accent-blue" />
                            ) : (
                                <span
                                    className={[
                                        "flex h-5 w-5 items-center justify-center rounded-full",
                                        "text-[11px] font-bold",
                                        active
                                            ? "bg-white/20 text-white"
                                            : "bg-finn-cotton text-finn-iron/60",
                                    ].join(" ")}
                                >
                                    {i + 1}
                                </span>
                            )}

                            <span className="hidden sm:inline">
                                {STEP_SHORT[step]}
                            </span>
                        </button>

                        {i < STEP_ORDER.length - 1 && (
                            <div
                                className={[
                                    "mx-1 h-px w-8 transition-colors",
                                    visited.includes(step)
                                        ? "bg-finn-accent-blue"
                                        : "bg-finn-cotton",
                                ].join(" ")}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
