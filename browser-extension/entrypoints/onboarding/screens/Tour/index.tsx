import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
    ArrowRight,
    CircleCheck,
    FlaskConical,
    Pin,
    Route,
} from "lucide-react";

import { FinnLink, withFinnLinks } from "@/components/FinnLink";
import {
    FIT_BADGE_NEUTRAL_LABEL,
    fitBadgeStateClass,
} from "@/lib/card-controls";
import { buildFitAnalysis } from "@/lib/reasoning-engine/fit";
import type { FitAnalysis, FitLevel } from "@/lib/reasoning-engine/fit";
import type {
    CategoryId,
    FeatureSelection,
    LensPreferences,
} from "@/lib/reasoning-engine/types";
import { demoCars } from "@/lib/demo-cars";

import { BrowserFrame, LensPopover } from "./BrowserFrame";
import { Callout, type CalloutArrow } from "./Callout";
import { BADGE_WHERE, PIN_WHERE } from "./copy";
import { ContinuingRow, MockCard, type CardControl } from "./MockCard";
import { MockPanel } from "./MockPanel";
import { BrandDisc, FitMeter } from "./parts";
import { StepCard, StepRail, type StepStatus } from "./Steps";

/** Which of the three annotated controls a paragraph is about. */
type Control = CardControl | "toolbar";

/**
 * The order the tour walks them in, held at module scope.
 *
 * The step descriptors are rebuilt on every render — they close over state —
 * so a state machine that read its "what is step 2" from them would depend on
 * an object identity that changes constantly. This is the same three ids and
 * it never moves.
 */
const TOUR_ORDER: Control[] = ["pin", "badge", "toolbar"];

/**
 * How long the tour holds still after a step is worked, in milliseconds.
 *
 * Long enough for the press and its result to read as cause and effect, and
 * for the button's "Done" to be read rather than glimpsed — the bubble moving
 * in the same frame as the click would look like it had teleported rather
 * than followed. Short enough that it is still an answer and not a wait: the
 * old 1400, and 2600 on the drawer, were paying for a tidy-up that no longer
 * happens.
 */
const STEP_BEAT = 600;

/**
 * Whether there is room beside the mock for the tour's bubbles.
 *
 * The coach marks hang off the sides of a card inside a three-column listing,
 * which stops being a sensible place for them the moment the listing is one
 * column wide. Below this the tour does not run at all and the reader gets
 * the three cards, which were always a complete account on their own.
 */
function useWideEnoughForTheTour(): boolean {
    /* Read on the first render rather than corrected on the second: the
       difference is a frame of scrim over a mock that is not being toured. */
    const [wide, setWide] = useState(
        () => window.matchMedia("(min-width: 768px)").matches,
    );

    useEffect(() => {
        const query = window.matchMedia("(min-width: 768px)");

        setWide(query.matches);

        const onChange = (event: MediaQueryListEvent) => setWide(event.matches);

        query.addEventListener("change", onChange);

        return () => query.removeEventListener("change", onChange);
    }, []);

    return wide;
}

/**
 * What Lens actually does, shown rather than described.
 *
 * This screen replaced one that listed three abstractions — you pin, it
 * ranks, it explains — in three cards with an icon each. Everything on it was
 * true and none of it was any use: a reader arriving from an install has
 * never seen finn.com with an extension on it, and cannot picture a "pin
 * button" they have no image of, on a card they have not met, on a site they
 * may not have opened yet. The words were doing the work of a picture, badly.
 *
 * So the screen is a picture, and the picture works. A browser frame, a
 * listing page inside it, three cards with the real controls on them at the
 * real sizes in the real corners, and three numbered paragraphs saying what
 * each one does in plain terms — where it is, what pressing it does, and what
 * it does *not* do. Pressing them here does what pressing them there will:
 * the pin fills and a toast confirms it, the pill opens the drawer beside the
 * page, the toolbar button opens the popup.
 *
 * Three rules held to, all of them about not lying to someone who is about to
 * trust this thing with a shopping decision:
 *
 * - **The verdicts are real.** Every band, every price and every sentence in
 *   the drawer is `buildFitAnalysis` run over the demo cars against whatever
 *   priorities are currently loaded. Nothing here is copy written to look
 *   like output.
 * - **The cars are not.** Aveline, Norvane and Halden are invented, they are
 *   labelled as invented above the frame, and the pins are local to this
 *   screen — pinning here pins nothing.
 * - **The defaults are named.** The reader has told Lens nothing yet, so the
 *   drawer shows the same "you're seeing Lens's defaults" notice it would
 *   show on the real site, which is both honest and the argument for the two
 *   screens that follow.
 */
export function Tour({
    priorities,
    preferences,
    categoryFeatures,
    onProgress,
}: {
    priorities: CategoryId[];
    preferences: LensPreferences;
    categoryFeatures: Record<CategoryId, FeatureSelection>;
    /**
     * How many of the three controls have been worked, reported upwards.
     *
     * The header holds the way forward shut until all three have been, so it
     * needs the count — and the count lives here, because "tried" is this
     * screen's own idea and nothing above it should have to know what a
     * control is.
     */
    onProgress: (tried: number, total: number) => void;
}) {
    const cars = useMemo(() => demoCars(), []);

    /*
     * Judged here rather than inside the card, so the pill on the card and
     * the drawer it opens are two views of one analysis and cannot disagree.
     */
    const analyses = useMemo(
        () =>
            new Map<number, FitAnalysis>(
                cars.map((car) => [
                    car.id,
                    buildFitAnalysis(
                        car,
                        priorities,
                        preferences,
                        categoryFeatures,
                    ),
                ]),
            ),
        [cars, priorities, preferences, categoryFeatures],
    );

    /**
     * The frame, so an action taken from below it can be watched.
     *
     * The three paragraphs each carry a button that works the control they
     * describe, and they sit under the browser they are describing — so on
     * most screens pressing one changes something the reader cannot see. A
     * demonstration nobody watches is worse than no demonstration: the pin
     * fills, the drawer slides in, the menu drops, and the reader is looking
     * at a button that appears to have done nothing.
     *
     * Only the paragraph buttons scroll. Pressing a control on the mock
     * itself means the reader is already looking at it, and moving the page
     * under somebody who is looking at the right place is the rudest thing
     * this screen could do.
     */
    const stage = useRef<HTMLDivElement>(null);

    const watchStage = useCallback(() => {
        stage.current?.scrollIntoView({
            /* The system setting, honoured here rather than in CSS: there is
               no media query that reaches a scrollIntoView option. */
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                .matches
                ? "auto"
                : "smooth",
            block: "start",
        });
    }, []);

    const [pinnedIds, setPinnedIds] = useState<number[]>([]);
    const [openId, setOpenId] = useState<number | null>(null);
    const [popupOpen, setPopupOpen] = useState(false);
    const [focus, setFocus] = useState<Control | null>(null);

    /**
     * The controls the reader has worked.
     *
     * Not the same thing as the controls' current *state*: a reader who pins
     * a car and then unpins it has still understood pinning, so idly working
     * a control twice does not un-finish its step.
     *
     * The one thing that does take a step back off the list is the reader
     * asking for it — pressing Back in the tour. That is not idle use, it is
     * "let me try that again", and a step you have gone back to see should be
     * a step you can do rather than one already ticked.
     *
     * It is also fed by the mock itself, not only by the buttons underneath:
     * pressing the real pin up in the frame is the step, and the bubble's
     * button is a convenience for a reader who would rather be shown.
     */
    const [tried, setTried] = useState<Control[]>([]);

    /* The car every step's own button acts on. */
    const first = cars[0];

    /**
     * Which step the tour is standing on, or null once it is out of the way.
     *
     * It starts on the first one. A guided tour that waits to be asked for is
     * a tour nobody takes — and this one is cheap to leave: every bubble
     * carries "Skip the tour", skipping is remembered, and the three cards
     * underneath say everything the bubbles do and more.
     */
    const wide = useWideEnoughForTheTour();
    const [tourAt, setTourAt] = useState<number | null>(0);

    const touring = wide && tourAt != null;
    const tourControl = tourAt == null ? null : TOUR_ORDER[tourAt];

    /**
     * Out of the guided tour, and down to where the work still is.
     *
     * Skipping puts the bubbles away; it does not put the three controls
     * away, and it cannot — the way off this screen is still shut until all
     * three have been worked. A reader who skipped and was left staring at
     * the same browser mock with no bubbles on it had been given no idea
     * what to do instead, and the cards that answer that are below the fold.
     *
     * So the page takes them there. It is the same courtesy the paragraph
     * buttons already do in the other direction.
     */
    const stepCards = useRef<HTMLDivElement>(null);

    const leaveTour = useCallback(() => {
        setTourAt(null);

        stepCards.current?.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                .matches
                ? "auto"
                : "smooth",
            block: "start",
        });
    }, []);

    /**
     * Back a step, and that step undone.
     *
     * A reader who presses Back is not navigating, they are asking to try
     * something again — so the step they land on is taken off the finished
     * list and whatever it did is put back the way it was: the pin comes out,
     * the drawer closes, the menu shuts. Landing on a step already ticked,
     * with its button spent and the tour poised to skip straight past it
     * again, would answer the request with a shrug.
     *
     * This is the only thing that puts the stage back. Going forwards leaves
     * everything where it is — see `nextStep`.
     *
     * `pinnedIds` is set directly rather than through `togglePin`, because
     * that raises the toast — and a confirmation that a car has been unpinned
     * is a thing the reader did not ask for and did not do.
     */
    const backStep = useCallback(
        (to: number) => {
            const control = TOUR_ORDER[to];

            if (!control) return;

            setTried((current) => current.filter((id) => id !== control));

            if (control === "pin" && first) {
                setPinnedIds((ids) => ids.filter((id) => id !== first.id));
            }

            if (control === "badge") setOpenId(null);
            if (control === "toolbar") setPopupOpen(false);

            setTourAt(to);
        },
        [first],
    );

    /**
     * On to the next step, leaving everything the last one made.
     *
     * It used to clear the stage on the way through — closing the drawer,
     * shutting the menu — so that the next bubble had the corner it wanted.
     * That is what the pause was for: the tour had to hold still long enough
     * for the reader to see a result it was about to take away, which meant
     * every step ended in a second and a half of nothing happening. The wait
     * was paying for the tidying.
     *
     * So it does not tidy. The pin stays filled, the drawer stays open, and
     * the next bubble moves aside for them instead — the reader keeps
     * everything they have made, and the mock ends the tour showing all three
     * of the things Lens does at once, which is a better picture than an
     * empty page anyway. Only `backStep` puts anything back, because there
     * the reader has asked for it.
     */
    const nextStep = useCallback(() => {
        setTourAt((at) => {
            if (at == null) return null;

            const next = at + 1;

            return next >= TOUR_ORDER.length ? null : next;
        });
    }, []);

    useEffect(() => {
        onProgress(tried.length, TOUR_ORDER.length);
    }, [tried, onProgress]);

    const markTried = useCallback((control: Control) => {
        setTried((current) =>
            current.includes(control) ? current : [...current, control],
        );
    }, []);
    const [toast, setToast] = useState<{
        car: string;
        detail: string;
        pinned: boolean;
    } | null>(null);

    /**
     * Move on the moment the reader has done the thing.
     *
     * Doing the thing is the only way the tour advances — the bubble has no
     * Next. A tour whose forward control can be pressed without working the
     * thing it points at is a tour that can be clicked through without
     * learning anything, and this one is the gate on the whole screen, so
     * being click-through-able made the gate a formality.
     *
     * The beat is a beat and not a wait. It was 1.4 seconds, and 2.6 on the
     * drawer, because the tour used to sweep each result away as it moved and
     * had to leave it up long enough to be seen first; now that nothing is
     * swept away, all the delay has to do is let the eye register that the
     * press caused something. `STEP_BEAT` is under the threshold where people
     * start experiencing a pause as waiting, so the tour reads as answering
     * rather than as thinking.
     */
    useEffect(() => {
        if (tourAt == null) return;

        const control = TOUR_ORDER[tourAt];

        if (!control || !tried.includes(control)) return;

        /*
         * No beat on the last step. There is nothing to move on to, so the
         * only thing a delay could do is hold the scrim up over a page whose
         * guide has already gone.
         */
        const last = tourAt === TOUR_ORDER.length - 1;

        const timer = window.setTimeout(nextStep, last ? 0 : STEP_BEAT);

        return () => window.clearTimeout(timer);
    }, [tourAt, tried, nextStep]);

    /*
     * The toast goes away on its own, because the real one does.
     *
     * Left up, it stopped being a copy of the confirmation finn.com gets and
     * became a permanent label on the mock — and a reader who pins, unpins
     * and pins again would have been reading a sentence about an action three
     * clicks old. Keyed on the message, so a second pin restarts the clock
     * and the attention animation together.
     */
    useEffect(() => {
        if (!toast) return;

        const timer = window.setTimeout(() => setToast(null), 2600);

        return () => window.clearTimeout(timer);
    }, [toast]);

    const togglePin = (id: number) => {
        const car = cars.find((candidate) => candidate.id === id);

        if (!car) return;

        const willPin = !pinnedIds.includes(id);

        markTried("pin");

        setPinnedIds((current) =>
            willPin
                ? [...current, id]
                : current.filter((pinned) => pinned !== id),
        );

        setToast({
            car: car.name,
            detail: [car.trim, car.equipmentLine].filter(Boolean).join(" "),
            pinned: willPin,
        });
    };

    const openPanel = (id: number) => {
        setPopupOpen(false);
        setOpenId(id);
    };

    /**
     * Closing the drawer is the second half of the step, not the end of it.
     *
     * Opening it used to be the whole thing, so the tour ticked the step and
     * moved on while the reasoning was still sliding in — the reader was
     * congratulated for arriving somewhere they had not read a word of, and
     * the next bubble appeared over the top of it. Asking them to close it
     * means they have to have *been* there: the drawer stays for exactly as
     * long as they want it, and the step ends when they are finished with it
     * rather than when the animation is.
     *
     * Guarded on something actually being open, so the undo in `backStep` —
     * which also closes the drawer — cannot tick the step it is trying to
     * put back.
     */
    const closePanel = useCallback(() => {
        if (openId == null) return;

        markTried("badge");
        setOpenId(null);
    }, [openId, markTried]);

    const toggleMenu = () => {
        markTried("toolbar");
        setOpenId(null);
        setPopupOpen((open) => !open);
    };

    /**
     * The three controls, in one list.
     *
     * Written once and read twice — by the rail, which needs their order and
     * their state, and by the cards, which need their words. They used to be
     * three hand-written blocks of JSX, which is fine until a rail has to
     * agree with them about how many there are and which is which.
     */
    const steps: {
        id: Control;
        title: string;
        where: string;
        aside?: string;
        sample: ReactNode;
        body: ReactNode;
        actionLabel: string;
        onAction: () => void;
        /** One line of instruction for the tour bubble. Not the explanation. */
        prompt: string;
        arrow: CalloutArrow;
        /** Where the bubble sits, relative to the surface that holds it. */
        calloutClass: string;
    }[] = [
            {
                id: "pin",
                title: "Pin a car you're considering",
                where: PIN_WHERE,
                sample: (
                    <span className="flex items-center gap-2">
                        <SamplePin pinned={false} />

                        <ArrowRight
                            aria-hidden="true"
                            className="h-3 w-3 text-finn-iron"
                        />

                        <SamplePin pinned />
                    </span>
                ),
                body: (
                    <>
                        Pinning puts a car on your shortlist. It is a bookmark held
                        in your own browser — <FinnLink /> is never told, nothing is
                        reserved and nothing is bought. Press it again to unpin.
                        Lens needs two pinned cars before it has anything to
                        compare.
                    </>
                ),
                prompt: "The glowing circle, top right of the photo. Press it and watch the card.",
                arrow: "left",
                calloutClass: "absolute top-0 left-full ml-4",
                actionLabel: pinnedIds.includes(first?.id ?? 0)
                    ? "Unpin it again"
                    : "Pin the first car",
                onAction: () => {
                    if (first) togglePin(first.id);
                },
            },
            {
                id: "badge",
                title: "Ask how a car fits you",
                where: BADGE_WHERE,
                sample: <SampleBadge analysis={first && analyses.get(first.id)} />,
                body: (
                    <>
                        Lens scores the car's equipment, price and consumption
                        against your ranking and puts the verdict on the card, so
                        you can judge a listing without opening it. Press{" "}
                        <strong className="font-black text-finn-black">
                            Why ›
                        </strong>{" "}
                        and the reasoning opens beside the page: what the car really
                        costs you a month, and which of your priorities it answers.
                    </>
                ),
                prompt:
                    openId != null
                        ? "That is the reasoning, in full. Close it when you have had a look."
                        : "The glowing pill, bottom left. It opens Lens's reasoning beside the page.",
                arrow: "top-left",
                calloutClass: "absolute top-full left-0 mt-3",
                actionLabel:
                    openId != null ? "Close the panel" : "Open the panel",
                onAction: () => {
                    if (openId != null) closePanel();
                    else if (first) openPanel(first.id);
                },
            },
            {
                id: "toolbar",
                title: "Get back to Lens later",
                where: "The Lens button in your browser's toolbar.",
                sample: (
                    <span className="flex items-center gap-2">
                        <BrandDisc size={22} />

                        <span className="text-[11px] font-bold text-finn-iron">
                            next to the address bar
                        </span>
                    </span>
                ),
                body: (
                    <>
                        Everything else is behind it: your pinned cars, your
                        settings, and the full recommendation once two or more cars
                        are pinned. If you can't see it, open your browser's
                        extensions menu — the jigsaw piece — and pin Finn Lens to
                        the toolbar.
                    </>
                ),
                prompt: "Up in the toolbar, next to the address bar. That button is Lens itself.",
                arrow: "top-right",
                /*
                 * It shifts left when the menu it is asking for is open, because
                 * the menu drops into exactly the same corner. A one-second
                 * overlap of two white cards reads as a bug rather than a tour.
                 */
                /*
                 * Shifted clear of a drawer, and only a drawer.
                 *
                 * It used to move for the menu as well, which was the one
                 * corner it could never usefully move for: opening the menu
                 * *is* this step, so the shift fired at the exact moment the
                 * bubble was about to be dismissed — and `transition-all`
                 * dutifully animated it across the frame before it vanished.
                 * The reader pressed the last button and watched the guide
                 * slide away sideways. It is gone in the same render now; see
                 * `calloutFor`.
                 */
                calloutClass:
                    openId != null
                        ? "absolute top-4 right-[23rem] transition-all"
                        : "absolute top-4 right-4 transition-all",
                actionLabel: popupOpen ? "Close the menu" : "Open the Lens menu",
                onAction: toggleMenu,
            },
        ];

    /**
     * One bubble, wherever the tour currently is.
     *
     * Built here rather than inside each surface because the surfaces know
     * where their own controls are and nothing else: `MockCard` is handed a
     * bubble and hangs it off its photo block, the frame is handed one and
     * hangs it over its page. What the bubble *says* is this component's
     * business, and there is only ever one of them on screen.
     */
    const calloutFor = (control: Control) => {
        const at = TOUR_ORDER.indexOf(control);
        const step = steps.find((candidate) => candidate.id === control);

        if (!step || tourAt !== at || !wide) return null;

        /*
         * The last step, once worked, draws nothing at all. Every other step
         * spends a beat showing "Done" on its way to the next one; this one
         * has no next one, so the beat would be the guide lingering over a
         * tour that is already over.
         */
        if (at === TOUR_ORDER.length - 1 && tried.includes(control)) {
            return null;
        }

        return (
            <Callout
                index={at}
                total={TOUR_ORDER.length}
                title={step.title}
                prompt={step.prompt}
                arrow={step.arrow}
                className={step.calloutClass}
                done={tried.includes(control)}
                action={{
                    label: step.actionLabel,
                    onClick: step.onAction,
                }}
                onSkip={leaveTour}
                onBack={at > 0 ? () => backStep(at - 1) : undefined}
            />
        );
    };

    const allTried = tried.length === steps.length;

    /**
     * Where a step stands.
     *
     * "Current" is the first one untried rather than a cursor the reader
     * moves: they are free to do these in any order, and the accent is a
     * suggestion about what to try next rather than a claim about where they
     * are. Once all three are tried nothing is current, and the page stops
     * asking.
     */
    const statusOf = (id: Control): StepStatus => {
        if (tried.includes(id)) return "done";

        /*
         * The tour, while it is running, is the answer to "which one now" —
         * and it has to be the only answer. Left to the untried-order rule
         * below, the rail lit step one blue while the tour stood on step
         * three, which is two different claims about where the reader is.
         */
        if (touring) return id === tourControl ? "current" : "upcoming";

        const next = steps.find((step) => !tried.includes(step.id));

        return next?.id === id ? "current" : "upcoming";
    };

    return (
        <div>
            <div className="text-center">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-finn-accent-blue">
                    How it works
                </p>

                <h1 className="mx-auto mt-3 max-w-3xl text-3xl font-black leading-tight tracking-tight text-finn-black sm:text-4xl">
                    Here is exactly what Lens puts on finn.com
                </h1>

                <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-finn-iron">
                    {withFinnLinks(
                        "Below is a working copy of a finn.com listing page with Lens installed. Three controls are marked. They do the same thing here as they do on the real site — press them.",
                    )}
                </p>
            </div>

            <div className="mt-6 flex items-start gap-2 rounded-[20px] bg-finn-warning/10 px-4 py-3 text-left">
                <FlaskConical
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-finn-warning"
                />

                <p className="text-xs leading-5 text-finn-black">
                    <strong className="font-black">
                        These three cars are invented.
                    </strong>{" "}
                    Aveline, Norvane and Halden are not manufacturers, and
                    their prices and equipment were written to demonstrate the
                    reasoning. Pinning one here pins nothing: this page is a
                    drawing, and nothing on it is saved.
                </p>
            </div>

            <div ref={stage} className="mt-5 scroll-mt-24">
                <BrowserFrame
                    lensFocused={focus === "toolbar"}
                    lensOpen={popupOpen}
                    lensSpotlit={touring && tourControl === "toolbar"}
                    lensStatus={statusOf("toolbar")}
                    scrim={touring}
                    callout={calloutFor("toolbar")}
                    onLensClick={toggleMenu}
                    popover={
                        popupOpen ? (
                            <LensPopover pinnedCount={pinnedIds.length} />
                        ) : null
                    }
                >
                    <div className="grid gap-3 p-4 2xs:grid-cols-2 lg:grid-cols-3">
                        {cars.map((car, index) => {
                            const analysis = analyses.get(car.id);
                            const level = analysis?.overall.level ?? "unknown";
                            const known = level !== "unknown";

                            return (
                                <MockCard
                                    key={car.id}
                                    car={car}
                                    level={known ? level : null}
                                    label={
                                        known && analysis
                                            ? analysis.overall.label
                                            : FIT_BADGE_NEUTRAL_LABEL
                                    }
                                    pinned={pinnedIds.includes(car.id)}
                                    open={openId === car.id}
                                    onTogglePin={() => togglePin(car.id)}
                                    onOpenPanel={() => openPanel(car.id)}
                                    markers={
                                        index === 0
                                            ? {
                                                  pin: statusOf("pin"),
                                                  badge: statusOf("badge"),
                                              }
                                            : undefined
                                    }
                                    focus={
                                        index === 0 && focus !== "toolbar"
                                            ? focus
                                            : null
                                    }
                                    spotlight={
                                        index === 0 &&
                                            touring &&
                                            tourControl !== "toolbar"
                                            ? tourControl
                                            : null
                                    }
                                    callout={
                                        index === 0 &&
                                            tourControl &&
                                            tourControl !== "toolbar"
                                            ? calloutFor(tourControl)
                                            : null
                                    }
                                />
                            );
                        })}
                    </div>

                    <ContinuingRow />

                    {toast && (
                        <MockToast
                            key={`${toast.car}-${String(toast.pinned)}`}
                            toast={toast}
                        />
                    )}

                    {openId != null && analyses.get(openId) && (
                        <MockPanel
                            analysis={analyses.get(openId)!}
                            onClose={closePanel}
                        />
                    )}
                </BrowserFrame>
            </div>

            <div className="mt-3 flex flex-col items-center gap-2">
                <PinnedCounter count={pinnedIds.length} />

                {/*
                  * The way back in. Skipping the tour has to be cheap, which
                  * means un-skipping it has to be cheap too — otherwise the
                  * skip is a decision the reader has to be sure about, and a
                  * skip you have to be sure about is not really an out.
                  */}
                {wide && tourAt == null && (
                    <button
                        type="button"
                        onClick={() => setTourAt(0)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[11px] font-bold text-finn-accent-blue shadow-sm transition hover:bg-finn-pale-blue"
                    >
                        <Route aria-hidden="true" className="h-3.5 w-3.5" />
                        {allTried
                            ? "Walk me through it again"
                            : "Take the guided tour"}
                    </button>
                )}
            </div>

            <div ref={stepCards} className="mt-7 scroll-mt-28">
                <StepRail
                    statuses={steps.map((step) => statusOf(step.id))}
                    focused={
                        focus == null
                            ? null
                            : steps.findIndex((step) => step.id === focus)
                    }
                    at={touring ? tourAt : null}
                    onGoTo={wide ? setTourAt : undefined}
                />

                <ol className="grid gap-3 md:grid-cols-3">
                    {steps.map((step, index) => (
                        <StepCard
                            key={step.id}
                            index={index}
                            status={statusOf(step.id)}
                            asking={!touring}
                            title={step.title}
                            where={step.where}
                            aside={step.aside}
                            sample={step.sample}
                            onFocus={() => setFocus(step.id)}
                            onBlur={() => setFocus(null)}
                            action={{
                                label: step.actionLabel,
                                onClick: () => {
                                    watchStage();
                                    step.onAction();
                                },
                            }}
                        >
                            {step.body}
                        </StepCard>
                    ))}
                </ol>

                {allTried && (
                    <p
                        /* Filled accent rather than a pale green wash: it
                           is the finish line for the three accent-blue steps
                           above it, and the paragraph directly under it is
                           already pale blue. */
                        className="mt-3 flex items-center justify-center gap-2 rounded-[20px] bg-finn-accent-blue px-5 py-3 text-center text-xs font-bold leading-5 text-white"
                    >
                        <CircleCheck
                            aria-hidden="true"
                            className="h-4 w-4 shrink-0"
                        />
                        That is every control Lens adds. You have pinned a car,
                        read a verdict and found the button — nothing else on
                        finn.com is ours.
                    </p>
                )}
            </div>

            <p className="mx-auto mt-7 max-w-2xl rounded-[22px] bg-finn-pale-blue px-5 py-4 text-center text-xs leading-5 text-finn-highlight-navy">
                <strong className="font-black">
                    Every verdict above came out of Lens's own starting
                    ranking.
                </strong>{" "}
                You haven't told it anything yet. The next two screens are where
                you replace that ranking with yours — and every band, price and
                sentence you just read moves with it.
            </p>

        </div>
    );
}

/**
 * The two-car rule, said by counting rather than by asserting.
 *
 * "Lens needs at least two" is a sentence a reader skims. A line under the
 * frame that changes as they pin is the same fact arriving at the moment it
 * is about them, and it is the one piece of arithmetic that decides whether
 * the product has anything to say at all.
 */
function PinnedCounter({ count }: { count: number }) {
    const ready = count >= 2;

    return (
        <p
            aria-live="polite"
            className={[
                "mt-3 text-center text-xs font-bold leading-5",
                ready ? "text-finn-influence-emerald" : "text-finn-iron",
            ].join(" ")}
        >
            {count === 0
                ? "Nothing pinned yet. Pin two of the cars above and Lens has a comparison."
                : count === 1
                    ? "One pinned. Lens needs two before it can compare anything."
                    : `${count} pinned — that's a comparison. On the real site, that is when the recommendation appears.`}
        </p>
    );
}

/** The toast the content script raises on every pin, in the frame. */
function MockToast({
    toast,
}: {
    toast: { car: string; detail: string; pinned: boolean };
}) {
    return (
        <div
            role="status"
            className={[
                "finn-lens-attention absolute bottom-3 left-3 z-50 flex max-w-[260px]",
                "items-start gap-2 rounded-xl px-3 py-2 shadow-lg",
                toast.pinned
                    ? "bg-finn-influence-emerald text-white"
                    : "bg-finn-black text-white",
            ].join(" ")}
        >
            <Pin
                aria-hidden="true"
                className={[
                    "mt-0.5 h-3.5 w-3.5 shrink-0",
                    toast.pinned ? "fill-current" : "",
                ].join(" ")}
            />

            <span className="min-w-0">
                <span className="block text-[11px] font-black">
                    {toast.pinned ? "Pinned:" : "Unpinned:"} {toast.car}
                </span>

                <span className="block text-[10px] leading-4 opacity-80">
                    {toast.detail}
                </span>
            </span>
        </div>
    );
}

/** The pin button at legend size, in one state or the other. */
function SamplePin({ pinned }: { pinned: boolean }) {
    return (
        <span
            aria-hidden="true"
            className={[
                "flex h-7 w-7 items-center justify-center rounded-full border",
                "shadow-[0_1px_6px_rgba(0,0,0,0.18)]",
                pinned
                    ? "border-finn-accent-blue bg-finn-accent-blue text-white"
                    : "border-finn-iron bg-white text-finn-iron",
            ].join(" ")}
        >
            <Pin className={pinned ? "size-3 fill-current" : "size-3"} />
        </span>
    );
}

/** The verdict pill at legend size, carrying the real band. */
function SampleBadge({ analysis }: { analysis: FitAnalysis | undefined }) {
    const level: FitLevel | null =
        analysis && analysis.overall.level !== "unknown"
            ? analysis.overall.level
            : null;

    return (
        <span
            aria-hidden="true"
            className={[
                "inline-flex items-center gap-1.5 rounded-full py-1 pl-1.5 pr-2",
                "shadow-[0_1px_6px_rgba(0,0,0,0.14)]",
                fitBadgeStateClass(level),
            ].join(" ")}
        >
            <BrandDisc size={14} />

            <FitMeter level={level} />

            <span className="text-[10px] font-black">
                {level && analysis
                    ? analysis.overall.label
                    : FIT_BADGE_NEUTRAL_LABEL}
            </span>
        </span>
    );
}
