import "@/assets/tailwind.css";
import { CheckBadgeIcon } from "@heroicons/react/24/outline";
import type { CompareStep } from "../types";

const STEP_ORDER: CompareStep[] = [
    "priorities",
    "order",
    "preferences",
    "advice",
];

const STEP_SHORT: Record<CompareStep, string> = {
    priorities: "Choose priorities",
    order: "Order priorities",
    preferences: "Set preferences",
    advice: "Advice",
};

export function Stepper({
    current,
    onGoTo,
    completed,
}: {
    current: CompareStep;
    onGoTo: (step: CompareStep) => void;
    completed: Set<CompareStep>;
}) {
    return (
        <div className="flex items-center gap-1">
            {STEP_ORDER.map((step, i) => {
                const active = step === current;
                const done = completed.has(step) && !active;

                const previousStep = STEP_ORDER[i - 1];
                const reachable =
                    active ||
                    done ||
                    (previousStep !== undefined &&
                        completed.has(previousStep));

                return (
                    <div key={step} className="flex items-center">
                        <button
                            type="button"
                            onClick={() => {
                                if (reachable) {
                                    onGoTo(step);
                                }
                            }}
                            disabled={!reachable}
                            className={[
                                "flex items-center gap-2 rounded-full px-4 py-2",
                                "text-sm font-bold transition-all",
                                active
                                    ? "bg-finn-accent-blue text-white shadow-md"
                                    : done
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
                                    completed.has(step)
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