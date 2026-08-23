import type { PriorityDefinition } from "@/lib/reasoning-engine/types";
import {
    ChevronDownIcon,
    ChevronUpIcon,
    ExclamationTriangleIcon,
    TrashIcon,
} from "@heroicons/react/24/outline";

interface PriorityRowProps {
    definition?: PriorityDefinition;
    index: number;
    total: number;
    onMove: (index: number, direction: -1 | 1) => void;
    onRemove: (id: PriorityDefinition["id"]) => void;
}

export function PriorityRow({
    definition,
    index,
    total,
    onMove,
    onRemove,
}: PriorityRowProps) {
    const problem = !definition
        ? "no longer exists"
        : !definition.enabled
            ? "currently disabled"
            : null;

    const rankClasses = [
        "bg-finn-accent-blue",
        "bg-finn-accent-blue/85",
        "bg-finn-accent-blue/70",
        "bg-finn-accent-blue/55",
        "bg-finn-accent-blue/40",
    ];

    const rankClass =
        rankClasses[index] ?? "bg-finn-accent-blue/40";

    return (
        <div
            className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 drop-shadow-xs ${problem
                ? "border-finn-warning/20 bg-finn-warning/10"
                : "border-finn-iron/20 bg-white"
                }`}
        >
            <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white ${rankClass}`}
            >
                {index + 1}
            </span>

            <span className="text-sm">
                {definition?.icon ?? "⚠️"}
            </span>

            <span className="min-w-0 flex-1 text-xs font-semibold text-finn-black">
                {definition?.label ?? "Unknown priority"}
            </span>

            {problem && (
                <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-finn-warning">
                    <ExclamationTriangleIcon className="h-3 w-3" />
                    {problem}
                </span>
            )}

            <button
                type="button"
                onClick={() => onMove(index, -1)}
                disabled={index === 0}
                className="shrink-0 text-finn-iron transition-opacity disabled:opacity-20"
                aria-label="Move priority up"
            >
                <ChevronUpIcon className="h-3.5 w-3.5" />
            </button>

            <button
                type="button"
                onClick={() => onMove(index, 1)}
                disabled={index === total - 1}
                className="shrink-0 text-finn-iron transition-opacity disabled:opacity-20"
                aria-label="Move priority down"
            >
                <ChevronDownIcon className="h-3.5 w-3.5" />
            </button>

            {definition && (
                <button
                    type="button"
                    onClick={() => onRemove(definition.id)}
                    className="shrink-0 text-finn-iron transition-colors hover:text-finn-warning"
                    aria-label={`Remove ${definition.label}`}
                >
                    <TrashIcon className="h-3.5 w-3.5" />
                </button>
            )}
        </div>
    );
}