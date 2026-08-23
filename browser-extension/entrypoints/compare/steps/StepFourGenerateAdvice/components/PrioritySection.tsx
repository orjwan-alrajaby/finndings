import { CATEGORIES } from "@/lib/reasoning-engine/constants";
import type { CategoryId } from "@/lib/reasoning-engine/types";

export function PrioritySection({
    priority,
    index,
    text,
    evidence,
}: {
    priority: CategoryId;
    index: number;
    text: string;
    evidence: string[];
}) {
    const meta = CATEGORIES[priority];

    return (
        <section className="border-t border-finn-cotton pt-6">
            <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-finn-accent-blue/10 text-sm font-black text-finn-accent-blue">
                    {meta.icon}
                </div>

                <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-finn-accent-blue">
                        Priority #{index + 1}
                    </p>

                    <h3 className="mt-1 text-lg font-black text-finn-black">
                        {meta.label}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-finn-iron">
                        {text}
                    </p>

                    {evidence.length > 0 && (
                        <ul className="mt-3 space-y-1.5">
                            {evidence.map((item) => (
                                <li
                                    key={item}
                                    className="text-xs font-semibold text-finn-black"
                                >
                                    · {item}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </section>
    );
}
