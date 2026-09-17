import { useId, type ReactNode } from "react";
import * as ToggleGroup from "@radix-ui/react-toggle-group";

import { InfoTip } from "@/components/InfoTip";
import { NumberInput } from "@/components/NumberInput";
import { FINN_INCLUDED_MONTHLY_KM } from "@/lib/reasoning-engine/constants";
import type {
    ContractType,
    LensPreferences,
} from "@/lib/reasoning-engine/types";

type NumericField = Exclude<keyof LensPreferences, "contractType">;

/**
 * What each driving figure is for, written from what the cost engine actually
 * does with it rather than from its label.
 *
 * One copy, because the same six figures are asked for in three places — the
 * setup flow, the compare drawer and the settings page — and an explanation
 * that says one thing in the drawer and another in settings is worse than
 * none.
 */
export const DRIVING_EXPLANATIONS: Record<keyof LensPreferences, string> = {
    monthlyBudget:
        "The most you want to spend per month all in — the subscription plus the running costs Lens works out below. It is the only figure here that changes which car Lens recommends rather than what one costs: the recommendation comes from the cars Lens can confirm fit, then from those it can't confirm either way, and only from cars over budget when that's all there is. Every car you pinned is still shown and explained. Optional.",
    monthlyKm:
        `Roughly how many kilometres you cover in a typical month — an estimate is fine. Everything Lens works out about energy is scaled by it, and FINN includes ${FINN_INCLUDED_MONTHLY_KM} km/month, so anything past that is charged at the car's own price per extra kilometre.`,
    petrolPrice:
        "What a litre costs you at the pump. Lens applies it to petrol cars, and to plug-in hybrids — FINN publishes one combined figure for those, so the whole of it is priced as fuel.",
    dieselPrice:
        "What a litre costs you at the pump. Used for diesel cars only — if you are not looking at any, this one changes nothing.",
    electricityPrice:
        "What you pay for a kilowatt-hour where you usually charge. Used for electric cars only, against the car's own consumption figure — public fast charging costs more than this, so an estimate built on home charging is the optimistic one.",
    contractType:
        "Whether you would take the car privately or through a business. FINN advertises a different monthly price for each, and this picks which of the two Lens costs every car on — nothing else about the recommendation changes.",
};

/**
 * The fields behind every cost estimate Lens makes.
 *
 * Every field here arrives with a working value, so this is a panel to
 * correct rather than a form to fill in — which is why the saved values are
 * offered as a button and not merely as placeholder text. The budget is the
 * one that changes what the reader sees rather than what a car costs, so it
 * says so, and it is called out again when it is still sitting on the
 * placeholder Lens ships with.
 *
 * Shared by the compare drawer and the setup flow, which ask for exactly the
 * same six figures. The caller carries the heading, so this says only what
 * the surrounding page cannot: which of these values are the reader's own
 * and how to get them back. `onUseSaved` is omitted where there is nothing
 * saved to go back to.
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
                <p className="min-w-0 max-w-xl text-xs leading-5 text-finn-iron">
                    Lens uses these to estimate what each car costs you.
                    Change anything here and it applies to this comparison
                    only — your saved values stay as they are.
                </p>

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
                    explanation={DRIVING_EXPLANATIONS.monthlyBudget}
                    unit="€/month"
                    value={preferences.monthlyBudget}
                    /* Blank rather than €0: nobody's budget is zero. */
                    optional
                    placeholder="No limit"
                    onChange={(value) => update("monthlyBudget", value)}
                />

                <AssumptionInput
                    /*
                     * Named rather than asked. It was "How much do you
                     * drive?", which the "i" beside it turned into "What is
                     * How much do you drive??" — and it was the only label of
                     * the six that was a question. The question itself is
                     * still the first thing the explanation says.
                     */
                    label="Monthly distance"
                    explanation={DRIVING_EXPLANATIONS.monthlyKm}
                    unit="km/month"
                    value={preferences.monthlyKm}
                    onChange={(value) => update("monthlyKm", value)}
                />

                <AssumptionInput
                    label="Petrol"
                    explanation={DRIVING_EXPLANATIONS.petrolPrice}
                    unit="€/L"
                    value={preferences.petrolPrice}
                    onChange={(value) => update("petrolPrice", value)}
                />

                <AssumptionInput
                    label="Diesel"
                    explanation={DRIVING_EXPLANATIONS.dieselPrice}
                    unit="€/L"
                    value={preferences.dieselPrice}
                    onChange={(value) => update("dieselPrice", value)}
                />

                <AssumptionInput
                    label="Electricity"
                    explanation={DRIVING_EXPLANATIONS.electricityPrice}
                    unit="€/kWh"
                    value={preferences.electricityPrice}
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
            <FieldLabel
                id="contract-type-label"
                label="Contract type"
                explanation={DRIVING_EXPLANATIONS.contractType}
            />

            {/*
              * A toggle group rather than two `aria-pressed` buttons under a
              * span. This is one question with two answers, so it gets one
              * tab stop, arrow keys between the answers, and the visible
              * label above it names the group rather than merely sitting
              * there. It cannot be deselected: every car is priced on one
              * contract or the other.
              */}
            <ToggleGroup.Root
                type="single"
                value={value}
                onValueChange={(next) => {
                    if (next) onChange(next as ContractType);
                }}
                aria-labelledby="contract-type-label"
                className="mt-1 flex gap-2"
            >
                {CONTRACT_OPTIONS.map(([option, label]) => (
                    <ToggleGroup.Item
                        key={option}
                        value={option}
                        className={[
                            "h-11 flex-1 rounded-2xl text-xs font-black shadow-sm transition",
                            "bg-finn-pale-blue text-finn-black hover:bg-finn-cotton",
                            "data-[state=on]:bg-finn-accent-blue data-[state=on]:text-white",
                        ].join(" ")}
                    >
                        {label}
                    </ToggleGroup.Item>
                ))}
            </ToggleGroup.Root>

            <p className="mt-1 text-[11px] leading-4 text-finn-iron">
                {value === "private"
                    ? "Lens uses FINN's advertised private monthly price. VAT is included."
                    : "Lens uses FINN's advertised business monthly price exactly as supplied."}
            </p>
        </div>
    );
}

/**
 * One figure, with its unit and its caveat attached to it.
 *
 * The label used to wrap the input, which associates the two but also folds
 * everything else inside the label — the unit and the whole hint sentence —
 * into the field's accessible name. "Monthly budget, euros per month,
 * optional, the most you want to spend per month in total, including running
 * costs…" is not a name.
 *
 * So the label names the field and nothing else, and the unit and the hint
 * are descriptions: read out after the name, in that order, which is the
 * order a sighted reader meets them in too.
 */
/**
 * A field's name with its explanation attached.
 *
 * Every one of these figures is asked for in two or three words — "Petrol",
 * "Electricity" — and none of them says what it is *for*. Two of the six used
 * to carry a sentence of prose underneath and the other four carried nothing,
 * which left the form looking as though the explained ones were the tricky
 * ones and the rest were self-evident. They are not: what Lens does with a
 * diesel price depends on whether any diesel car is in the comparison, and
 * the budget is the only figure on the panel that changes which cars a reader
 * is shown at all.
 *
 * So the explanation goes behind an "i" on every field instead, which is
 * where this app puts explanations everywhere else — the feature chips, the
 * priority rows — and the panel is six labelled fields rather than a wall of
 * grey small print. `InfoTip` opens on hover and pins on click, so a sentence
 * this long can actually be read.
 */
export function FieldLabel({
    htmlFor,
    id,
    label,
    explanation,
}: {
    /**
     * The input this names. Omitted for the contract type, which is a group
     * of two controls rather than one — a `label` pointing at a group names
     * nothing, so that one names itself through `id` and the group's own
     * `aria-labelledby`.
     */
    htmlFor?: string;
    id?: string;
    label: string;
    explanation: ReactNode;
}) {
    const text = "text-xs font-bold text-finn-black";

    return (
        <div className="flex items-center gap-1">
            {htmlFor ? (
                <label htmlFor={htmlFor} className={text}>
                    {label}
                </label>
            ) : (
                <span id={id} className={text}>
                    {label}
                </span>
            )}

            <InfoTip subject={label}>{explanation}</InfoTip>
        </div>
    );
}

function AssumptionInput({
    label,
    explanation,
    unit,
    value,
    optional,
    placeholder,
    onChange,
}: {
    label: string;
    explanation: ReactNode;
    unit: string;
    value: number;
    /** Renders 0 as an empty field, so "unset" doesn't read as "zero". */
    optional?: boolean;
    placeholder?: string;
    onChange: (value: number) => void;
}) {
    const id = useId();

    return (
        <div>
            <FieldLabel
                htmlFor={`${id}-field`}
                label={label}
                explanation={explanation}
            />

            <div className="mt-1 flex items-center rounded-2xl bg-finn-pale-blue px-3 shadow-sm has-[[aria-invalid]]:ring-2 has-[[aria-invalid]]:ring-finn-error/60">
                <NumberInput
                    id={`${id}-field`}
                    optional={optional}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    aria-describedby={`${id}-unit`}
                    className="h-11 min-w-0 flex-1 bg-transparent text-sm font-bold text-finn-black outline-none placeholder:font-normal placeholder:text-finn-iron aria-invalid:text-finn-error"
                />

                <span id={`${id}-unit`} className="text-xs text-finn-iron">
                    {unit}
                </span>
            </div>
        </div>
    );
}
