import type { PriorityDefinition } from "@/lib/reasoning-engine/types";

interface CalculatedPriorityInfoProps {
    priority: PriorityDefinition;
    onClose: () => void;
}

export function CalculatedPriorityInfo({
    priority,
    onClose,
}: CalculatedPriorityInfoProps) {
    const isAffordability =
        priority.id === "affordability";

    return (
        <div className="space-y-4 border-t border-white p-4">
            <div className="rounded-2xl bg-white p-4">
                <p className="text-sm font-black text-finn-highlight-navy">
                    How {priority.label} is
                    calculated
                </p>

                <p className="mt-2 text-xs leading-5 text-finn-black">
                    {isAffordability
                        ? "This priority is calculated automatically from the vehicle's financial data, including its price and relevant running costs."
                        : "This priority is calculated automatically from the vehicle's emissions and efficiency data."}
                </p>
            </div>

            <div className="rounded-2xl bg-white p-4">
                <p className="text-xs font-black text-finn-black">
                    Nothing to configure
                </p>

                <p className="mt-1 text-xs leading-5 text-finn-iron">
                    This priority does not use manually
                    selected features, so there is nothing
                    to enable or prioritize here.
                </p>
            </div>

            <button
                type="button"
                onClick={onClose}
                className="h-10 w-full rounded-full bg-white text-xs font-bold text-finn-black shadow-sm transition hover:bg-finn-cotton"
            >
                Done
            </button>
        </div>
    );
}