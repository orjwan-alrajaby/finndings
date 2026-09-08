import "@/assets/tailwind.css";
import { useEffect, useMemo, useState } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Scale, Settings } from "lucide-react";

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

import { CarRow } from "./components/CarRow";
import { NothingOpen, NothingPinned } from "./components/EmptyStates";
import { SetSummary } from "./components/SetSummary";
import { Toolbar } from "./components/Toolbar";
import { UnpinDialog } from "./components/UnpinDialog";
import { sortCars, type SortKey } from "./utils/sorting";

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

                    {cars.length > 0 && (
                        <SetSummary cars={cars} analyses={analyses} />
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
                        <NothingPinned />
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

                <UnpinDialog
                    ids={confirming}
                    onCancel={() => setConfirming(null)}
                    onConfirm={(ids) => void remove(ids)}
                />
            </main>
        </Tooltip.Provider>
    );
}
