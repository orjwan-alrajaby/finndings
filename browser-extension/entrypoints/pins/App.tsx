import "@/assets/tailwind.css";
import { useEffect, useMemo, useRef, useState } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { ArrowLeft, Scale, Settings } from "lucide-react";

import { FitAnalysisView } from "@/components/FitAnalysisView";
import { NavButton, PageHeader } from "@/components/PageHeader";
import { UsingDefaultsNotice } from "@/components/UsingDefaultsNotice";
import {
    hasSavedLensSettings,
    loadLensSettings,
} from "@/lib/reasoning-engine";
import {
    buildFitAnalysis,
    type FitAnalysis,
} from "@/lib/reasoning-engine/fit";
import type { LensSettings } from "@/lib/reasoning-engine/types";
import { loadPinnedCars, unpinCars } from "@/lib/stored-data";
import type { PinnedFinnCar } from "@/lib/types";
import { openBrowserTab } from "@/lib/utils";

import { CarCard } from "./components/CarCard";
import { NothingPinned } from "./components/EmptyStates";
import { SetSummary } from "./components/SetSummary";
import { Toolbar } from "./components/Toolbar";
import { UnpinDialog } from "./components/UnpinDialog";
import {
    bestMatch,
    cheapestPrice,
    sortCars,
    type SortKey,
} from "./utils/sorting";

/**
 * The pinned cars, as something the reader owns rather than something that
 * happens to them.
 *
 * Pinning was one-way. The button on finn.com toggles, so a car could be
 * unpinned from the page it was pinned on — and nowhere else. Once the reader
 * had moved on, or the listing had gone, the pin was permanent: the compare
 * flow showed the set and gave no way to change it, and the popup showed
 * three of them and no way to change it either. A set you can only add to
 * stops being a comparison and becomes a pile.
 *
 * So: the whole set, with the two things missing from it — removing one, and
 * reading the analysis of one without hunting for it on finn.com. The second
 * matters more than it looks. That analysis is reachable only from a card
 * badge on finn.com, which means the reader could only ask "how does this suit
 * me?" about a car they were already looking at. Here they can ask it about
 * any car they kept, side by side with the rest.
 */
export default function PinsPage() {
    const [cars, setCars] = useState<PinnedFinnCar[] | null>(null);
    const [settings, setSettings] = useState<LensSettings | null>(null);
    const [configured, setConfigured] = useState(false);

    const [openId, setOpenId] = useState<number | null>(null);
    const [checked, setChecked] = useState<number[]>([]);
    const [selecting, setSelecting] = useState(false);
    const [sort, setSort] = useState<SortKey>("pinnedAt");
    const [confirming, setConfirming] = useState<number[] | null>(null);

    const refresh = async () => {
        setCars(await loadPinnedCars());
    };

    useEffect(() => {
        void (async () => {
            const [saved, isConfigured] = await Promise.all([
                loadLensSettings(),
                hasSavedLensSettings().catch(() => false),
            ]);

            setSettings(saved);
            setConfigured(isConfigured);

            await refresh();
        })();

        /*
         * The set can change under this page — a pin on finn.com, or a
         * deletion from Settings — so the page listens rather than assuming
         * it is the only thing touching storage.
         */
        const listener = (message: { type?: string }) => {
            if (message.type === "PINNED_CARS_UPDATED") void refresh();
        };

        browser.runtime.onMessage.addListener(listener);

        return () => {
            browser.runtime.onMessage.removeListener(listener);
        };
    }, []);

    /*
     * Every car analysed once, and reused by both the list and the open
     * panel. Scoring on demand would let the chip in the list and the band on
     * the reading drift apart, which is exactly the kind of disagreement this
     * product cannot afford.
     *
     * No longer gated on the reader having answered. Lens ships defaults, so
     * there is always something honest to say; `configured` now decides
     * whether the page captions the answers as Lens's assumptions rather than
     * whether it gives any.
     */
    const analyses = useMemo(() => {
        if (!cars || !settings) {
            return new Map<number, FitAnalysis>();
        }

        return new Map(
            cars.map((car) => [
                car.id,
                buildFitAnalysis(
                    car,
                    settings.priorities,
                    settings.preferences,
                    settings.categoryFeatures,
                ),
            ]),
        );
    }, [cars, settings]);

    const sorted = useMemo(
        () => (cars ? sortCars(cars, sort, analyses) : []),
        [cars, sort, analyses],
    );

    const open = sorted.find((car) => car.id === openId) ?? null;
    const openAnalysis = open ? (analyses.get(open.id) ?? null) : null;

    /**
     * The reading, brought to the top when it changes underneath the reader.
     *
     * A full analysis runs to several screens, so a reader who has scrolled
     * into the middle of one and then picks a different car off the rail gets
     * the new car's reading — opened at whatever paragraph the old one had
     * reached. Nothing about the page moves, so the change reads as a glitch
     * rather than as an answer. Below `lg` the panel stacks under the list
     * instead, and there the same click leaves the reading off the bottom of
     * the screen entirely.
     *
     * The guard is what keeps this from fighting the reader: if the top of
     * the reading is already sitting in the band just under the sticky bar,
     * the page is where it should be and nothing moves. It only scrolls when
     * the answer is somewhere the reader is not looking.
     */
    const reading = useRef<HTMLElement>(null);

    useEffect(() => {
        if (openId == null) return;

        const node = reading.current;

        if (!node) return;

        /* The page bar and the sticky way back under it, plus a little air. */
        const HEADER = 144;
        const { top } = node.getBoundingClientRect();

        if (top >= HEADER - 8 && top <= HEADER + 200) return;

        node.scrollIntoView({
            /* The system setting, honoured here rather than in CSS: there is
               no media query that reaches a scrollIntoView option. */
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                .matches
                ? "auto"
                : "smooth",
            block: "start",
        });
    }, [openId]);

    /*
     * Worked out once for the set rather than once per card: "cheapest" and
     * "ahead" are claims about the whole board, and a card cannot answer
     * either by looking at itself.
     */
    const leader = useMemo(
        () => bestMatch(cars ?? [], analyses),
        [cars, analyses],
    );

    const floor = useMemo(() => cheapestPrice(cars ?? []), [cars]);

    const gapFor = (car: PinnedFinnCar): number | null => {
        const price = car.pricing?.customerMonthly?.price;

        if (!price || !floor) return null;

        return price - floor.price;
    };

    /* Leaving selection mode drops the selection with it. */
    const stopSelecting = () => {
        setSelecting(false);
        setChecked([]);
    };

    /**
     * Into the reading, and out of whatever the board was doing.
     *
     * The two views are two jobs — arranging the set, and reading one car —
     * and a half-finished selection carried into the second would come back
     * to a board the reader had stopped looking at. Stepping in ends it.
     */
    const openCar = (id: number) => {
        stopSelecting();
        setOpenId(id);
    };

    const remove = async (ids: number[]) => {
        await unpinCars(ids);

        setChecked((current) =>
            current.filter((id) => !ids.includes(id)),
        );

        if (openId !== null && ids.includes(openId)) setOpenId(null);

        /* Everyone else holding a copy of the set is told, not left to guess. */
        void browser.runtime
            .sendMessage({ type: "PINNED_CARS_UPDATED" })
            .catch(() => undefined);

        await refresh();
        setConfirming(null);
    };

    if (cars === null) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-finn-snow">
                <span className="text-sm text-finn-iron">
                    Reading your pinned cars…
                </span>
            </main>
        );
    }

    return (
        <Tooltip.Provider delayDuration={250}>
            <main className="min-h-screen bg-finn-snow text-finn-black">
                <PageHeader>
                    <NavButton
                        icon={<Scale aria-hidden="true" className="h-4 w-4" />}
                        label="See my recommendation"
                        variant="primary"
                        onClick={() =>
                            void openBrowserTab("OPEN_COMPARE_PAGE")
                        }
                        disabled={cars.length < 2}
                        title={
                            cars.length < 2
                                ? "Pin at least two cars and Lens can rank them"
                                : undefined
                        }
                    />

                    <NavButton
                        icon={<Settings aria-hidden="true" className="h-4 w-4" />}
                        label="Settings"
                        onClick={() =>
                            void openBrowserTab("OPEN_SETTINGS_PAGE")
                        }
                    />
                </PageHeader>

                <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
                    {cars.length > 0 && (
                        <SetSummary cars={cars} analyses={analyses} />
                    )}

                    {!configured && cars.length > 0 && (
                        <div className="mt-4">
                            <UsingDefaultsNotice
                                onPersonalise={() =>
                                    void openBrowserTab(
                                        "OPEN_ONBOARDING_PAGE",
                                    )
                                }
                            />
                        </div>
                    )}

                    {cars.length === 0 ? (
                        <NothingPinned />
                    ) : (
                        /*
                         * The reading only takes a column once there is one.
                         *
                         * This was a fixed two-column split, so on a page
                         * where nothing had been opened yet — which is every
                         * first visit — half the width was a dashed box
                         * explaining what would appear there. The set now
                         * fills the page until a car is opened, and the grid
                         * folds to a single rail beside the reading when one
                         * is.
                         */
                        <>
                        {/*
                          * The way back, and the only thing on the page that
                          * says which of the two views the reader is in.
                          *
                          * A breadcrumb rather than a close button on the
                          * panel: leaving is a move between views, not the
                          * dismissal of a thing, and the reader arrived here
                          * from a board they will want again to sort or thin
                          * out. It sits above both columns because it applies
                          * to both of them.
                          */}
                        {open && (
                            /*
                             * Pinned under the page bar, because a reading
                             * runs to several screens and the way out of a
                             * view cannot be a thing you have to scroll eight
                             * thousand pixels back up to reach. It carries
                             * the page's own ground and a blur so the cards
                             * pass under it rather than through it.
                             */
                            <div className="sticky top-16 z-20 -mx-4 mt-6 flex flex-wrap items-center gap-3 bg-finn-snow/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
                                <button
                                    type="button"
                                    onClick={() => setOpenId(null)}
                                    className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-xs font-black text-finn-black shadow-sm ring-1 ring-black/[0.06] transition hover:bg-finn-pale-blue hover:text-finn-accent-blue hover:ring-finn-accent-blue"
                                >
                                    <ArrowLeft
                                        aria-hidden="true"
                                        className="h-4 w-4"
                                    />
                                    All {cars.length} cars
                                </button>

                                <p className="min-w-0 truncate text-xs text-finn-iron">
                                    Reading{" "}
                                    <strong className="font-black text-finn-black">
                                        {open.name}
                                    </strong>
                                    . Pick another on the left, or go back to
                                    sort and thin out the set.
                                </p>
                            </div>
                        )}

                        <div
                            className={[
                                "mt-6 grid gap-6",
                                open
                                    ? "lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]"
                                    : "",
                            ].join(" ")}
                        >
                            <section className="min-w-0">
                                {/*
                                  * The board's own controls, and only on the
                                  * board. Sorting and picking cars off are
                                  * things you do to a set; once the reader
                                  * has stepped into one car they are reading,
                                  * and a row of sort pills beside a five-page
                                  * analysis is furniture for a job nobody is
                                  * doing.
                                  */}
                                {!open && (
                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                        <h2 className="text-sm font-black text-finn-black">
                                            Your set · {cars.length}
                                        </h2>

                                        <Toolbar
                                            total={cars.length}
                                            checked={checked}
                                            selecting={selecting}
                                            sort={sort}
                                            onSort={setSort}
                                            onStartSelecting={() =>
                                                setSelecting(true)
                                            }
                                            onStopSelecting={stopSelecting}
                                            onSelectAll={() =>
                                                setChecked(
                                                    checked.length ===
                                                        cars.length
                                                        ? []
                                                        : cars.map(
                                                              (car) => car.id,
                                                          ),
                                                )
                                            }
                                            onUnpinChecked={() =>
                                                setConfirming(checked)
                                            }
                                        />
                                    </div>
                                )}

                                <ul
                                    className={[
                                        "grid gap-4",
                                        open
                                            ? ""
                                            : "sm:grid-cols-2 xl:grid-cols-3",
                                    ].join(" ")}
                                >
                                    {sorted.map((car) => (
                                        <CarCard
                                            key={car.id}
                                            car={car}
                                            band={
                                                analyses.get(car.id)
                                                    ?.overall ?? null
                                            }
                                            leading={car.id === leader?.car.id}
                                            cheapest={
                                                car.pricing?.customerMonthly
                                                    ?.price != null &&
                                                car.pricing.customerMonthly
                                                    .price === floor?.price
                                            }
                                            priceGap={gapFor(car)}
                                            selected={car.id === openId}
                                            checked={checked.includes(car.id)}
                                            selecting={selecting}
                                            onOpen={() =>
                                                openCar(car.id)
                                            }
                                            onToggleChecked={() =>
                                                setChecked((current) =>
                                                    current.includes(car.id)
                                                        ? current.filter(
                                                              (id) =>
                                                                  id !==
                                                                  car.id,
                                                          )
                                                        : [
                                                              ...current,
                                                              car.id,
                                                          ],
                                                )
                                            }
                                            onUnpin={() =>
                                                setConfirming([car.id])
                                            }
                                        />
                                    ))}
                                </ul>
                            </section>

                            {openAnalysis && (
                                <section
                                    ref={reading}
                                    className="min-w-0 scroll-mt-36"
                                >
                                    <FitAnalysisView analysis={openAnalysis} />
                                </section>
                            )}
                        </div>
                        </>
                    )}
                </div>

                <UnpinDialog
                    ids={confirming}
                    onCancel={() => setConfirming(null)}
                    onConfirm={(ids) => void remove(ids)}
                />
            </main>
        </Tooltip.Provider>
    );
}
