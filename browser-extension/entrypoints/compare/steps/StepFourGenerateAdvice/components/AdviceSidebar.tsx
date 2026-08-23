import type { CategoryId } from "@/lib/reasoning-engine/types";
import { CATEGORIES } from "@/lib/reasoning-engine/constants";

interface AdviceSidebarProps {
    priorities: CategoryId[];
}

export function AdviceSidebar({
    priorities,
}: AdviceSidebarProps) {
    return (
        <aside className="space-y-4">
            <div className="rounded-[24px] bg-white p-5 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-finn-iron">
                    Your setup
                </p>

                <div className="mt-4 space-y-2">
                    {priorities.slice(0, 5).map((priority, index) => (
                        <div
                            key={priority}
                            className="flex items-center gap-2"
                        >
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-finn-cotton text-[10px] font-black">
                                {index + 1}
                            </span>

                            <span className="text-xs font-bold">
                                {CATEGORIES[priority].label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="rounded-[24px] bg-finn-black p-5 text-white">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">
                    One important caveat
                </p>

                <p className="mt-3 text-sm leading-6 text-white/75">
                    Running costs are estimates based on your mileage and the
                    prices you entered. FINN's supplied data does not include
                    the contract's included-kilometre allowance, so Lens does
                    not invent an overage total.
                </p>
            </div>
        </aside>
    );
}