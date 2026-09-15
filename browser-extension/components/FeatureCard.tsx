import * as Collapsible from "@radix-ui/react-collapsible";
import { SquarePen } from "lucide-react";
import type { ReactNode } from "react";

import { PriorityIcon } from "@/components/PriorityIcon";
import { surfaceTone } from "@/lib/priority-marks";
import { MAX_FEATURES_PER_CATEGORY } from "@/lib/reasoning-engine/constants";

interface FeatureCardProps {
    /** The priority's icon *name*, not the mark — see `PriorityIcon`. */
    icon: string;
    label: string;
    featureCount: number;
    open: boolean;
    onToggle: () => void;
    children?: ReactNode;
}

/**
 * One priority, and what it opens into.
 *
 * The colour belongs to the header and stops there. It used to wash the whole
 * card, which meant an open priority tinted everything inside it — and what
 * is inside it is a list of rows whose own colour is the entire point, each
 * one saying how much a feature counts. A tint under all of them flattens
 * that: the pale levels have to read against white, not against a colour
 * competing with them.
 *
 * A collapsible, so that the pen button carries `aria-expanded` and points at
 * the panel it opens. It was a bare button with an `aria-label` that swapped
 * between "Edit" and "Close" — which told a screen reader what the button
 * would do next but never that there was a region here, or that it was open.
 */
export function FeatureCard({
    icon,
    label,
    featureCount,
    open,
    onToggle,
    children,
}: FeatureCardProps) {
    /*
     * The priority's own hue, the one its row wears in the order above. Seven
     * grey cards with a small mark each were a list a reader had to read top
     * to bottom to find Comfort in; in colour it is the pink one.
     */
    const tone = surfaceTone(icon);

    return (
        <Collapsible.Root
            open={open}
            onOpenChange={onToggle}
            className={[
                "overflow-hidden rounded-[20px] bg-white transition-all",
                open
                    ? `shadow-md ring-2 ${tone.edgeStrong}`
                    : `bg-linear-to-r to-white to-60% shadow-sm ring-1 ${tone.wash} ${tone.edge} ${tone.edgeHover} hover:shadow-md`,
            ].join(" ")}
        >
            <div
                className={[
                    "relative flex w-full items-center gap-3 overflow-hidden p-4 text-left transition-colors",
                    open ? tone.ground : "",
                ].join(" ")}
            >
                {/* The mark again, large and faint, in the header only — decoration. */}
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-6 right-16 opacity-10"
                >
                    <PriorityIcon name={icon} className="h-20 w-20" />
                </span>

                <div className="relative flex min-w-0 flex-1 items-center gap-3">
                    <span
                        aria-hidden="true"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/5"
                    >
                        <PriorityIcon name={icon} className="h-5.5 w-5.5" />
                    </span>

                    <div className="min-w-0 flex-1">
                        <p
                            className={[
                                "text-sm font-black",
                                open ? tone.ink : "text-finn-black",
                            ].join(" ")}
                        >
                            {label}
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                            {/*
                              * How many of the five are raised, as five pips —
                              * a count a reader can compare down the list at a
                              * glance instead of reading seven sentences. The
                              * sentence stays beside it, because the pips say
                              * how many and only the words say what that means.
                              */}
                            {featureCount > 0 && (
                                <span
                                    aria-hidden="true"
                                    className="flex items-center gap-0.5"
                                >
                                    {Array.from(
                                        { length: MAX_FEATURES_PER_CATEGORY },
                                        (_, index) => (
                                            <span
                                                key={index}
                                                className={[
                                                    "h-1.5 w-3 rounded-full",
                                                    index < featureCount
                                                        ? tone.bar
                                                        : tone.track,
                                                ].join(" ")}
                                            />
                                        ),
                                    )}
                                </span>
                            )}

                            {/*
                              * Both states say what Lens will do, because both
                              * are real answers. Picking nothing is judged on the
                              * whole category; picking five adds influence to
                              * those five and still judges the whole priority.
                              * Neither line may imply the rest stopped counting.
                              */}
                            <p
                                className={[
                                    "text-[11px] leading-4",
                                    open ? "text-finn-black" : "text-finn-iron",
                                ].join(" ")}
                            >
                                {featureCount > 0
                                    ? `${featureCount} ${
                                          featureCount === 1
                                              ? "feature"
                                              : "features"
                                      } getting extra influence`
                                    : "Judged on the whole priority"}
                            </p>
                        </div>
                    </div>
                </div>

                <Collapsible.Trigger
                    className={[
                        "relative rounded-full p-2 shadow-sm transition",
                        open
                            ? `${tone.solid} text-white`
                            : `bg-white ring-1 ${tone.edge} ${tone.ink} ${tone.groundHover} ${tone.edgeHover}`,
                    ].join(" ")}
                    aria-label={
                        open
                            ? `Close what counts in ${label}`
                            : `Choose what counts in ${label}`
                    }
                >
                    <SquarePen aria-hidden="true" className="h-4 w-4" />
                </Collapsible.Trigger>
            </div>

            <Collapsible.Content>{children}</Collapsible.Content>
        </Collapsible.Root>
    );
}
