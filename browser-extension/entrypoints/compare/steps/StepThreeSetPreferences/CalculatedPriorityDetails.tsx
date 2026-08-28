
import "@/assets/tailwind.css";
import type {
    CategoryId,
} from "@/lib/reasoning-engine/types";
import { CATEGORIES } from "@/lib/reasoning-engine/constants";

export function CalculatedPriorityDetails({
    categoryId,
}: {
    categoryId: CategoryId;
}) {
    const category = CATEGORIES[categoryId];

    return (
        <div>
            <p className="text-sm font-black text-finn-black">
                How {category.label} is calculated
            </p>

            <p className="mt-2 text-xs leading-5 text-finn-iron">
                Lens calculates {category.label} automatically from the
                vehicle's available emissions and efficiency data.
            </p>

            <div className="mt-4 rounded-2xl bg-white p-3">
                <p className="text-xs font-black text-finn-black">
                    Nothing to configure here
                </p>

                <p className="mt-1 text-xs leading-5 text-finn-iron">
                    Unlike the other priorities, this one is
                    derived directly from vehicle data. There are
                    no features to single out for extra influence.
                </p>
            </div>
        </div>
    );
}
