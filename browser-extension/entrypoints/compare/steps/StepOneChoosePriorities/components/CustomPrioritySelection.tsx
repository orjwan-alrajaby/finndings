import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import type {
    CategoryId,
    FeatureSelection,
} from "@/lib/reasoning-engine/types";
import { PriorityColumn } from "./PriorityColumn";

export function CustomPrioritySelection({
    priorities,
    available,
    atLimit,
    expandedCat,
    categoryFeatures,
    onTogglePriority,
    onExpandCategory,
    onChooseProfile,
}: {
    priorities: CategoryId[];
    available: CategoryId[];
    atLimit: boolean;
    expandedCat: CategoryId | null;
    categoryFeatures: Record<CategoryId, FeatureSelection>;
    onTogglePriority: (id: CategoryId) => void;
    onExpandCategory: (id: CategoryId) => void;
    onChooseProfile: () => void;
}) {
    return (
        <section>
            <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                    <p className="text-sm font-black text-finn-black">
                        Choose your priorities
                    </p>

                    <p className="mt-0.5 text-xs text-finn-iron">
                        Pick up to five things that matter most to you.
                        You can order them next.
                    </p>
                </div>

                <span className="rounded-full bg-finn-snow px-3 py-1 text-[11px] font-black text-finn-iron">
                    {priorities?.length}/5
                </span>
            </div>

            <div className="rounded-[28px] bg-white p-2 drop-shadow-sm">
                <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_52px_minmax(0,1fr)]">
                    <PriorityColumn
                        title="Your priorities"
                        count={priorities?.length}
                        categories={priorities}
                        chosen
                        expandedCat={expandedCat}
                        categoryFeatures={categoryFeatures}
                        onToggle={onTogglePriority}
                        onExpand={onExpandCategory}
                    />

                    <PriorityArrow />

                    <PriorityColumn
                        title="Available priorities"
                        categories={available}
                        disabled={atLimit}
                        expandedCat={expandedCat}
                        categoryFeatures={categoryFeatures}
                        onToggle={onTogglePriority}
                        onExpand={onExpandCategory}
                    />
                </div>
            </div>

            <div className="mt-5 flex justify-center">
                <button
                    type="button"
                    onClick={onChooseProfile}
                    className="flex items-center gap-1.5 text-xs font-bold text-finn-iron transition hover:text-finn-accent-blue"
                >
                    <ArrowLeftIcon className="h-3.5 w-3.5" />
                    Start with a profile instead
                </button>
            </div>
        </section>
    );
}

function PriorityArrow() {
    return (
        <div className="flex h-full flex-col items-center justify-center">
            <div className="w-px flex-1 bg-linear-to-b from-transparent via-finn-accent-blue/30 to-transparent" />

            <div className="my-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-finn-pale-blue text-finn-accent-blue">
                <ArrowLeftIcon className="h-4 w-4" />
            </div>

            <div className="w-px flex-1 bg-linear-to-b from-transparent via-finn-accent-blue/30 to-transparent" />
        </div>
    );
}