import { ChevronRight } from "lucide-react";

export function ActionButton({
    title,
    description,
    icon,
    disabled = false,
    onClick,
    accent,
}: {
    title: string;
    description: string;
    icon: React.ReactNode;
    disabled?: boolean;
    onClick: () => void;
    accent?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={[
                "group flex w-full items-center gap-3 rounded-[18px] border p-3.5 text-left transition-all sm:p-4",
                disabled
                    ? "cursor-not-allowed border-transparent bg-finn-cotton opacity-60"
                    : `border-finn-cotton bg-white shadow-sm hover:shadow-md active:scale-[0.99] ${accent
                        ? "hover:border-finn-accent-blue/25"
                        : "hover:border-finn-black/20"
                    }`,
            ].join(" ")}
        >
            <span
                className={[
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                    disabled
                        ? "bg-white text-finn-iron"
                        : accent
                            ? "bg-finn-pale-blue text-finn-accent-blue group-hover:bg-finn-accent-blue group-hover:text-white"
                            : "bg-finn-black/10 text-finn-black group-hover:bg-finn-black group-hover:text-white",
                ].join(" ")}
            >
                {icon}
            </span>

            <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-finn-black">{title}</span>
                <span className="mt-0.5 block text-xs leading-4 text-finn-iron">{description}</span>
            </span>

            <ChevronRight
                aria-hidden="true"
                className={[
                    "h-4 w-4 shrink-0 transition-transform",
                    disabled
                        ? "text-finn-cotton"
                        : `text-finn-iron group-hover:translate-x-0.5 ${accent
                            ? "group-hover:text-finn-accent-blue"
                            : "group-hover:text-finn-black"
                        }`,
                ].join(" ")}
            />
        </button>
    );
}