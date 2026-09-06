import "@/assets/tailwind.css";
import { useEffect, useState } from "react";
import {
  AdjustmentsHorizontalIcon,
  BookmarkIcon,
  Cog6ToothIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import * as Tooltip from "@radix-ui/react-tooltip";

import type { PinnedFinnCar } from "@/lib/types";
import { FinnLink } from "@/components/FinnLink";
import { NavButton, PageHeader } from "@/components/PageHeader";

import { AdjustDrawer } from "./components/AdjustDrawer";
import { Advice } from "./advice";
import { useCompareStore } from "./store";

/**
 * The compare page: the answer, and a drawer to argue with it.
 *
 * This was a four-step wizard — priorities, feature picks, driving
 * assumptions, and only then a recommendation. Two things were wrong with
 * that. The product already has an onboarding flow that asks those same
 * questions once, so the wizard re-asked what the reader had answered; and
 * the questions are unanswerable in the abstract anyway. Nobody knows
 * whether their order is right until they have seen what it recommends.
 *
 * So the page opens on the recommendation, built from the reader's saved
 * answers, and "something doesn't look right?" opens those answers beside it.
 * Every control in there writes to the same store this page renders from, so
 * changing one re-reasons the page immediately — on a wide screen the layout
 * makes room for the drawer rather than hiding behind it, so the reader can
 * watch their own change land.
 */
export default function CompareTab({
  cars,
  onSettings,
  onManagePins,
}: {
  cars: PinnedFinnCar[];
  onSettings: () => void;
  onManagePins: () => void;
}) {
  const loadSettings = useCompareStore((state) => state.loadSettings);
  const settingsLoaded = useCompareStore((state) => state.settingsLoaded);

  const [adjusting, setAdjusting] = useState(false);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  if (cars.length === 0) {
    return (
      <div className="min-h-screen bg-white px-4 py-12 text-center">
        <div className="mx-auto max-w-xl rounded-[28px] bg-finn-pale-blue p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-finn-accent-blue">
            <SparklesIcon className="h-7 w-7" />
          </div>

          <h1 className="mt-5 text-2xl font-black text-finn-black">
            Nothing to compare yet
          </h1>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-finn-iron">
            Pin a few cars on <FinnLink /> first. FINN Lens will
            automatically include every pinned car here.
          </p>
        </div>
      </div>
    );
  }

  const [onlyCar] = cars;

  if (cars.length === 1 && onlyCar) {
    return (
      <div className="min-h-screen bg-white px-4 py-12 text-center">
        <div className="mx-auto max-w-xl rounded-[28px] bg-finn-pale-blue p-8">
          <img
            src={onlyCar.images.thumbnail}
            alt={onlyCar.name}
            className="mx-auto h-32 w-52 rounded-2xl object-cover"
          />

          <h1 className="mt-5 text-2xl font-black text-finn-black">
            One car is pinned
          </h1>

          <p className="mt-2 text-sm leading-6 text-finn-iron">
            Keep browsing and pin another car. FINN Lens compares
            the full pinned set automatically — there is no
            separate selection step.
          </p>

          {/*
            * The one car can still be read on its own, which is the only
            * useful thing to offer someone who cannot compare yet.
            */}
          <button
            type="button"
            onClick={onManagePins}
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-finn-accent-blue px-5 text-xs font-black text-white shadow-sm transition hover:bg-finn-highlight-navy"
          >
            See how this one suits you
          </button>
        </div>
      </div>
    );
  }

  /*
   * Held until the saved answers have actually been read. A recommendation
   * built from the defaults, replaced a tick later by one built from the
   * reader's own settings, is a wrong answer shown confidently.
   */
  if (!settingsLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <span className="text-sm text-finn-iron">
          Reading your settings…
        </span>
      </div>
    );
  }

  return (
    <Tooltip.Provider delayDuration={350}>
      <main className="min-h-screen bg-white text-finn-black">
        {/*
          * The page makes room for the drawer where there is room to make.
          * Below that it stays put and the drawer comes over it, which is
          * why the drawer carries a scrim at those widths and not at these.
          */}
        <div
          className={[
            "transition-[padding] duration-300 ease-out",
            adjusting ? "lg:pr-108" : "",
          ].join(" ")}
        >
          <PageHeader>
            <NavButton
              icon={<AdjustmentsHorizontalIcon className="h-4 w-4" />}
              label="Adjust my answers"
              onClick={() => setAdjusting((was) => !was)}
              active={adjusting}
              expanded={adjusting}
            />

            <NavButton
              icon={<BookmarkIcon className="h-4 w-4" />}
              label="Pinned cars"
              onClick={onManagePins}
            />

            <NavButton
              icon={<Cog6ToothIcon className="h-4 w-4" />}
              label="Settings"
              onClick={onSettings}
            />
          </PageHeader>

          <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
            <Advice cars={cars} onAdjust={() => setAdjusting(true)} />
          </div>
        </div>

        <AdjustDrawer
          open={adjusting}
          onClose={() => setAdjusting(false)}
          onSettings={onSettings}
        />
      </main>
    </Tooltip.Provider>
  );
}
