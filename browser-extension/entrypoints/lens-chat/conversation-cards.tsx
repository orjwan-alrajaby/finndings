import { useState, type ReactNode } from "react";
import {
    ArrowRight,
    CalendarRange,
    Check,
    CircleHelp,
    CircleSlash,
    Eye,
    MessageCircleQuestion,
    Minus,
    Pin,
    Rows3,
    Scale,
    ShieldQuestion,
    TriangleAlert,
    Wallet,
} from "lucide-react";

import { PriorityIcon } from "@/components/PriorityIcon";
import { CATEGORIES } from "@/lib/reasoning-engine/constants";
import { formatEUR, monthLabel, priorityWeights } from "@/lib/reasoning-engine";
import type { WireQuestion } from "@/lib/lens-ai/contract";
import { EVIDENCE, coverage, type EvidenceId } from "@/lib/lens-chat/evidence";
import type { FitStory, StorySection, Tone } from "@/lib/lens-chat/fit-story";
import type { CarLine, MatchSummary } from "@/lib/lens-chat/run";
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
    onAnswer,
    disabled,
}: {
    question: WireQuestion;
    lead: string;
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
                    {question.options.map((option) => (
                        <button
                            key={option}
                            type="button"
                            disabled={disabled}
                            onClick={() => onAnswer(option)}
                            className="rounded-full bg-finn-pale-blue px-3 py-1.5 text-[11px] font-bold text-finn-accent-blue transition hover:bg-finn-accent-blue hover:text-white disabled:opacity-50"
                        >
                            {option}
                        </button>
                    ))}
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
    onCompare,
    onAnswer,
    onCorrect,
}: {
    understanding: Understanding;
    translation: Translation;
    reply: string;
    question: WireQuestion | null;
    cars: PinnedFinnCar[];
    scopeLabel: string;
    isUpdate: boolean;
    status: "pending" | "applied" | "superseded";
    busy: boolean;
    onCompare: () => void;
    onAnswer: (answer: string) => void;
    onCorrect: () => void;
}) {
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
                <p className="mt-3 px-4 text-xs leading-5 text-finn-iron">
                    <span className="font-black text-finn-black">Your situation: </span>
                    {u.context.map((item) => item.label).join(" · ")}
                </p>
            )}

            {(u.budget || u.rental) && (
                <div className="mt-3 space-y-1.5 px-4">
                    <Label>Your limits</Label>
                    {u.budget && (
                        <div className="flex items-start gap-2 rounded-2xl bg-white px-3 py-2">
                            <Wallet aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-finn-accent-blue" />
                            <div className="min-w-0">
                                <p className="text-sm font-black">
                                    {u.budget.kind === "hardMax"
                                        ? `${formatEUR(u.budget.monthly)}/month — a hard maximum`
                                        : `Around ${formatEUR(u.budget.monthly)}/month — a target, not a limit`}
                                </p>
                                <p className="text-[11px] leading-4 text-finn-iron">
                                    {u.budget.kind === "hardMax"
                                        ? "Cars Lens estimates above it won't be recommended."
                                        : "It won't rule cars out; Lens will say how each compares."}
                                </p>
                            </div>
                        </div>
                    )}
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
                    <Label>What the car needs to do for you</Label>
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
                                            <EvidenceChip key={entry.id} id={entry.id} use={entry.use} cars={cars} />
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

            {(u.droppedPriorities.length > 0 || dropped.length > 0) && (
                <p className="mt-3 px-4 text-xs leading-5 text-finn-iron">
                    <span className="font-black text-finn-black">Not counting: </span>
                    {[...u.droppedPriorities.map((id) => CATEGORIES[id].label), ...dropped.map((need) => need.label)].join(", ")}.
                </p>
            )}

            {u.notModelled.length > 0 && (
                <div className="mt-3 space-y-1.5 px-4">
                    <Label>What Lens can't take into account</Label>
                    {u.notModelled.map((item) => (
                        <p key={item.said} className="flex gap-2 rounded-2xl border border-white/80 bg-white/50 px-3 py-2 text-xs leading-5 text-finn-iron">
                            <CircleSlash aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>
                                <span className="font-black text-finn-black">"{item.said}"</span> — {item.explanation}
                            </span>
                        </p>
                    ))}
                </div>
            )}

            {question && status === "pending" && (
                <div className="mt-3 px-4">
                    <QuestionBlock
                        question={question}
                        lead={blocking ? "Before I compare cars" : "One thing that would help"}
                        onAnswer={onAnswer}
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
                        {hasSomething ? (
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
                        <button
                            type="button"
                            onClick={() => setShowWeights((was) => !was)}
                            className="mt-2 text-[10px] font-bold text-finn-iron hover:text-finn-black"
                            aria-expanded={showWeights}
                        >
                            {showWeights ? "Hide" : "How Lens will weigh this"}
                        </button>
                        {showWeights && <Weights translation={translation} />}
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
function EvidenceChip({ id, use, cars }: { id: EvidenceId; use?: string; cars: PinnedFinnCar[] }) {
    const counts = coverage(cars, id);
    /* For evidence nobody wants, the useful count is how many cars avoid it. */
    const answering = EVIDENCE[id].undesirable ? counts.notListed : counts.listed;

    return (
        <span
            title={[use ? `${use.charAt(0).toUpperCase()}${use.slice(1)}.` : "", EVIDENCE[id].explanation].filter(Boolean).join(" ")}
            className="inline-flex items-center gap-1 rounded-full bg-finn-snow px-2 py-0.5 text-[10px] font-bold text-finn-black"
        >
            {(EVIDENCE[id].undesirable ? EVIDENCE[id].negativeLabel : null) ?? EVIDENCE[id].label}
            {counts.total > 0 && (
                <span className="font-semibold text-finn-iron">
                    · {answering} of {counts.total}
                </span>
            )}
        </span>
    );
}

/** The engine's view, for anyone who wants to audit it — not the main answer. */
function Weights({ translation }: { translation: Translation }) {
    const weights = priorityWeights(translation.order.map((item) => item.id));

    return (
        <div className="mt-1.5 space-y-1">
            <div className="flex flex-wrap gap-1">
                {translation.order.map((item, index) => (
                    <span key={item.id} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold">
                        <span className="text-finn-accent-blue">#{index + 1}</span>
                        <PriorityIcon name={CATEGORIES[item.id].icon} className="h-3 w-3" />
                        {CATEGORIES[item.id].label}
                        <span className="text-finn-iron">{weights[index]?.weightPercent}%</span>
                    </span>
                ))}
            </div>
            {translation.order.some((item) => item.filler) && (
                <p className="text-[10px] leading-4 text-finn-iron">
                    Lens ranks at least three priorities. {translation.order.filter((item) => item.filler).map((item) => CATEGORIES[item.id].label).join(" and ")}{" "}
                    {translation.order.filter((item) => item.filler).length === 1 ? "comes" : "come"} from your saved settings and count least.
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
                    <div className="px-4 py-3">
                        <Label>You needed</Label>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {story.sections.map((section) => (
                                <span key={section.key} className="inline-flex items-center gap-1 rounded-full bg-finn-snow px-2.5 py-1 text-[11px] font-bold">
                                    {section.kind === "budget" ? (
                                        <Wallet aria-hidden="true" className="h-3 w-3 text-finn-accent-blue" />
                                    ) : section.kind === "rental" ? (
                                        <CalendarRange aria-hidden="true" className="h-3 w-3 text-finn-accent-blue" />
                                    ) : null}
                                    {section.short}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2.5 border-t border-finn-cotton px-4 py-3">
                        <Label>Lens found</Label>
                        {story.sections.map((section) => (
                            <SectionView key={section.key} section={section} compact={false} />
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
