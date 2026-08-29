import "@/assets/tailwind.css";
import {
    ArrowLeftIcon,
    ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { type CategoryId } from "@/lib/reasoning-engine/types";
import { CategoryCard } from "../components/CategoryCard";
import { useCompareStore } from "../store";

export function StepTwoOrderPrioritiesStep() {
    const priorities = useCompareStore((state) => state.priorities);
    const features = useCompareStore((state) => state.features);
    const movePriority = useCompareStore((state) => state.movePriority);
    const back = useCompareStore((state) => state.back);
    const next = useCompareStore((state) => state.next);

    const activeCategory = useCompareStore(
        (state) => state.expandedOrderCategory,
    );
    const setActiveCategory = useCompareStore(
        (state) => state.setExpandedOrderCategory,
    );

    /*
     * A drag lives and dies inside one gesture, so it stays local — there is
     * nothing to come back to.
     */
    const [draggedCategory, setDraggedCategory] =
        useState<CategoryId | null>(null);

    const [dragOverCategory, setDragOverCategory] =
        useState<CategoryId | null>(null);

    return (
        <div className="space-y-7 w-full">
            <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-finn-accent-blue">
                    Step 2
                </p>

                <h2 className="mt-2 text-3xl font-black tracking-tight text-finn-black sm:text-4xl">
                    Put them in order
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-finn-iron">
                    What's more important to you? Drag your priorities into
                    the order that feels right. Higher priorities have more
                    influence on your final recommendation.
                </p>
            </div>

            <section className="col-span-7">
                <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-black text-finn-black">
                        Your priority order
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {priorities.map((catId, index) => (
                        <CategoryCard
                            key={catId}
                            mode="order"
                            catId={catId}
                            isChosen
                            rank={index}
                            onExpand={() => setActiveCategory(catId)}
                            expanded={activeCategory === catId}
                            categoryFeatures={features}
                            draggable
                            onDragStart={() => setDraggedCategory(catId)}
                            onDragOver={() => setDragOverCategory(catId)}
                            onDrop={() => {
                                if (draggedCategory) {
                                    movePriority(draggedCategory, catId);
                                }
                            }}
                            isDragOver={dragOverCategory === catId}
                        />
                    ))}
                </div>
            </section>

            <div className="flex gap-3 border-t border-finn-cotton pt-5">
                <button
                    type="button"
                    onClick={back}
                    className="flex h-13 items-center gap-2 rounded-full border-2 border-finn-cotton px-6 text-sm font-bold text-finn-black transition hover:bg-white"
                >
                    <ArrowLeftIcon className="h-4 w-4" />
                    Back
                </button>

                <button
                    type="button"
                    onClick={next}
                    className="flex h-13 flex-1 items-center justify-center gap-2 rounded-full bg-finn-accent-blue text-sm font-black text-white shadow-md transition hover:bg-finn-highlight-navy"
                >
                    See my advice
                    <ArrowRightIcon className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
