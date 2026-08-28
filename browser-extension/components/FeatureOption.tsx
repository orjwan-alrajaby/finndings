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

/** A priority the user has already given this same feature extra influence in. */
export interface FeatureElsewhere {
    label: string;
    icon: string;
}

interface FeatureOptionProps {
    feature: FeatureId;
    /** The influence the user gave it. This card only exists once picked. */
    importance: FeatureImportance;
    /**
     * A one-line explanation of what just happened, shown under this row
     * only. The picker puts it on the user's first pick and nowhere else.
     */
    hint?: string;
    /** Other priorities where this same feature is already picked out. */
    alsoPickedIn?: FeatureElsewhere[];
    onToggle: () => void;
    onImportanceChange: (importance: FeatureImportance) => void;
}

/**
 * One feature the reader singled out, and how much it should count.
 *
 * Only picked features get a card, and only on the right-hand column. The
 * catalogue on the left is a list of names; the rich treatment — colour, the
 * influence control, the notices — belongs to the handful the reader actually
 * spoke about, which is what keeps a fifteen-feature category from arriving
 * as fifteen identical boxes.
 *
 * The card is coloured by the level it carries, so "which of these did I say
 * matters most" is answered without reading a word.
 */
export function FeatureOption({
    feature,
    importance,
    hint,
    alsoPickedIn,
    onToggle,
    onImportanceChange,
}: FeatureOptionProps) {
    const { label, explanation } = FEATURES[feature];
    const level = FEATURE_IMPORTANCE[importance];

    return (
        <div className={["rounded-2xl p-3 transition", level.selectedCardClass].join(" ")}>
            <div className="flex items-start gap-2.5">
                <button
                    type="button"
                    role="checkbox"
                    aria-checked={true}
                    aria-label={`${label} — remove from your picks`}
                    onClick={onToggle}
                    className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5 text-left"
                >
                    <span
                        className={[
                            "mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-transparent text-white transition",
                            level.dotClass,
                        ].join(" ")}
                    >
                        <CheckIcon className="h-3.5 w-3.5" />
                    </span>

                    <span className="min-w-0">
                        <span className="block text-sm font-bold leading-5 text-finn-black">
                            {label}
                        </span>

                        <span
                            className={[
                                "mt-0.5 block text-[10px] font-black uppercase tracking-wide",
                                level.accentTextClass,
                            ].join(" ")}
                        >
                            {level.badgeLabel}
                        </span>
                    </span>
                </button>

                {explanation && (
                    <span className="mt-0.5 shrink-0">
                        <InfoTip subject={label}>{explanation}</InfoTip>
                    </span>
                )}
            </div>

            <ImportancePicker
                label={label}
                value={importance}
                onChange={onImportanceChange}
            />

            {alsoPickedIn && alsoPickedIn.length > 0 && (
                <DuplicateNotice label={label} elsewhere={alsoPickedIn} />
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
 * The same feature, already spoken for under another priority.
 *
 * Not an error, and not undone for them: a feature that sits in two
 * catalogues genuinely counts in both, so picking it twice does something
 * real. What it also does is spend two of ten picks on one signal, and that
 * is the part a reader can't see from inside one category. So the note states
 * both halves and leaves the choice where it belongs.
 */
function DuplicateNotice({
    label,
    elsewhere,
}: {
    label: string;
    elsewhere: FeatureElsewhere[];
}) {
    const names = elsewhere.map((item) => item.label);

    const joined =
        names.length === 1
            ? names[0]
            : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

    return (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-white/70 px-2.5 py-2 text-[11px] leading-4 text-finn-iron">
            <span aria-hidden className="shrink-0">
                {elsewhere.map((item) => item.icon).join(" ")}
            </span>

            <span>
                You've also given {label.toLowerCase()} extra influence under{" "}
                <strong className="font-black text-finn-black">{joined}</strong>
                . It counts in both — or spend this pick on something else.
            </span>
        </p>
    );
}

/**
 * How much this one should count, on the three levels the engine understands.
 *
 * The labels are adverbs answering the question above them, so the control
 * reads as one sentence: how much should this influence your decision —
 * somewhat, moderately, highly. The question is written out once, on the
 * first picked row; asking it again under every row after that is the same
 * sentence three times in one column. The radiogroup carries it as a label
 * either way, so a screen reader hears the question on every control.
 *
 * Nothing here is a requirement. A car missing a highly-weighted pick is
 * still eligible to win, and the Advice says so.
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
            <p className="px-0.5 pb-1.5 text-[10px] font-black uppercase tracking-wide text-finn-iron">
                How much should this influence your decision?
            </p>
            <div
                role="radiogroup"
                aria-label={`How much ${label} should influence your decision`}
                className="flex gap-1"
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
                                "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-1.5 py-1.5 text-[11px] font-black leading-3 transition",
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

                            <span>{meta.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
