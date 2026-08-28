import { CheckIcon } from "@heroicons/react/24/solid";
import { InfoTip } from "@/components/InfoTip";
import {
    FEATURE_IMPORTANCE,
    FEATURES,
    IMPORTANCE_SCALE,
} from "@/lib/reasoning-engine/constants";
import type {
    FeatureId,
    FeatureImportance,
} from "@/lib/reasoning-engine/types";

interface FeatureOptionProps {
    feature: FeatureId;
    /** The influence the user gave it, or null when it isn't picked. */
    importance: FeatureImportance | null;
    /** True when this one can't be picked right now — the cap is reached. */
    disabled: boolean;
    disabledReason?: string;
    /** Shown on the leading catalogue entries as a starting point. */
    suggested?: boolean;
    /**
     * A one-line explanation of what just happened, shown under this row
     * only. The picker puts it on the user's first pick and nowhere else.
     */
    hint?: string;
    onToggle: () => void;
    onImportanceChange: (importance: FeatureImportance) => void;
}

/**
 * One feature: pick it, then say how much it should influence the result.
 *
 * The two decisions are drawn as two, because they are two. Picking is a
 * checkbox and nothing more; the influence control only exists once the row
 * has been picked, and when it appears it brings its own question with it.
 * That sequence is what stops the list reading as "tick the equipment you
 * require" — a row you have not picked asks you nothing about strength,
 * because there is nothing yet to grade.
 *
 * A picked row changes colour to the level it carries, so the answer to
 * "which of these did I say matters most" is visible without reading a word.
 */
export function FeatureOption({
    feature,
    importance,
    disabled,
    disabledReason,
    suggested = false,
    hint,
    onToggle,
    onImportanceChange,
}: FeatureOptionProps) {
    const { label, explanation } = FEATURES[feature];
    const selected = importance != null;
    const level = importance ? FEATURE_IMPORTANCE[importance] : null;

    return (
        <div
            className={[
                "rounded-2xl p-3 transition",
                level
                    ? level.selectedCardClass
                    : disabled
                        ? "bg-white/50"
                        : "bg-white ring-1 ring-finn-iron/10 hover:ring-finn-iron/30",
            ].join(" ")}
        >
            <div className="flex items-start gap-2.5">
                <button
                    type="button"
                    role="checkbox"
                    aria-checked={selected}
                    aria-label={
                        selected
                            ? `${label} — getting extra influence`
                            : `${label} — give this extra influence`
                    }
                    disabled={disabled}
                    title={disabled ? disabledReason : undefined}
                    onClick={onToggle}
                    className={[
                        "flex min-w-0 flex-1 items-start gap-2.5 text-left",
                        disabled ? "cursor-not-allowed" : "cursor-pointer",
                    ].join(" ")}
                >
                    <span
                        className={[
                            "mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition",
                            level
                                ? `${level.dotClass} border-transparent text-white`
                                : "border-finn-iron/30 bg-white",
                        ].join(" ")}
                    >
                        {selected && <CheckIcon className="h-3.5 w-3.5" />}
                    </span>

                    <span className="min-w-0">
                        <span
                            className={[
                                "block text-sm font-bold leading-5",
                                level
                                    ? "text-finn-black"
                                    : disabled
                                        ? "text-finn-iron/60"
                                        : "text-finn-black",
                            ].join(" ")}
                        >
                            {label}
                        </span>

                        {suggested && !selected && (
                            <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wide text-finn-iron">
                                Commonly picked
                            </span>
                        )}

                        {level && (
                            <span
                                className={[
                                    "mt-0.5 block text-[10px] font-black uppercase tracking-wide",
                                    level.accentTextClass,
                                ].join(" ")}
                            >
                                Extra influence · {level.label}
                            </span>
                        )}
                    </span>
                </button>

                {explanation && (
                    <span className="mt-0.5 shrink-0">
                        <InfoTip subject={label}>{explanation}</InfoTip>
                    </span>
                )}
            </div>

            {importance != null && (
                <ImportancePicker
                    label={label}
                    value={importance}
                    onChange={onImportanceChange}
                />
            )}

            {hint && (
                <p className="mt-2 text-[11px] leading-4 text-finn-black/70">
                    {hint}
                </p>
            )}
        </div>
    );
}

/**
 * How much this one should count, on the three levels the engine understands.
 *
 * The question is written out above the buttons rather than left to a
 * tooltip, because it is the whole point of the control: the reader is not
 * saying whether they want the feature — they already said that by picking it
 * — they are saying how loudly it should speak.
 *
 * Nothing here is a requirement. A car missing an extremely-important pick is
 * still eligible to win, and the Advice says so. These words describe
 * strength of preference, which is why none of them is "essential".
 */
function ImportancePicker({
    label,
    value,
    onChange,
}: {
    label: string;
    value: FeatureImportance;
    onChange: (importance: FeatureImportance) => void;
}) {
    return (
        <div className="mt-2.5 rounded-xl bg-white/80 p-2">
            <p className="px-0.5 text-[10px] font-black uppercase tracking-wide text-finn-iron">
                How much should this influence your decision?
            </p>

            <div
                role="radiogroup"
                aria-label={`How much ${label} should influence your decision`}
                className="mt-1.5 flex gap-2"
            >
                {IMPORTANCE_SCALE.map((option) => {
                    const meta = FEATURE_IMPORTANCE[option];
                    const active = value === option;

                    return (
                        <button
                            key={option}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            title={meta.hint}
                            onClick={() => onChange(option)}
                            className={[
                                "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-1.5 py-1.5 text-[10px] font-black leading-3 transition",
                                active
                                    ? meta.activeClass
                                    : `bg-white ${meta.idleClass}`,
                            ].join(" ")}
                        >
                            {/*
                              * The dot carries the colour so the label never
                              * has to. Colour is the fast read; the words are
                              * the real one, and they stay on every state.
                              */}
                            <span
                                className={[
                                    "h-2 w-2 shrink-0 rounded-full",
                                    active ? "bg-white" : meta.dotClass,
                                ].join(" ")}
                            />

                            <span className="text-left">{meta.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
