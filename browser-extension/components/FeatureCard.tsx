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

                        <p
                            className={[
                                "mt-0.5 text-[11px]",
                                open
                                    ? "text-finn-black"
                                    : "text-finn-iron",
                            ].join(" ")}
                        >
                            {/*
                              * No features picked out is a real setting, not
                              * an empty one — the card must not read like an
                              * unfinished form.
                              */}
                            {featureCount > 0
                                ? `${featureCount} ${featureCount === 1
                                    ? "feature"
                                    : "features"
                                } picked out`
                                : "Judged on the category overall"}
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
