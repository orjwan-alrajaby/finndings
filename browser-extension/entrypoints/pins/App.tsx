import "@/assets/tailwind.css";
import { useEffect, useMemo, useState } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
    ArrowTopRightOnSquareIcon,
    BookmarkIcon,
    Cog6ToothIcon,
    ScaleIcon,
    TrashIcon,
} from "@heroicons/react/24/outline";

import { FitAnalysisView } from "@/components/FitAnalysisView";
import { UsingDefaultsNotice } from "@/components/UsingDefaultsNotice";
import { FINN_BASE_URL } from "@/lib/constants";
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
import { openBrowserTab } from "../popup/utils";

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
                <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
                    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-finn-accent-blue">
                                FINN Lens
                            </p>

                            <h1 className="mt-2 text-3xl font-black tracking-tight">
                                Pinned cars
                            </h1>

                            <p className="mt-2 max-w-2xl text-sm leading-6 text-finn-iron">
                                Everything you kept while browsing. Open one to
                                see how it does against your priorities, or
                                unpin what you're no longer weighing up —
                                what's left here is exactly what Lens compares.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() =>
                                    void openBrowserTab("OPEN_COMPARE_PAGE")
                                }
                                disabled={cars.length < 2}
                                title={
                                    cars.length < 2
                                        ? "Pin at least two cars to compare them"
                                        : undefined
                                }
                                className="inline-flex h-11 items-center gap-2 rounded-full bg-finn-accent-blue px-5 text-xs font-black text-white shadow-sm transition hover:bg-finn-highlight-navy disabled:cursor-not-allowed disabled:bg-finn-cotton disabled:text-finn-iron"
                            >
                                <ScaleIcon className="h-4 w-4" />
                                Compare these
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    void openBrowserTab("OPEN_SETTINGS_PAGE")
                                }
                                className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-4 text-xs font-bold text-finn-iron shadow-sm transition hover:text-finn-black"
                            >
                                <Cog6ToothIcon className="h-4 w-4" />
                                Settings
                            </button>
                        </div>
                    </header>

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
                                    sort={sort}
                                    onSort={setSort}
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
                                <div className="lg:sticky lg:top-6">
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
                                Nothing happens on finn.com — you can pin{" "}
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
    sort,
    onSort,
    onSelectAll,
    onUnpinChecked,
}: {
    total: number;
    checked: number[];
    sort: SortKey;
    onSort: (key: SortKey) => void;
    onSelectAll: () => void;
    onUnpinChecked: () => void;
}) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3">
                <p className="text-xs font-black text-finn-black">
                    {total} {total === 1 ? "car" : "cars"}
                </p>

                <button
                    type="button"
                    onClick={onSelectAll}
                    className="text-[11px] font-bold text-finn-accent-blue underline-offset-2 transition hover:underline"
                >
                    {checked.length === total
                        ? "Clear selection"
                        : "Select all"}
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {checked.length > 0 && (
                    <button
                        type="button"
                        onClick={onUnpinChecked}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-finn-error px-3.5 text-[11px] font-black text-white transition hover:brightness-110"
                    >
                        <TrashIcon className="h-3.5 w-3.5" />
                        Unpin {checked.length}
                    </button>
                )}

                <label className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-finn-iron">
                        Sort
                    </span>

                    <select
                        value={sort}
                        onChange={(event) =>
                            onSort(event.target.value as SortKey)
                        }
                        className="h-9 rounded-full bg-finn-snow px-3 text-[11px] font-bold text-finn-black outline-none"
                    >
                        {SORTS.map(([key, label]) => (
                            <option key={key} value={key}>
                                {label}
                            </option>
                        ))}
                    </select>
                </label>
            </div>
        </div>
    );
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
                <BookmarkIcon className="h-7 w-7" />
            </span>

            <h2 className="mt-5 text-2xl font-black text-finn-black">
                Nothing pinned yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-finn-iron">
                Lens adds a pin button to every car on finn.com. Pin the ones
                you're weighing up and they collect here, ready to compare.
            </p>

            <a
                href={FINN_BASE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-finn-accent-blue px-6 text-sm font-black text-white shadow-sm transition hover:bg-finn-highlight-navy"
            >
                Open finn.com
                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </a>
        </div>
    );
}

function NothingOpen({ configured }: { configured: boolean }) {
    return (
        <div className="rounded-[28px] border border-dashed border-finn-cotton bg-white/60 p-8 text-center">
            <p className="text-sm font-black text-finn-black">
                Pick a car to read it
            </p>

            <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-finn-iron">
                {configured
                    ? "You'll get the same reading the side panel gives you on finn.com — how it does on each of your priorities, which of your picks it has, what it costs you a month, and what you'd be accepting."
                    : "You'll get the same reading the side panel gives you on finn.com — each priority in turn, the features behind the verdict, what it costs you a month, and what you'd be accepting. On Lens's own assumptions until you give it yours."}
            </p>
        </div>
    );
}
