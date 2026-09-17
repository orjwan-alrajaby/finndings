import { CATEGORIES, CATEGORY_IDS, SIGNALS } from "@/lib/reasoning-engine/constants";
import { isBinarySignal, lengthMm, signalUtility } from "@/lib/reasoning-engine/evidence";
import type { CategoryId, SignalId } from "@/lib/reasoning-engine/types";
import type { FinnCar } from "@/lib/types";

/**
 * What Lens can actually check on a car, for connecting a reader's needs to
 * it.
 *
 * Everything Lens reads from FINN — its equipment list and the handful of
 * facts derived from its structured fields — plus one reading the chat adds
 * (all-wheel drive, from the drive type FINN states). Most of it is scored by
 * some priority; some of it isn't (rear USB ports, privacy glass, a heat
 * pump). Unscored evidence never moves a score. It is here so that "I want
 * the kids kept busy" can be answered with what FINN actually lists, stated
 * as a fact about the car, and not with a guess.
 */

export type EvidenceId = SignalId | "allWheelDrive";

export interface EvidenceDef {
    id: EvidenceId;
    label: string;
    explanation: string;
    /** The priority that scores it, if any. Null means Lens only reads it. */
    scoredIn: CategoryId | null;
    /** Whether a reader can raise it inside that priority. */
    raisable: boolean;
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
            /* FINN's boot figure is ambiguous and deliberately unscored; don't offer it as evidence either. */
            .filter((id) => id !== "bootVolume" && id !== "hasDriverAssistance")
            .map((id) => {
                const home = homeOf(id);

                return [
                    id,
                    {
                        id,
                        label: SIGNALS[id].label,
                        explanation: SIGNALS[id].explanation,
                        scoredIn: home.category,
                        raisable: home.raisable,
                    },
                ];
            }),
    ) as Record<SignalId, EvidenceDef>),

    allWheelDrive: {
        id: "allWheelDrive",
        label: "All-wheel drive",
        explanation: "Power goes to all four wheels, which helps pulling away and climbing on snow, ice and wet surfaces. Read from the drive type FINN lists.",
        scoredIn: null,
        raisable: false,
    },
};

export const EVIDENCE_IDS = Object.keys(EVIDENCE) as EvidenceId[];

export const isEvidenceId = (value: unknown): value is EvidenceId =>
    typeof value === "string" && value in EVIDENCE;

export type EvidenceState = "listed" | "notListed" | "unknown";

/** What FINN's data says about one piece of evidence on one car. */
export function readEvidence(car: FinnCar, id: EvidenceId): EvidenceState {
    if (id === "allWheelDrive") {
        if (!car.driveType || car.driveType === "Unknown") return "unknown";
        return car.driveType === "All-Wheel Drive" ? "listed" : "notListed";
    }

    const utility = signalUtility(id, car);

    if (utility == null) return "unknown";

    /* A measured figure (length) is "listed" when it scores well on its own curve. */
    if (!isBinarySignal(id)) return utility >= 0.6 ? "listed" : "notListed";

    return utility === 1 ? "listed" : "notListed";
}

/** A measured fact worth quoting instead of a yes or no. */
export function measuredDisplay(car: FinnCar, id: EvidenceId): string | null {
    if (id !== "compactLength") return null;

    const length = lengthMm(car);

    return length ? `${(length / 1000).toFixed(2)} m long` : null;
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
