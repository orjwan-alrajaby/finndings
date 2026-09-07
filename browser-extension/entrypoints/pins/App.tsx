import "@/assets/tailwind.css";
import { useEffect, useMemo, useState } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
    Bookmark,
    CircleCheck,
    ExternalLink,
    FileSearch,
    Scale,
    Settings,
    Trash2,
    X,
} from "lucide-react";

import { NavButton, PageHeader } from "@/components/PageHeader";

import { FitAnalysisView } from "@/components/FitAnalysisView";
import { UsingDefaultsNotice } from "@/components/UsingDefaultsNotice";
import { FINN_BASE_URL } from "@/lib/constants";
import { FinnLink, withFinnLinks } from "@/components/FinnLink";
import {
    formatEUR,
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

import { CarRow } from "./components/CarRow";
import { ConfirmDialog } from "../settings/components/ConfirmDialog";

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
 * matters more than it looks. That analysis was reachable only from a card
 * badge or the launcher on a detail page, which means the reader could only
 * ask "how does this suit me?" about a car they were already looking at. Here
 * they can ask it about any car they kept, side by side with the rest.
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

    /* Leaving selection mode drops the selection with it. */
    const stopSelecting = () => {
        setSelecting(false);
        setChecked([]);
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

    const best = bestMatch(sorted, analyses);
    const cheapest = cheapestPrice(cars);

    return (
        <Tooltip.Provider delayDuration={250}>
            <main className="min-h-screen bg-finn-snow text-finn-black">
                <PageHeader>
                    <NavButton
                        icon={<Scale className="h-4 w-4" />}
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
                        icon={<Settings className="h-4 w-4" />}
                        label="Settings"
                        onClick={() =>
                            void openBrowserTab("OPEN_SETTINGS_PAGE")
                        }
                    />
                </PageHeader>

                <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
                    <header className="mb-6">
                        <h1 className="text-3xl font-black tracking-tight">
                            Pinned cars
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-finn-iron">
                            Everything you kept while browsing. Open one to see
                            how it does against your priorities, or unpin what
                            you're no longer weighing up — what's left here is
                            exactly what Lens compares.
                        </p>
                    </header>

                    {/*
                      * The three things a reader wants from the set as a
                      * whole, before they read any single row: how many they
                      * have, which one is winning, and what the floor is.
                      * Every figure comes from the same analyses the list
                      * and the panel are drawn from.
                      */}
                    {cars.length > 0 && (
                        <dl className="mb-5 grid gap-3 sm:grid-cols-3">
                            <Stat
                                label="Pinned"
                                value={`${cars.length} ${cars.length === 1 ? "car" : "cars"}`}
                                detail={
                                    cars.length < 2
                                        ? "Pin one more to get a recommendation"
                                        : "Ready to rank"
                                }
                            />

                            <Stat
                                label="Best match"
                                value={best?.car.name ?? "—"}
                                detail={
                                    best
                                        ? best.band.label
                                        : "Nothing scored yet"
                                }
                                tone="accent"
                            />

                            <Stat
                                label="Cheapest"
                                value={
                                    cheapest
                                        ? `${formatEUR(cheapest.price)}/mo`
                                        : "—"
                                }
                                detail={
                                    cheapest?.name ?? "No prices published"
                                }
                            />
                        </dl>
                    )}

                    {!configured && cars.length > 0 && (
                        <div className="mb-4">
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
                        <EmptyState />
                    ) : (
                        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                            <section className="min-w-0">
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
                                            checked.length === cars.length
                                                ? []
                                                : cars.map((car) => car.id),
                                        )
                                    }
                                    onUnpinChecked={() =>
                                        setConfirming(checked)
                                    }
                                />

                                <ul className="mt-3 flex flex-col gap-2.5">
                                    {sorted.map((car) => (
                                        <CarRow
                                            key={car.id}
                                            car={car}
                                            band={
                                                analyses.get(car.id)
                                                    ?.overall ?? null
                                            }
                                            selected={car.id === openId}
                                            checked={checked.includes(car.id)}
                                            selecting={selecting}
                                            onOpen={() =>
                                                setOpenId(
                                                    car.id === openId
                                                        ? null
                                                        : car.id,
                                                )
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

                            <section className="min-w-0">
                                <div className="lg:sticky lg:top-24">
                                    {openAnalysis ? (
                                        <FitAnalysisView
                                            analysis={openAnalysis}
                                        />
                                    ) : (
                                        <NothingOpen
                                            configured={configured}
                                        />
                                    )}
                                </div>
                            </section>
                        </div>
                    )}
                </div>

                <ConfirmDialog
                    open={confirming !== null}
                    onOpenChange={(next) => {
                        if (!next) setConfirming(null);
                    }}
                    title={
                        confirming && confirming.length > 1
                            ? `Unpin ${confirming.length} cars?`
                            : "Unpin this car?"
                    }
                    confirmLabel={
                        confirming && confirming.length > 1
                            ? `Unpin ${confirming.length}`
                            : "Unpin"
                    }
                    tone="danger"
                    onConfirm={() => void remove(confirming ?? [])}
                    description={
                        <>
                            <p>
                                {confirming && confirming.length > 1
                                    ? "These cars leave your comparison and Lens stops ranking them."
                                    : "This car leaves your comparison and Lens stops ranking it."}
                            </p>

                            <p className="mt-2">
                                Nothing happens on <FinnLink /> — you can pin{" "}
                                {confirming && confirming.length > 1
                                    ? "them"
                                    : "it"}{" "}
                                again from the listing at any time.
                            </p>
                        </>
                    }
                />
            </main>
        </Tooltip.Provider>
    );
}

/* -------------------------------------------------------------------------- */
/* List controls                                                              */
/* -------------------------------------------------------------------------- */

type SortKey = "pinnedAt" | "fit" | "price" | "name";

const SORTS: [SortKey, string][] = [
    ["pinnedAt", "Recently pinned"],
    ["fit", "Best fit"],
    ["price", "Cheapest"],
    ["name", "Name"],
];

function Toolbar({
    total,
    checked,
    selecting,
    sort,
    onSort,
    onStartSelecting,
    onStopSelecting,
    onSelectAll,
    onUnpinChecked,
}: {
    total: number;
    checked: number[];
    selecting: boolean;
    sort: SortKey;
    onSort: (key: SortKey) => void;
    onStartSelecting: () => void;
    onStopSelecting: () => void;
    onSelectAll: () => void;
    onUnpinChecked: () => void;
}) {
    /*
     * Two bars in one slot, because they are two different jobs. Ordinarily
     * the reader is arranging the list; while they are picking cars off, the
     * only things that matter are how many they have picked and the two ways
     * out. Showing both at once is how a toolbar ends up with six controls
     * and no shape.
     */
    if (selecting) {
        return (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-finn-black px-4 py-3 text-white shadow-sm">
                <div className="flex items-center gap-3">
                    <p className="text-xs font-black">
                        {checked.length === 0
                            ? "Pick the cars to unpin"
                            : `${checked.length} selected`}
                    </p>

                    <button
                        type="button"
                        onClick={onSelectAll}
                        className="text-[11px] font-bold text-white/70 underline-offset-2 transition hover:text-white hover:underline"
                    >
                        {checked.length === total
                            ? "Clear selection"
                            : "Select all"}
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onUnpinChecked}
                        disabled={checked.length === 0}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-finn-error px-3.5 text-[11px] font-black text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/40"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        Unpin
                        {checked.length > 0 ? ` ${checked.length}` : ""}
                    </button>

                    <button
                        type="button"
                        onClick={onStopSelecting}
                        aria-label="Done selecting"
                        className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-white px-3 py-2.5 shadow-sm">
            {/*
              * Segmented rather than a dropdown. Four options that change
              * what the reader is looking at should be four things they can
              * see, and a native select was the one piece of unstyled
              * furniture on the page.
              */}
            <div
                role="group"
                aria-label="Sort by"
                className="flex flex-wrap items-center gap-1 rounded-full bg-finn-snow p-1"
            >
                {SORTS.map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => onSort(key)}
                        aria-pressed={sort === key}
                        className={[
                            "rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors",
                            sort === key
                                ? "bg-white text-finn-black shadow-sm"
                                : "text-finn-iron hover:text-finn-black",
                        ].join(" ")}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <button
                type="button"
                onClick={onStartSelecting}
                className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold text-finn-iron transition hover:bg-finn-snow hover:text-finn-black"
            >
                <CircleCheck className="h-4 w-4" />
                Select
            </button>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* The set at a glance                                                        */
/* -------------------------------------------------------------------------- */

function Stat({
    label,
    value,
    detail,
    tone,
}: {
    label: string;
    value: string;
    detail: string;
    /** Marks the one figure that is a verdict rather than a count. */
    tone?: "accent";
}) {
    return (
        <div className="min-w-0 rounded-[20px] bg-white px-4 py-3 shadow-sm">
            <dt className="text-[10px] font-black uppercase tracking-[0.14em] text-finn-iron">
                {label}
            </dt>

            <dd
                className={[
                    "mt-1 truncate text-base font-black",
                    tone === "accent"
                        ? "text-finn-accent-blue"
                        : "text-finn-black",
                ].join(" ")}
            >
                {value}
            </dd>

            <dd className="mt-0.5 truncate text-[11px] leading-4 text-finn-iron">
                {detail}
            </dd>
        </div>
    );
}

/** The strongest-scoring car, if anything has been scored at all. */
function bestMatch(
    cars: PinnedFinnCar[],
    analyses: Map<number, FitAnalysis>,
): { car: PinnedFinnCar; band: FitAnalysis["overall"] } | null {
    let best: { car: PinnedFinnCar; band: FitAnalysis["overall"] } | null =
        null;

    for (const car of cars) {
        const band = analyses.get(car.id)?.overall;

        if (!band || band.level === "unknown") continue;

        if (
            !best ||
            FIT_ORDER.indexOf(band.level) < FIT_ORDER.indexOf(best.band.level)
        ) {
            best = { car, band };
        }
    }

    return best;
}

/** The lowest published subscription price in the set. */
function cheapestPrice(
    cars: PinnedFinnCar[],
): { price: number; name: string } | null {
    let cheapest: { price: number; name: string } | null = null;

    for (const car of cars) {
        const price = car.pricing?.customerMonthly?.price;

        if (!price) continue;
        if (!cheapest || price < cheapest.price) {
            cheapest = { price, name: car.name };
        }
    }

    return cheapest;
}

/**
 * Ordering the list.
 *
 * "Best fit" falls back to leaving the order alone when nothing has been
 * analysed, which is what happens before the reader has configured Lens —
 * sorting by a band nobody has been shown would be ordering the list by a
 * secret.
 */
function sortCars(
    cars: PinnedFinnCar[],
    key: SortKey,
    analyses: Map<number, FitAnalysis>,
): PinnedFinnCar[] {
    const next = [...cars];

    const priceOf = (car: PinnedFinnCar) =>
        car.pricing?.customerMonthly?.price || Number.POSITIVE_INFINITY;

    const rankOf = (car: PinnedFinnCar) => {
        const level = analyses.get(car.id)?.overall.level;

        return level ? FIT_ORDER.indexOf(level) : FIT_ORDER.length;
    };

    switch (key) {
        case "fit":
            return next.sort((a, b) => rankOf(a) - rankOf(b));

        case "price":
            return next.sort((a, b) => priceOf(a) - priceOf(b));

        case "name":
            return next.sort((a, b) => a.name.localeCompare(b.name));

        default:
            /* Newest first, and cars with no timestamp last rather than first. */
            return next.sort((a, b) =>
                (b.pinnedAt ?? "").localeCompare(a.pinnedAt ?? ""),
            );
    }
}

const FIT_ORDER = ["strong", "good", "partial", "limited", "unknown"];

/* -------------------------------------------------------------------------- */
/* Empty states                                                               */
/* -------------------------------------------------------------------------- */

function EmptyState() {
    return (
        <div className="mx-auto max-w-xl rounded-[28px] bg-white p-8 text-center shadow-sm">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-finn-pale-blue text-finn-accent-blue">
                <Bookmark className="h-7 w-7" />
            </span>

            <h2 className="mt-5 text-2xl font-black text-finn-black">
                Nothing pinned yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-finn-iron">
                Lens adds a pin button to every car on <FinnLink />. Pin the ones
                you're weighing up and they collect here, ready to compare.
            </p>

            <a
                href={FINN_BASE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-finn-accent-blue px-6 text-sm font-black text-white shadow-sm transition hover:bg-finn-highlight-navy"
            >
                Open finn.com
                <ExternalLink className="h-4 w-4" />
            </a>
        </div>
    );
}

/**
 * The right-hand column before a car is opened.
 *
 * Not an apology for being empty. It is the one place to say what opening a
 * row actually gets you, so the reader knows there is something behind the
 * click — spelled out as the four questions the reading answers, in the
 * order it answers them.
 */
function NothingOpen({ configured }: { configured: boolean }) {
    return (
        <div className="rounded-[28px] border border-dashed border-finn-cotton bg-white/60 p-8">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-finn-pale-blue text-finn-accent-blue">
                <FileSearch className="h-6 w-6" />
            </span>

            <p className="mt-4 text-center text-sm font-black text-finn-black">
                Open a car to read it
            </p>

            <p className="mx-auto mt-2 max-w-sm text-center text-xs leading-5 text-finn-iron">
                {withFinnLinks(
                    "The same reading the side panel gives you on finn.com, for any car you kept.",
                )}
                {!configured && (
                    <> On Lens's own assumptions until you give it yours.</>
                )}
            </p>

            <ul className="mx-auto mt-5 max-w-xs space-y-2">
                {[
                    "How it does on each of your priorities",
                    "Which of the features you picked out it has",
                    "What it costs you a month, line by line",
                    "What you'd be accepting by taking it",
                ].map((line) => (
                    <li key={line} className="flex items-start gap-2">
                        <CircleCheck
                            aria-hidden="true"
                            className="mt-px h-4 w-4 shrink-0 text-finn-accent-blue"
                        />

                        <span className="text-xs leading-5 text-finn-black">
                            {line}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
