import { FINN_INCLUDED_MONTHLY_KM } from "@/lib/reasoning-engine/constants";
import type { ContractType, LensPreferences } from "@/lib/reasoning-engine/types";
import { Section } from "../components/primitives";

interface DrivingSettingsProps {
    preferences: LensPreferences;
    onChange: (preferences: LensPreferences) => void;
}

type NumericField = Exclude<keyof LensPreferences, "contractType">;

const FIELDS: [NumericField, string, string, string, string][] = [
    [
        "monthlyBudget",
        "Monthly budget",
        "€/month",
        "50",
        "The most you want to spend per month in total, including running costs.",
    ],
    [
        "monthlyKm",
        "Monthly mileage",
        "km/month",
        "100",
        "Roughly how far you drive in a typical month. An estimate is fine.",
    ],
    ["petrolPrice", "Petrol price", "€/L", "0.01", ""],
    ["dieselPrice", "Diesel price", "€/L", "0.01", ""],
    ["electricityPrice", "Electricity price", "€/kWh", "0.01", ""],
];

const CONTRACT_OPTIONS: [ContractType, string, string][] = [
    ["private", "Private", "Uses FINN's advertised private monthly price. VAT is included."],
    ["business", "Business", "Uses FINN's advertised business monthly price, exactly as supplied."],
];

export function DrivingSettings({ preferences, onChange }: DrivingSettingsProps) {
    return (
        <Section
            title="Driving"
            description="These describe you, not FINN — how far you actually drive, what fuel or electricity costs where you live, and what you're willing to spend. FINN Lens can't know this on its own, so estimates are only as good as what you enter here."
        >
            <div className="grid gap-4 sm:grid-cols-2">
                {FIELDS.map(([key, label, unit, step, hint]) => (
                    <label key={key}>
                        <span className="text-xs font-bold text-finn-black">{label}</span>
                        <div className="mt-1 flex rounded-2xl bg-finn-snow px-3">
                            <input
                                type="number"
                                min="0"
                                step={step}
                                value={preferences[key]}
                                onChange={(event) => onChange({ ...preferences, [key]: Number(event.target.value) })}
                                className="h-12 min-w-0 flex-1 bg-transparent text-sm font-bold text-finn-black outline-none"
                            />
                            <span className="flex items-center text-xs text-finn-iron">{unit}</span>
                        </div>
                        {hint && <span className="mt-1 block text-[11px] leading-4 text-finn-iron">{hint}</span>}
                    </label>
                ))}
            </div>

            <div className="mt-5">
                <p className="text-xs font-bold text-finn-black">Contract type</p>
                <p className="mt-1 text-[11px] leading-4 text-finn-iron">
                    Which price Lens should use when it works out what a car costs you.
                </p>

                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {CONTRACT_OPTIONS.map(([value, label, description]) => {
                        const active = preferences.contractType === value;

                        return (
                            <button
                                key={value}
                                type="button"
                                aria-pressed={active}
                                onClick={() => onChange({ ...preferences, contractType: value })}
                                className={[
                                    "rounded-2xl border-2 p-3 text-left transition",
                                    active
                                        ? "border-finn-accent-blue bg-finn-pale-blue"
                                        : "border-finn-cotton bg-finn-snow hover:border-finn-iron/30",
                                ].join(" ")}
                            >
                                <span className="text-xs font-black text-finn-black">{label}</span>
                                <span className="mt-1 block text-[11px] leading-4 text-finn-iron">{description}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="mt-5 space-y-2 rounded-2xl bg-finn-cotton/70 p-4 text-xs leading-5 text-finn-iron">
                <p>
                    FINN's subscription currently includes{" "}
                    <strong className="text-finn-black">{FINN_INCLUDED_MONTHLY_KM} km/month</strong>. Anything you drive beyond
                    that is charged at the car's own extra-kilometre price, which FINN supplies per vehicle. That's a FINN fact,
                    not an estimate of your driving — your monthly mileage above is what drives the cost estimates.
                </p>
                <p>
                    The default prices above reflect typical German-market fuel and electricity costs. Adjust them to your own
                    market if you're comparing elsewhere.
                </p>
                <p>
                    FINN Lens also doesn't know your charging setup (home vs public, tariff), so electricity cost is estimated
                    from the single price above rather than a mixed charging model.
                </p>
                <p>
                    Your budget is a limit, not a preference you rank. Lens won't reward a car for being cheap or penalise it for
                    being expensive — it only checks whether the estimated total fits.
                </p>
            </div>
        </Section>
    );
}
