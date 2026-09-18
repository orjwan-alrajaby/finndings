import { useState, type ReactNode } from "react";
import {
    ArrowRight,
    ArrowUp,
    CalendarRange,
    Check,
    CircleHelp,
    CircleSlash,
    ChevronDown,
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
import { heardLines, matchSentence } from "@/lib/lens-chat/plain";
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
    onBudget: (monthly: number | null) => void;
    onPeriod: (from: string | null, to: string | null) => void;
    /** What the reader has chosen on this card and not sent yet. */
    picked: string | null;
    onPick: (answer: string) => void;
}) {
    const [showDetail, setShowDetail] = useState(false);
    const missing = missingEssentials(u);
    /* Half a period is not a period, so the fields hold their own state. */
    const [period, setPeriod] = useState<{ from: string | null; to: string | null }>({ from: null, to: null });

    /*
     * A newer understanding replaced this one, but what Lens said and asked
     * stays in the conversation — the answer below it has to read as an
     * answer to something.
     */
    if (status === "superseded") {
        if (!reply && !question) return null;

        return (
            <div className="max-w-[92%] space-y-1.5">
                {reply && <p className="text-sm leading-6 text-finn-black">{reply}</p>}
                {question && <p className="text-sm font-black leading-5 text-finn-black">{question.ask}</p>}
            </div>
        );
    }

    const heard = heardLines(u);
    const active = u.needs.filter((need) => need.status === "active");
    const asks = Boolean(missing.budget || missing.period || question || suggestions.length);
    const hasSomething = u.budget || u.rental || active.length || u.droppedPriorities.length;

    return (
        <div className="space-y-2">
            {/*
              * Lens speaks first, as itself. The recap under it is a note, not
              * the message — which is how a person reads a conversation.
              */}
            {reply && <p className="max-w-[92%] text-sm leading-6 text-finn-black">{reply}</p>}

            <section className="overflow-hidden rounded-[20px] bg-white ring-1 ring-finn-cotton">
                <div className="px-4 pt-3.5 pb-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-finn-iron">
                        {isUpdate ? "What I understand now" : "What I heard"}
                    </p>

                    <dl className="mt-2 space-y-1.5">
                        <HeardLine label="You" value={heard.situation} />
                        <HeardLine label="Limits" value={heard.limits} />
                        <HeardLine label="I'll look for" value={heard.lookingFor} strong />
                        <HeardLine label="Not chasing" value={heard.notChasing} />
                        <HeardLine label="Can't judge" value={heard.cantJudge} />
                    </dl>

                    {u.tension && (
                        <p className="mt-2.5 text-xs leading-5 text-finn-iron">
                            <span className="font-black text-finn-black">The trade-off: </span>
                            {u.tension.charAt(0).toLowerCase() + u.tension.slice(1)}
                        </p>
                    )}

                    <button
                        type="button"
                        onClick={() => setShowDetail((was) => !was)}
                        aria-expanded={showDetail}
                        className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-finn-accent-blue hover:underline"
                    >
                        {showDetail ? "Hide what Lens will check" : "See what Lens will check"}
                        <ChevronDown aria-hidden="true" className={`h-3 w-3 transition ${showDetail ? "rotate-180" : ""}`} />
                    </button>
                </div>

                {showDetail && (
                    <Detail understanding={u} translation={translation} cars={cars} scopeLabel={scopeLabel} />
                )}

                <div className="border-t border-finn-cotton bg-finn-snow px-4 py-3">
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
                                <SmallButton tone="solid" onClick={onCompare} disabled={busy}>
                                    <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                                    {isUpdate ? "Update the comparison" : "Compare these cars"}
                                </SmallButton>
                            ) : null}
                            <SmallButton onClick={onCorrect} disabled={busy}>
                                Not quite
                            </SmallButton>
                        </div>
                    )}
                </div>
            </section>

            {/*
              * Everything Lens wants from the reader, in one place and in one
              * voice. They used to arrive as three differently-shaped blocks,
              * which made a conversation feel like a stack of forms.
              */}
            {asks && status === "pending" && (
                <section className="space-y-2 rounded-[20px] bg-finn-pale-blue px-4 py-3.5">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-finn-accent-blue">
                        {question?.blocking ? "Before I compare" : "A couple of things"}
                    </p>

                    {missing.budget && (
                        <Ask title="What's the most you'd spend a month?" note="Lens counts the subscription and the running costs together.">
                            <div className="flex flex-wrap gap-1.5">
                                {BUDGET_CHOICES.map((amount) => (
                                    <Chip key={amount} onClick={() => onBudget(amount)} disabled={busy}>
                                        Up to {formatEUR(amount)}
                                    </Chip>
                                ))}
                                <Chip quiet onClick={() => onBudget(null)} disabled={busy}>
                                    No limit
                                </Chip>
                            </div>
                        </Ask>
                    )}

                    {missing.period && (
                        <Ask title="When do you need it, and for how long?" note="FINN rents on fixed terms, so the months decide the price and whether it can arrive in time.">
                            <RentalPeriodInput
                                from={period.from}
                                to={period.to}
                                tone="bg-white"
                                onChange={(from, to) => {
                                    setPeriod({ from, to });
                                    onPeriod(from, to);
                                }}
                            />
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => onPeriod(null, null)}
                                className="mt-1.5 text-[11px] font-bold text-finn-iron hover:text-finn-black disabled:opacity-50"
                            >
                                I don't have fixed dates
                            </button>
                        </Ask>
                    )}

                    {question && (
                        <Ask title={question.ask} note={question.why ? `${question.why.charAt(0).toUpperCase()}${question.why.slice(1).replace(/[.\s]+$/, "")}.` : ""}>
                            <div className="flex flex-wrap gap-1.5">
                                {question.options.map((option) => (
                                    <Chip key={option} chosen={picked === option} onClick={() => onPick(picked === option ? "" : option)} disabled={busy}>
                                        {option}
                                    </Chip>
                                ))}
                            </div>
                        </Ask>
                    )}

                    {suggestions.length > 0 && (
                        <Ask
                            title={suggestions.length === 1 ? "One thing you didn't mention" : "A few things you didn't mention"}
                            note="Lens can check these on every car. You never asked for them, so it won't unless you say so."
                        >
                            <ul className="space-y-2.5">
                                {suggestions.map((item) => (
                                    <SuggestionRow
                                        key={item.id}
                                        id={item.id}
                                        why={item.why}
                                        busy={busy}
                                        onAccept={() => onAcceptSuggestion(item.id)}
                                        onDecline={() => onDeclineSuggestion(item.id)}
                                    />
                                ))}
                            </ul>
                        </Ask>
                    )}
                </section>
            )}
        </div>
    );
}

/** One line of the recap: skipped entirely when there's nothing to say. */
function HeardLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
    if (!value) return null;

    return (
        <div className="flex gap-2 text-xs leading-5">
            <dt className="w-20 shrink-0 font-bold text-finn-iron">{label}</dt>
            <dd className={strong ? "font-bold text-finn-black" : "text-finn-black"}>{value}</dd>
        </div>
    );
}

/** One thing Lens wants from the reader, asked the same way every time. */
function Ask({ title, note, hint, children }: { title: string; note?: string; hint?: string; children: ReactNode }) {
    return (
        <div className="rounded-2xl bg-white px-3 py-2.5">
            <p className="text-sm font-black leading-5 text-finn-black">{title}</p>
            {note && <p className="mt-0.5 text-[11px] leading-4 text-finn-iron">{note}</p>}
            {hint && <p className="mt-1 text-xs leading-5 text-finn-black">{hint}</p>}
            <div className="mt-2">{children}</div>
        </div>
    );
}

function Chip({
    children,
    chosen,
    quiet,
    onClick,
    disabled,
}: {
    children: ReactNode;
    chosen?: boolean;
    quiet?: boolean;
    onClick: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-pressed={chosen}
            className={[
                "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold transition disabled:opacity-50",
                chosen
                    ? "bg-finn-accent-blue text-white"
                    : quiet
                      ? "bg-finn-snow text-finn-iron hover:text-finn-black"
                      : "bg-finn-pale-blue text-finn-accent-blue hover:bg-finn-accent-blue hover:text-white",
            ].join(" ")}
        >
            {chosen && <Check aria-hidden="true" className="h-3 w-3" />}
            {children}
        </button>
    );
}

/**
 * One piece of equipment Lens noticed and the reader never asked for.
 *
 * Each of these used to be its own card, with what the feature is and why it
 * might matter to this reader stacked one under the other — three suggestions
 * filled a phone screen and read as a form rather than an offer. The reason
 * that is about them stays visible; the general explanation waits behind the
 * name for anyone who hasn't met the feature before.
 */
function SuggestionRow({
    id,
    why,
    busy,
    onAccept,
    onDecline,
}: {
    id: EvidenceId;
    why: string;
    busy: boolean;
    onAccept: () => void;
    onDecline: () => void;
}) {
    const [showWhat, setShowWhat] = useState(false);
    const general = plainly(id);
    /* With no reason of its own, the explanation is the reason. */
    const reason = why ? sentenceCase(why) : general;

    return (
        <li className="border-t border-finn-cotton pt-2.5 first:border-0 first:pt-0">
            {why ? (
                <button
                    type="button"
                    onClick={() => setShowWhat((was) => !was)}
                    aria-expanded={showWhat}
                    className="text-left text-xs font-black leading-5 text-finn-black underline decoration-finn-cotton decoration-dotted underline-offset-2"
                >
                    {sentenceCase(lowerLabel(id)).replace(/\.$/, "")}
                </button>
            ) : (
                <p className="text-xs font-black leading-5 text-finn-black">{sentenceCase(lowerLabel(id)).replace(/\.$/, "")}</p>
            )}

            <p className="mt-0.5 text-[11px] leading-4 text-finn-iron">{reason}</p>

            {showWhat && <p className="mt-1 text-[11px] leading-4 text-finn-iron">{general}</p>}

            <div className="mt-1.5 flex flex-wrap gap-1.5">
                <Chip onClick={onAccept} disabled={busy}>
                    Count it
                </Chip>
                <Chip quiet onClick={onDecline} disabled={busy}>
                    Not important to me
                </Chip>
            </div>
        </li>
    );
}

const lowerLabel = (id: EvidenceId): string => {
    const label = EVIDENCE[id].label;

    return /^[A-Z0-9]{2,}/.test(label) ? label : `${label.charAt(0).toLowerCase()}${label.slice(1)}`;
};

/**
 * What Lens will actually check, for a reader who wants to see it.
 *
 * Everything here was in the conversation itself until it crowded out the
 * conversation: the equipment behind each need, how many of these cars carry
 * it, what the reader is already confident about, and the order Lens will
 * weigh things in. One tap away is close enough.
 */
function Detail({
    understanding: u,
    translation,
    cars,
    scopeLabel,
}: {
    understanding: Understanding;
    translation: Translation;
    cars: PinnedFinnCar[];
    scopeLabel: string;
}) {
    const [showWeights, setShowWeights] = useState(false);
    const active = u.needs.filter((need) => need.status === "active");
    const lessRelevant = new Set(translation.lessRelevant);

    return (
        <div className="space-y-2 border-t border-finn-cotton bg-finn-snow px-4 py-3">
            {active.map((need) => (
                <div key={need.id}>
                    <p className="flex flex-wrap items-center gap-x-1.5 text-xs font-black text-finn-black">
                        {need.label}
                        <span className="text-[10px] font-bold text-finn-iron">{IMPORTANCE_LABEL[need.importance]}</span>
                    </p>

                    {need.evidence.filter((entry) => !lessRelevant.has(entry.id)).length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
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

            {u.capabilities.map((item) => (
                <p key={item.label} className="text-[11px] leading-4 text-finn-iron">
                    You're confident with {lower(item.label)}
                    {item.lessRelevant.length > 0 && <> — so Lens won't lean on {item.lessRelevant.map((id) => EVIDENCE[id].label.toLowerCase()).join(" or ")}</>}.
                </p>
            ))}

            {cars.length > 0 && <p className="text-[10px] leading-4 text-finn-iron">Counts are across {scopeLabel}.</p>}

            <div>
                <button
                    type="button"
                    onClick={() => setShowWeights((was) => !was)}
                    aria-expanded={showWeights}
                    className="text-[11px] font-bold text-finn-iron hover:text-finn-black"
                >
                    {showWeights ? "Hide how this is weighed" : "How Lens weighs this"}
                </button>
                {showWeights && <Weights translation={translation} />}
            </div>
        </div>
    );
}

/** The amounts most readers pick, offered before anyone types one. */
const BUDGET_CHOICES = [400, 500, 600, 750];

const sentenceCase = (value: string): string =>
    `${value.charAt(0).toUpperCase()}${value.slice(1).replace(/[.\s]+$/, "")}.`;

const lower = (value: string): string =>
    /^[A-Z]{2,}|^I\b/.test(value) ? value : `${value.charAt(0).toLowerCase()}${value.slice(1)}`;

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
                    <span key={item.id} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold ring-1 ring-finn-cotton">
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
                    {row.raised.length > 0 && <> → raises {row.raised.map((item) => `${item.label} (${item.importance})`).join(", ")}</>}
                    {row.rules.map((rule) => (
                        <span key={rule.id}> → {rule.mode === "without" ? "rules out" : "requires"} {rule.label}</span>
                    ))}
                    {row.unpublished && <> · FINN doesn't publish {row.unpublished}</>}
                </p>
            ))}

            {profile.priorities.some((item) => item.filler) && (
                <p className="text-[10px] leading-4 text-finn-iron">
                    Lens weighs at least three things.{" "}
                    {profile.priorities.filter((item) => item.filler).map((item) => item.label).join(" and ")}{" "}
                    {profile.priorities.filter((item) => item.filler).length === 1 ? "comes" : "come"} from your saved settings and count least.
                </p>
            )}
        </div>
    );
}

/**
 * One thing Lens can check, with its own explanation a tap away.
 *
 * The label is equipment's own name, which is no help to someone who has
 * never read a car review — so the chip opens into what it does for them, and
 * how many of the cars in front of them have it.
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
                className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-finn-black ring-1 ring-finn-cotton transition hover:bg-finn-pale-blue"
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
                <p className="w-full rounded-xl bg-white px-2.5 py-1.5 text-[11px] leading-4 text-finn-iron">
                    <span className="font-black text-finn-black">{EVIDENCE[id].label}. </span>
                    {plainly(id)}
                    {use && <> {sentenceCase(use)}</>}
                </p>
            )}
        </>
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
    const [showChecked, setShowChecked] = useState(false);
    const { car } = match;
    const pinned = actions.pinnedIds.has(car.id);
    /*
     * The obvious question when the best match costs more than they said they
     * would spend: then why not the cheaper one? Lens ranks on everything they
     * asked for, so it owes them the answer here rather than in a follow-up.
     */
    const withinInstead = car.budget === "over"
        ? alternatives.find((alt) => alt.budget === "within" && alt.rental !== "doesNotFit") ?? null
        : null;

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

                {/*
                  * One sentence about the car, then the checking behind a tap.
                  * The list of headings that used to sit here was Lens's
                  * working, and it buried the answer the reader asked for.
                  */}
                <p className="mt-2.5 text-[13px] font-semibold leading-5 text-finn-black">
                    {story.sections.length > 0 ? matchSentence(story) : match.reason}
                </p>

                {story.sections.length > 0 && (
                    <>
                        <button
                            type="button"
                            onClick={() => setShowChecked((was) => !was)}
                            aria-expanded={showChecked}
                            className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-finn-accent-blue hover:underline"
                        >
                            {showChecked ? "Hide what Lens checked" : "What Lens checked"}
                            <ChevronDown aria-hidden="true" className={`h-3 w-3 transition ${showChecked ? "rotate-180" : ""}`} />
                        </button>

                        {showChecked && (
                            <div className="mt-2 space-y-2.5">
                                {story.sections.map((section) => (
                                    <SectionView key={section.key} section={section} compact />
                                ))}
                                <p className="text-[11px] leading-4 text-finn-iron">{story.bandMeaning}</p>
                            </div>
                        )}
                    </>
                )}
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

            {alternatives.length > 0 && (
                <div className="bg-white px-4 py-3">
                    <Label>Other options</Label>
                    {withinInstead ? (
                        <p className="mt-0.5 text-[11px] leading-4 text-finn-iron">
                            {withinInstead.name} is the best Lens found within your limit.
                        </p>
                    ) : alternatives.every((alt) => alt.budget === "over" || alt.rental === "doesNotFit") ? (
                        <p className="mt-0.5 text-[11px] leading-4 text-finn-iron">Nothing else here fits your limits — these are the closest.</p>
                    ) : null}
                    <ul className="mt-1.5 divide-y divide-finn-cotton">
                        {alternatives.map((alt) => (
                            <li key={alt.id} className="flex items-center justify-between gap-2 py-1.5">
                                <span className="min-w-0 truncate text-xs font-black text-finn-black">{alt.name}</span>
                                <span className="flex shrink-0 items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-finn-iron">
                                        ~{formatEUR(alt.monthly)}/mo{alt.budget === "over" ? " · over your limit" : alt.rental === "doesNotFit" ? " · wrong dates" : alt.id === withinInstead?.id ? " · within your limit" : ""}
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
