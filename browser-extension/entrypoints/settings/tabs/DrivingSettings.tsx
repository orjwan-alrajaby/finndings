import { AutomaticOnlyInput, DRIVING_EXPLANATIONS, FieldLabel, RentalPeriodInput } from "@/components/DrivingAssumptions";
import { FINN_INCLUDED_MONTHLY_KM } from "@/lib/reasoning-engine/constants";
import type { ContractType, LensPreferences } from "@/lib/reasoning-engine/types";
import { NumberInput } from "@/components/NumberInput";
import { Section } from "../components/primitives";

interface DrivingSettingsProps {
    preferences: LensPreferences;
    onChange: (preferences: LensPreferences) => void;
}

type NumericField = Exclude<keyof LensPreferences, "contractType" | "rentalFrom" | "rentalTo" | "automaticOnly">;

interface Field {
    key: NumericField;
    label: string;
    unit: string;
    /**
     * Shown blank at 0, because 0 means "not set" rather than "zero euros".
     * Only the budget is optional; the rest are assumptions Lens has to have a
     * figure for to estimate anything at all.
     */
    optional?: boolean;
    placeholder?: string;
}

const FIELDS: Field[] = [
    {
        key: "monthlyBudget",
        label: "Monthly budget",
        unit: "€/month",
        optional: true,
        placeholder: "No limit",
    },
    {
        key: "monthlyKm",
        /* Matches the setup flow and the compare drawer. */
        label: "Monthly distance",
        unit: "km/month",
    },
    { key: "petrolPrice", label: "Petrol price", unit: "€/L" },
    { key: "dieselPrice", label: "Diesel price", unit: "€/L" },
    { key: "electricityPrice", label: "Electricity price", unit: "€/kWh" },
];

const CONTRACT_OPTIONS: [ContractType, string, string][] = [
    ["private", "Private", "Uses FINN's advertised private monthly price. VAT is included."],
    ["business", "Business", "Uses FINN's advertised business monthly price, exactly as supplied."],
];

export function DrivingSettings({ preferences, onChange }: DrivingSettingsProps) {
    return (
        <Section
            title="Driving"
            description="These describe you, not FINN — how far you actually drive, what fuel or electricity costs where you live, and what you're willing to spend. Finn Lens can't know this on its own, so estimates are only as good as what you enter here."
        >
            <div className="grid gap-4 sm:grid-cols-2">
                {/*
                  * The explanations sit behind an "i" on each label, as they
                  * do in the setup flow and the compare drawer — the label no
                  * longer wraps the input, so the "i" is a button of its own
                  * rather than something that also focuses the field.
                  */}
                {FIELDS.map(({ key, label, unit, optional, placeholder }) => (
                    <div key={key}>
                        <FieldLabel htmlFor={`driving-${key}`} label={label} explanation={DRIVING_EXPLANATIONS[key]} />
                        <div className="mt-1 flex rounded-2xl bg-finn-snow px-3 has-[[aria-invalid]]:ring-2 has-[[aria-invalid]]:ring-finn-error/60">
                            <NumberInput
                                id={`driving-${key}`}
                                optional={optional}
                                placeholder={placeholder}
                                value={preferences[key]}
                                onChange={(value) => onChange({ ...preferences, [key]: value })}
                                aria-describedby={`driving-${key}-unit`}
                                className="h-12 min-w-0 flex-1 bg-transparent text-sm font-bold text-finn-black outline-none placeholder:font-normal placeholder:text-finn-iron aria-invalid:text-finn-error"
                            />
                            <span id={`driving-${key}-unit`} className="flex items-center text-xs text-finn-iron">{unit}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-5">
                <RentalPeriodInput
                    from={preferences.rentalFrom}
                    to={preferences.rentalTo}
                    tone="bg-finn-snow"
                    onChange={(rentalFrom, rentalTo) => onChange({ ...preferences, rentalFrom, rentalTo })}
                />
            </div>

            <div className="mt-5">
                <AutomaticOnlyInput
                    checked={preferences.automaticOnly}
                    tone="bg-finn-snow"
                    onChange={(automaticOnly) => onChange({ ...preferences, automaticOnly })}
                />
            </div>

            <div className="mt-5">
                <FieldLabel id="driving-contract-type" label="Contract type" explanation={DRIVING_EXPLANATIONS.contractType} />

                <div role="group" aria-labelledby="driving-contract-type" className="mt-2 grid gap-2 sm:grid-cols-2">
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
                    that is charged at the car's own price per extra kilometre, which FINN publishes for each car. That part
                    comes from FINN rather than from us — it's your monthly mileage above that decides the cost estimates.
                </p>
                <p>
                    The default prices above reflect typical German-market fuel and electricity costs. Adjust them to your own
                    market if you're comparing elsewhere.
                </p>
                <p>
                    If you charge at home sometimes and at a public charger other times, you'll be paying two different prices.
                    Lens has no way of knowing the split, so it works out electricity costs from the one price you set above.
                </p>
                <p>
                    Your budget is a limit, not a preference you rank. Lens won't reward a car for being cheap or penalise it for
                    being expensive — it only checks whether the estimated total fits. With no budget set, nothing is ruled out on
                    price and the recommendation comes down to your priorities alone.
                </p>
            </div>
        </Section>
    );
}
