import { SparklesIcon } from "@heroicons/react/24/outline";
import type {
    CategoryId,
    FeatureWeight,
} from "@/lib/reasoning-engine/types";
import { CategoryCard } from "../../../components/CategoryCard";

export function PriorityColumn({
    title,
    categories,
    count,
    chosen = false,
    disabled = false,
    expandedCat,
    categoryFeatures,
    onToggle,
    onExpand,
}: {
    title: string;
    categories: CategoryId[];
    count?: number;
    chosen?: boolean;
    disabled?: boolean;
    expandedCat: CategoryId | null;
    categoryFeatures: Record<CategoryId, FeatureWeight[]>;
    onToggle: (id: CategoryId) => void;
    onExpand: (id: CategoryId) => void;
}) {
    return (
        <div
            className={[
                "rounded-3xl bg-finn-accent-blue/10 p-3 transition-all duration-300 sm:p-4",
                disabled ? "opacity-70" : "",
            ].join(" ")}
        >
            <div className="mb-3 flex items-center justify-between">
                <p
                    className={[
                        "text-[11px] font-black uppercase tracking-[0.14em]",
                        chosen
                            ? "text-finn-accent-blue"
                            : "text-finn-iron",
                    ].join(" ")}
                >
                    {title}
                </p>

                {count !== undefined && (
                    <span className="text-[11px] font-bold text-finn-iron">
                        {count}/5
                    </span>
                )}
            </div>

            {categories?.length === 0 ? (
                chosen ? (
                    <EmptySelection />
                ) : (
                    <AllCategoriesSelected />
                )
            ) : (
                <div
                    className={[
                        "space-y-2.5",
                        disabled ? "pointer-events-none" : "",
                    ].join(" ")}
                >
                    {categories?.map((catId, index) => (
                        <CategoryCard
                            key={catId}
                            catId={catId}
                            isChosen={chosen}
                            rank={chosen ? index : undefined}
                            onToggle={() => onToggle(catId)}
                            expanded={expandedCat === catId}
                            onExpand={() => onExpand(catId)}
                            categoryFeatures={categoryFeatures}
                            disabled={disabled}
                            mode="select"
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function EmptySelection() {
    return (
        <div className="flex min-h-55 items-center justify-center rounded-[22px] border-2 border-dashed border-finn-accent-blue/30 px-6 text-center">
            <div>
                <SparklesIcon className="mx-auto h-6 w-6 text-finn-accent-blue/60" />

                <p className="mt-3 text-sm font-bold text-finn-black">
                    Nothing selected yet
                </p>

                <p className="mt-1 text-xs leading-5 text-finn-iron">
                    Add categories from the right to build your list.
                </p>
            </div>
        </div>
    );
}

function AllCategoriesSelected() {
    return (
        <div className="rounded-[22px] bg-finn-snow p-8 text-center">
            <p className="text-sm font-bold text-finn-black">
                You've considered everything.
            </p>

            <p className="mt-1 text-xs text-finn-iron">
                All available categories are already selected.
            </p>
        </div>
    );
}