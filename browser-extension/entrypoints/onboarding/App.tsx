import "@/assets/tailwind.css";
import { useCallback, useEffect, useState } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";

import {
    DEFAULT_CATEGORY_FEATURES,
    DEFAULT_PREFERENCES,
    DEFAULT_PRIORITIES,
    DEFAULT_PRIORITY_DEFINITIONS,
    DEFAULT_PROFILES,
} from "@/lib/reasoning-engine/constants";
import { loadLensSettings, saveLensSettings } from "@/lib/reasoning-engine";
import type {
    CategoryId,
    FeatureSelection,
    LensPreferences,
    PriorityDefinition,
    Profile,
} from "@/lib/reasoning-engine/types";
import {
    markOnboardingComplete,
    markOnboardingSkipped,
} from "@/lib/onboarding";
import { FINN_BASE_URL } from "@/lib/constants";
import { FinnLink } from "@/components/FinnLink";

import { SCREEN_ORDER, type OnboardingScreen } from "./types";
import { ProgressRail } from "./components/ProgressRail";
import { Welcome } from "./screens/Welcome";
import { HowItWorks } from "./screens/HowItWorks";
import { Priorities } from "./screens/Priorities";
import { Driving } from "./screens/Driving";
import { Preview } from "./screens/Preview";

/**
 * Setting Finn Lens up, once.
 *
 * The product asks four things of a reader — pin some cars, say what matters,
 * order it, say what your driving costs — and before this flow existed it
 * asked all of them on the way to a first answer, of someone who did not yet
 * know what the answer would look like. That is the wrong order: the two
 * configuration questions are cheap, they have sensible defaults, and they
 * are the same every time, so they belong here, once, in front of a reader
 * who has been told what they are for.
 *
 * Two rules this flow holds to, both from the same principle — that a setup
 * flow is a courtesy and never a toll gate:
 *
 * - **Skip always works.** Every screen carries it, it saves nothing, and
 *   the product is fully usable afterwards on its defaults. A reader who
 *   skips is never asked again unprompted.
 * - **Nothing is written until the end.** The reader's answers go to storage
 *   in one write, when they finish. A flow abandoned halfway leaves no
 *   half-configured product behind.
 */
export default function OnboardingPage() {
    const [screen, setScreen] = useState<OnboardingScreen>("welcome");
    const [loading, setLoading] = useState(true);

    /* The answers being collected, seeded from whatever is already stored. */
    const [priorities, setPriorities] =
        useState<CategoryId[]>(DEFAULT_PRIORITIES);
    const [preferences, setPreferences] =
        useState<LensPreferences>(DEFAULT_PREFERENCES);
    const [priorityDefinitions, setPriorityDefinitions] = useState<
        PriorityDefinition[]
    >(DEFAULT_PRIORITY_DEFINITIONS);
    const [profiles, setProfiles] = useState<Profile[]>(DEFAULT_PROFILES);
    const [categoryFeatures, setCategoryFeatures] =
        useState<Record<CategoryId, FeatureSelection>>(
            DEFAULT_CATEGORY_FEATURES,
        );

    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(false);

    /*
     * Seeded rather than started blank. Someone who reopens this flow from
     * the popup has answers already, and showing them the defaults instead
     * would read as their settings having been thrown away.
     */
    useEffect(() => {
        let alive = true;

        loadLensSettings()
            .then((settings) => {
                if (!alive) return;

                setPriorities(settings.priorities);
                setPreferences(settings.preferences);
                setPriorityDefinitions(settings.priorityDefinitions);
                setProfiles(settings.profiles);
                setCategoryFeatures(settings.categoryFeatures);
            })
            .catch((error: unknown) => {
                console.error(
                    "Finn Lens: could not read your settings",
                    error,
                );
            })
            .finally(() => {
                if (alive) setLoading(false);
            });

        return () => {
            alive = false;
        };
    }, []);

    /* A new screen starts at the top of itself, not halfway down the last one. */
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [screen]);

    const go = useCallback((next: OnboardingScreen) => {
        setScreen(next);
    }, []);

    const step = (delta: number) => {
        const next = SCREEN_ORDER[SCREEN_ORDER.indexOf(screen) + delta];

        if (next) go(next);
    };

    /**
     * Write the answers, then leave.
     *
     * `saveLensSettings` is given only what this flow actually asked about.
     * Feature picks, profile toggles and the default profile are untouched:
     * a reader who configured those before opening this must not have them
     * quietly replaced by whatever the flow happened to be holding.
     */
    const finish = async (then: () => void) => {
        setSaving(true);
        setSaveError(false);

        try {
            await saveLensSettings({ priorities, preferences });
            await markOnboardingComplete();

            then();
        } catch (error) {
            console.error("Finn Lens: could not save your setup", error);
            setSaveError(true);
        } finally {
            setSaving(false);
        }
    };

    /**
     * Leave without saving anything.
     *
     * Recorded, so the flow doesn't reappear on the next install-time check,
     * but recorded as *skipped* rather than completed — the reader is running
     * on the product's defaults, not on answers of their own.
     */
    const skip = async () => {
        await markOnboardingSkipped();

        void openPage("OPEN_COMPARE_PAGE");
    };

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-finn-snow">
                <span className="text-sm text-finn-iron">
                    Getting things ready…
                </span>
            </main>
        );
    }

    return (
        <Tooltip.Provider delayDuration={250}>
            <main className="min-h-screen bg-finn-snow text-finn-black">
                <header className="sticky top-0 z-20 border-b border-finn-cotton/70 bg-finn-snow/90 backdrop-blur-md">
                    <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-4 sm:px-6 lg:px-10">
                        <ProgressRail current={screen} onGoTo={go} />

                        <button
                            type="button"
                            onClick={() => void skip()}
                            className="shrink-0 rounded-full px-3 py-2 text-xs font-bold text-finn-iron underline-offset-2 transition hover:text-finn-black hover:underline"
                        >
                            Skip setup
                        </button>
                    </div>
                </header>

                <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
                    {screen === "welcome" && (
                        <Welcome onNext={() => step(1)} />
                    )}

                    {screen === "how" && (
                        <HowItWorks
                            onBack={() => step(-1)}
                            onNext={() => step(1)}
                        />
                    )}

                    {screen === "priorities" && (
                        <Priorities
                            priorities={priorities}
                            priorityDefinitions={priorityDefinitions}
                            categoryFeatures={categoryFeatures}
                            profiles={profiles}
                            onChange={setPriorities}
                            onBack={() => step(-1)}
                            onNext={() => step(1)}
                        />
                    )}

                    {screen === "driving" && (
                        <Driving
                            preferences={preferences}
                            onChange={setPreferences}
                            onBack={() => step(-1)}
                            onNext={() => step(1)}
                        />
                    )}

                    {screen === "preview" && (
                        <Preview
                            priorities={priorities}
                            preferences={preferences}
                            categoryFeatures={categoryFeatures}
                            saving={saving}
                            saveError={saveError}
                            onBack={() => step(-1)}
                            onEditPriorities={() => go("priorities")}
                            onFinish={() =>
                                void finish(() => {
                                    window.location.href = FINN_BASE_URL;
                                })
                            }
                            onOpenCompare={() =>
                                void finish(() => {
                                    void openPage("OPEN_COMPARE_PAGE");
                                })
                            }
                        />
                    )}
                </div>

                <footer className="pb-10 text-center text-[11px] leading-4 text-finn-iron">
                    Finn Lens is unofficial and not affiliated with{" "}
                    <FinnLink />.
                </footer>
            </main>
        </Tooltip.Provider>
    );
}

/**
 * Ask the background page to open one of the extension's own pages.
 *
 * Failure is swallowed on purpose: the reader is on their way out of this
 * flow either way, and their answers are already saved by the time this
 * runs. A toast about a tab that didn't open helps nobody.
 */
async function openPage(type: "OPEN_COMPARE_PAGE"): Promise<void> {
    try {
        await browser.runtime.sendMessage({ type });
    } catch (error) {
        console.error("Finn Lens: could not open that page", error);
    }
}
