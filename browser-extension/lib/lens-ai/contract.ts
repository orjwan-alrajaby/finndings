/**
 * What crosses the wire between the extension and the Lens AI server.
 *
 * Deliberately free of imports. The server reads these as types only, and
 * nothing in here may pull the reasoning engine — or anything else that
 * decides — across that boundary. Ids are plain strings on purpose: on the
 * way back they are *claims* by a language model, and `proposal.ts` is where
 * they are checked against the real vocabulary before anything uses them.
 *
 * The split the whole experiment rests on:
 *
 *   natural language ─► server (model) ─► ProposedChange ─► validate ─► Answers ─► engine
 *   engine result    ─► LensFacts      ─► server (model) ─► prose
 *
 * The model never sees a scoring function and never returns a score.
 */

/* -------------------------------------------------------------------------- */
/* Vocabulary: what Lens can represent                                        */
/* -------------------------------------------------------------------------- */

export interface VocabularyFeature {
    id: string;
    label: string;
    explanation: string;
    /** Counts only once raised — a towbar, roof rails. */
    niche: boolean;
}

export interface VocabularyCategory {
    id: string;
    label: string;
    question: string;
    description: string;
    /** The measured figure this priority reads, when it has one. */
    measured: string | null;
    /** The only features that may be raised under this priority. */
    features: VocabularyFeature[];
}

export interface VocabularyProfile {
    id: string;
    label: string;
    forWhom: string;
    priorities: string[];
}

export interface LensVocabulary {
    categories: VocabularyCategory[];
    profiles: VocabularyProfile[];
    importance: { id: "high" | "medium" | "low"; label: string; meaning: string }[];
    rules: string[];
    /** Things people ask about that Lens has no data or setting for. */
    notModelled: string[];
}

/** The reader's answers as they stand, in the vocabulary above. */
export interface CurrentAnswers {
    priorities: { id: string; label: string; rank: number; weightPercent: number }[];
    raised: { category: string; feature: string; label: string; importance: string }[];
    /** Null when no budget is set. */
    monthlyBudget: number | null;
    monthlyKm: number;
    contractType: "private" | "business";
    /** The period the reader needs the car for, months as "YYYY-MM", or null. */
    rentalPeriod: { from: string; to: string; months: number } | null;
    basedOnProfile: string | null;
    /** Today's date, "YYYY-MM-DD", so "this October" can be placed in a year. */
    today: string;
}

/* -------------------------------------------------------------------------- */
/* A proposed change — untrusted until validated                              */
/* -------------------------------------------------------------------------- */

export type ProposedImportance = "high" | "medium" | "low" | "standard";

export interface ProposedChange {
    /** Start from a profile's order and emphasis, before the edits below. */
    startFromProfile: string | null;
    /** The complete new order, most important first. Null leaves it alone. */
    priorityOrder: { category: string; reason: string }[] | null;
    /** Features to raise, re-level, or put back to standard. */
    raise: {
        category: string;
        feature: string;
        importance: ProposedImportance;
        reason: string;
    }[];
    budget: {
        action: "set" | "increaseBy" | "decreaseBy" | "remove";
        amount: number | null;
        reason: string;
    } | null;
    /** The reader talked about cost without giving a figure Lens could use. */
    budgetWithoutFigure: string | null;
    monthlyKm: { value: number; reason: string } | null;
    contractType: { value: "private" | "business"; reason: string } | null;
    /** From and until which month the reader needs the car, both "YYYY-MM". */
    rentalPeriod: {
        action: "set" | "remove";
        from: string | null;
        to: string | null;
        reason: string;
    } | null;
    /** What the reader said that no Lens setting can express. */
    notRepresentable: { said: string; explanation: string }[];
}

/* -------------------------------------------------------------------------- */
/* Facts: what Lens concluded, for grounding an answer                        */
/* -------------------------------------------------------------------------- */

/**
 * Built by `context.ts` from the engine's own output. Loosely typed here
 * because the server only forwards it; its exact shape is the extension's
 * business and is documented where it is built.
 */
export type LensFacts = Record<string, unknown>;

/* -------------------------------------------------------------------------- */
/* Requests and responses                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Which cars a conversation can be about.
 *
 * - `page` — the configurations on the finn.com page whose data Lens holds.
 * - `pinned` — the cars the reader explicitly pinned.
 * - `thisCar` — the one configuration the reader is looking at.
 */
export type ScopeKind = "page" | "pinned" | "thisCar";

export interface ScopeOption {
    kind: ScopeKind;
    /** "the 12 configurations on this finn.com page Lens has data for". */
    description: string;
    count: number;
}

/** The scopes on offer where the reader is, and which one is in use. */
export interface ConversationScope {
    current: ScopeKind | null;
    available: ScopeOption[];
}

export interface InterpretRequest {
    text: string;
    vocabulary: LensVocabulary;
    current: CurrentAnswers;
    /** Present when the conversation happens on finn.com, where scope can change. */
    scope?: ConversationScope;
}

export interface InterpretResult {
    /** One or two sentences, in the reader's terms, of what was understood. */
    summary: string;
    change: ProposedChange;
    /** The set of cars the reader's words point at, when they point at one. */
    scope?: ScopeKind | null;
}

export interface AskRequest {
    question: string;
    vocabulary: LensVocabulary;
    current: CurrentAnswers;
    facts: LensFacts;
    /** The last few exchanges, oldest first. Short-lived by design. */
    history: { question: string; answer: string }[];
    scope?: ConversationScope;
}

export interface AskResult {
    /**
     * `answer` — explained from the facts.
     * `whatIf` — a hypothetical, returned as a change for Lens to run.
     */
    kind: "answer" | "whatIf";
    answer: string;
    change: ProposedChange | null;
    /** The set of cars the question is about, when that differs from the one in use. */
    scope?: ScopeKind | null;
}

export type AiEnvelope<T> =
    | {
          ok: true;
          result: T;
          provider: string;
          model: string | null;
          ms: number;
      }
    | { ok: false; error: string; provider?: string };

export interface HealthResult {
    ok: true;
    provider: string;
    model: string | null;
}
