import { FINN_INCLUDED_MONTHLY_KM } from "@/lib/reasoning-engine/constants";
import type {
    ContractType,
    LensPreferences,
} from "@/lib/reasoning-engine/types";

type NumericField = Exclude<keyof LensPreferences, "contractType">;

export function DrivingAssumptions({
    preferences,
    setPreferences,
}: {
    preferences: LensPreferences;
    setPreferences: (value: LensPreferences) => void;
}) {
    const update = (key: NumericField, value: number) => {
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
                    These values help Lens estimate what each car costs you.
                    The defaults are based on the German market, but you can
                    change them to reflect your situation.
                </p>
            </div>

            <div className="mt-5 flex flex-col gap-3">
                <AssumptionInput
                    label="Monthly budget"
                    hint="The most you want to spend per month in total, including running costs."
                    unit="€/month"
                    value={preferences.monthlyBudget}
                    step={50}
                    onChange={(value) => update("monthlyBudget", value)}
                />

                <AssumptionInput
                    label="How much do you drive?"
                    hint={`Approximately how many kilometres in a typical month? An estimate is fine — you can change this later. FINN includes ${FINN_INCLUDED_MONTHLY_KM} km/month.`}
                    unit="km/month"
                    value={preferences.monthlyKm}
                    step={100}
                    onChange={(value) => update("monthlyKm", value)}
                />

                <AssumptionInput
                    label="Petrol"
                    unit="€/L"
                    value={preferences.petrolPrice}
                    step={0.01}
                    onChange={(value) => update("petrolPrice", value)}
                />

                <AssumptionInput
                    label="Diesel"
                    unit="€/L"
                    value={preferences.dieselPrice}
                    step={0.01}
                    onChange={(value) => update("dieselPrice", value)}
                />

                <AssumptionInput
                    label="Electricity"
                    unit="€/kWh"
                    value={preferences.electricityPrice}
                    step={0.01}
                    onChange={(value) => update("electricityPrice", value)}
                />

                <ContractTypeToggle
                    value={preferences.contractType}
                    onChange={(contractType) =>
                        setPreferences({ ...preferences, contractType })
                    }
                />
            </div>

            <p className="mt-4 text-[11px] leading-5 text-finn-iron">
                Your budget decides which cars are eligible to be recommended.
                It is not ranked alongside your priorities, and it never adds
                or removes points from a car's score.
            </p>
        </section>
    );
}

const CONTRACT_OPTIONS: [ContractType, string][] = [
    ["private", "Private"],
    ["business", "Business"],
];

function ContractTypeToggle({
    value,
    onChange,
}: {
    value: ContractType;
    onChange: (value: ContractType) => void;
}) {
    return (
        <div>
            <span className="text-xs font-bold text-finn-black">
                Contract type
            </span>

            <div className="mt-1 flex gap-2">
                {CONTRACT_OPTIONS.map(([option, label]) => {
                    const active = value === option;

                    return (
                        <button
                            key={option}
                            type="button"
                            aria-pressed={active}
                            onClick={() => onChange(option)}
                            className={[
                                "h-11 flex-1 rounded-2xl text-xs font-black shadow-sm transition",
                                active
                                    ? "bg-finn-accent-blue text-white"
                                    : "bg-finn-pale-blue text-finn-black hover:bg-finn-cotton",
                            ].join(" ")}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            <p className="mt-1 text-[11px] leading-4 text-finn-iron">
                {value === "private"
                    ? "Lens uses FINN's advertised private monthly price. VAT is included."
                    : "Lens uses FINN's advertised business monthly price exactly as supplied."}
            </p>
        </div>
    );
}

function AssumptionInput({
    label,
    hint,
    unit,
    value,
    step,
    onChange,
}: {
    label: string;
    hint?: string;
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
                        onChange(Number(event.target.value))
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

            {hint && (
                <span className="mt-1 block text-[11px] leading-4 text-finn-iron">
                    {hint}
                </span>
            )}
        </label>
    );
}
