import type { PinnedFinnCar } from "@/lib/types";
import type { LensPreferences, VehicleScore } from "@/lib/reasoning-engine/types";
import { calculateCost } from "@/lib/reasoning-engine";

interface RecommendationRankingProps {
    ranked: PinnedFinnCar[];
    scores: VehicleScore[];
    preferences: LensPreferences;
}

function money(value: number) {
    return `€${Math.round(value).toLocaleString("de-DE")}`;
}

export function RecommendationRanking({
    ranked,
    scores,
    preferences,
}: RecommendationRankingProps) {
    return (
        <div className="mt-4 space-y-2">
            {ranked.map((car, index) => {
                const carScore = scores.find(
                    (score) => score.vehicleId === car.id,
                );

                if (!carScore) return null;

                return (
                    <div
                        key={car.id}
                        className={[
                            "flex items-center gap-3 rounded-2xl p-3",
                            index === 0
                                ? "bg-finn-accent-blue/10"
                                : "bg-finn-snow",
                        ].join(" ")}
                    >
                        <span className="w-6 text-center text-xs font-black text-finn-iron">
                            #{index + 1}
                        </span>

                        <img
                            src={car.images.thumbnail}
                            alt=""
                            className="h-9 w-12 rounded-lg object-cover"
                        />

                        <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold">
                                {car.name}
                            </p>

                            <p className="text-[10px] text-finn-iron">
                                {money(
                                    calculateCost(car, preferences)
                                        .totalMonthly,
                                )}
                                /month estimated
                            </p>
                        </div>

                        <span className="font-mono text-xs font-black">
                            {carScore.total}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}