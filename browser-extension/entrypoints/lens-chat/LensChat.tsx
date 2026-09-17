import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Check, Save, X } from "lucide-react";

import { loadLensSettings, saveLensSettings } from "@/lib/reasoning-engine";
import type { LensSettings } from "@/lib/reasoning-engine/types";
import { isPersonalised } from "@/lib/personalisation";
import { ask, interpret } from "@/lib/lens-ai/client";
import { buildLensFacts } from "@/lib/lens-ai/context";
import type { ScopeKind } from "@/lib/lens-ai/contract";
import type { Outcome } from "@/lib/lens-ai/outcome";
import { carLabel } from "@/lib/lens-ai/outcome";
import {
    applyChange,
    isEmptyChange,
    validateChange,
    type ValidatedChange,
} from "@/lib/lens-ai/proposal";
import { buildVocabulary, describeCurrent } from "@/lib/lens-ai/vocabulary";
import type { PageContext } from "@/lib/lens-chat/messages";
import {
    compareRows,
    explainWhy,
    runLens,
    summariseMatch,
    type LensRun,
} from "@/lib/lens-chat/run";
import { copyFeatures, type Answers } from "@/entrypoints/compare/store";
import { OutcomeCard } from "@/entrypoints/compare/lens-ai/OutcomeCard";
import { ProposalReview } from "@/entrypoints/compare/lens-ai/ProposalReview";
import { proposalFor, runProposal, useLensAiStatus, type Proposal } from "@/entrypoints/compare/lens-ai/hooks";
import { AiError, PrimaryButton, SecondaryButton, Thinking } from "@/entrypoints/compare/lens-ai/parts";

import { CompareCard, MatchCard, SmallButton, WhyCard, type CarActions } from "./cards";
import { onPageChanged, requestClose, requestPageContext, requestPin, requestShowCar } from "./page";
import {
    buildScopes,
    conversationScope,
    defaultScope,
    readStoredCars,
    type Scope,
    type StoredCars,
} from "./scopes";

/**
 * Ask Lens, on finn.com.
 *
 * The conversation moves between a few kinds of turn, and the difference
 * between them is the whole idea:
 *
 * - **The reader describes what they want.** The model maps it onto Lens's
 *   own settings; the reader sees that mapping and nothing changes until they
 *   say "use these".
 * - **Lens answers.** The existing engine runs over the chosen candidate set
 *   and the chat shows its result. No model decides anything here.
 * - **The reader asks about it.** Explanations are the engine's own reasoning
 *   laid out ("why this car"), or a model's answer grounded in the facts Lens
 *   sent. A "what if" comes back as a proposed change for the engine to run.
 *
 * Preferences confirmed here belong to this conversation. The reader's saved
 * settings and pinned cars change only when they press the button that says so.
 */

type Entry = { id: number } & (
    | { kind: "user"; text: string }
    | { kind: "lens"; text: string; tone?: "note" }
    | { kind: "thinking"; text: string }
    | { kind: "error"; text: string; retry: (() => void) | null }
    | {
          kind: "interpretation";
          said: string;
          summary: string;
          change: ValidatedChange;
          budgetFigure: number | null;
          status: "pending" | "applied" | "cancelled" | "superseded";
      }
    | { kind: "match"; run: LensRun }
    | {
          kind: "why";
          run: LensRun;
          /** What the reader had said when they asked, so the card can't drift. */
          story: { toldMe: string[]; understood: string | null };
      }
    | { kind: "compare"; run: LensRun }
    | {
          kind: "whatIf";
          answer: string;
          change: ValidatedChange;
          status: "pending" | "ran" | "used" | "cancelled";
          ran?: { outcome: Outcome; proposal: Proposal };
      }
    | { kind: "saveOffer"; saved: boolean }
);

type EntryInput = Entry extends infer E ? (E extends Entry ? Omit<E, "id"> : never) : never;

const STARTERS = [
    "I have two kids and want something practical.",
    "I'm a nervous driver and care about safety.",
    "I do a lot of motorway driving.",
    "I live somewhere hot.",
    "Keep the cost as low as possible.",
    "What would change if safety mattered more?",
];

const WHY = /^\s*why\s+(this|that|the)\s+(car|one)\s*\??\s*$|^\s*why\s*\??\s*$/i;

export function LensChat() {
    const { status, retry: retryHealth } = useLensAiStatus();
    const aiReady = status.state === "ready";

    const [settings, setSettings] = useState<LensSettings | null>(null);
    const [personalised, setPersonalised] = useState(true);
    const [answers, setAnswers] = useState<Answers | null>(null);
    const [page, setPage] = useState<PageContext | null>(null);
    const [pageLoaded, setPageLoaded] = useState(false);
    const [stored, setStored] = useState<StoredCars>({ pinned: {}, loaded: {} });
    const [scopeKind, setScopeKind] = useState<ScopeKind | null>(null);
    const [entries, setEntries] = useState<Entry[]>([]);
    const [input, setInput] = useState("");
    const [busy, setBusy] = useState(false);
    const [run, setRun] = useState<LensRun | null>(null);

    const nextId = useRef(1);
    const story = useRef<{ toldMe: string[]; understood: string | null }>({ toldMe: [], understood: null });
    const history = useRef<{ question: string; answer: string }[]>([]);
    const pinQueue = useRef<Promise<unknown>>(Promise.resolve());
    const endRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLTextAreaElement | null>(null);

    /* -- What Lens has ------------------------------------------------------ */

    const refreshPage = useCallback(async () => {
        const [context, cars] = await Promise.all([requestPageContext(), readStoredCars()]);
        setPage(context);
        setStored(cars);
        setPageLoaded(true);
    }, []);

    useEffect(() => {
        void (async () => {
            const loaded = await loadLensSettings();
            setSettings(loaded);
            setAnswers({
                priorities: loaded.priorities,
                preferences: loaded.preferences,
                features: copyFeatures(loaded.categoryFeatures),
                basedOn: loaded.basedOn,
            });
            setPersonalised(await isPersonalised());
        })();

        void refreshPage();

        const offPage = onPageChanged(() => void refreshPage());

        const onStorage = (changes: Record<string, unknown>, area: string) => {
            if (area !== "local") return;
            if ("pinnedCars" in changes || "loadedCarsFromFinnApi" in changes) {
                void readStoredCars().then(setStored);
            }
        };

        browser.storage.onChanged.addListener(onStorage);

        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") void requestClose();
        };
        window.addEventListener("keydown", onKey);

        return () => {
            offPage();
            browser.storage.onChanged.removeListener(onStorage);
            window.removeEventListener("keydown", onKey);
        };
    }, [refreshPage]);

    const scopes = useMemo(() => buildScopes(page, stored), [page, stored]);
    const kind: ScopeKind = scopeKind ?? defaultScope(page, scopes);
    const scope: Scope = scopes[kind];

    const enabled = useMemo(
        () => (settings?.priorityDefinitions ?? []).filter((item) => item.enabled).map((item) => item.id),
        [settings],
    );
    const vocabulary = useMemo(() => buildVocabulary(enabled.length ? enabled : undefined), [enabled]);
    const pinnedIds = useMemo(() => new Set(Object.keys(stored.pinned).map(Number)), [stored]);

    /* Latest values for the async flows below, which outlive a render. */
    const latest = useRef({ answers, scopes, kind, run, vocabulary, enabled });
    latest.current = { answers, scopes, kind, run, vocabulary, enabled };

    /* -- The conversation --------------------------------------------------- */

    const push = useCallback((entry: EntryInput): number => {
        const id = nextId.current++;
        setEntries((all) => [...all, { ...entry, id } as Entry]);
        return id;
    }, []);

    const update = useCallback((id: number, change: (entry: Entry) => Entry) => {
        setEntries((all) => all.map((entry) => (entry.id === id ? change(entry) : entry)));
    }, []);

    const remove = useCallback((id: number) => {
        setEntries((all) => all.filter((entry) => entry.id !== id));
    }, []);

    useEffect(() => {
        endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    }, [entries.length, entries.at(-1)]);

    /** Runs the engine over a scope and shows the result. */
    const showRun = useCallback(
        (nextAnswers: Answers, nextKind: ScopeKind, intro?: string) => {
            const target = latest.current.scopes[nextKind];

            if (!target.cars.length) {
                push({
                    kind: "lens",
                    text:
                        nextKind === "pinned"
                            ? "You haven't pinned any cars yet, so there's nothing in that set to compare."
                            : nextKind === "thisCar"
                              ? "There's no single car on this page for Lens to look at."
                              : "None of the cars on this page have reached Lens yet. Scroll the page so FINN loads them, then ask again.",
                    tone: "note",
                });
                return null;
            }

            const result = runLens(target.cars, nextAnswers, nextKind, target.headline);

            if (!result) return null;

            /* A result fixes the scope: cars loading later mustn't move it under the reader. */
            setScopeKind(nextKind);
            setRun(result);
            if (intro) push({ kind: "lens", text: intro });
            push({ kind: "match", run: result });

            return result;
        },
        [push],
    );

    const switchScope = useCallback(
        (nextKind: ScopeKind, rerun: boolean) => {
            if (nextKind === latest.current.kind && !rerun) return;

            setScopeKind(nextKind);

            const target = latest.current.scopes[nextKind];

            if (rerun && latest.current.answers) {
                showRun(latest.current.answers, nextKind, `${target.headline}.`);
            } else {
                push({ kind: "lens", text: `${target.headline}.`, tone: "note" });
            }
        },
        [push, showRun],
    );

    const scopeFor = (suggested: ScopeKind | null | undefined): ScopeKind | null =>
        suggested && latest.current.scopes[suggested]?.cars.length ? suggested : null;

    /* -- Describing ---------------------------------------------------------- */

    const describe = useCallback(
        async (text: string, pending: Extract<Entry, { kind: "interpretation" }> | null) => {
            const current = latest.current;
            if (!current.answers) return;

            if (pending) update(pending.id, (entry) => ({ ...(entry as typeof pending), status: "superseded" }));

            const said = pending ? `${pending.said}\n\nThen they added: ${text}` : text;
            const thinking = push({ kind: "thinking", text: "Reading that as Lens settings…" });

            const response = await interpret({
                text: said,
                vocabulary: current.vocabulary,
                current: describeCurrent(current.answers),
                scope: conversationScope(current.kind, current.scopes),
            });

            remove(thinking);

            if (!response.ok) {
                push({ kind: "error", text: response.error, retry: () => void describe(text, null) });
                return;
            }

            const change = validateChange(response.result.change, latest.current.answers!, latest.current.enabled);
            const suggested = scopeFor(response.result.scope);

            if (suggested && suggested !== latest.current.kind) switchScope(suggested, false);

            if (isEmptyChange(change) && !change.budgetWithoutFigure) {
                if (suggested) {
                    showRun(latest.current.answers!, suggested, "Using your current Lens settings.");
                    return;
                }

                push({
                    kind: "interpretation",
                    said,
                    summary: response.result.summary,
                    change,
                    budgetFigure: null,
                    status: "pending",
                });
                return;
            }

            story.current.toldMe.push(text);

            push({
                kind: "interpretation",
                said,
                summary: response.result.summary,
                change,
                budgetFigure: null,
                status: "pending",
            });
        },
        [push, remove, switchScope, showRun, update],
    );

    const useInterpretation = (entry: Extract<Entry, { kind: "interpretation" }>) => {
        if (!answers) return;

        const next = applyChange(answers, entry.change, entry.budgetFigure);

        setAnswers(next);
        story.current.understood = entry.summary;
        update(entry.id, (current) => ({ ...(current as typeof entry), status: "applied" }));

        const shown = showRun(next, kind, "Here's what Lens recommends with those preferences.");

        if (shown && !entries.some((item) => item.kind === "saveOffer")) {
            push({ kind: "saveOffer", saved: false });
        }
    };

    /* -- Asking -------------------------------------------------------------- */

    /*
     * Built from the engine alone, and deliberately without a model: the
     * card already connects what the reader said to what Lens weighed and
     * what the car did, and on the free tier every model call is one of a
     * handful a day. A reader who wants it in other words can ask.
     */
    const showWhy = useCallback(
        (target: LensRun) => {
            push({
                kind: "why",
                run: target,
                story: { toldMe: [...story.current.toldMe], understood: story.current.understood },
            });
        },
        [push],
    );

    const askLens = useCallback(
        async (text: string) => {
            const current = latest.current;
            if (!current.answers || !current.run) return;

            const thinking = push({ kind: "thinking", text: "Reading Lens's results…" });

            const response = await ask({
                question: text,
                vocabulary: current.vocabulary,
                current: describeCurrent(current.answers),
                facts: buildLensFacts(current.run.recommendation, current.run.narrative),
                history: history.current.slice(-3),
                scope: conversationScope(current.kind, current.scopes),
            });

            remove(thinking);

            if (!response.ok) {
                push({ kind: "error", text: response.error, retry: () => void askLens(text) });
                return;
            }

            const { kind: answerKind, answer, change } = response.result;
            history.current.push({ question: text, answer });

            const suggested = scopeFor(response.result.scope);

            if (suggested && suggested !== latest.current.kind) {
                push({ kind: "lens", text: answer });
                switchScope(suggested, true);
                return;
            }

            if (answerKind === "whatIf" && change) {
                push({
                    kind: "whatIf",
                    answer,
                    change: validateChange(change, latest.current.answers!, latest.current.enabled),
                    status: "pending",
                });
                return;
            }

            push({ kind: "lens", text: answer });
        },
        [push, remove, switchScope],
    );

    const send = async (raw: string) => {
        const text = raw.trim();
        if (!text || busy || !answers) return;

        setInput("");
        push({ kind: "user", text });

        const currentRun = latest.current.run;

        if (currentRun && WHY.test(text)) {
            showWhy(currentRun);
            return;
        }

        if (!aiReady) {
            push({
                kind: "lens",
                tone: "note",
                text: "Lens can't read free text right now. You can still get a recommendation from your Lens settings, ask why, compare and pin.",
            });
            return;
        }

        setBusy(true);

        try {
            const pending = [...entries]
                .reverse()
                .find((entry): entry is Extract<Entry, { kind: "interpretation" }> =>
                    entry.kind === "interpretation" && entry.status === "pending",
                );

            if (!currentRun || pending) await describe(text, pending ?? null);
            else await askLens(text);
        } finally {
            setBusy(false);
            inputRef.current?.focus();
        }
    };

    /* -- Acting on cars ----------------------------------------------------- */

    const actions: CarActions = {
        pinnedIds,
        onPin: (carId, pinned) => {
            pinQueue.current = pinQueue.current.then(async () => {
                const result = await requestPin(carId, pinned);

                if (!result || "error" in result) {
                    push({
                        kind: "error",
                        text: result && "error" in result ? result.error : "Couldn't reach the page to pin this car.",
                        retry: null,
                    });
                }
            });
        },
        canShow: (carId) => Boolean(page?.pageCarIds.includes(carId)),
        onShow: (carId) => void requestShowCar(carId),
    };

    const runWhatIf = (entry: Extract<Entry, { kind: "whatIf" }>) => {
        if (!answers || !run) return;

        const proposal = proposalFor(entry.change, answers);
        const ran = runProposal(scopes[run.scope].cars, proposal);

        if (!ran) return;

        update(entry.id, (current) => ({ ...(current as typeof entry), status: "ran", ran: { outcome: ran.outcome, proposal } }));
    };

    const useWhatIf = (entry: Extract<Entry, { kind: "whatIf" }>) => {
        if (!entry.ran || !run) return;

        setAnswers(entry.ran.proposal.after);
        update(entry.id, (current) => ({ ...(current as typeof entry), status: "used" }));
        showRun(entry.ran.proposal.after, run.scope);
    };

    /* -- Suggestions --------------------------------------------------------- */

    const suggestions: { label: string; act: () => void }[] = run
        ? [
              { label: "Why this car?", act: () => void send("Why this car?") },
              ...(run.recommendation.runnerUp
                  ? [
                        {
                            label: `Why not the ${carLabel(run.recommendation.runnerUp, run.recommendation.context.vehicles)}?`,
                            act: () =>
                                void send(`Why didn't you choose the ${carLabel(run.recommendation.runnerUp!, run.recommendation.context.vehicles)}?`),
                        },
                    ]
                  : []),
              ...(run.recommendation.context.vehicles.length > 1
                  ? [
                        { label: "Compare these cars", act: () => push({ kind: "compare", run }) },
                        { label: "What about the cheaper one?", act: () => void send("What am I giving up with the cheaper option?") },
                    ]
                  : []),
              { label: "Good for long road trips?", act: () => void send("Would this still make sense for long road trips?") },
              { label: "What if safety mattered more?", act: () => void send("What would change if safety mattered more?") },
              { label: "Too expensive", act: () => void send("Too expensive.") },
          ].filter((item) => aiReady || ["Why this car?", "Compare these cars"].includes(item.label))
        : aiReady
          ? STARTERS.map((label) => ({ label, act: () => void send(label) }))
          : [];

    /* -- Rendering ----------------------------------------------------------- */

    const ready = Boolean(answers && pageLoaded);

    return (
        <div className="flex h-screen flex-col bg-white font-sans text-finn-black">
            <Header scope={scope} scopes={scopes} kind={kind} onScope={(next) => switchScope(next, Boolean(run))} />

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-finn-snow px-3 py-3">
                {!ready ? (
                    <div className="py-10">
                        <Thinking>Reading this page…</Thinking>
                    </div>
                ) : entries.length === 0 ? (
                    <EmptyState
                        scope={scope}
                        aiState={status.state}
                        personalised={personalised}
                        onRetryAi={retryHealth}
                        onUseSettings={() => answers && showRun(answers, kind, `Using your ${personalised ? "" : "default "}Lens settings.`)}
                    />
                ) : (
                    <div className="space-y-3">
                        {entries.map((entry) => (
                            <EntryView
                                key={entry.id}
                                entry={entry}
                                answers={answers!}
                                actions={actions}
                                onUseInterpretation={useInterpretation}
                                onBudgetFigure={(id, figure) =>
                                    update(id, (current) =>
                                        current.kind === "interpretation" ? { ...current, budgetFigure: figure } : current,
                                    )
                                }
                                onCancel={(id) =>
                                    update(id, (current) =>
                                        current.kind === "interpretation" || current.kind === "whatIf"
                                            ? ({ ...current, status: "cancelled" } as Entry)
                                            : current,
                                    )
                                }
                                onCorrect={() => {
                                    setInput("");
                                    inputRef.current?.focus();
                                }}
                                onWhy={showWhy}
                                onCompare={(target) => push({ kind: "compare", run: target })}
                                onRunWhatIf={runWhatIf}
                                onUseWhatIf={useWhatIf}
                                onSave={async (id) => {
                                    if (!answers) return;
                                    await saveLensSettings({
                                        priorities: answers.priorities,
                                        preferences: answers.preferences,
                                        categoryFeatures: answers.features,
                                        basedOn: answers.basedOn,
                                    });
                                    update(id, (current) => (current.kind === "saveOffer" ? { ...current, saved: true } : current));
                                }}
                            />
                        ))}
                        <div ref={endRef} />
                    </div>
                )}
            </div>

            <footer className="border-t border-finn-cotton bg-white px-3 pb-3 pt-2">
                {suggestions.length > 0 && (
                    <div className="-mx-3 mb-2 flex gap-1.5 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
                        {suggestions.map((item) => (
                            <button
                                key={item.label}
                                type="button"
                                disabled={busy || !ready}
                                onClick={item.act}
                                className="shrink-0 rounded-full bg-finn-pale-blue px-3 py-1.5 text-[11px] font-bold text-finn-accent-blue transition hover:bg-finn-accent-blue hover:text-white disabled:opacity-50"
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                )}

                <form
                    className="flex items-end gap-2 rounded-[20px] bg-finn-snow py-1.5 pl-3 pr-1.5 ring-1 ring-transparent focus-within:ring-finn-accent-blue"
                    onSubmit={(event) => {
                        event.preventDefault();
                        void send(input);
                    }}
                >
                    <textarea
                        ref={inputRef}
                        value={input}
                        rows={1}
                        maxLength={600}
                        disabled={!ready}
                        onChange={(event) => setInput(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" && !event.shiftKey) {
                                event.preventDefault();
                                void send(input);
                            }
                        }}
                        placeholder={
                            !aiReady
                                ? "Lens can't read free text right now"
                                : run
                                  ? "Ask about these cars, or “what if…”"
                                  : "Tell Lens what you're looking for…"
                        }
                        aria-label="Message Lens"
                        className="max-h-24 min-h-9 flex-1 resize-none bg-transparent py-2 text-sm leading-5 outline-none placeholder:text-finn-iron/70"
                    />
                    <button
                        type="submit"
                        aria-label="Send"
                        disabled={!input.trim() || busy || !ready}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-finn-accent-blue text-white transition hover:bg-finn-highlight-navy disabled:opacity-40"
                    >
                        <ArrowUp aria-hidden="true" className="h-4 w-4" />
                    </button>
                </form>
            </footer>
        </div>
    );
}

/* -------------------------------------------------------------------------- */

function Header({
    scope,
    scopes,
    kind,
    onScope,
}: {
    scope: Scope;
    scopes: Record<ScopeKind, Scope>;
    kind: ScopeKind;
    onScope: (kind: ScopeKind) => void;
}) {
    const options: ScopeKind[] = ["page", "pinned", "thisCar"];

    return (
        <header className="border-b border-finn-cotton bg-white px-3 pb-2.5 pt-3">
            <div className="flex items-center gap-2">
                <img src="/icon/48.png" alt="" className="h-7 w-7 rounded-full bg-white" />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-black leading-4">Lens</p>
                    <p className="truncate text-[11px] leading-4 text-finn-iron" aria-live="polite">
                        {scope.headline}
                        {scope.kind === "page" && scope.missing > 0 ? ` · ${scope.missing} not loaded yet` : ""}
                    </p>
                </div>
                <button
                    type="button"
                    aria-label="Close Lens"
                    onClick={() => void requestClose()}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-finn-iron transition hover:bg-finn-snow hover:text-finn-black"
                >
                    <X aria-hidden="true" className="h-4 w-4" />
                </button>
            </div>

            <div role="radiogroup" aria-label="Which cars Lens compares" className="mt-2 flex gap-1 rounded-full bg-finn-cotton p-1">
                {options.map((option) => {
                    const count = scopes[option].cars.length;
                    const selected = option === kind;

                    return (
                        <button
                            key={option}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            disabled={count === 0}
                            onClick={() => onScope(option)}
                            className={[
                                "flex-1 truncate rounded-full px-2 py-1.5 text-[11px] font-black transition",
                                selected ? "bg-white text-finn-black shadow-sm" : "text-finn-iron hover:text-finn-black",
                                "disabled:cursor-not-allowed disabled:opacity-40",
                            ].join(" ")}
                        >
                            {option === "page" ? "This page" : option === "pinned" ? "Pinned" : "This car"}
                            {option !== "thisCar" && <span className="ml-1 text-finn-iron">{count}</span>}
                        </button>
                    );
                })}
            </div>
        </header>
    );
}

function EmptyState({
    scope,
    aiState,
    personalised,
    onRetryAi,
    onUseSettings,
}: {
    scope: Scope;
    aiState: "checking" | "offline" | "ready";
    personalised: boolean;
    onRetryAi: () => void;
    onUseSettings: () => void;
}) {
    return (
        <div className="px-2 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-finn-accent-blue">Ask Lens</p>
            <h2 className="mt-1 text-xl font-black tracking-tight">What are you looking for?</h2>
            <p className="mt-1 text-sm leading-6 text-finn-iron">
                Tell Lens in your own words. You'll see how it understood you before anything changes.
            </p>
            <p className="mt-3 rounded-2xl bg-white px-3 py-2.5 text-xs italic leading-5 text-finn-iron">
                "I have two kids, live somewhere really hot, I'm not a confident driver, and I do a lot of motorway driving."
            </p>

            <p className="mt-4 text-[11px] leading-4 text-finn-iron">
                {scope.cars.length
                    ? `Lens can compare ${scope.description}.`
                    : "Lens doesn't have data for any cars in this set yet."}
            </p>

            {aiState === "offline" && (
                <div className="mt-4 rounded-2xl bg-white px-3 py-3">
                    <p className="text-xs leading-5 text-finn-iron">
                        Lens can't read free text right now — the Lens AI server isn't answering. Everything else still works.
                    </p>
                    <button type="button" onClick={onRetryAi} className="mt-1 text-xs font-black text-finn-accent-blue hover:underline">
                        Check again
                    </button>
                </div>
            )}

            {scope.cars.length > 0 && (
                <div className="mt-4">
                    <SecondaryButton onClick={onUseSettings}>
                        Or get a match from my {personalised ? "" : "default "}Lens settings
                    </SecondaryButton>
                </div>
            )}
        </div>
    );
}

function EntryView({
    entry,
    answers,
    actions,
    onUseInterpretation,
    onBudgetFigure,
    onCancel,
    onCorrect,
    onWhy,
    onCompare,
    onRunWhatIf,
    onUseWhatIf,
    onSave,
}: {
    entry: Entry;
    answers: Answers;
    actions: CarActions;
    onUseInterpretation: (entry: Extract<Entry, { kind: "interpretation" }>) => void;
    onBudgetFigure: (id: number, figure: number | null) => void;
    onCancel: (id: number) => void;
    onCorrect: () => void;
    onWhy: (run: LensRun) => void;
    onCompare: (run: LensRun) => void;
    onRunWhatIf: (entry: Extract<Entry, { kind: "whatIf" }>) => void;
    onUseWhatIf: (entry: Extract<Entry, { kind: "whatIf" }>) => void;
    onSave: (id: number) => void;
}) {
    switch (entry.kind) {
        case "user":
            return (
                <p className="ml-auto w-fit max-w-[85%] rounded-[18px] rounded-br-md bg-finn-highlight-navy px-3 py-2 text-sm leading-5 text-white">
                    {entry.text}
                </p>
            );

        case "lens":
            return (
                <p className={`max-w-[92%] text-sm leading-6 ${entry.tone === "note" ? "text-finn-iron" : "text-finn-black"}`}>
                    {entry.text}
                </p>
            );

        case "thinking":
            return <Thinking>{entry.text}</Thinking>;

        case "error":
            return <AiError message={entry.text} onRetry={entry.retry ?? undefined} />;

        case "interpretation": {
            const proposal = proposalFor(entry.change, answers, entry.budgetFigure);
            const empty = isEmptyChange(entry.change) && entry.budgetFigure == null;

            if (entry.status === "superseded") return null;

            if (entry.status !== "pending") {
                return (
                    <p className="text-xs font-bold text-finn-iron">
                        {entry.status === "applied" ? (
                            <span className="inline-flex items-center gap-1 text-finn-influence-emerald">
                                <Check aria-hidden="true" className="h-3.5 w-3.5" />
                                Using these preferences for this conversation.
                            </span>
                        ) : (
                            "Left your preferences as they were."
                        )}
                    </p>
                );
            }

            return (
                <ProposalReview
                    proposal={proposal}
                    eyebrow="Here's what I understood"
                    title={empty ? "Nothing here maps onto a Lens setting" : "Your words, as Lens settings"}
                    summary={entry.summary}
                    budgetFigure={entry.budgetFigure}
                    onBudgetFigure={(figure) => onBudgetFigure(entry.id, figure)}
                >
                    {!empty && <PrimaryButton onClick={() => onUseInterpretation(entry)}>Use these preferences</PrimaryButton>}
                    <SecondaryButton onClick={onCorrect}>{empty ? "Try again" : "Not quite"}</SecondaryButton>
                    <SecondaryButton onClick={() => onCancel(entry.id)}>Cancel</SecondaryButton>
                    {!empty && (
                        <p className="basis-full text-[11px] leading-4 text-finn-iron">
                            Not quite right? Just tell Lens what to change.
                        </p>
                    )}
                </ProposalReview>
            );
        }

        case "match":
            return (
                <MatchCard
                    match={summariseMatch(entry.run)}
                    actions={actions}
                    onWhy={() => onWhy(entry.run)}
                    onCompare={() => onCompare(entry.run)}
                />
            );

        case "why":
            return <WhyCard why={explainWhy(entry.run, entry.story)} />;

        case "compare":
            return <CompareCard rows={compareRows(entry.run)} headline={entry.run.scopeHeadline} actions={actions} />;

        case "whatIf": {
            if (entry.status === "cancelled") {
                return <p className="text-xs font-bold text-finn-iron">Left as it was.</p>;
            }

            if (entry.status === "used") {
                return (
                    <p className="inline-flex items-center gap-1 text-xs font-bold text-finn-influence-emerald">
                        <Check aria-hidden="true" className="h-3.5 w-3.5" />
                        Using the changed preferences.
                    </p>
                );
            }

            if (entry.status === "ran" && entry.ran) {
                return (
                    <OutcomeCard outcome={entry.ran.outcome}>
                        <PrimaryButton onClick={() => onUseWhatIf(entry)}>Use this</PrimaryButton>
                        <SecondaryButton onClick={() => onCancel(entry.id)}>Go back</SecondaryButton>
                    </OutcomeCard>
                );
            }

            const proposal = proposalFor(entry.change, answers);
            const empty = isEmptyChange(entry.change);

            return (
                <div className="space-y-2">
                    <p className="text-sm leading-6">{entry.answer}</p>
                    <ProposalReview
                        proposal={proposal}
                        eyebrow="Try this change?"
                        title={empty ? "Lens can't test that as a setting" : "Lens would re-run with these answers"}
                    >
                        {!empty && <PrimaryButton onClick={() => onRunWhatIf(entry)}>Run comparison</PrimaryButton>}
                        <SecondaryButton onClick={() => onCancel(entry.id)}>Cancel</SecondaryButton>
                    </ProposalReview>
                </div>
            );
        }

        case "saveOffer":
            return (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white px-3 py-2.5">
                    <p className="min-w-0 flex-1 text-[11px] leading-4 text-finn-iron">
                        {entry.saved
                            ? "Saved. Lens's badges, panel and Compare page now use these preferences too."
                            : "These preferences apply to this conversation only. Your saved Lens settings haven't changed."}
                    </p>
                    {!entry.saved && (
                        <SmallButton onClick={() => onSave(entry.id)}>
                            <Save aria-hidden="true" className="h-3.5 w-3.5" />
                            Save as my settings
                        </SmallButton>
                    )}
                </div>
            );
    }
}
