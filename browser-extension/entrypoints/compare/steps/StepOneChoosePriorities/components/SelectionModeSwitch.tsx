import {
    PencilSquareIcon,
    SparklesIcon,
} from "@heroicons/react/24/outline";
import type { SelectionMode } from "../types";

export function SelectionModeSwitch({
    value,
    onChange,
}: {
    value: SelectionMode;
    onChange: (mode: SelectionMode) => void;
}) {
    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <ModeButton
                active={value === "profile"}
                icon={<SparklesIcon className="h-5 w-5" />}
                title="Start with a profile"
                description="Choose a ready-made starting point based on what you care about."
                onClick={() => onChange("profile")}
            />

            <ModeButton
                active={value === "custom"}
                icon={<PencilSquareIcon className="h-5 w-5" />}
                title="Choose my own priorities"
                description="Pick the things that matter most to you, one by one."
                onClick={() => onChange("custom")}
            />
        </div>
    );
}

function ModeButton({
    active,
    icon,
    title,
    description,
    onClick,
}: {
    active: boolean;
    icon: React.ReactNode;
    title: string;
    description: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                "rounded-[22px] p-4 text-left transition-all group",
                active
                    ? "bg-finn-pale-blue shadow-[0_0_0_2px] shadow-finn-accent-blue"
                    : "hover:bg-finn-pale-blue/80 bg-white shadow-sm",
            ].join(" ")}
        >
            <div className="flex items-start gap-3">
                <div
                    className={[
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                        active
                            ? "bg-finn-accent-blue text-white"
                            : "bg-finn-snow text-finn-iron group-hover:bg-white group-hover:text-finn-black",
                    ].join(" ")}
                >
                    {icon}
                </div>

                <div>
                    <p className={`text-sm font-black ${active ? "text-finn-accent-blue" : "text-finn-black"}`}>
                        {title}
                    </p>

                    <p className={`mt-1 text-xs leading-5  ${active ? "text-finn-black" : "text-finn-iron"}`}>
                        {description}
                    </p>
                </div>
            </div>
        </button>
    );
}