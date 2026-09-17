import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Check, Save, X } from "lucide-react";

import { loadLensSettings, saveLensSettings } from "@/lib/reasoning-engine";
import type { LensSettings } from "@/lib/reasoning-engine/types";
import { isPersonalised } from "@/lib/personalisation";
import { converse } from "@/lib/lens-ai/client";
import { buildLensFacts } from "@/lib/lens-ai/context";
import type { ScopeKind, WireQuestion } from "@/lib/lens-ai/contract";
import { carLabel, compareOutcomes, type Outcome } from "@/lib/lens-ai/outcome";
import { buildVocabulary } from "@/lib/lens-ai/vocabulary";
import type { PageContext } from "@/lib/lens-chat/messages";
import { evidenceCatalogue } from "@/lib/lens-chat/evidence";
import { evidenceForNeeds, tellFitStory } from "@/lib/lens-chat/fit-story";
import { alternativesWithinLimits, compareRows, runLens, summariseMatch, type LensRun } from "@/lib/lens-chat/run";
import {
    diffUnderstanding,
    EMPTY_UNDERSTANDING,
    isEmptyUnderstanding,
    readQuestion,
    groundInWhatWasSaid,
    readUnderstanding,
    toAnswers,
    toWire,
    type Translation,
    type Understanding,
} from "@/lib/lens-chat/understanding";
import { copyFeatures, type Answers } from "@/entrypoints/compare/store";
import { OutcomeCard } from "@/entrypoints/compare/lens-ai/OutcomeCard";
import { useLensAiStatus } from "@/entrypoints/compare/lens-ai/hooks";
import { AiError, PrimaryButton, SecondaryButton, Thinking } from "@/entrypoints/compare/lens-ai/parts";

import { CompareCard, SmallButton, type CarActions } from "./cards";
import { FitCard, UnderstandingCard, WhatIfCard, WhyCard } from "./conversation-cards";
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
 * The conversation is about understanding a person, and only then about cars:
 *
 * - **Each message updates what Lens understands** — constraints, needs,
 *   context, what they're already confident with, what Lens can't use — and
 *   Lens may ask one question when the answer would change the recommendation.
 *   The understanding carries across messages; nothing is re-asked.
 * - **Nothing changes the comparison until the person says so.** "Compare
 *   cars" turns the understanding into Lens's own answers, deterministically,
 *   and the engine ranks the chosen set.
 * - **The result is explained in their terms**: what they told Lens, what Lens
 *   found on this car, and the catch — every fact read off the car.
 * - **Questions and what-ifs use the same understanding.** A what-if is a
 *   proposed version of it that the engine runs before anything is kept.
 *
 * Preferences confirmed here belong to this conversation; saved settings and
 * pinned cars change only when the person presses the button that says so.
 */

type Entry = { id: number } & (
    | { kind: "user"; text: string }
    | { kind: "lens"; text: string; tone?: "note" }
    | { kind: "thinking"; text: string }
    | { kind: "error"; text: string; retry: (() => void) | null }
    | {
          kind: "understanding";
          understanding: Understanding;
          question: WireQuestion | null;
          reply: string;
          isUpdate: boolean;
          status: "pending" | "applied" | "superseded";
      }
    | { kind: "fit"; run: LensRun; understanding: Understanding; translation: Translation; question: WireQuestion | null }
    | { kind: "why"; run: LensRun; understanding: Understanding; translation: Translation; question: WireQuestion | null }
    | { kind: "compare"; run: LensRun }
    | {
          kind: "whatIf";
          reply: string;
          after: Understanding;
          lines: { label: string; from: string; to: string }[];
          status: "pending" | "ran" | "used" | "cancelled";
          ran?: { outcome: Outcome; run: LensRun; translation: Translation };
      }
    | { kind: "saveOffer"; saved: boolean }
);

type EntryInput = Entry extends infer E ? (E extends Entry ? Omit<E, "id"> : never) : never;

const STARTERS = [
    "I have two young kids and want them safe and entertained.",
    "I'm a nervous driver.",
    "I drive through cold winters.",
    "I can't spend more than €500 a month.",
    "I only care about safety and staying under €500.",
    "I do a lot of motorway driving.",
];

const WHY = /^\s*why\s+(this|that|the)\s+(car|one)\s*\??\s*$|^\s*why\s*\??\s*$/i;

export function LensChat() {
    const { status, retry: retryHealth } = useLensAiStatus();
    const aiReady = status.state === "ready";

    const [settings, setSettings] = useState<LensSettings | null>(null);
    const [personalised, setPersonalised] = useState(true);
    const [base, setBase] = useState<Answers | null>(null);
    const [page, setPage] = useState<PageContext | null>(null);
    const [pageLoaded, setPageLoaded] = useState(false);
    const [stored, setStored] = useState<StoredCars>({ pinned: {}, loaded: {} });
    const [scopeKind, setScopeKind] = useState<ScopeKind | null>(null);
    const [entries, setEntries] = useState<Entry[]>([]);
    const [input, setInput] = useState("");
    const [busy, setBusy] = useState(false);

    /* What the conversation has established. */
    const [understanding, setUnderstanding] = useState<Understanding>(EMPTY_UNDERSTANDING);
    const [openQuestion, setOpenQuestion] = useState<WireQuestion | null>(null);
    const [applied, setApplied] = useState<{ understanding: Understanding; translation: Translation } | null>(null);
    const [run, setRun] = useState<LensRun | null>(null);

    const answered = useRef<{ question: string; answer: string }[]>([]);
    const history = useRef<{ role: "reader" | "lens"; text: string }[]>([]);
    const nextId = useRef(1);
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
            setBase({
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
    const latest = useRef({ base, scopes, kind, run, vocabulary, enabled, understanding, openQuestion, applied });
    latest.current = { base, scopes, kind, run, vocabulary, enabled, understanding, openQuestion, applied };

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

    const say = useCallback(
        (text: string, tone?: "note") => {
            push({ kind: "lens", text, tone });
            history.current.push({ role: "lens", text });
        },
        [push],
    );

    /* The page moved on under an open conversation — say so. */
    const lastUrl = useRef<string | null>(null);

    useEffect(() => {
        if (!page) return;

        const previous = lastUrl.current;
        lastUrl.current = page.url;

        if (previous == null || new URL(previous).pathname === new URL(page.url).pathname) return;
        if (!entries.length) return;

        push({
            kind: "lens",
            tone: "note",
            text: `You've moved to another page. ${scopes.thisCar.cars.length ? `${scopes.thisCar.headline}; ` : ""}${scopes.page.headline.toLowerCase()}. Earlier results are about the cars they named.`,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page?.url]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    }, [entries.length, entries.at(-1)]);

    /** Ranks a scope with an understanding and shows why the result fits. */
    const compareWith = useCallback(
        (u: Understanding, nextKind: ScopeKind, intro?: string) => {
            const current = latest.current;
            if (!current.base) return null;

            const target = current.scopes[nextKind];

            if (!target.cars.length) {
                say(
                    nextKind === "pinned"
                        ? "You haven't pinned any cars yet, so there's nothing in that set to compare."
                        : nextKind === "thisCar"
                          ? "There's no single car on this page for Lens to look at."
                          : "None of the cars on this page have reached Lens yet. Scroll the page so FINN loads them, then ask again.",
                    "note",
                );
                return null;
            }

            const translation = toAnswers(current.base, u, current.enabled.length ? current.enabled : undefined);
            const result = runLens(target.cars, translation.answers, nextKind, target.headline);

            if (!result) return null;

            setScopeKind(nextKind);
            setRun(result);
            setApplied({ understanding: u, translation });

            if (intro) say(intro, "note");

            push({ kind: "fit", run: result, understanding: u, translation, question: current.openQuestion });
            history.current.push({
                role: "lens",
                text: `Compared ${target.headline.toLowerCase()}; the strongest match is ${carLabel(result.recommendation.winner, result.recommendation.context.vehicles)}.`,
            });

            return result;
        },
        [push, say],
    );

    const switchScope = useCallback(
        (nextKind: ScopeKind) => {
            const current = latest.current;
            if (nextKind === current.kind && !current.run) return;

            setScopeKind(nextKind);

            if (current.run && current.applied) {
                compareWith(current.applied.understanding, nextKind, `${current.scopes[nextKind].headline}.`);
            } else {
                say(`${current.scopes[nextKind].headline}.`, "note");
            }
        },
        [compareWith, say],
    );

    const showWhy = useCallback(
        (target: LensRun) => {
            const current = latest.current;
            const u = current.applied?.understanding ?? EMPTY_UNDERSTANDING;
            const translation = current.applied?.translation ?? toAnswers(current.base!, u);

            push({ kind: "why", run: target, understanding: u, translation, question: current.openQuestion });
        },
        [push],
    );

    const talk = useCallback(
        async (message: string) => {
            const current = latest.current;
            const thinking = push({ kind: "thinking", text: current.run ? "Thinking about that…" : "Listening…" });

            const response = await converse({
                message,
                vocabulary: current.vocabulary,
                understanding: toWire(current.understanding),
                openQuestion: current.openQuestion,
                answered: answered.current,
                evidence: evidenceCatalogue(current.scopes[current.kind].cars),
                facts: current.run
                    ? {
                          ...buildLensFacts(current.run.recommendation, current.run.narrative),
                          yourSituation: toWire(current.applied?.understanding ?? current.understanding),
                          evidenceForYourNeeds: evidenceForNeeds(current.run, current.applied?.understanding ?? current.understanding),
                      }
                    : null,
                history: history.current.slice(-8),
                scope: conversationScope(current.kind, current.scopes),
                today: new Date().toISOString().slice(0, 10),
            });

            remove(thinking);

            if (!response.ok) {
                push({ kind: "error", text: response.error, retry: () => void talk(message) });
                return;
            }

            const said = history.current.filter((line) => line.role === "reader").map((line) => line.text);
            const result = response.result;

            /* A question Lens asked is answered by whatever the person said next. */
            if (current.openQuestion) {
                answered.current.push({ question: current.openQuestion.ask, answer: message });
            }

            const enabledIds = current.enabled.length ? current.enabled : undefined;
            const suggested =
                result.scope && result.scope !== current.kind && current.scopes[result.scope]?.cars.length
                    ? result.scope
                    : null;

            /*
             * Before any comparison there are no facts to answer from, so an
             * "answer" that carries an understanding is really one.
             */
            if (result.kind === "answer" && !current.run && result.understanding) result.kind = "understanding";

            if (result.kind === "answer" || !result.understanding) {
                say(result.reply);
                setOpenQuestion(readQuestion(result.question, answered.current, current.scopes[current.kind].cars) ?? (result.kind === "answer" ? current.openQuestion : null));
                if (suggested) switchScope(suggested);
                return;
            }

            if (result.kind === "whatIf") {
                const before = current.applied?.understanding ?? current.understanding;
                const { reply, understanding: after } = groundInWhatWasSaid(
                    result.reply,
                    readUnderstanding(result.understanding, before, enabledIds),
                    said,
                );

                history.current.push({ role: "lens", text: reply });
                push({ kind: "whatIf", reply, after, lines: diffUnderstanding(before, after), status: "pending" });
                return;
            }

            const { reply, understanding: next } = groundInWhatWasSaid(
                result.reply,
                readUnderstanding(result.understanding, current.understanding, enabledIds),
                said,
            );
            const question = readQuestion(result.question, answered.current, current.scopes[current.kind].cars);

            setUnderstanding(next);
            setOpenQuestion(question);
            history.current.push({ role: "lens", text: [reply, question?.ask].filter(Boolean).join(" ") });

            if (suggested) setScopeKind(suggested);

            if (isEmptyUnderstanding(next) && !question && !next.notModelled.length) {
                say(reply);
                return;
            }

            setEntries((all) =>
                all.map((entry) =>
                    entry.kind === "understanding" && entry.status === "pending" ? { ...entry, status: "superseded" } : entry,
                ),
            );

            push({
                kind: "understanding",
                understanding: next,
                question,
                reply,
                isUpdate: Boolean(current.run),
                status: "pending",
            });

            /* "Compare my cars" with nothing new to understand: just compare. */
            if (suggested && current.run) compareWith(next, suggested);
        },
        [compareWith, push, remove, say, switchScope],
    );

    const send = async (raw: string) => {
        const text = raw.trim();
        if (!text || busy || !base) return;

        setInput("");
        push({ kind: "user", text });
        history.current.push({ role: "reader", text });

        const currentRun = latest.current.run;

        if (currentRun && WHY.test(text)) {
            showWhy(currentRun);
            return;
        }

        if (!aiReady) {
            say("Lens can't read free text right now. You can still get a match from your Lens settings, ask why, compare and pin.", "note");
            return;
        }

        setBusy(true);

        try {
            await talk(text);
        } finally {
            setBusy(false);
            inputRef.current?.focus();
        }
    };

    const confirmUnderstanding = (entry: Extract<Entry, { kind: "understanding" }>) => {
        const shown = compareWith(latest.current.understanding, latest.current.kind);

        if (!shown) return;

        setEntries((all) =>
            all.map((item) =>
                item.id === entry.id ? { ...item, status: "applied" } as Entry : item,
            ),
        );

        if (!entries.some((item) => item.kind === "saveOffer")) push({ kind: "saveOffer", saved: false });
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
        const current = latest.current;
        if (!current.base || !current.run) return;

        const translation = toAnswers(current.base, entry.after, current.enabled.length ? current.enabled : undefined);
        const cars = current.scopes[current.run.scope].cars;
        const after = runLens(cars, translation.answers, current.run.scope, current.run.scopeHeadline);

        if (!after) return;

        const outcome = compareOutcomes({
            cars,
            before: current.run.recommendation,
            after: after.recommendation,
            beforeAnswers: current.run.answers,
            afterAnswers: translation.answers,
        });

        update(entry.id, (item) => (item.kind === "whatIf" ? { ...item, status: "ran", ran: { outcome, run: after, translation } } : item));
    };

    const useWhatIf = (entry: Extract<Entry, { kind: "whatIf" }>) => {
        if (!entry.ran) return;

        setUnderstanding(entry.after);
        update(entry.id, (item) => (item.kind === "whatIf" ? { ...item, status: "used" } : item));
        latest.current.understanding = entry.after;
        compareWith(entry.after, entry.ran.run.scope);
    };

    /* -- Suggestions --------------------------------------------------------- */

    const suggestions: { label: string; act: () => void }[] = run
        ? [
              { label: "Why this car?", act: () => void send("Why this car?") },
              ...(run.recommendation.runnerUp
                  ? [
                        {
                            label: `Why not the ${carLabel(run.recommendation.runnerUp, run.recommendation.context.vehicles)}?`,
                            act: () => void send(`Why didn't you choose the ${carLabel(run.recommendation.runnerUp!, run.recommendation.context.vehicles)}?`),
                        },
                    ]
                  : []),
              ...(run.recommendation.context.vehicles.length > 1
                  ? [
                        { label: "Compare these cars", act: () => push({ kind: "compare", run }) },
                        { label: "What about the cheaper one?", act: () => void send("What am I giving up with the cheaper option?") },
                    ]
                  : []),
              ...(applied?.understanding.budget?.kind === "hardMax"
                  ? [{ label: "What if I could spend €100 more?", act: () => void send("What if I could spend €100 more per month?") }]
                  : [{ label: "Too expensive", act: () => void send("Too expensive.") }]),
          ].filter((item) => aiReady || ["Why this car?", "Compare these cars"].includes(item.label))
        : aiReady && entries.length === 0
          ? STARTERS.map((label) => ({ label, act: () => void send(label) }))
          : [];

    /* -- Rendering ----------------------------------------------------------- */

    const ready = Boolean(base && pageLoaded);

    return (
        <div className="flex h-screen flex-col bg-white font-sans text-finn-black">
            <Header scope={scope} scopes={scopes} kind={kind} onScope={(next) => switchScope(next)} />

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
                        onUseSettings={() => compareWith(EMPTY_UNDERSTANDING, kind, `Using your ${personalised ? "" : "default "}Lens settings.`)}
                    />
                ) : (
                    <div className="space-y-3">
                        {entries.map((entry) => {
                            switch (entry.kind) {
                                case "user":
                                    return (
                                        <p key={entry.id} className="ml-auto w-fit max-w-[85%] rounded-[18px] rounded-br-md bg-finn-highlight-navy px-3 py-2 text-sm leading-5 text-white">
                                            {entry.text}
                                        </p>
                                    );

                                case "lens":
                                    return (
                                        <p key={entry.id} className={`max-w-[92%] text-sm leading-6 ${entry.tone === "note" ? "text-finn-iron" : "text-finn-black"}`}>
                                            {entry.text}
                                        </p>
                                    );

                                case "thinking":
                                    return <Thinking key={entry.id}>{entry.text}</Thinking>;

                                case "error":
                                    return <AiError key={entry.id} message={entry.text} onRetry={entry.retry ?? undefined} />;

                                case "understanding":
                                    return (
                                        <UnderstandingCard
                                            key={entry.id}
                                            understanding={entry.understanding}
                                            translation={toAnswers(base!, entry.understanding, enabled.length ? enabled : undefined)}
                                            reply={entry.reply}
                                            question={entry.question}
                                            cars={scope.cars}
                                            scopeLabel={scope.headline.replace(/^Comparing /, "").replace(/^Looking at /, "")}
                                            isUpdate={entry.isUpdate}
                                            status={entry.status}
                                            busy={busy}
                                            onCompare={() => confirmUnderstanding(entry)}
                                            onAnswer={(answer) => void send(answer)}
                                            onCorrect={() => {
                                                setInput("");
                                                inputRef.current?.focus();
                                            }}
                                        />
                                    );

                                case "fit":
                                    return (
                                        <FitCard
                                            key={entry.id}
                                            story={tellFitStory(entry.run, entry.understanding, entry.translation.lessRelevant, entry.question)}
                                            match={summariseMatch(entry.run)}
                                            alternatives={alternativesWithinLimits(entry.run)}
                                            actions={actions}
                                            busy={busy}
                                            onWhy={() => showWhy(entry.run)}
                                            onCompare={() => push({ kind: "compare", run: entry.run })}
                                            onAnswer={(answer) => void send(answer)}
                                        />
                                    );

                                case "why":
                                    return (
                                        <WhyCard
                                            key={entry.id}
                                            story={tellFitStory(entry.run, entry.understanding, entry.translation.lessRelevant, entry.question)}
                                            translation={entry.translation}
                                        />
                                    );

                                case "compare":
                                    return <CompareCard key={entry.id} rows={compareRows(entry.run)} headline={entry.run.scopeHeadline} actions={actions} />;

                                case "whatIf":
                                    if (entry.status === "ran" && entry.ran) {
                                        return (
                                            <OutcomeCard key={entry.id} outcome={entry.ran.outcome}>
                                                <PrimaryButton onClick={() => useWhatIf(entry)}>Use this</PrimaryButton>
                                                <SecondaryButton onClick={() => update(entry.id, (item) => (item.kind === "whatIf" ? { ...item, status: "cancelled" } : item))}>
                                                    Go back
                                                </SecondaryButton>
                                            </OutcomeCard>
                                        );
                                    }

                                    if (entry.status === "used") {
                                        return (
                                            <p key={entry.id} className="inline-flex items-center gap-1 text-xs font-bold text-finn-influence-emerald">
                                                <Check aria-hidden="true" className="h-3.5 w-3.5" />
                                                Using the changed situation.
                                            </p>
                                        );
                                    }

                                    return (
                                        <WhatIfCard
                                            key={entry.id}
                                            reply={entry.reply}
                                            lines={entry.lines}
                                            status={entry.status}
                                            busy={busy}
                                            onRun={() => runWhatIf(entry)}
                                            onCancel={() => update(entry.id, (item) => (item.kind === "whatIf" ? { ...item, status: "cancelled" } : item))}
                                        />
                                    );

                                case "saveOffer":
                                    return (
                                        <div key={entry.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-white px-3 py-2.5">
                                            <p className="min-w-0 flex-1 text-[11px] leading-4 text-finn-iron">
                                                {entry.saved
                                                    ? "Saved. Lens's badges, panel and Compare page now use these preferences too."
                                                    : "This applies to this conversation only. Your saved Lens settings haven't changed."}
                                            </p>
                                            {!entry.saved && (
                                                <SmallButton
                                                    onClick={async () => {
                                                        if (!applied) return;
                                                        await saveLensSettings({
                                                            priorities: applied.translation.answers.priorities,
                                                            preferences: applied.translation.answers.preferences,
                                                            categoryFeatures: applied.translation.answers.features,
                                                            basedOn: null,
                                                        });
                                                        update(entry.id, (item) => (item.kind === "saveOffer" ? { ...item, saved: true } : item));
                                                    }}
                                                >
                                                    <Save aria-hidden="true" className="h-3.5 w-3.5" />
                                                    Save as my settings
                                                </SmallButton>
                                            )}
                                        </div>
                                    );
                            }
                        })}
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
                        maxLength={1200}
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
                                : openQuestion
                                  ? "Answer, or tell Lens something else…"
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

