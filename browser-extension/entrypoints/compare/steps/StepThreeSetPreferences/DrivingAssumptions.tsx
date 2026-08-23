import type { LensPreferences } from "@/lib/reasoning-engine/types";

export function DrivingAssumptions({
    preferences,
    setPreferences,
}: {
    preferences: LensPreferences;
    setPreferences: (value: LensPreferences) => void;
}) {
    const update = (
        key: keyof LensPreferences,
        value: number,
    ) => {
        setPreferences({
            ...preferences,
            [key]: value,
        });
    };

    return (
        <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6 col-span-3 h-fit">
            <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-finn-accent-blue">
                    Your driving
                </p>

                <h3 className="mt-1 text-xl font-black text-finn-black">
                    Driving assumptions
                </h3>

                <p className="mt-1 text-xs leading-5 text-finn-iron">
                    These values help Lens estimate running costs. The
                    defaults are based on the German market, but you can
                    change them to reflect your situation.
                </p>
            </div>

            <div className="mt-5 flex flex-col gap-3">
                <AssumptionInput
                    label="Budget"
                    unit="€/Month"
                    value={preferences.monthlyBudget}
                    step={50}
                    onChange={(value) =>
                        update("monthlyBudget", value)
                    }
                />
                <AssumptionInput
                    label="Annual mileage"
                    unit="km/year"
                    value={preferences.annualKm}
                    step={500}
                    onChange={(value) =>
                        update("annualKm", value)
                    }
                />

                <AssumptionInput
                    label="Petrol"
                    unit="€/L"
                    value={preferences.petrolPrice}
                    step={0.01}
                    onChange={(value) =>
                        update("petrolPrice", value)
                    }
                />

                <AssumptionInput
                    label="Diesel"
                    unit="€/L"
                    value={preferences.dieselPrice}
                    step={0.01}
                    onChange={(value) =>
                        update("dieselPrice", value)
                    }
                />

                <AssumptionInput
                    label="Electricity"
                    unit="€/kWh"
                    value={preferences.electricityPrice}
                    step={0.01}
                    onChange={(value) =>
                        update("electricityPrice", value)
                    }
                />
            </div>

            <p className="mt-4 text-[11px] leading-5 text-finn-iron">
                These assumptions only affect Lens calculations. They do not
                change the vehicle data supplied by FINN.
            </p>
        </section>
    );
}

function AssumptionInput({
    label,
    unit,
    value,
    step,
    onChange,
}: {
    label: string;
    unit: string;
    value: number;
    step: number;
    onChange: (value: number) => void;
}) {
    return (
        <label className="block">
            <span className="text-xs font-bold text-finn-black">
                {label}
            </span>

            <div className="mt-1 flex items-center rounded-2xl shadow-sm bg-finn-pale-blue px-3">
                <input
                    type="number"
                    min="0"
                    step={step}
                    value={value}
                    onChange={(event) =>
                        onChange(
                            Number(event.target.value),
                        )
                    }
                    className={[
                        "h-11 min-w-0 flex-1 bg-transparent text-sm font-bold text-finn-black outline-none",
                        // line below removes the number input's default HTML up/down arrows
                        "appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    ].join(" ")}
                />

                <span className="text-xs text-finn-iron">
                    {unit}
                </span>
            </div>
        </label>
    );
}