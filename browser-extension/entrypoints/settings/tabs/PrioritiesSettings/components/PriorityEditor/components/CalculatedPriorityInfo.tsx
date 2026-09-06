import type { PriorityDefinition } from "@/lib/reasoning-engine/types";
import { EnvironmentalMethod } from "@/components/EnvironmentalMethod";

interface CalculatedPriorityInfoProps {
    priority: PriorityDefinition;
    onClose: () => void;
}

export function CalculatedPriorityInfo({
    priority,
    onClose,
}: CalculatedPriorityInfoProps) {
    return (
        <div className="space-y-4 border-t border-white p-4">
            <div className="rounded-2xl bg-white p-4">
                <p className="text-sm font-black text-finn-highlight-navy">
                    How {priority.label} is
                    calculated
                </p>

                {priority.id === "environmental" ? (
                    <div className="mt-2">
                        <EnvironmentalMethod />
                    </div>
                ) : (
                    <p className="mt-2 text-xs leading-5 text-finn-black">
                        This priority is calculated automatically from the
                        vehicle's own data rather than from a feature list.
                    </p>
                )}
            </div>

            <div className="rounded-2xl bg-white p-4">
                <p className="text-xs font-black text-finn-black">
                    Nothing to configure
                </p>

                <p className="mt-1 text-xs leading-5 text-finn-iron">
                    Because it's judged on figures rather than equipment,
                    there's no feature list here to single one out of. Where
                    this priority sits in your order is what decides how much
                    it counts.
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