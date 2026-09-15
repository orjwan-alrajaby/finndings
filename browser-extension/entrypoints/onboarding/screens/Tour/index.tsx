import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlaskConical, Pin, Route } from "lucide-react";

import {
    TourKitProvider,
    TourProvider,
    useTour,
    type TourConfig,
} from "@tour-kit/react";

import { FinnLink, withFinnLinks } from "@/components/FinnLink";
import { FIT_BADGE_NEUTRAL_LABEL } from "@/lib/card-controls";
import { buildFitAnalysis } from "@/lib/reasoning-engine/fit";
import type { FitAnalysis } from "@/lib/reasoning-engine/fit";
import type {
    CategoryId,
    FeatureSelection,
    LensPreferences,
} from "@/lib/reasoning-engine/types";
import { demoCars } from "@/lib/demo-cars";

import { BrowserFrame, LensPopover } from "./BrowserFrame";
import { Coach, SPOTLIGHT_PADDING, useScrollToStep } from "./Coach";
import { BADGE_WHERE, PIN_WHERE } from "./copy";
import { ContinuingRow, MockCard } from "./MockCard";
import { MockPanel } from "./MockPanel";

const GUIDE_ID = "finn-lens-controls";

/**
 * Whether the mock has room to show the reasoning drawer *beside* a card.
 *
 * The drawer is 320px and pinned to the frame's right edge, exactly as the
 * real one is pinned to the browser's — so on a narrow window it covers the
 * page rather than sitting next to it, which is honest, and is also the whole
 * of the problem. The step that opens it rings the pill it came from, and a
 * ring drawn around a pill that is now behind a drawer is a ring around the
 * wrong thing: the reader looks where they are told and finds a paragraph of
 * somebody else's text inside the circle.
 *
 * So below this width the step points at the pill and leaves it at that. The
 * drawer is still one press away — the mock is live throughout — and pressing
 * it is the same gesture the sentence describes.
 */
function roomForTheDrawer(): boolean {
    return window.matchMedia("(min-width: 768px)").matches;
}

/**
 * What Lens actually does, shown rather than described.
 *
 * A browser frame, a finn.com listing page inside it, and the three controls
 * Lens adds on the cards at the real sizes in the real corners. Pressing them
 * here does what pressing them there will: the pin fills and a toast confirms
 * it, the pill opens the reasoning drawer beside the page, the toolbar button
 * opens the popup.
 *
 * Over the top of that, a three-step guide from `@tour-kit/react` that rings
 * each control in turn and says one thing about it. **The guide is a guide and
 * not a test.** The screen it replaced tried to be both at once and was
 * neither: it explained every control twice — once in a bubble on the mock and
 * again in a card below it, in different words — advanced only when the reader
 * worked the control, and on two of the three steps quietly required them to
 * *close* what they had opened before it would move. The way off the screen was
 * held shut behind all three. A reader who did not guess the rules was stuck in
 * front of a counter telling them how many they had left.
 *
 * So: one explanation, in one place. Back and Next on every step. Nothing
 * required, nothing gated, and the mock stays live underneath the whole time,
 * so pressing a control and pressing Next are both fine and neither is wrong.
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
}: {
    priorities: CategoryId[];
    preferences: LensPreferences;
    categoryFeatures: Record<CategoryId, FeatureSelection>;
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

    /** The car the guide walks. The other two are there to say "every card". */
    const first = cars[0];

    const [pinnedIds, setPinnedIds] = useState<number[]>([]);
    const [openId, setOpenId] = useState<number | null>(null);
    const [popupOpen, setPopupOpen] = useState(false);
    const [toast, setToast] = useState<{
        car: string;
        detail: string;
        pinned: boolean;
    } | null>(null);

    /**
     * The three controls, as elements.
     *
     * A step's `target` takes a selector, a ref or a getter, and refs are the
     * shape to use in a React tree: no ids to keep unique, nothing to go stale
     * when a class changes, and the guide points at the element the component
     * actually rendered rather than at the first thing on the page that
     * matches a string.
     */
    const pin = useRef<HTMLButtonElement>(null);
    const badge = useRef<HTMLButtonElement>(null);
    const lens = useRef<HTMLButtonElement>(null);

    /**
     * The one surface open, or none — set by whichever step is showing.
     *
     * Every step declares the whole stage rather than a change to it, so the
     * steps compose in any order: going back to step one closes the drawer
     * because step one says the drawer is closed, not because anything
     * remembers opening it.
     */
    const stage = useCallback(
        (surface: "none" | "reasoning" | "menu") => {
            setOpenId(
                surface === "reasoning" && roomForTheDrawer()
                    ? (first?.id ?? null)
                    : null,
            );
            setPopupOpen(surface === "menu");
        },
        [first],
    );

    const togglePin = (id: number) => {
        const car = cars.find((candidate) => candidate.id === id);

        if (!car) return;

        const willPin = !pinnedIds.includes(id);

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

    /*
     * The toast goes away on its own, because the real one does. Keyed on the
     * message, so a second pin restarts the clock and the attention animation
     * together.
     */
    useEffect(() => {
        if (!toast) return;

        const timer = window.setTimeout(() => setToast(null), 2600);

        return () => window.clearTimeout(timer);
    }, [toast]);

    /**
     * The guide itself: three steps, and a sentence each.
     *
     * Held in a memo with the stage setter as its only moving part, because
     * the provider takes tours as a prop and re-registering a new tour object
     * on every render would restart the walk under the reader's feet.
     *
     * Each step says what the control is *for*, and then where to find it on
     * the real site — which is the half a ring cannot do, because next week
     * the reader is on finn.com with no ring on it. What it does not do is
     * spend a sentence on which pixel to click here; the ring is already
     * saying that, better than a sentence can.
     */
    const tours = useMemo<TourConfig[]>(
        () => [
            {
                id: GUIDE_ID,
                autoStart: true,
                /*
                 * Never remembered. This page is reachable from the popup at
                 * any time, and a reader who opens it again has asked to be
                 * shown again — a guide that stays finished because it was
                 * finished once in another session is a guide they cannot get
                 * back without knowing there is a button for it.
                 */
                persistence: false,
                steps: [
                    {
                        id: "pin",
                        target: pin,
                        placement: "right-start",
                        spotlightPadding: SPOTLIGHT_PADDING,
                        title: "Pin the cars you like",
                        content: (
                            <>
                                A shortlist kept in your own browser. Nothing is
                                reserved and <FinnLink /> is never told. Pin two
                                or more and Lens can compare them.
                                <Where>{PIN_WHERE}</Where>
                            </>
                        ),
                        onShow: () => stage("none"),
                    },
                    {
                        id: "reasoning",
                        target: badge,
                        placement: "bottom-start",
                        spotlightPadding: SPOTLIGHT_PADDING,
                        title: "Read the verdict, and why",
                        content: (
                            <>
                                Every car is scored against what matters to you,
                                so you can judge a listing without opening it.
                                Press{" "}
                                <strong className="font-black text-white">
                                    Why ›
                                </strong>{" "}
                                and the full reasoning opens beside the page:
                                what the car really costs you a month, and which
                                of your priorities it answers.
                                <Where>{BADGE_WHERE}</Where>
                            </>
                        ),
                        onShow: () => stage("reasoning"),
                    },
                    {
                        id: "toolbar",
                        target: lens,
                        /*
                         * Above the button, not beside it.
                         *
                         * This step opens the menu to show what is behind the
                         * button, and the menu drops into exactly the space to
                         * the button's left and below — which is where a
                         * bubble anchored to a toolbar icon naturally wants to
                         * go. Sat there it covered the one thing the step had
                         * just opened. Above is the only side the menu never
                         * reaches, and the tail still points down at the
                         * button from there.
                         */
                        placement: "top-end",
                        spotlightPadding: SPOTLIGHT_PADDING,
                        title: "Come back here any time",
                        content: (
                            <>
                                Your pinned cars, your settings and the full
                                recommendation all live behind this button. If
                                it isn't there, open your browser's extensions
                                menu — the jigsaw piece — and pin Finn Lens.
                                <Where>
                                    The Lens button, beside the address bar.
                                </Where>
                            </>
                        ),
                        onShow: () => stage("menu"),
                    },
                ],
                /* However the guide ends, it tidies up after itself: the
                   reader is left with the mock they can play with rather than
                   with a menu the guide happened to leave hanging open. */
                onComplete: () => stage("none"),
                onSkip: () => stage("none"),
            },
        ],
        [stage],
    );

    return (
        <TourKitProvider>
            <TourProvider tours={tours}>
                <div>
                    <div className="text-center">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-finn-accent-blue">
                            How it works
                        </p>

                        <h1 className="mx-auto mt-3 max-w-3xl text-3xl font-black leading-tight tracking-tight text-finn-black sm:text-4xl">
                            This is Lens, on finn.com
                        </h1>

                        <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-finn-iron">
                            {withFinnLinks(
                                "A working copy of a finn.com listing page. Lens adds three controls to it — press them, they do the same thing here as they do on the real site.",
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
                            Their prices and equipment were written to
                            demonstrate the reasoning, and pinning one here pins
                            nothing.
                        </p>
                    </div>

                    <div className="mt-5">
                        <BrowserFrame
                            lensRef={lens}
                            lensOpen={popupOpen}
                            onLensClick={() =>
                                setPopupOpen((open) => {
                                    if (!open) setOpenId(null);

                                    return !open;
                                })
                            }
                            popover={
                                popupOpen ? (
                                    <LensPopover
                                        pinnedCount={pinnedIds.length}
                                    />
                                ) : null
                            }
                        >
                            <div className="grid gap-3 p-4 2xs:grid-cols-2 lg:grid-cols-3">
                                {cars.map((car, index) => {
                                    const analysis = analyses.get(car.id);
                                    const level =
                                        analysis?.overall.level ?? "unknown";
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
                                            onTogglePin={() =>
                                                togglePin(car.id)
                                            }
                                            onOpenPanel={() => {
                                                setPopupOpen(false);
                                                setOpenId(car.id);
                                            }}
                                            pinRef={index === 0 ? pin : undefined}
                                            badgeRef={
                                                index === 0 ? badge : undefined
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
                                    onClose={() => setOpenId(null)}
                                />
                            )}
                        </BrowserFrame>
                    </div>

                    <div className="mt-3 flex flex-col items-center gap-2">
                        <PinnedCounter count={pinnedIds.length} />

                        <ReplayButton />
                    </div>

                    <p className="mx-auto mt-7 max-w-2xl rounded-[22px] bg-finn-pale-blue px-5 py-4 text-center text-xs leading-5 text-finn-highlight-navy">
                        <strong className="font-black">
                            Every verdict above came out of Lens's own starting
                            ranking.
                        </strong>{" "}
                        You haven't told it anything yet. The next two screens
                        are where you replace that ranking with yours — and
                        every band, price and sentence you just read moves with
                        it.
                    </p>
                </div>

                <Guide />
            </TourProvider>
        </TourKitProvider>
    );
}

/**
 * The guide's own furniture, mounted once inside the provider.
 *
 * Separate from the screen above it because `useTour` and the scroll it drives
 * are only available to a descendant of `TourProvider`, and the screen is the
 * thing that renders the provider.
 */
function Guide() {
    useScrollToStep();

    return <Coach finishLabel="Done" />;
}

/**
 * The way back into the guide, once it has been closed.
 *
 * Closing has to be cheap, which means un-closing has to be cheap too —
 * otherwise the × in the bubble's corner is a decision the reader has to be
 * sure about, and a decision you have to be sure about is not really an out.
 * It is absent while the guide is up, because there is nothing to restart.
 */
function ReplayButton() {
    const { isActive, start } = useTour(GUIDE_ID);

    if (isActive) return null;

    return (
        <button
            type="button"
            onClick={() => start()}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[11px] font-bold text-finn-accent-blue shadow-sm transition hover:bg-finn-pale-blue"
        >
            <Route aria-hidden="true" className="h-3.5 w-3.5" />
            Show me the three controls again
        </button>
    );
}

/**
 * Where to look for this control on the real site.
 *
 * The ring answers "where" on this page; nothing answers it on finn.com next
 * week, which is when the reader actually needs it. One line, set apart from
 * the sentence above so it reads as a direction rather than as more prose.
 * The two card sentences live in `copy.ts`, where a test holds them to the
 * corner the real control is really dressed in.
 */
function Where({ children }: { children: string }) {
    return (
        <span className="mt-2 block text-[11px] font-bold text-finn-pale-blue">
            {children}
        </span>
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
                "text-center text-xs font-bold leading-5",
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
