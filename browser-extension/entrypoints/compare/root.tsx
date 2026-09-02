import "@/assets/tailwind.css";
import { useEffect } from "react";
import {
  Cog6ToothIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import * as Tooltip from "@radix-ui/react-tooltip";

import type { PinnedFinnCar } from "@/lib/types";

import { Launch } from "./components/Launch";
import { Stepper } from "./components/Stepper";
import { StepOnePrioritiesStep } from "./steps/StepOnePriorities";
import { StepTwoSetPreferences } from "./steps/StepTwoSetPreferences";
import { StepThreeSetAssumptions } from "./steps/StepThreeSetAssumptions";
import { StepFourGenerateAdvice } from "./steps/StepFourGenerateAdvice";
import { useCompareStore } from "./store";

/**
 * The compare flow.
 *
 * Every answer the reader gives lives in the compare store rather than in
 * the step that asks for it, so the four steps are a view onto one set of
 * answers instead of a form that has to be filled in front to back. That is
 * what lets the stepper walk backwards and forwards freely: a step that is
 * re-entered redraws what the reader left there, down to which card was
 * open and which car was in the hot seat.
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
  const step = useCompareStore((state) => state.step);
  const loadSettings = useCompareStore((state) => state.loadSettings);

  const settingsLoaded = useCompareStore((state) => state.settingsLoaded);
  const hasSavedSetup = useCompareStore((state) => state.hasSavedSetup);
  const started = useCompareStore((state) => state.started);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  /*
   * A reader with saved answers is offered them rather than asked for them
   * again. Held until the settings have actually been read, so the launch
   * screen never shows an order that is about to be replaced by the stored
   * one a tick later.
   */
  const showLaunch = settingsLoaded && hasSavedSetup && !started;

  if (cars.length === 0) {
    return (
      <div className="min-h-screen bg-finn-snow px-4 py-12 text-center">
        <div className="mx-auto max-w-xl rounded-[28px] bg-white p-8 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-finn-pale-blue text-finn-accent-blue">
            <SparklesIcon className="h-7 w-7" />
          </div>

          <h1 className="mt-5 text-2xl font-black text-finn-black">
            Nothing to compare yet
          </h1>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-finn-iron">
            Pin a few cars on finn.com first. FINN Lens will
            automatically include every pinned car here.
          </p>
        </div>
      </div>
    );
  }

  const [onlyCar] = cars;

  if (cars.length === 1 && onlyCar) {
    return (
      <div className="min-h-screen bg-finn-snow px-4 py-12 text-center">
        <div className="mx-auto max-w-xl rounded-[28px] bg-white p-8 shadow-sm">
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

  return (
    <Tooltip.Provider delayDuration={350}>
      <main className="min-h-screen bg-finn-snow text-finn-black">
        <div className="mx-auto w-full max-w-370">
          <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-finn-cotton/70 bg-finn-snow/90 px-4 py-4 backdrop-blur-md sm:px-6 lg:px-10">
            <div />

            {showLaunch ? <div /> : <Stepper />}

            <button
              type="button"
              onClick={onSettings}
              className="flex items-center gap-2 rounded-full bg-white p-2.5 font-semibold text-finn-iron shadow-sm transition-colors hover:text-finn-black"
              aria-label="Settings"
            >
              <Cog6ToothIcon className="h-4 w-4" />
              <span>Settings</span>
            </button>
          </header>

          <div className="px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-12">
            <div className="mx-auto flex max-w-6xl items-center justify-center">
              {showLaunch && (
                <Launch
                  carCount={cars.length}
                  onSettings={onSettings}
                  onManagePins={onManagePins}
                />
              )}

              {!showLaunch && step === "priorities" && (
                <StepOnePrioritiesStep onSettings={onSettings} />
              )}

              {!showLaunch && step === "preferences" && (
                <StepTwoSetPreferences />
              )}

              {!showLaunch && step === "assumptions" && (
                <StepThreeSetAssumptions />
              )}

              {!showLaunch && step === "advice" && (
                <StepFourGenerateAdvice
                  cars={cars}
                  onSettings={onSettings}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </Tooltip.Provider>
  );
}
