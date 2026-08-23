import { DEFAULT_FINN_MONTHLY_KM } from "@/lib/reasoning-engine/constants";
import type { LensPreferences } from "@/lib/reasoning-engine/types";
import { Section } from "../components/primitives";

interface DrivingSettingsProps {
    preferences: LensPreferences;
    onChange: (preferences: LensPreferences) => void;
}

const FIELDS: [keyof LensPreferences, string, string, string][] = [
    ["monthlyBudget", "Monthly budget", "€/Month", "50"],
    ["annualKm", "Annual mileage", "km/year", "500"],
    ["petrolPrice", "Petrol price", "€/L", "0.01"],
    ["dieselPrice", "Diesel price", "€/L", "0.01"],
    ["electricityPrice", "Electricity price", "€/kWh", "0.01"],
];

export function DrivingSettings({ preferences, onChange }: DrivingSettingsProps) {
    return (
        <Section
            title="Driving"
            description="These describe you, not FINN — how far you actually drive and what fuel or electricity costs where you live. FINN Lens can't know this on its own, so estimates are only as good as what you enter here."
        >
            <div className="grid gap-4 sm:grid-cols-2">
                {FIELDS.map(([key, label, unit, step]) => (
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
                    </label>
                ))}
            </div>

            <div className="mt-5 space-y-2 rounded-2xl bg-finn-cotton/70 p-4 text-xs leading-5 text-finn-iron">
                <p>
                    For reference, FINN's standard subscription packages typically include about{" "}
                    <strong className="text-finn-black">{DEFAULT_FINN_MONTHLY_KM} km/month</strong> before extra-kilometre charges apply.
                    That's a FINN/market fact, not an estimate of your driving — your own annual mileage above is what actually
                    drives the cost estimates.
                </p>
                <p>
                    The default prices above reflect typical German-market fuel and electricity costs. Adjust them to your own
                    market if you're comparing elsewhere.
                </p>
                <p>
                    FINN Lens also doesn't know your charging setup (home vs public, tariff), so electricity cost is estimated
                    from the single price above rather than a mixed charging model.
                </p>
            </div>
        </Section>
    );
}