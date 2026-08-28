import { PencilSquareIcon } from "@heroicons/react/24/outline";
import type { ReactNode } from "react";

interface FeatureCardProps {
    icon: string;
    label: string;
    featureCount: number;
    open: boolean;
    onToggle: () => void;
    children?: ReactNode;
}

export function FeatureCard({
    icon,
    label,
    featureCount,
    open,
    onToggle,
    children,
}: FeatureCardProps) {
    return (
        <div
            className={[
                "overflow-hidden rounded-[20px] transition",
                open
                    ? "bg-finn-pale-blue shadow-[0_0_0_2px] shadow-finn-accent-blue"
                    : "bg-finn-snow drop-shadow-sm",
            ].join(" ")}
        >
            <div className="flex w-full items-center gap-3 p-4 text-left">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-finn-iron/20 bg-white text-2xl font-bold text-finn-accent-blue">
                        {icon}
                    </span>

                    <div className="min-w-0 flex-1">
                        <p
                            className={[
                                "text-sm font-black",
                                open
                                    ? "text-finn-accent-blue"
                                    : "text-finn-black",
                            ].join(" ")}
                        >
                            {label}
                        </p>

                        {/*
                          * Both states say what Lens will do, because both
                          * are real answers. Picking nothing is judged on the
                          * whole category; picking five adds weight to those
                          * five and still judges the whole category. Neither
                          * line may imply the rest stopped counting.
                          */}
                        <p
                            className={[
                                "mt-0.5 text-[11px] font-bold",
                                open ? "text-finn-black" : "text-finn-iron",
                            ].join(" ")}
                        >
                            {featureCount > 0
                                ? `${featureCount} ${
                                      featureCount === 1
                                          ? "feature"
                                          : "features"
                                  } selected`
                                : "No specific features selected"}
                        </p>

                        <p
                            className={[
                                "mt-0.5 text-[11px] leading-4",
                                open ? "text-finn-black/70" : "text-finn-iron",
                            ].join(" ")}
                        >
                            {featureCount > 0
                                ? `${
                                      featureCount === 1 ? "It" : "They"
                                  }'ll have extra influence on your recommendation.`
                                : "We'll judge this priority on the category as a whole."}
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onToggle}
                    className={[
                        "rounded-full p-2 transition",
                        open
                            ? "bg-finn-accent-blue text-white"
                            : "border border-finn-iron/15 bg-white text-finn-iron hover:border-finn-black/40 hover:text-finn-black",
                    ].join(" ")}
                    aria-label={
                        open
                            ? `Close ${label}`
                            : `Edit ${label}`
                    }
                >
                    <PencilSquareIcon className="h-4 w-4" />
                </button>
            </div>

            {children}
        </div>
    );
}
