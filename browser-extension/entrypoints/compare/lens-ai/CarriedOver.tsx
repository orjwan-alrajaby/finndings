import { useEffect, useState } from "react";
import { ArrowRight, MessageCircle, Save, X } from "lucide-react";

import { formatEUR } from "@/lib/reasoning-engine";
import { CATEGORIES } from "@/lib/reasoning-engine/constants";
import { asPhrase, ruleLabel } from "@/lib/lens-chat/evidence";
import {
    clearSession,
    loadSession,
    nameFor,
    saveSearch,
    type LensSession,
} from "@/lib/lens-chat/session";

import { useCompareStore } from "../store";

/**
 * The conversation the reader just had, offered on the page they land on next.
 *
 * Lens without this is two products: someone describes their winter, their
 * children and their €500 limit to the chat on finn.com, opens the
 * recommendation page, and finds it ranking cars by settings they last touched
 * months ago. The session is theirs and already built, so the page says what
 * it has and lets them use it, keep it, or ignore it.
 *
 * Nothing here writes their saved settings. Applying it changes this page's
 * working answers; saving it keeps a named copy they can come back to.
 */
export function CarriedOver() {
    const [session, setSession] = useState<LensSession | null>(null);
    const [state, setState] = useState<"offered" | "using" | "saved">("offered");
    const applyAnswers = useCompareStore((store) => store.applyAnswers);

    useEffect(() => {
        void loadSession().then(setSession);
    }, []);

    if (!session) return null;

    const budget = session.answers.preferences.monthlyBudget;
    const when = session.at ? new Date(session.at) : null;

    return (
        <section className="finn-lens-screen-only mb-4 rounded-[22px] bg-finn-pale-blue p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-finn-accent-blue">
                        <MessageCircle aria-hidden="true" className="h-3.5 w-3.5" />
                        {state === "using" ? "Carried over from your chat" : "From your chat on finn.com"}
                    </p>

                    <p className="mt-1 text-sm font-black text-finn-black">{nameFor(session)}</p>

                    {session.summary && <p className="mt-0.5 text-xs leading-5 text-finn-iron">{session.summary}</p>}

                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {budget > 0 && (
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold">
                                Up to {formatEUR(budget)}/month
                            </span>
                        )}
                        {session.rules.map((rule) => (
                            <span key={rule.id} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold">
                                {ruleLabel(rule.id, rule.mode)}
                            </span>
                        ))}
                        {session.answers.priorities.slice(0, 3).map((id) => (
                            <span key={id} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold">
                                {CATEGORIES[id].label}
                            </span>
                        ))}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        void clearSession();
                        setSession(null);
                    }}
                    aria-label="Dismiss what you built in the chat"
                    className="rounded-full p-1 text-finn-iron transition hover:bg-white hover:text-finn-black"
                >
                    <X aria-hidden="true" className="h-4 w-4" />
                </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
                {state === "offered" ? (
                    <button
                        type="button"
                        onClick={() => {
                            /* "session": this page only. Their saved priorities stay as they are. */
                            applyAnswers(session.answers, "session");
                            setState("using");
                        }}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-finn-accent-blue px-4 text-xs font-black text-white transition hover:bg-finn-highlight-navy"
                    >
                        <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                        Use it on this page
                    </button>
                ) : (
                    <p className="text-xs font-bold text-finn-influence-emerald">
                        {state === "saved" ? "Saved, and in use on this page." : "In use on this page."}
                    </p>
                )}

                {state !== "saved" && (
                    <button
                        type="button"
                        onClick={() => {
                            void saveSearch({
                                ...session,
                                id: `search-${Date.now()}`,
                                name: nameFor(session),
                                note: [session.summary, ...session.focus.map((item) => item.label)].filter(Boolean).join(" · "),
                            });
                            applyAnswers(session.answers, "session");
                            setState("saved");
                        }}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-xs font-bold text-finn-iron transition hover:text-finn-black"
                    >
                        <Save aria-hidden="true" className="h-3.5 w-3.5" />
                        Keep this search
                    </button>
                )}
            </div>

            <p className="mt-2 text-[11px] leading-4 text-finn-iron">
                {when ? `Built in your conversation on ${when.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}. ` : ""}
                Your saved priorities and profiles haven't changed
                {session.rules.some((rule) => rule.mode === "without")
                    ? `, and ${session.rules.filter((rule) => rule.mode === "without").map((rule) => `cars FINN files as ${asPhrase(rule.id)}`).join(" and ")} are set aside here as they were in the chat.`
                    : "."}
            </p>
        </section>
    );
}
