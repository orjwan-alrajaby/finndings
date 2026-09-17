import { useEffect, useMemo, useState } from "react";

import { buildRecommendation } from "@/lib/reasoning-engine";
import type { CategoryId, Recommendation } from "@/lib/reasoning-engine/types";
import {
    lensAiUsable,
    loadLensAiSettings,
    watchLensAiSettings,
    type LensAiSettings,
} from "@/lib/lens-ai/settings";
import { compareOutcomes, type Outcome } from "@/lib/lens-ai/outcome";
import {
    applyChange,
    describeChange,
    type ChangeDescription,
    type ValidatedChange,
} from "@/lib/lens-ai/proposal";
import type { PinnedFinnCar } from "@/lib/types";

import { type Answers, useCompareStore } from "../store";

/** What the page is reasoning from, as one stable object. */
export function useCurrentAnswers(): Answers {
    const priorities = useCompareStore((state) => state.priorities);
    const preferences = useCompareStore((state) => state.preferences);
    const features = useCompareStore((state) => state.features);
    const basedOn = useCompareStore((state) => state.basedOn);

    return useMemo(
        () => ({ priorities, preferences, features, basedOn }),
        [priorities, preferences, features, basedOn],
    );
}

/** The priorities switched on in Settings — the only ones a change may use. */
export function useEnabledCategories(): CategoryId[] {
    const definitions = useCompareStore((state) => state.priorityDefinitions);

    return useMemo(
        () => definitions.filter((item) => item.enabled).map((item) => item.id),
        [definitions],
    );
}

export type LensAiStatus = { state: "checking" } | { state: "off" } | { state: "ready" };

/**
 * Whether Lens AI is switched on, with a key, in Settings — kept current, so
 * turning it off on the Settings page takes the AI surfaces off every open
 * page without a reload.
 *
 * Every AI surface reads this first. Off is the default, not an error: the
 * page it sits on works exactly as it does without the AI.
 */
export function useLensAiStatus() {
    const [status, setStatus] = useState<LensAiStatus>({ state: "checking" });

    useEffect(() => {
        const show = (settings: LensAiSettings) => setStatus({ state: lensAiUsable(settings) ? "ready" : "off" });

        void loadLensAiSettings().then(show);

        return watchLensAiSettings(show);
    }, []);

    return { status };
}

/** A validated change, with what it does to the answers, before anything runs. */
export interface Proposal {
    change: ValidatedChange;
    before: Answers;
    after: Answers;
    description: ChangeDescription;
}

export function proposalFor(
    change: ValidatedChange,
    before: Answers,
    budgetFigure: number | null = null,
): Proposal {
    const after = applyChange(before, change, budgetFigure);

    return { change, before, after, description: describeChange(before, after, change) };
}

/**
 * Run both sets of answers through the real engine and compare the results.
 *
 * This is the whole of the what-if: two `buildRecommendation` calls over the
 * same pinned cars. The model that proposed the change has no part in it.
 */
export function runProposal(
    cars: PinnedFinnCar[],
    proposal: Proposal,
): { outcome: Outcome; after: Recommendation } | null {
    const run = (answers: Answers) =>
        buildRecommendation(cars, answers.priorities, answers.preferences, answers.features);

    const beforeRec = run(proposal.before);
    const afterRec = run(proposal.after);

    if (!beforeRec || !afterRec) return null;

    return {
        after: afterRec,
        outcome: compareOutcomes({
            cars,
            before: beforeRec,
            after: afterRec,
            beforeAnswers: proposal.before,
            afterAnswers: proposal.after,
        }),
    };
}
