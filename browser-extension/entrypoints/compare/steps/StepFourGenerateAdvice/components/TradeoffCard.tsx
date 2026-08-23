import { CATEGORIES } from "@/lib/reasoning-engine/constants";
import type { CategoryId } from "@/lib/reasoning-engine/types";

export function TradeoffCard({
    title,
    text,
    priority,
}: {
    title: string;
    text: string;
    priority: CategoryId;
}) {
    return (
        <div className="rounded-[22px] bg-finn-cotton/80 p-5">
            <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-finn-warning/15 text-finn-warning">
                    !
                </div>

                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-finn-warning">
                        Because{" "}
                        {CATEGORIES[priority].label.toLowerCase()} is one
                        of your top priorities
                    </p>

                    <h3 className="mt-1 text-base font-black text-finn-black">
                        {title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-finn-iron">
                        {text}
                    </p>
                </div>
            </div>
        </div>
    );
}
