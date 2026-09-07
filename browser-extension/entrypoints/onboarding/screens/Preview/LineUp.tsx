import { configurationDetail, configurationName } from "@/lib/car-labels";
import { demoCarSummary } from "@/lib/demo-cars";
import { formatEUR } from "@/lib/reasoning-engine";
import type { PinnedFinnCar } from "@/lib/types";

/**
 * The three cars, before the page starts arguing about them.
 *
 * The reading below names cars constantly — "€282/month more than Lumo" —
 * and without having met them the reader is following an argument about
 * strangers. This is the line-up they would otherwise have built by pinning.
 */
export function LineUp({
    cars,
    winnerId,
}: {
    cars: PinnedFinnCar[];
    /** Marked, so the argument that follows starts from a known place. */
    winnerId?: number;
}) {
    return (
        <div className="mt-4">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-finn-iron">
                The three cars being compared
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
                {cars.map((car) => {
                    const winner = car.id === winnerId;

                    return (
                        <div
                            key={car.id}
                            className={[
                                "rounded-[22px] bg-white p-4",
                                winner
                                    ? "shadow-[0_0_0_2px] shadow-finn-accent-blue"
                                    : "shadow-sm",
                            ].join(" ")}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <p className="min-w-0 text-sm font-black text-finn-black">
                                    {car.name}
                                </p>

                                <span className="shrink-0 rounded-full bg-finn-cotton px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-finn-iron">
                                    Example
                                </span>
                            </div>

                            <p className="mt-0.5 text-[11px] font-bold text-finn-accent-blue">
                                {configurationName(car)}
                            </p>

                            <p className="mt-0.5 text-[11px] leading-4 text-finn-iron">
                                {configurationDetail(car)}
                            </p>

                            <p className="mt-2 text-[11px] leading-4 text-finn-iron">
                                {demoCarSummary(car.id)}
                            </p>

                            <dl className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-finn-cotton pt-2.5">
                                <Spec
                                    label="Boot"
                                    value={`${car.capacity.trunk} L`}
                                />

                                <Spec
                                    label="CO₂"
                                    value={`${car.co2.value} g/km`}
                                />

                                {car.electric?.range != null &&
                                car.electric.range !== "Unknown" ? (
                                    <Spec
                                        label="Range"
                                        value={`${car.electric.range} km`}
                                    />
                                ) : (
                                    <Spec
                                        label="Uses"
                                        value={`${car.consumption.combined} ${
                                            car.consumption.unit ===
                                            "kWh/100Km"
                                                ? "kWh"
                                                : "L"
                                        }/100km`}
                                    />
                                )}
                            </dl>

                            <p className="mt-2.5 text-xs font-black text-finn-black">
                                {formatEUR(car.pricing.customerMonthly.price)}
                                <span className="font-bold text-finn-iron">
                                    /mo subscription
                                </span>
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function Spec({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0">
            <dt className="text-[9px] font-black uppercase tracking-wide text-finn-iron">
                {label}
            </dt>
            <dd className="text-[11px] font-bold text-finn-black">{value}</dd>
        </div>
    );
}
