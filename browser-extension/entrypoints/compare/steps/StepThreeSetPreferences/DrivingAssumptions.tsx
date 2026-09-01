import { FINN_INCLUDED_MONTHLY_KM } from "@/lib/reasoning-engine/constants";
import type {
    ContractType,
    LensPreferences,
} from "@/lib/reasoning-engine/types";

type NumericField = Exclude<keyof LensPreferences, "contractType">;

/**
 * What the reader's driving costs, as its own half of step 3.
 *
 * Every field here arrives with a working value, so this is a panel to
 * correct rather than a form to fill in — which is why the defaults are
 * offered as a button and not merely as placeholder text. The budget is the
 * one that changes what the reader sees rather than what a car costs, so it
 * says so, and it is called out again when it is still sitting on the
 * placeholder Lens ships with.
 */
export function DrivingAssumptions({
    preferences,
    setPreferences,
    onUseSaved,
    isSaved,
}: {
    preferences: LensPreferences;
    setPreferences: (value: LensPreferences) => void;
    /** Puts every field back to the reader's saved settings. */
    onUseSaved?: () => void;
    /** True when nothing has been changed away from those. */
    isSaved?: boolean;
}) {
    const update = (key: NumericField, value: number) => {
        setPreferences({
            ...preferences,
            [key]: value,
        });
    };

    return (
        <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-finn-accent-blue">
                        Your driving
                    </p>

                    <h3 className="mt-1 text-xl font-black text-finn-black">
                        Driving assumptions
                    </h3>

                    <p className="mt-1 max-w-xl text-xs leading-5 text-finn-iron">
                        Lens uses these to estimate what each car costs you.
                        Change anything here and it applies to this comparison
                        only — your saved values stay as they are.
                    </p>
                </div>

                {onUseSaved && (
                    <button
                        type="button"
                        onClick={onUseSaved}
                        disabled={isSaved}
                        className={[
                            "shrink-0 rounded-full px-4 py-2 text-xs font-black transition",
                            isSaved
                                ? "cursor-default bg-finn-cotton text-finn-iron"
                                : "bg-finn-pale-blue text-finn-accent-blue hover:bg-finn-accent-blue hover:text-white",
                        ].join(" ")}
                    >
                        {isSaved
                            ? "Using your saved values"
                            : "Use my saved values"}
                    </button>
                )}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <AssumptionInput
                    label="Monthly budget"
                    hint="Optional. The most you want to spend per month in total, including running costs — the one figure here that decides which cars are eligible at all. Leave it blank and every car you pinned stays in the running."
                    unit="€/month"
                    value={preferences.monthlyBudget}
                    step={50}
                    /* Blank rather than €0: nobody's budget is zero. */
                    optional
                    placeholder="No limit"
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

                <div className="sm:col-span-2">
                    <ContractTypeToggle
                        value={preferences.contractType}
                        onChange={(contractType) =>
                            setPreferences({ ...preferences, contractType })
                        }
                    />
                </div>
            </div>

            <p className="mt-4 text-[11px] leading-5 text-finn-iron">
                {preferences.monthlyBudget > 0
                    ? `Your budget decides which cars are eligible to be
                       recommended. It is not ranked alongside your priorities,
                       and it never adds or removes points from a car's score.`
                    : `You haven't set a budget, so every car you pinned is
                       eligible and the recommendation comes down to your
                       priorities alone. Set one and Lens will only recommend a
                       car it can confirm fits — it still never adds or removes
                       points from a car's score.`}
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
    optional,
    placeholder,
    onChange,
}: {
    label: string;
    hint?: string;
    unit: string;
    value: number;
    step: number;
    /** Renders 0 as an empty field, so "unset" doesn't read as "zero". */
    optional?: boolean;
    placeholder?: string;
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
                    placeholder={placeholder}
                    value={optional && value === 0 ? "" : value}
                    onChange={(event) =>
                        onChange(Number(event.target.value) || 0)
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
