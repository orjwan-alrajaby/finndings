import "@/assets/tailwind.css";
import { useCallback, useEffect, useState } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";

import { MIN_PRIORITIES } from "@/lib/reasoning-engine/constants";
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
import Logo from "/icon/128.png";

import { SCREEN_ORDER, type OnboardingScreen } from "./types";
import { ProgressRail } from "./components/ProgressRail";
import {
    ACTION_BAR_CLEARANCE,
    ActionBar,
} from "./components/StepNav";
import { Welcome } from "./screens/Welcome";
import { Tour } from "./screens/Tour";
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

    /**
     * How far through the tour on screen two the reader has got.
     *
     * The screen owns the idea; this owns the door. Nothing here knows what a
     * "control" is — only that there are three of them and how many have been
     * worked, which is all the header needs to decide whether the way on is
     * open. See `screens/Tour`.
     */
    const [tourTried, setTourTried] = useState(0);
    const [tourTotal, setTourTotal] = useState(3);

    const onTourProgress = useCallback((tried: number, total: number) => {
        setTourTried(tried);
        setTourTotal(total);
    }, []);

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

    /**
     * What the header offers on each screen.
     *
     * Derived rather than stored, and gathered here rather than left in five
     * screens, because the bar it feeds is one bar: a reader moving between
     * screens should see the same control change its label, not five controls
     * take turns appearing in slightly different places.
     *
     * The welcome screen is absent on purpose — it is a landing page with its
     * own invitation in the body, and there is nothing behind it to go back
     * to.
     */
    const nav = (():
        | {
            /** Null on the first screen, which has nothing behind it. */
            onBack: (() => void) | null;
            label: string;
            onNext: () => void;
            busy?: boolean;
            blockedBecause?: string;
            urging?: boolean;
            secondary?: { label: string; onClick: () => void };
        }
        | null => {
        if (screen === "welcome") {
            return {
                /*
                 * The one screen with nothing behind it. Everything else about
                 * the bar is the same, including the button, because a reader
                 * who learns where "on" lives on the first screen should not
                 * have to learn it again on the second.
                 */
                onBack: null,
                label: "Show me what Lens adds",
                onNext: () => step(1),
                urging: true,
            };
        }

        if (screen === "tour") {
            const left = tourTotal - tourTried;

            return {
                onBack: () => step(-1),
                label: "Set up my ranking",
                onNext: () => step(1),
                /*
                 * The one place this flow holds a door shut, and it does it
                 * with the count rather than a scolding: the reader can see
                 * exactly what is outstanding and the screen behind is already
                 * pointing at it. `Skip setup` still leaves — that is the
                 * whole flow's escape and it is not this screen's to take
                 * away.
                 */
                blockedBecause:
                    left > 0
                        ? `Try all three marked controls above to carry on — ${tourTried} of ${tourTotal} done.`
                        : undefined,
                /*
                 * The moment the third control is worked, this is the only
                 * thing left to do — and the reader's eyes are down on the
                 * mock, not up here. It goes on asking until they come.
                 */
                urging: left === 0,
            };
        }

        if (screen === "priorities") {
            return {
                onBack: () => step(-1),
                label: "Next: how you drive",
                onNext: () => step(1),
                blockedBecause:
                    priorities.length < MIN_PRIORITIES
                        ? `Choose at least ${MIN_PRIORITIES} priorities to carry on.`
                        : undefined,
            };
        }

        if (screen === "driving") {
            return {
                onBack: () => step(-1),
                label: "Show me Lens working",
                onNext: () => step(1),
            };
        }

        if (screen === "preview") {
            return {
                onBack: () => step(-1),
                label: "Go pin some real cars",
                busy: saving,
                onNext: () =>
                    void finish(() => {
                        window.location.href = FINN_BASE_URL;
                    }),
                secondary: {
                    label: "Open Finn Lens instead",
                    onClick: () =>
                        void finish(() => {
                            void openPage("OPEN_COMPARE_PAGE");
                        }),
                },
            };
        }

        return null;
    })();

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
                {/*
                  * The header says where you are and nothing else now: the
                  * controls live on the stripe at the foot of the window. Two
                  * thin bands, one reading and one acting, with the screen
                  * itself between them.
                  *
                  * It keeps the body's own measure rather than spanning the
                  * window, unlike the stripe — this is a line of reading, and
                  * a rail run edge to edge across a wide screen stops looking
                  * like the page's progress and starts looking like its
                  * furniture.
                  *
                  * `z-60` is the one thing here that is not a style choice.
                  * The tour's bubbles, its scrim and the mock's popup stack up
                  * to z-50 inside the page, and lower than them this bar was
                  * painted over the moment the reader scrolled the mock up
                  * underneath it.
                  */}
                <header className="sticky top-0 z-60 border-b border-finn-cotton/70 bg-finn-snow/90 backdrop-blur-md">
                    <div className="flex items-center justify-between gap-10 px-4 py-4 sm:px-6 lg:px-10">
                        {/*
                          * The mark, from the second screen on.
                          *
                          * Not on the welcome, where it is already the largest
                          * thing on the page — a 96px disc and the product's
                          * name under it. Repeating it in the bar above would
                          * be the page introducing itself twice. From the tour
                          * onwards the reader is looking at a drawing of
                          * somebody else's website for most of the screen, and
                          * this is what says whose page they are still on.
                          */}
                        {screen !== "welcome" && (
                            <span className="flex shrink-0 items-center gap-2">
                                <img
                                    src={Logo}
                                    alt=""
                                    aria-hidden="true"
                                    className="h-6 w-6 shrink-0 object-contain"
                                />

                                <span className="hidden text-xs font-black uppercase tracking-[0.16em] text-finn-accent-blue sm:inline">
                                    Finn Lens
                                </span>
                            </span>
                        )}

                        <ProgressRail current={screen} onGoTo={go} />
                        {screen !== "welcome" && (<div className="hidden sm:block md:w-full sm:max-w-25" />)}
                    </div>
                </header>

                <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-10">
                    {screen === "welcome" && <Welcome />}

                    {screen === "tour" && (
                        <Tour
                            priorities={priorities}
                            preferences={preferences}
                            categoryFeatures={categoryFeatures}
                            onProgress={onTourProgress}
                        />
                    )}

                    {screen === "priorities" && (
                        <Priorities
                            priorities={priorities}
                            priorityDefinitions={priorityDefinitions}
                            categoryFeatures={categoryFeatures}
                            profiles={profiles}
                            onChange={setPriorities}
                        />
                    )}

                    {screen === "driving" && (
                        <Driving
                            preferences={preferences}
                            onChange={setPreferences}
                        />
                    )}

                    {screen === "preview" && (
                        <Preview
                            priorities={priorities}
                            preferences={preferences}
                            categoryFeatures={categoryFeatures}
                            saveError={saveError}
                            onEditPriorities={() => go("priorities")}
                        />
                    )}
                </div>

                <footer
                    className={[
                        "text-center text-[11px] leading-4 text-finn-iron",
                        ACTION_BAR_CLEARANCE,
                    ].join(" ")}
                >
                    Finn Lens is unofficial and not affiliated with{" "}
                    <FinnLink />.
                </footer>

                <ActionBar
                    onBack={nav?.onBack ?? null}
                    onSkip={() => void skip()}
                    next={
                        nav
                            ? {
                                label: nav.label,
                                onClick: nav.onNext,
                                busy: nav.busy,
                                blockedBecause: nav.blockedBecause,
                                urging: nav.urging,
                                secondary: nav.secondary,
                            }
                            : undefined
                    }
                />
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
