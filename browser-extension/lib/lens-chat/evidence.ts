import { CATEGORIES, CATEGORY_IDS, SIGNALS } from "@/lib/reasoning-engine/constants";
import { bootLitres, evRangeKm, isBinarySignal, lengthMm, signalUtility } from "@/lib/reasoning-engine/evidence";
import type { CategoryId, SignalId } from "@/lib/reasoning-engine/types";
import type { FinnCar } from "@/lib/types";

/**
 * What Lens can actually check on a car, for connecting a reader's needs to
 * it.
 *
 * Everything Lens reads from FINN — its equipment list and the handful of
 * facts derived from its structured fields. Most of it is scored by some
 * priority; some of it isn't (privacy glass, leather seats). Unscored evidence never moves a score. It is here so that "I want
 * the kids kept busy" can be answered with what FINN actually lists, stated
 * as a fact about the car, and not with a guess.
 */

/**
 * `electricRange` isn't one of the engine's signals — range reaches a score
 * through longDistance's own trip factor rather than as a raisable feature —
 * but it's the first thing anyone driving far asks about, and FINN publishes
 * it. So Lens can point at it even though nobody can raise it.
 */
export type EvidenceId = SignalId | "electricRange" | "suvBody" | "winterReadyTyres";

/** Evidence Lens reads but never scores, with the reason it isn't scored. */
const READ_ONLY: Partial<Record<EvidenceId, string>> = {
    /* FINN's single boot figure is sometimes seats-up and sometimes seats-folded. */
    bootVolume:
        "How much the boot holds, as FINN publishes it. FINN doesn't say whether the figure is with the rear seats up or folded, so Lens quotes it and doesn't score it.",
    electricRange:
        "The WLTP range FINN publishes for an electric car. Lens already weighs range inside long-distance driving; this is the figure itself.",
};

export interface EvidenceDef {
    id: EvidenceId;
    label: string;
    explanation: string;
    /** The priority that scores it, if any. Null means Lens only reads it. */
    scoredIn: CategoryId | null;
    /** Whether a reader can raise it inside that priority. */
    raisable: boolean;
    /**
     * True where finding it is the bad news: "I really don't want an SUV" is
     * a need, and the car being one is what answers it — the wrong way.
     */
    undesirable?: boolean;
}

const homeOf = (id: SignalId): { category: CategoryId | null; raisable: boolean } => {
    for (const category of CATEGORY_IDS) {
        const def = CATEGORIES[category] as {
            features: readonly string[];
            expected?: readonly string[];
            alsoCounts?: readonly string[];
        };

        if (def.features.includes(id)) return { category, raisable: true };
        if (def.expected?.includes(id) || def.alsoCounts?.includes(id)) return { category, raisable: false };
    }

    return { category: null, raisable: false };
};

export const EVIDENCE: Record<EvidenceId, EvidenceDef> = {
    ...(Object.fromEntries(
        (Object.keys(SIGNALS) as SignalId[])
            /* `Fahrerassistenz` is a level, read through driverAssistLevel2 instead. */
            .filter((id) => id !== "hasDriverAssistance")
            .map((id) => {
                const home = homeOf(id);

                const readOnly = READ_ONLY[id];

                return [
                    id,
                    {
                        id,
                        label: SIGNALS[id].label,
                        explanation: readOnly ?? SIGNALS[id].explanation,
                        scoredIn: readOnly ? null : home.category,
                        raisable: readOnly ? false : home.raisable,
                    },
                ];
            }),
    ) as Record<SignalId, EvidenceDef>),

    electricRange: {
        id: "electricRange",
        label: "Electric range",
        explanation: READ_ONLY.electricRange!,
        scoredIn: null,
        raisable: false,
    },

    /*
     * Body type and tyres come from FINN's own structured fields — `cartype`
     * and `tires` — rather than from the equipment list. Neither is scored:
     * Lens ranks on what a car has, not on what shape it is. They're here
     * because "I don't want a massive SUV" and "winter is unpleasant here"
     * are answered by facts FINN publishes, and answering them from length
     * alone was guessing at something Lens could simply read.
     */
    suvBody: {
        id: "suvBody",
        label: "SUV body",
        explanation:
            "Whether FINN files this car as an SUV. Lens doesn't score body type — it reads it, so a reader who doesn't want one can see what they're being offered.",
        scoredIn: null,
        raisable: false,
        undesirable: true,
    },

    winterReadyTyres: {
        id: "winterReadyTyres",
        label: "All-season or winter tyres",
        explanation:
            "What FINN says is fitted: all-season tyres, or a summer and a winter set. Not scored — nearly every FINN car comes on all-season tyres — but it's the answer to what the car is shod with in winter.",
        scoredIn: null,
        raisable: false,
    },
};

/** How FINN's `cartype` reads in a sentence. */
const BODY_WORDS: Record<string, string> = {
    suv: "an SUV",
    "klein- und kompaktwagen": "a small or compact car",
    kompaktwagen: "a compact car",
    kleinwagen: "a small car",
    kombi: "an estate",
    limousine: "a saloon",
    cabriolet: "a convertible",
    hatchback: "a hatchback",
    van: "a van",
    transporter: "a van",
};

const bodyWord = (car: FinnCar): string | null => {
    const type = String(car.vehicleType ?? "").trim();

    return type ? (BODY_WORDS[type.toLowerCase()] ?? `a ${type.toLowerCase()}`) : null;
};

const isSuv = (car: FinnCar): boolean => /\bsuv\b/i.test(String(car.vehicleType ?? ""));

export const EVIDENCE_IDS = Object.keys(EVIDENCE) as EvidenceId[];

export const isEvidenceId = (value: unknown): value is EvidenceId =>
    typeof value === "string" && value in EVIDENCE;

export type EvidenceState = "listed" | "notListed" | "unknown";

/** Range enough to stop thinking about stopping, on FINN's own WLTP figure. */
const LONG_RANGE_KM = 350;

/** What FINN's data says about one piece of evidence on one car. */
export function readEvidence(car: FinnCar, id: EvidenceId): EvidenceState {
    if (id === "electricRange") {
        const range = evRangeKm(car);

        return range == null ? "unknown" : range >= LONG_RANGE_KM ? "listed" : "notListed";
    }

    if (id === "suvBody") {
        return bodyWord(car) == null ? "unknown" : isSuv(car) ? "listed" : "notListed";
    }

    if (id === "winterReadyTyres") {
        return car.tyres == null ? "unknown" : "listed";
    }

    const utility = signalUtility(id, car);

    if (utility == null) return "unknown";

    /* A measured figure (length) is "listed" when it scores well on its own curve. */
    if (!isBinarySignal(id)) return utility >= 0.6 ? "listed" : "notListed";

    return utility === 1 ? "listed" : "notListed";
}

/**
 * Whether this car answers the need the evidence was cited for: normally that
 * it's listed, and for evidence nobody wants (an SUV body) that it isn't.
 * Null where FINN says nothing either way.
 */
export function evidenceMet(car: FinnCar, id: EvidenceId): boolean | null {
    const state = readEvidence(car, id);

    if (state === "unknown") return null;

    return EVIDENCE[id].undesirable ? state === "notListed" : state === "listed";
}

/**
 * A measured fact worth quoting instead of a yes or no, in both directions:
 * "4.68 m long" says more than "no", and is the honest thing to say about a
 * car whose length FINN publishes and which simply isn't small.
 */
export function measuredDisplay(car: FinnCar, id: EvidenceId): string | null {
    if (id === "compactLength") {
        const length = lengthMm(car);

        return length ? `${(length / 1000).toFixed(2)} m long` : null;
    }

    if (id === "bootVolume") {
        const litres = bootLitres(car);

        return litres ? `a ${Math.round(litres)} L boot` : null;
    }

    if (id === "electricRange") {
        const range = evRangeKm(car);

        return range ? `${Math.round(range)} km of range on FINN's figure` : null;
    }

    if (id === "suvBody") return bodyWord(car);

    if (id === "winterReadyTyres") {
        return car.tyres === "summerAndWinter"
            ? "a summer set and a winter set, in FINN's data"
            : car.tyres === "allSeason"
              ? "all-season tyres, in FINN's data"
              : null;
    }

    return null;
}

export interface Coverage {
    id: EvidenceId;
    listed: number;
    notListed: number;
    unknown: number;
    total: number;
}

export function coverage(cars: FinnCar[], id: EvidenceId): Coverage {
    const result: Coverage = { id, listed: 0, notListed: 0, unknown: 0, total: cars.length };

    for (const car of cars) {
        const state = readEvidence(car, id);

        if (state === "listed") result.listed += 1;
        else if (state === "notListed") result.notListed += 1;
        else result.unknown += 1;
    }

    return result;
}

/** The catalogue as the model sees it: what each piece is, and how common it is here. */
export function evidenceCatalogue(cars: FinnCar[]) {
    return EVIDENCE_IDS.map((id) => {
        const def = EVIDENCE[id];
        const counts = coverage(cars, id);

        return {
            id,
            label: def.label,
            explanation: def.explanation,
            scoredBy: def.scoredIn ? CATEGORIES[def.scoredIn].label : "not scored — Lens only reads it",
            listedOn: `${counts.listed} of ${counts.total} cars in scope${counts.unknown ? ` (${counts.unknown} unknown)` : ""}`,
        };
    });
}
