
import "@/assets/tailwind.css";
import type {
    CategoryId,
} from "@/lib/reasoning-engine/types";
import { CATEGORIES } from "@/lib/reasoning-engine/constants";
import { EnvironmentalMethod } from "@/components/EnvironmentalMethod";

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

            {categoryId === "environmental" ? (
                <div className="mt-2">
                    <EnvironmentalMethod />
                </div>
            ) : (
                <p className="mt-2 text-xs leading-5 text-finn-iron">
                    Lens works {category.label} out from the car's own
                    published figures rather than from a list of equipment.
                </p>
            )}

            {/*
              * A framed note, not a white block. The card this sits in
              * is already white, so a white fill drew nothing at all.
              */}
            <div className="mt-4 rounded-2xl border border-finn-cotton bg-white p-3.5">
                <p className="text-xs font-black text-finn-black">
                    Nothing to configure here
                </p>

                <p className="mt-1 text-xs leading-5 text-finn-iron">
                    Because it's judged on figures rather than equipment,
                    there's no feature list here to single one out of. Where
                    you put this priority in your order is what decides how
                    much it counts.
                </p>
            </div>
        </div>
    );
}
