import { useState, type ReactNode } from "react";
import {
    ArrowRight,
    ArrowUp,
    CalendarRange,
    Check,
    CircleHelp,
    CircleSlash,
    Eye,
    Info,
    MessageCircleQuestion,
    Minus,
    Pin,
    Rows3,
    Route,
    Scale,
    ShieldQuestion,
    TriangleAlert,
    Wallet,
} from "lucide-react";

import { PriorityIcon } from "@/components/PriorityIcon";
import { RentalPeriodInput } from "@/components/DrivingAssumptions";
import { CATEGORIES } from "@/lib/reasoning-engine/constants";
import { formatEUR, monthLabel, priorityWeights } from "@/lib/reasoning-engine";
import type { WireQuestion } from "@/lib/lens-ai/contract";
import { asPhrase, coverage, EVIDENCE, plainly, ruleLabel, withoutLabel, type EvidenceId } from "@/lib/lens-chat/evidence";
import type { FitStory, StorySection, Tone } from "@/lib/lens-chat/fit-story";
import type { CarLine, MatchSummary } from "@/lib/lens-chat/run";
import { budgetCeiling, missingEssentials, ruledOut } from "@/lib/lens-chat/understanding";
import type { Need, Translation, Understanding } from "@/lib/lens-chat/understanding";
import type { PinnedFinnCar } from "@/lib/types";

import { BandChip, SmallButton, type CarActions } from "./cards";

/**
 * The conversation's cards, in the Lens visual language: blue for what Lens
 * understood and the case for a car, amber for the catch, grey for what Lens
 * can't use. Nothing here decides anything; it lays out an `Understanding`, a
 * `Translation` and a `FitStory`.
 */

const IMPORTANCE_LABEL: Record<Need["importance"], string> = {
    essential: "Must have",
    important: "Important",
    niceToHave: "Nice to have",
};

const IMPORTANCE_CLASS: Record<Need["importance"], string> = {
    essential: "bg-finn-influence-red-pale text-finn-influence-red",
    important: "bg-finn-influence-orange-pale text-finn-influence-orange",
    niceToHave: "bg-finn-influence-emerald-pale text-finn-influence-emerald",
};

function Eyebrow({ children }: { children: ReactNode }) {
    return (
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-finn-accent-blue">{children}</p>
    );
}

function Label({ children }: { children: ReactNode }) {
    return <p className="text-[10px] font-black uppercase tracking-wide text-finn-iron">{children}</p>;
}

const toneIcon: Record<Tone, ReactNode> = {
    good: <Check aria-hidden="true" className="h-3.5 w-3.5 text-finn-influence-emerald" />,
    note: <Minus aria-hidden="true" className="h-3.5 w-3.5 text-finn-warning-deep" />,
    missing: <TriangleAlert aria-hidden="true" className="h-3.5 w-3.5 text-finn-warning-deep" />,
    unknown: <CircleHelp aria-hidden="true" className="h-3.5 w-3.5 text-finn-iron" />,
};

const periodText = (rental: NonNullable<Understanding["rental"]>) =>
    `${rental.startDay ? `${rental.startDay} ` : ""}${monthLabel(rental.from)} → ${monthLabel(rental.to)}`;

/* -------------------------------------------------------------------------- */
/* A question worth answering                                                 */
/* -------------------------------------------------------------------------- */

export function QuestionBlock({
    question,
    lead,
    picked,
    onAnswer,
    disabled,
}: {
    question: WireQuestion;
    lead: string;
    /** What the reader has chosen but not sent yet. */
    picked?: string | null;
    onAnswer: (answer: string) => void;
    disabled?: boolean;
}) {
    return (
        <div className="rounded-2xl bg-white px-3 py-3 ring-1 ring-finn-accent-blue/25">
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-finn-accent-blue">
                <ShieldQuestion aria-hidden="true" className="h-3.5 w-3.5" />
                {lead}
            </p>
            <p className="mt-1 text-sm font-black text-finn-black">{question.ask}</p>
            {question.why && (
                <p className="mt-0.5 text-xs leading-5 text-finn-iron">
                    {question.why.charAt(0).toUpperCase() + question.why.slice(1).replace(/[.\s]+$/, "")}.
                </p>
            )}
            {question.options.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {question.options.map((option) => {
                        const chosen = picked === option;

                        return (
                            <button
                                key={option}
                                type="button"
                                disabled={disabled}
                                aria-pressed={chosen}
                                onClick={() => onAnswer(chosen ? "" : option)}
                                className={[
                                    "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold transition disabled:opacity-50",
                                    chosen
                                        ? "bg-finn-accent-blue text-white"
                                        : "bg-finn-pale-blue text-finn-accent-blue hover:bg-finn-accent-blue hover:text-white",
                                ].join(" ")}
                            >
                                {chosen && <Check aria-hidden="true" className="h-3 w-3" />}
                                {option}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* What Lens understood                                                       */
/* -------------------------------------------------------------------------- */

export function UnderstandingCard({
    understanding: u,
    translation,
    reply,
    question,
    cars,
    scopeLabel,
    isUpdate,
    status,
    busy,
    suggestions,
    onCompare,
    onAnswer,
    onCorrect,
    onAcceptSuggestion,
    onDeclineSuggestion,
    onBudget,
    onPeriod,
    picked,
    onPick,
}: {
    understanding: Understanding;
    translation: Translation;
    reply: string;
    question: WireQuestion | null;
    /** Equipment Lens is offering to take into account, not applying. */
    suggestions: { id: EvidenceId; why: string }[];
    cars: PinnedFinnCar[];
    scopeLabel: string;
    isUpdate: boolean;
    status: "pending" | "applied" | "superseded";
    busy: boolean;
    onCompare: () => void;
    onAnswer: (answer: string) => void;
    onCorrect: () => void;
    onAcceptSuggestion: (id: EvidenceId) => void;
    onDeclineSuggestion: (id: EvidenceId) => void;
    /** The budget and period Lens asks for itself when the reader hasn't said. */
    onBudget: (monthly: number | null) => void;
    onPeriod: (from: string | null, to: string | null) => void;
    /** What the reader has chosen on this card and not sent yet. */
    picked: string | null;
    onPick: (answer: string) => void;
}) {
    const missing = missingEssentials(u);
    /* Half a period is not a period, so the fields hold their own state. */
    const [period, setPeriod] = useState<{ from: string | null; to: string | null }>({ from: null, to: null });
    const [showWeights, setShowWeights] = useState(false);

    /*
     * A newer understanding replaced this one, but what Lens said and asked
     * stays in the conversation — the answer below it has to read as an
     * answer to something.
     */
    if (status === "superseded") {
        if (!reply && !question) return null;

        return (
            <section className="rounded-[22px] bg-finn-pale-blue/60 px-4 py-3">
                {reply && <p className="text-sm leading-6 text-finn-black">{reply}</p>}
                {question && (
                    <p className={`${reply ? "mt-1.5" : ""} flex gap-1.5 text-sm font-black text-finn-black`}>
                        <ShieldQuestion aria-hidden="true" className="mt-1 h-3.5 w-3.5 shrink-0 text-finn-accent-blue" />
                        {question.ask}
                    </p>
                )}
            </section>
        );
    }

    const active = u.needs.filter((need) => need.status === "active");
    const dropped = u.needs.filter((need) => need.status === "dropped");
    /*
     * Said out loud rather than quietly obeyed: a reader who told Lens they
     * don't need a big boot should see that written down, next to the things
     * they do need.
     */
    const notNeeded = [
        ...u.droppedPriorities.map((id) => CATEGORIES[id].label),
        ...dropped.map((need) => need.label),
        ...ruledOut(u)
            .filter((rule) => rule.mode === "without")
            .map((rule) => `Anything FINN files as ${asPhrase(rule.id)}`),
        ...u.notModelled.filter((item) => item.stance === "doesntCare").map((item) => sentenceCase(item.said)),
    ].filter((item, index, all) => all.indexOf(item) === index);
    const wanted = u.notModelled.filter((item) => item.stance !== "doesntCare");
    const lessRelevant = new Set(translation.lessRelevant);
    const blocking = Boolean(question?.blocking);
    const hasSomething = u.budget || u.rental || active.length || u.droppedPriorities.length;

    return (
        <section className="overflow-hidden rounded-[22px] bg-finn-pale-blue">
            <div className="px-4 pt-4">
                <Eyebrow>{isUpdate ? "What I understand now" : "Here's what I understood"}</Eyebrow>
                {reply && <p className="mt-1.5 text-sm font-semibold leading-6 text-finn-black">{reply}</p>}
                {u.tension && (
                    <p className="mt-2 flex gap-1.5 rounded-2xl bg-finn-warning/10 px-3 py-2 text-xs leading-5 text-finn-black">
                        <Scale aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-finn-warning-deep" />
                        <span>
                            <span className="font-black">Where the choice will be made: </span>
                            {u.tension.charAt(0).toLowerCase() + u.tension.slice(1)}
                        </span>
                    </p>
                )}
            </div>

            {u.context.length > 0 && (
                <div className="mt-3 px-4">
                    <Label>How you'll use it</Label>
                    <ul className="mt-1 space-y-0.5">
                        {u.context.map((item) => (
                            <li key={item.label} className="flex gap-1.5 text-xs leading-5 text-finn-black">
                                <span aria-hidden="true" className="text-finn-accent-blue">·</span>
                                {item.label}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {(u.budget || u.rental || u.monthlyKm || ruledOut(u).length > 0) && (
                <div className="mt-3 space-y-1.5 px-4">
                    <Label>Your limits</Label>
                    {u.budget && (
                        <div className="flex items-start gap-2 rounded-2xl bg-white px-3 py-2">
                            <Wallet aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-finn-accent-blue" />
                            <div className="min-w-0">
                                <p className="text-sm font-black">
                                    {u.budget.kind === "hardMax"
                                        ? `${formatEUR(u.budget.monthly)}/month — a hard maximum`
                                        : u.budget.stretchTo
                                          ? `Around ${formatEUR(u.budget.monthly)}/month — ${formatEUR(u.budget.stretchTo)} at a stretch`
                                          : `Around ${formatEUR(u.budget.monthly)}/month — a target, not a limit`}
                                </p>
                                <p className="text-[11px] leading-4 text-finn-iron">
                                    {u.budget.kind === "hardMax"
                                        ? "Cars Lens estimates above it won't be recommended."
                                        : `Lens looks no further than ${formatEUR(budgetCeiling(u.budget))} a month.`}
                                </p>
                            </div>
                        </div>
                    )}
                    {/* The mileage is why a €400 listing is quoted at €756 — say it where the limits are. */}
                    {u.monthlyKm && (
                        <div className="flex items-start gap-2 rounded-2xl bg-white px-3 py-2">
                            <Route aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-finn-accent-blue" />
                            <div className="min-w-0">
                                <p className="text-sm font-black">About {u.monthlyKm.value.toLocaleString("en-GB")} km a month</p>
                                <p className="text-[11px] leading-4 text-finn-iron">
                                    Lens prices fuel or charging and FINN's extra-kilometre charge on this, so its monthly figures sit above FINN's headline price.
                                </p>
                            </div>
                        </div>
                    )}
                    {ruledOut(u).map((item) => (
                        <div key={item.id} className="flex items-start gap-2 rounded-2xl bg-white px-3 py-2">
                            <CircleSlash aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-finn-accent-blue" />
                            <div className="min-w-0">
                                <p className="text-sm font-black">
                                    {ruleLabel(item.id, item.mode)}
                                </p>
                                <p className="text-[11px] leading-4 text-finn-iron">
                                    {item.mode === "without"
                                        ? "Lens sets those cars aside before ranking, rather than scoring them lower."
                                        : "Lens ranks only cars FINN lists that way, rather than scoring the rest lower."}
                                </p>
                            </div>
                        </div>
                    ))}
                    {u.rental && (
                        <div className="flex items-start gap-2 rounded-2xl bg-white px-3 py-2">
                            <CalendarRange aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-finn-accent-blue" />
                            <div className="min-w-0">
                                <p className="text-sm font-black">{periodText(u.rental)}</p>
                                <p className="text-[11px] leading-4 text-finn-iron">
                                    Lens will price each car on the shortest FINN term that covers it, and check it can be delivered in time.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {active.length > 0 && (
                <div className="mt-3 space-y-1.5 px-4">
                    <Label>What matters</Label>
                    {active.map((need) => (
                        <div key={need.id} className="rounded-2xl bg-white px-3 py-2">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="text-sm font-black">{need.label}</span>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${IMPORTANCE_CLASS[need.importance]}`}>
                                    {IMPORTANCE_LABEL[need.importance]}
                                </span>
                            </div>
                            {need.said && (
                                <p className="text-[11px] leading-4 text-finn-iron">
                                    {/* "Because you're…" only reads when the paraphrase is second person. */}
                                    {/^(you|your)\b/i.test(need.said)
                                        ? `Because ${need.said.replace(/[.\s]+$/, "")}.`
                                        : `From what you said: ${need.said.replace(/[.\s]+$/, "")}.`}
                                </p>
                            )}

                            {need.evidence.filter((entry) => !lessRelevant.has(entry.id)).length > 0 && (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                    {need.evidence
                                        .filter((entry) => !lessRelevant.has(entry.id))
                                        .map((entry) => (
                                            <EvidenceChip key={entry.id} id={entry.id} use={entry.use} unwanted={entry.unwanted} cars={cars} />
                                        ))}
                                </div>
                            )}

                            {need.notInData && (
                                <p className="mt-1 text-[11px] leading-4 text-finn-iron">
                                    FINN doesn't publish {need.notInData}, so Lens can't check that part.
                                </p>
                            )}
                        </div>
                    ))}
                    {/* The counts sentence needs a count — on a page whose cars haven't loaded, the headline is a sentence of its own. */}
                    {cars.length > 0 && (
                        <p className="text-[10px] leading-4 text-finn-iron">Counts are listings across {scopeLabel}.</p>
                    )}
                </div>
            )}

            {u.capabilities.length > 0 && (
                <div className="mt-3 space-y-1.5 px-4">
                    <Label>You're already confident with</Label>
                    {u.capabilities.map((item) => (
                        <p key={item.label} className="rounded-2xl bg-white/70 px-3 py-2 text-xs leading-5">
                            <span className="font-black">{item.label}</span>
                            {item.lessRelevant.length > 0 && (
                                <span className="text-finn-iron">
                                    {" "}— so I won't lean on {item.lessRelevant.map((id) => EVIDENCE[id].label.toLowerCase()).join(" or ")}.
                                </span>
                            )}
                        </p>
                    ))}
                </div>
            )}

            {notNeeded.length > 0 && (
                <div className="mt-3 px-4">
                    <Label>What you don't need</Label>
                    <ul className="mt-1 space-y-0.5">
                        {notNeeded.map((item) => (
                            <li key={item} className="flex gap-1.5 text-xs leading-5 text-finn-iron">
                                <span aria-hidden="true">·</span>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {wanted.length > 0 && (
                <div className="mt-3 space-y-1.5 px-4">
                    <Label>Lens can't judge</Label>
                    {wanted.map((item) => (
                        <p key={item.said} className="flex gap-2 rounded-2xl border border-white/80 bg-white/50 px-3 py-2 text-xs leading-5 text-finn-iron">
                            <CircleSlash aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>
                                <span className="font-black text-finn-black">"{item.said}"</span> — {item.explanation}
                            </span>
                        </p>
                    ))}
                </div>
            )}

            {status === "pending" && (missing.budget || missing.period) && (
                <div className="mt-3 px-4">
                    <EssentialsBlock
                        missing={missing}
                        period={period}
                        busy={busy}
                        onBudget={onBudget}
                        onPeriod={(from, to) => {
                            setPeriod({ from, to });
                            onPeriod(from, to);
                        }}
                    />
                </div>
            )}

            {suggestions.length > 0 && status === "pending" && (
                <div className="mt-3 px-4">
                    <SuggestionBlock
                        suggestions={suggestions}
                        cars={cars}
                        busy={busy}
                        onAccept={onAcceptSuggestion}
                        onDecline={onDeclineSuggestion}
                    />
                </div>
            )}

            {question && status === "pending" && (
                <div className="mt-3 px-4">
                    <QuestionBlock
                        question={question}
                        lead={blocking ? "Before I compare cars" : "One thing that would help"}
                        picked={picked}
                        onAnswer={onPick}
                        disabled={busy}
                    />
                </div>
            )}

            <div className="mt-3 border-t border-white/70 bg-white/60 px-4 py-3">
                {status === "applied" ? (
                    <p className="flex items-center gap-1.5 text-xs font-bold text-finn-influence-emerald">
                        <Check aria-hidden="true" className="h-3.5 w-3.5" />
                        Compared with this.
                    </p>
                ) : (
                    <div className="flex flex-wrap items-center gap-2">
                        {picked ? (
                            /*
                             * Answered here, sent once. Sending the moment a
                             * chip is tapped replaced this card — and with it
                             * everything else Lens had asked — before the
                             * reader could answer the rest.
                             */
                            <SmallButton tone="solid" onClick={() => onAnswer(picked)} disabled={busy}>
                                <ArrowUp aria-hidden="true" className="h-3.5 w-3.5" />
                                Send my answer
                            </SmallButton>
                        ) : hasSomething ? (
                            blocking ? (
                                <SmallButton onClick={onCompare} disabled={busy}>
                                    Compare anyway
                                </SmallButton>
                            ) : (
                                <SmallButton tone="solid" onClick={onCompare} disabled={busy}>
                                    <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                                    {isUpdate ? "Update the comparison" : "Compare cars"}
                                </SmallButton>
                            )
                        ) : null}
                        <SmallButton onClick={onCorrect} disabled={busy}>
                            Not quite
                        </SmallButton>
                    </div>
                )}

                {hasSomething && (
                    <>
                        <div className="mt-2.5 rounded-2xl bg-white px-3 py-2">
                            <p className="text-[10px] font-black uppercase tracking-wide text-finn-accent-blue">
                                Temporary Lens profile
                            </p>
                            <p className="mt-0.5 text-[11px] leading-4 text-finn-iron">
                                Built from this conversation. Your saved priorities and profiles haven't changed.
                            </p>
                            {translation.profile.focus.length > 0 && (
                                <p className="mt-1.5 text-xs leading-5 text-finn-black">
                                    <span className="font-black">For this search, Lens is weighing: </span>
                                    {translation.profile.focus.map((item) => item.label).join(" · ")}
                                </p>
                            )}
                            <button
                                type="button"
                                onClick={() => setShowWeights((was) => !was)}
                                className="mt-1.5 text-[10px] font-bold text-finn-iron hover:text-finn-black"
                                aria-expanded={showWeights}
                            >
                                {showWeights ? "Hide the detail" : "Show how that becomes a score"}
                            </button>
                            {showWeights && <Weights translation={translation} />}
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}

/**
 * One thing Lens can check, and how common it is here.
 *
 * The label is equipment's own name, which is no help to someone who says
 * they don't know cars — so what the model said it would do for *them* is
 * what the chip explains on hover, with Lens's description behind it.
 */
function EvidenceChip({ id, use, unwanted, cars }: { id: EvidenceId; use?: string; unwanted?: boolean; cars: PinnedFinnCar[] }) {
    const [open, setOpen] = useState(false);
    const counts = coverage(cars, id);
    /* Where the reader wants it absent, the useful count is how many cars avoid it. */
    const answering = unwanted ? counts.notListed : counts.listed;

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen((was) => !was)}
                aria-expanded={open}
                title={plainly(id)}
                className="inline-flex items-center gap-1 rounded-full bg-finn-snow px-2 py-0.5 text-[10px] font-bold text-finn-black transition hover:bg-finn-cotton"
            >
                {unwanted ? withoutLabel(id) : EVIDENCE[id].label}
                {counts.total > 0 && (
                    <span className="font-semibold text-finn-iron">
                        · {answering} of {counts.total}
                    </span>
                )}
                <Info aria-hidden="true" className="h-2.5 w-2.5 text-finn-iron" />
            </button>
            {open && (
                <p className="w-full rounded-xl bg-finn-snow px-2.5 py-1.5 text-[11px] leading-4 text-finn-iron">
                    <span className="font-black text-finn-black">{EVIDENCE[id].label}. </span>
                    {plainly(id)}
                    {use && <> {sentenceCase(use)}</>}
                </p>
            )}
        </>
    );
}

const sentenceCase = (value: string): string =>
    `${value.charAt(0).toUpperCase()}${value.slice(1).replace(/[.\s]+$/, "")}.`;

/** The amounts most readers pick, and the wording Lens keeps for each. */
const BUDGET_CHOICES = [400, 500, 600, 750];

/**
 * What Lens needs and nobody thinks to say.
 *
 * A comparison without a budget ranks cars the reader can't have, and one
 * without a period prices every car on FINN's longest term. Both are cheap to
 * ask for and expensive to leave out, and neither needs the model — so the
 * question is asked here, and answered in one tap.
 */
function EssentialsBlock({
    missing,
    period,
    busy,
    onBudget,
    onPeriod,
}: {
    missing: { budget: boolean; period: boolean };
    /** What's typed in the period fields so far — neither month alone sets it. */
    period: { from: string | null; to: string | null };
    busy: boolean;
    onBudget: (monthly: number | null) => void;
    onPeriod: (from: string | null, to: string | null) => void;
}) {
    return (
        <div className="rounded-2xl bg-white px-3 py-3 ring-1 ring-finn-accent-blue/25">
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-finn-accent-blue">
                <Wallet aria-hidden="true" className="h-3.5 w-3.5" />
                {missing.budget && missing.period ? "Two things Lens needs" : "One thing Lens needs"}
            </p>

            {missing.budget && (
                <div className="mt-1.5">
                    <p className="text-sm font-black text-finn-black">What's the most you'd spend a month?</p>
                    <p className="text-[11px] leading-4 text-finn-iron">
                        Lens counts the subscription and the running costs together, and won't recommend a car above it.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {BUDGET_CHOICES.map((amount) => (
                            <button
                                key={amount}
                                type="button"
                                disabled={busy}
                                onClick={() => onBudget(amount)}
                                className="rounded-full bg-finn-pale-blue px-3 py-1.5 text-[11px] font-bold text-finn-accent-blue transition hover:bg-finn-accent-blue hover:text-white disabled:opacity-50"
                            >
                                Up to {formatEUR(amount)}
                            </button>
                        ))}
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => onBudget(null)}
                            className="rounded-full bg-finn-snow px-3 py-1.5 text-[11px] font-bold text-finn-iron transition hover:text-finn-black disabled:opacity-50"
                        >
                            No limit
                        </button>
                    </div>
                </div>
            )}

            {missing.period && (
                <div className={missing.budget ? "mt-3" : "mt-1.5"}>
                    <p className="text-sm font-black text-finn-black">When do you need it, and for how long?</p>
                    <p className="text-[11px] leading-4 text-finn-iron">
                        FINN rents on fixed terms, so the months you need decide which term each car is priced on — and whether it can be delivered in time.
                    </p>
                    <div className="mt-2">
                        <RentalPeriodInput from={period.from} to={period.to} tone="bg-finn-snow" onChange={onPeriod} />
                    </div>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => onPeriod(null, null)}
                        className="mt-1.5 text-[11px] font-bold text-finn-iron hover:text-finn-black disabled:opacity-50"
                    >
                        I don't have fixed dates
                    </button>
                </div>
            )}
        </div>
    );
}

/**
 * Equipment the reader never asked for, offered rather than applied.
 *
 * Lens knows about equipment most people have never heard of, and a reader
 * who hates parking may simply not know a camera can show the car from above.
 * Saying so is useful; deciding for them is not — so this says what it does
 * and leaves the choice with them.
 */
function SuggestionBlock({
    suggestions,
    cars,
    busy,
    onAccept,
    onDecline,
}: {
    suggestions: { id: EvidenceId; why: string }[];
    cars: PinnedFinnCar[];
    busy: boolean;
    onAccept: (id: EvidenceId) => void;
    onDecline: (id: EvidenceId) => void;
}) {
    return (
        <div className="space-y-1.5">
            <Label>Something Lens can check, if it's useful to you</Label>
            {suggestions.map((item) => {
                const counts = coverage(cars, item.id);

                return (
                    <div key={item.id} className="rounded-2xl bg-white px-3 py-2.5">
                        <p className="text-sm font-black text-finn-black">
                            {EVIDENCE[item.id].label}
                            {counts.total > 0 && (
                                <span className="ml-1.5 text-[10px] font-bold text-finn-iron">
                                    on {counts.listed} of {counts.total} here
                                </span>
                            )}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-4 text-finn-iron">{plainly(item.id)}</p>
                        {item.why && <p className="mt-1 text-xs leading-5 text-finn-black">{sentenceCase(item.why)}</p>}
                        <div className="mt-2 flex flex-wrap gap-2">
                            <SmallButton tone="solid" onClick={() => onAccept(item.id)} disabled={busy}>
                                Count it in
                            </SmallButton>
                            <SmallButton onClick={() => onDecline(item.id)} disabled={busy}>
                                Not important to me
                            </SmallButton>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/** The engine's view, for anyone who wants to audit it — not the main answer. */
/**
 * The session profile with its workings shown: what was said, the Lens
 * priority it became, the equipment raised inside it, and the share of the
 * result that priority carries.
 *
 * Not reasoning — a structure. It's here so a reader can check that Lens is
 * weighing their life rather than a profile they set months ago, and so we
 * can debug an odd recommendation without guessing.
 */
function Weights({ translation }: { translation: Translation }) {
    const { profile } = translation;

    return (
        <div className="mt-1.5 space-y-1.5">
            <div className="flex flex-wrap gap-1">
                {profile.priorities.map((item, index) => (
                    <span key={item.id} className="inline-flex items-center gap-1 rounded-full bg-finn-snow px-2 py-0.5 text-[10px] font-bold">
                        <span className="text-finn-accent-blue">#{index + 1}</span>
                        <PriorityIcon name={CATEGORIES[item.id].icon} className="h-3 w-3" />
                        {item.label}
                        <span className="text-finn-iron">{item.sharePercent}%</span>
                    </span>
                ))}
            </div>

            {profile.trace.map((row) => (
                <p key={row.need} className="text-[10px] leading-4 text-finn-iron">
                    <span className="font-black text-finn-black">{row.need}</span>
                    {row.priorities.length > 0 && <> → {row.priorities.map((item) => item.label).join(", ")}</>}
                    {row.raised.length > 0 && (
                        <> → raises {row.raised.map((item) => `${item.label} (${item.importance})`).join(", ")}</>
                    )}
                    {row.rules.map((rule) => (
                        <span key={rule.id}> → {rule.mode === "without" ? "rules out" : "requires"} {rule.label}</span>
                    ))}
                    {row.unpublished && <> · FINN doesn't publish {row.unpublished}</>}
                </p>
            ))}

            {profile.priorities.some((item) => item.filler) && (
                <p className="text-[10px] leading-4 text-finn-iron">
                    Lens ranks at least three priorities.{" "}
                    {profile.priorities.filter((item) => item.filler).map((item) => item.label).join(" and ")}{" "}
                    {profile.priorities.filter((item) => item.filler).length === 1 ? "comes" : "come"} from your saved settings and count least.
                </p>
            )}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Why this car fits you                                                      */
/* -------------------------------------------------------------------------- */

function SectionView({ section, compact }: { section: StorySection; compact: boolean }) {
    const icon =
        section.kind === "budget" ? (
            <Wallet aria-hidden="true" className="h-4 w-4 text-finn-accent-blue" />
        ) : section.kind === "rental" ? (
            <CalendarRange aria-hidden="true" className="h-4 w-4 text-finn-accent-blue" />
        ) : (
            toneIcon[section.tone]
        );

    const lines = compact ? section.lines.slice(0, 3) : section.lines;

    return (
        <div className="flex gap-2">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">{icon}</span>
            <div className="min-w-0">
                <p className="text-[13px] font-black leading-5 text-finn-black">{section.title}</p>
                {lines.map((line) => (
                    <p key={line.text} className={`text-xs leading-5 ${line.tone === "good" ? "text-finn-black" : "text-finn-iron"}`}>
                        {line.text}
                    </p>
                ))}
            </div>
        </div>
    );
}

export function FitCard({
    story,
    match,
    alternatives,
    actions,
    busy,
    onWhy,
    onCompare,
    onAnswer,
}: {
    story: FitStory;
    match: MatchSummary;
    /** Within the person's limits first. */
    alternatives: CarLine[];
    actions: CarActions;
    busy: boolean;
    onWhy: () => void;
    onCompare: () => void;
    onAnswer: (answer: string) => void;
}) {
    const { car } = match;
    const pinned = actions.pinnedIds.has(car.id);

    return (
        <section className="overflow-hidden rounded-[22px] bg-finn-pale-blue">
            <div className="p-4">
                <Eyebrow>{story.eyebrow}</Eyebrow>

                <div className="mt-2 flex items-start gap-3">
                    {car.image && (
                        <img
                            src={car.image}
                            alt=""
                            onError={(event) => {
                                event.currentTarget.style.display = "none";
                            }}
                            className="h-12 w-[72px] shrink-0 rounded-xl bg-white object-cover"
                        />
                    )}
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <h3 className="text-base font-black leading-5 text-finn-black">{story.carName}</h3>
                            <BandChip car={car} />
                        </div>
                        <p className="mt-0.5 text-[11px] leading-4 text-finn-iron">
                            {[car.configuration, `${car.costComplete ? "~" : "from "}${formatEUR(car.monthly)}/month`].join(" · ")}
                        </p>
                    </div>
                </div>

                {story.sections.length > 0 ? (
                    <div className="mt-3 space-y-2.5">
                        <p className="text-[10px] font-black uppercase tracking-wide text-finn-iron">Why it fits what you described</p>
                        {story.sections.map((section) => (
                            <SectionView key={section.key} section={section} compact />
                        ))}
                    </div>
                ) : (
                    match.reason && <p className="mt-3 text-[13px] font-semibold leading-5 text-finn-black">{match.reason}</p>
                )}

                <p className="mt-3 text-[11px] leading-4 text-finn-iron">{story.bandMeaning}</p>
            </div>

            {story.catch && (
                <div className="bg-finn-warning/10 px-4 py-3">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-finn-warning-deep">
                        <Scale aria-hidden="true" className="h-3 w-3" />
                        The catch
                    </p>
                    <p className="mt-1 text-xs leading-5 text-finn-black">{story.catch.text}</p>
                    {story.catch.alternative && <p className="mt-0.5 text-xs leading-5 text-finn-iron">{story.catch.alternative}</p>}
                </div>
            )}

            {story.stillToKnow && (
                <div className="bg-white px-4 py-3">
                    <QuestionBlock question={story.stillToKnow} lead="One thing I still need to know" onAnswer={onAnswer} disabled={busy} />
                </div>
            )}

            {alternatives.length > 0 && (
                <div className="bg-white px-4 py-3">
                    <Label>
                        {alternatives.every((alt) => alt.budget === "over" || alt.rental === "doesNotFit")
                            ? "Nothing else fits your limits · closest others"
                            : "Next best options"}
                    </Label>
                    <ul className="mt-1.5 divide-y divide-finn-cotton">
                        {alternatives.map((alt) => (
                            <li key={alt.id} className="flex items-center justify-between gap-2 py-1.5">
                                <span className="min-w-0 truncate text-xs font-black text-finn-black">{alt.name}</span>
                                <span className="flex shrink-0 items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-finn-iron">
                                        ~{formatEUR(alt.monthly)}/mo{alt.budget === "over" ? " · over your limit" : alt.rental === "doesNotFit" ? " · wrong dates" : ""}
                                    </span>
                                    <BandChip car={alt} />
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="flex flex-wrap gap-1.5 border-t border-white/60 bg-white px-4 py-3">
                <SmallButton tone={pinned ? "quiet" : "solid"} pressed={pinned} onClick={() => actions.onPin(car.id, !pinned)}>
                    <Pin aria-hidden="true" className={`h-3.5 w-3.5 ${pinned ? "fill-current" : ""}`} />
                    {pinned ? "Pinned" : "Pin this car"}
                </SmallButton>
                <SmallButton onClick={onWhy}>
                    <MessageCircleQuestion aria-hidden="true" className="h-3.5 w-3.5" />
                    Why this car?
                </SmallButton>
                {!match.singleCar && (
                    <SmallButton onClick={onCompare}>
                        <Rows3 aria-hidden="true" className="h-3.5 w-3.5" />
                        Compare alternatives
                    </SmallButton>
                )}
                {actions.canShow(car.id) && (
                    <SmallButton onClick={() => actions.onShow(car.id)}>
                        <Eye aria-hidden="true" className="h-3.5 w-3.5" />
                        Show on page
                    </SmallButton>
                )}
            </div>

            <p className="bg-white px-4 pb-3 text-[10px] leading-4 text-finn-iron">
                Ranked by Lens's own scoring across {match.candidateCount} {match.candidateCount === 1 ? "car" : "cars"}. Nothing is pinned unless you pin it.
            </p>
        </section>
    );
}

/* -------------------------------------------------------------------------- */
/* Why this car — organised around what you told Lens                         */
/* -------------------------------------------------------------------------- */

export function WhyCard({ story, translation }: { story: FitStory; translation: Translation }) {
    const [showWeights, setShowWeights] = useState(false);

    return (
        <section className="overflow-hidden rounded-[22px] bg-white ring-1 ring-finn-cotton">
            <div className="bg-finn-pale-blue px-4 py-3">
                <Eyebrow>Why this car</Eyebrow>
                <h3 className="mt-0.5 text-sm font-black text-finn-black">{story.carName}</h3>
            </div>

            {story.sections.length > 0 ? (
                <>
                    {/*
                      * Each thing they said, answered where they said it —
                      * rather than a row of needs and a row of findings the
                      * reader has to pair up themselves.
                      */}
                    <div className="space-y-3 px-4 py-3">
                        {story.sections.map((section) => (
                            <div key={section.key}>
                                <p className="text-xs font-black leading-5 text-finn-black">
                                    {section.said ? `You said ${section.said.replace(/[.\s]+$/, "")}.` : section.short}
                                </p>
                                <div className="mt-1">
                                    <SectionView section={section} compact={false} />
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <p className="px-4 py-3 text-xs leading-5 text-finn-iron">
                    You haven't told Lens about your situation in this conversation, so this match comes from your Lens settings. Tell me what you need and I'll explain it in those terms.
                </p>
            )}

            {story.catch && (
                <div className="border-t border-finn-cotton bg-finn-warning/10 px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-wide text-finn-warning-deep">The catch</p>
                    <p className="mt-1 text-xs leading-5">{story.catch.text}</p>
                    {story.catch.alternative && <p className="text-xs leading-5 text-finn-iron">{story.catch.alternative}</p>}
                </div>
            )}

            <div className="border-t border-finn-cotton px-4 py-2.5">
                <button
                    type="button"
                    onClick={() => setShowWeights((was) => !was)}
                    aria-expanded={showWeights}
                    className="text-[10px] font-bold text-finn-iron hover:text-finn-black"
                >
                    {showWeights ? "Hide Lens's weighting" : "How Lens weighed it"}
                </button>
                {showWeights && <Weights translation={translation} />}
            </div>
        </section>
    );
}

/* -------------------------------------------------------------------------- */
/* What if                                                                    */
/* -------------------------------------------------------------------------- */

export function WhatIfCard({
    reply,
    lines,
    status,
    busy,
    onRun,
    onCancel,
}: {
    reply: string;
    lines: { label: string; from: string; to: string }[];
    status: "pending" | "ran" | "used" | "cancelled";
    busy: boolean;
    onRun: () => void;
    onCancel: () => void;
}) {
    if (status === "cancelled") return <p className="text-xs font-bold text-finn-iron">Left as it was.</p>;

    return (
        <section className="rounded-[22px] bg-finn-snow px-4 py-3 ring-1 ring-finn-cotton">
            <Eyebrow>Try this change?</Eyebrow>
            {reply && <p className="mt-1 text-sm font-semibold leading-6">{reply}</p>}
            {lines.length > 0 ? (
                <dl className="mt-2 space-y-1">
                    {lines.map((line) => (
                        <div key={line.label} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3 py-2">
                            <dt className="text-xs font-bold text-finn-iron">{line.label}</dt>
                            <dd className="flex items-center gap-1.5 text-xs font-black">
                                <span className="font-bold text-finn-iron">{line.from}</span>
                                <ArrowRight aria-hidden="true" className="h-3 w-3 text-finn-iron" />
                                {line.to}
                            </dd>
                        </div>
                    ))}
                </dl>
            ) : (
                <p className="mt-1 text-xs text-finn-iron">That doesn't change anything Lens uses.</p>
            )}
            {status === "pending" && (
                <div className="mt-3 flex gap-2">
                    {lines.length > 0 && (
                        <SmallButton tone="solid" onClick={onRun} disabled={busy}>
                            Run comparison
                        </SmallButton>
                    )}
                    <SmallButton onClick={onCancel} disabled={busy}>
                        Cancel
                    </SmallButton>
                </div>
            )}
        </section>
    );
}
