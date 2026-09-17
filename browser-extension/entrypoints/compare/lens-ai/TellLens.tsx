import { useMemo, useState } from "react";
import { ArrowRight, MessageSquareText, Undo2, X } from "lucide-react";

import { interpret } from "@/lib/lens-ai/client";
import type { Outcome } from "@/lib/lens-ai/outcome";
import {
    isEmptyChange,
    validateChange,
    type ValidatedChange,
} from "@/lib/lens-ai/proposal";
import { buildVocabulary, describeCurrent } from "@/lib/lens-ai/vocabulary";
import type { PinnedFinnCar } from "@/lib/types";

import { type Answers, useCompareStore } from "../store";
import {
    proposalFor,
    runProposal,
    useCurrentAnswers,
    useEnabledCategories,
    useLensAiStatus,
} from "./hooks";
import { OutcomeCard } from "./OutcomeCard";
import { ProposalReview } from "./ProposalReview";
import {
    AiError,
    ExperimentTag,
    PrimaryButton,
    SecondaryButton,
    Thinking,
} from "./parts";

/**
 * "Tell Lens what you're looking for."
 *
 * The reader describes themselves in their own words; the model maps that onto
 * Lens's priorities, features and assumptions; the reader sees the mapping —
 * as Lens settings, with what couldn't be mapped said out loud — and only
 * then chooses to use it. Applying goes through the same `applyAnswers` the
 * Adjust drawer uses, and the result is shown as a before-and-after worked out
 * by the engine, with an undo.
 *
 * It sits above the recommendation rather than in front of it: the page still
 * opens on an answer, and this is one more way to argue with it.
 */

const EXAMPLES = [
    "I have two kids, live somewhere really hot, I'm not a very confident driver, and we do a few long road trips every year. I'd rather keep the monthly cost reasonable.",
    "Mostly city driving, tiny parking spaces, and I want the lowest emissions I can get for under €600 a month.",
    "I drive 30,000 km a year on the motorway for work and I want to arrive not feeling wrecked.",
];

type Phase =
    | { step: "idle" }
    | { step: "thinking" }
    | { step: "error"; message: string }
    | { step: "review"; summary: string; change: ValidatedChange; budgetFigure: number | null }
    | { step: "applied"; outcome: Outcome; previous: Answers };

export function TellLens({ cars }: { cars: PinnedFinnCar[] }) {
    const { status } = useLensAiStatus();
    const answers = useCurrentAnswers();
    const enabled = useEnabledCategories();
    const applyAnswers = useCompareStore((state) => state.applyAnswers);

    const [text, setText] = useState("");
    const [phase, setPhase] = useState<Phase>({ step: "idle" });

    const vocabulary = useMemo(() => buildVocabulary(enabled), [enabled]);

    /*
     * Derived at render from the answers as they stand, not captured when the
     * model replied, so a review left open while something else changed the
     * answers still shows — and applies — against the current ones.
     */
    const proposal = useMemo(
        () =>
            phase.step === "review"
                ? proposalFor(phase.change, answers, phase.budgetFigure)
                : null,
        [phase, answers],
    );

    if (status.state !== "ready") return null;

    const submit = async () => {
        const said = text.trim();
        if (!said) return;

        setPhase({ step: "thinking" });

        const response = await interpret({
            text: said,
            vocabulary,
            current: describeCurrent(answers),
        });

        if (!response.ok) {
            setPhase({ step: "error", message: response.error });
            return;
        }

        const change = validateChange(response.result.change, answers, enabled);

        if (import.meta.env.DEV) {
            console.debug("[Lens AI] interpret validated", { raw: response.result.change, change });
        }

        setPhase({
            step: "review",
            summary: response.result.summary,
            change,
            budgetFigure: null,
        });
    };

    const use = () => {
        if (!proposal) return;

        const ran = runProposal(cars, proposal);

        applyAnswers(proposal.after, "lensAi");

        setPhase(
            ran
                ? { step: "applied", outcome: ran.outcome, previous: proposal.before }
                : { step: "idle" },
        );
    };

    const undo = () => {
        if (phase.step !== "applied") return;

        applyAnswers(phase.previous, "lensAi");
        setPhase({ step: "idle" });
    };

    const canUse =
        proposal != null &&
        !(isEmptyChange(proposal.change) && proposal.after.preferences.monthlyBudget === answers.preferences.monthlyBudget);

    return (
        <section className="finn-lens-screen-only mb-6 rounded-[28px] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-finn-accent-blue">
                    <MessageSquareText aria-hidden="true" className="h-3.5 w-3.5" />
                    Tell Lens
                </p>

                <ExperimentTag status={status} />
            </div>

            <h2 className="mt-1.5 text-xl font-black tracking-tight text-finn-black sm:text-2xl">
                Tell Lens what you're looking for.
            </h2>

            <p className="mt-1 text-sm leading-6 text-finn-iron">
                In your own words. You'll see how Lens understood it, as your
                settings, before anything changes.
            </p>

            <form
                className="mt-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    void submit();
                }}
            >
                <div className="flex flex-col gap-2 rounded-[22px] bg-finn-snow p-2 ring-1 ring-transparent transition focus-within:ring-finn-accent-blue sm:flex-row sm:items-end">
                    <textarea
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                                event.preventDefault();
                                void submit();
                            }
                        }}
                        rows={2}
                        maxLength={2000}
                        placeholder="e.g. Two kids, hot summers, I'm a nervous driver, and a few long road trips a year…"
                        aria-label="Describe what you're looking for"
                        className="min-h-14 flex-1 resize-y bg-transparent px-3 py-2 text-sm leading-6 text-finn-black outline-none placeholder:text-finn-iron/70"
                    />

                    <PrimaryButton
                        type="submit"
                        busy={phase.step === "thinking"}
                        disabled={!text.trim()}
                    >
                        Interpret
                        <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </PrimaryButton>
                </div>

                {phase.step === "idle" && !text && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {EXAMPLES.map((example) => (
                            <button
                                key={example}
                                type="button"
                                onClick={() => setText(example)}
                                className="max-w-full truncate rounded-full bg-finn-pale-blue px-3 py-1.5 text-left text-[11px] font-bold text-finn-accent-blue transition hover:bg-finn-accent-blue hover:text-white sm:max-w-[22rem]"
                                title={example}
                            >
                                {example}
                            </button>
                        ))}
                    </div>
                )}
            </form>

            {phase.step === "thinking" && (
                <div className="mt-4">
                    <Thinking>Mapping that onto your Lens settings…</Thinking>
                </div>
            )}

            {phase.step === "error" && (
                <div className="mt-4">
                    <AiError message={phase.message} onRetry={() => void submit()} />
                </div>
            )}

            {phase.step === "review" && proposal && (
                <div className="mt-4">
                    <ProposalReview
                        proposal={proposal}
                        eyebrow="Here's what I understood"
                        title="Your answers, as Lens settings"
                        summary={phase.summary}
                        budgetFigure={phase.budgetFigure}
                        onBudgetFigure={(budgetFigure) =>
                            setPhase({ ...phase, budgetFigure })
                        }
                    >
                        <PrimaryButton onClick={use} disabled={!canUse}>
                            Use these preferences
                        </PrimaryButton>

                        <SecondaryButton onClick={() => setPhase({ step: "idle" })}>
                            Cancel
                        </SecondaryButton>

                        <p className="basis-full text-[11px] leading-4 text-finn-iron">
                            Your priority order is kept for next time, as it is
                            when you adjust it yourself. Everything else applies
                            to this comparison only.
                        </p>
                    </ProposalReview>
                </div>
            )}

            {phase.step === "applied" && (
                <div className="mt-4">
                    <OutcomeCard outcome={phase.outcome}>
                        <SecondaryButton onClick={undo}>
                            <Undo2 aria-hidden="true" className="h-4 w-4" />
                            Undo
                        </SecondaryButton>

                        <SecondaryButton onClick={() => setPhase({ step: "idle" })}>
                            <X aria-hidden="true" className="h-4 w-4" />
                            Done
                        </SecondaryButton>
                    </OutcomeCard>
                </div>
            )}
        </section>
    );
}
