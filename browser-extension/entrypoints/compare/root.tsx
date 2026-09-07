import "@/assets/tailwind.css";
import { useEffect, useState } from "react";
import { Bookmark, Settings, SlidersHorizontal, Sparkles } from "lucide-react";
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
 * answers, and "something doesn't look right?" opens those answers over it in
 * a drawer. The drawer holds a draft and commits it in one act, so this page
 * re-reasons when the reader saves rather than on every keystroke inside it.
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
            <Sparkles aria-hidden="true" className="h-7 w-7" />
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
          * The page keeps its full width, and there is no wrapper around it
          * any more. It used to give up 27rem to the drawer, which squeezed
          * the advice into a column too narrow to read while the reader
          * worked in one too narrow to work in; the drawer overlays it now.
          */}
        <PageHeader>
          <NavButton
            icon={<SlidersHorizontal aria-hidden="true" className="h-4 w-4" />}
            label="Adjust my answers"
            onClick={() => setAdjusting((was) => !was)}
            active={adjusting}
            expanded={adjusting}
          />

          <NavButton
            icon={<Bookmark aria-hidden="true" className="h-4 w-4" />}
            label="Pinned cars"
            onClick={onManagePins}
          />

          <NavButton
            icon={<Settings aria-hidden="true" className="h-4 w-4" />}
            label="Settings"
            onClick={onSettings}
          />
        </PageHeader>

        <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <Advice cars={cars} onAdjust={() => setAdjusting(true)} />
        </div>

        <AdjustDrawer
          open={adjusting}
          onOpenChange={setAdjusting}
          onSettings={onSettings}
        />
      </main>
    </Tooltip.Provider>
  );
}
