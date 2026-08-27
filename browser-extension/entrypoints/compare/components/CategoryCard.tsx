import "@/assets/tailwind.css";
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { CATEGORIES, FEATURES } from "@/lib/reasoning-engine/constants";
import type {
    CategoryId,
    FeatureSelection,
} from "@/lib/reasoning-engine/types";

interface CategoryCardProps {
    catId: CategoryId;
    isChosen: boolean;
    rank?: number;
    onToggle?: () => void;

    expanded?: boolean;
    onExpand?: () => void;
    categoryFeatures: Record<CategoryId, FeatureSelection>;

    // Order mode
    draggable?: boolean;
    onDragStart?: () => void;
    onDragOver?: () => void;
    onDrop?: () => void;
    isDragOver?: boolean;

    disabled?: boolean;
    mode: "select" | "order";
}

export function CategoryCard({
    catId,
    isChosen,
    rank,
    onToggle,
    expanded,
    onExpand,
    categoryFeatures,
    disabled = false,
    mode,
    draggable = false,
    onDragStart,
    onDragOver,
    onDrop,
    isDragOver = false,
}: CategoryCardProps) {
    const meta = CATEGORIES[catId];
    const isOrderMode = mode === "order";

    return (
        <div
            draggable={isOrderMode && draggable}
            onDragStart={(event) => {
                if (!isOrderMode || !draggable) return;

                event.dataTransfer.effectAllowed = "move";
                onDragStart?.();
            }}
            onDragOver={(event) => {
                if (!isOrderMode || !draggable) return;

                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                onDragOver?.();
            }}
            onDrop={(event) => {
                if (!isOrderMode || !draggable) return;

                event.preventDefault();
                onDrop?.();
            }}
            className={[
                "overflow-hidden rounded-2xl border transition-all duration-200",

                disabled
                    ? "border-finn-snow bg-finn-snow opacity-45"
                    : isChosen
                        ? "border-finn-accent-blue/30 bg-white shadow-[0_2px_12px_rgba(0,114,234,0.08)]"
                        : "border-finn-snow bg-white hover:border-finn-iron/20 hover:shadow-sm",

                isOrderMode && isDragOver
                    ? "border-finn-accent-blue shadow-[0_0_0_2px_rgba(0,114,234,0.15)]"
                    : "",

                isOrderMode && draggable
                    ? "cursor-grab active:cursor-grabbing"
                    : "",
            ].join(" ")}
        >
            <div className="relative flex flex-col gap-1 p-3.5 sm:p-4">
                <div className="flex items-center gap-2">
                    {/* Category icon */}
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-finn-iron/30 bg-finn-pale-blue text-xl font-bold text-finn-accent-blue">
                        {meta.icon}
                    </span>

                    <p
                        className={[
                            "text-sm font-black sm:text-base",
                            isChosen
                                ? "text-finn-accent-blue"
                                : "text-finn-black",
                        ].join(" ")}
                    >
                        {meta.label}
                    </p>
                </div>

                <p
                    className={[
                        "text-xs leading-5 sm:text-sm",
                        isChosen
                            ? "text-finn-highlight-navy"
                            : "text-finn-iron",
                    ].join(" ")}
                >
                    {meta.question}
                </p>

                {/* Details / information */}
                {onExpand && (
                    <button
                        type="button"
                        onClick={onExpand}
                        disabled={disabled}
                        className="absolute right-12 top-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-finn-iron transition-colors hover:bg-finn-snow hover:text-finn-black disabled:cursor-default"
                        aria-label={`Details about ${meta.label}`}
                    >
                        <ChevronDownIcon
                            className={[
                                "h-4 w-4 transition-transform duration-200",
                                expanded ? "rotate-180" : "",
                            ].join(" ")}
                        />
                    </button>
                )}

                {/* Priority number — order mode only */}
                {isOrderMode && isChosen && rank !== undefined && (
                    <div
                        className={[
                            "absolute right-4 top-4 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black text-white",
                            rank === 0
                                ? "bg-finn-accent-blue"
                                : rank === 1
                                    ? "bg-finn-accent-blue/85"
                                    : rank === 2
                                        ? "bg-finn-accent-blue/70"
                                        : rank === 3
                                            ? "bg-finn-accent-blue/55"
                                            : "bg-finn-accent-blue/40",
                        ].join(" ")}
                    >
                        {rank + 1}
                    </div>
                )}

                {/* Add / remove */}
                {onToggle && (
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onToggle();
                        }}
                        disabled={disabled}
                        className={[
                            "absolute right-4 top-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all",

                            isChosen
                                ? "bg-finn-error/10 text-finn-error hover:bg-finn-error/80 hover:text-white"
                                : "bg-finn-accent-blue/20 text-finn-accent-blue hover:bg-finn-highlight-navy hover:text-white",

                            disabled ? "cursor-not-allowed" : "",
                        ].join(" ")}
                        aria-label={
                            isChosen
                                ? `Remove ${meta.label}`
                                : `Add ${meta.label}`
                        }
                    >
                        {isChosen ? (
                            <ArrowRightIcon className="h-4 w-4" />
                        ) : (
                            <ArrowLeftIcon className="h-4 w-4" />
                        )}
                    </button>
                )}
            </div>

            {/* Select mode keeps its accordion details.
                Order mode uses the external details panel instead. */}
            {expanded && !disabled && (
                <div className="border-t border-finn-snow px-4 pb-4 pt-3.5">
                    <CategoryReadonlyDetails
                        catId={catId}
                        categoryFeatures={categoryFeatures}
                    />
                </div>
            )}
        </div>
    );
}

function CategoryReadonlyDetails({
    catId,
    categoryFeatures,
}: {
    catId: CategoryId;
    categoryFeatures: Record<CategoryId, FeatureSelection>;
}) {
    const meta = CATEGORIES[catId];
    const features = categoryFeatures[catId] ?? [];

    return (
        <div className="space-y-4">
            {/* Description */}
            <p className="text-sm leading-6 text-finn-black">
                {meta.description}
            </p>

            {/* Best suited for */}
            <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-finn-iron">
                    Best suited for
                </p>

                <div className="flex flex-wrap gap-1.5">
                    {meta.recommendedFor.map((item) => (
                        <span
                            key={item}
                            className="rounded-full border border-finn-iron/10 bg-finn-snow px-2.5 py-1 text-[11px] font-bold text-finn-iron"
                        >
                            {item}
                        </span>
                    ))}
                </div>
            </div>

            {/* What the user picked out here */}
            {meta.features.length > 0 && (
                <div>
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-finn-iron">
                        {features.length > 0
                            ? "Features you picked out"
                            : "Judged on the equipment overall"}
                    </p>

                    {features.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                            {features.map((preference) => (
                                <span
                                    key={preference.key}
                                    className="rounded-full bg-finn-pale-blue px-2.5 py-1 text-[11px] font-bold text-finn-highlight-navy"
                                >
                                    {FEATURES[preference.key].label}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[11px] leading-5 text-finn-iron">
                            You haven't singled out particular features here,
                            so cars are compared across all{" "}
                            {meta.features.length} systems this priority covers.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}