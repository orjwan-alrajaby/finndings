import "@/assets/tailwind.css";
import { useEffect, useState } from "react";
import {
  Cog6ToothIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import * as Tooltip from "@radix-ui/react-tooltip";

import type { PinnedFinnCar } from "@/lib/types";

import {
  DEFAULT_CATEGORY_FEATURES,
  DEFAULT_PREFERENCES,
  DEFAULT_PRIORITIES,
  DEFAULT_PROFILES,
} from "@/lib/reasoning-engine/constants";

import {
  loadLensSettings,
  saveLensSettings,
} from "@/lib/reasoning-engine";

import type {
  CategoryId,
  FeatureWeight,
  LensPreferences,
} from "@/lib/reasoning-engine/types";

import { Stepper } from "./components/Stepper";
import { StepOneChoosePrioritiesStep } from "./steps/StepOneChoosePriorities";
import { StepTwoOrderPrioritiesStep } from "./steps/StepTwoOrderPriorities";
import type { CompareStep } from "./types";
import { StepThreeSetPreferences } from "./steps/StepThreeSetPreferences";
import { StepFourGenerateAdvice } from "./steps/StepFourGenerateAdvice";

export default function CompareTab({
  cars,
  onAdvice,
  onSettings,
}: {
  cars: PinnedFinnCar[];
  onAdvice: () => void;
  onSettings: () => void;
}) {
  const [step, setStep] =
    useState<CompareStep>("priorities");

  const [priorities, setPriorities] =
    useState<CategoryId[]>(DEFAULT_PRIORITIES);

  const [preferences, setPreferences] =
    useState<LensPreferences>(DEFAULT_PREFERENCES);

  const [profiles, setProfiles] =
    useState(DEFAULT_PROFILES);

  const [categoryFeatures, setCategoryFeatures] =
    useState<Record<CategoryId, FeatureWeight[]>>(
      DEFAULT_CATEGORY_FEATURES,
    );

  useEffect(() => {
    loadLensSettings().then((settings) => {
      setPreferences(settings.preferences);
      setPriorities(settings.priorities);
      setProfiles(settings.profiles);
      setCategoryFeatures(
        settings.categoryFeatures,
      );
    });
  }, []);

  const saveAnd = async (
    nextStep?: CompareStep,
    features = categoryFeatures,
  ) => {
    await saveLensSettings({
      preferences,
      priorities,
      profiles,
      categoryFeatures: features,
    });

    if (nextStep) {
      setStep(nextStep);
    } else {
      onAdvice();
    }
  };

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
        </div>
      </div>
    );
  }

  const completedStepsByStep: Record<CompareStep, CompareStep[]> = {
    priorities: [],
    order: ["priorities"],
    preferences: ["priorities", "order"],
    advice: ["priorities", "order", "preferences"],
  };

  const completedSteps = completedStepsByStep[step];

  return (
    <Tooltip.Provider delayDuration={350}>
      <main className="min-h-screen bg-finn-snow text-finn-black">
        <div className="mx-auto w-full max-w-370">
          <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-finn-cotton/70 bg-finn-snow/90 px-4 py-4 backdrop-blur-md sm:px-6 lg:px-10">
            <div />

            <Stepper
              current={step}
              onGoTo={setStep}
              completed={
                new Set(completedSteps)
              }
            />

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
              {step === "priorities" && (
                <StepOneChoosePrioritiesStep
                  priorities={priorities}
                  setPriorities={
                    setPriorities
                  }
                  profiles={profiles}
                  onNext={() =>
                    setStep("order")
                  }
                  onSettings={onSettings}
                  categoryFeatures={
                    categoryFeatures
                  }
                />
              )}

              {step === "order" && (
                <StepTwoOrderPrioritiesStep
                  priorities={priorities}
                  setPriorities={
                    setPriorities
                  }
                  categoryFeatures={
                    categoryFeatures
                  }
                  onBack={() =>
                    setStep("priorities")
                  }
                  onNext={() =>
                    saveAnd("preferences")
                  }
                />
              )}

              {step === "preferences" && (
                <StepThreeSetPreferences
                  priorities={priorities}
                  preferences={preferences}
                  setPreferences={
                    setPreferences
                  }
                  categoryFeatures={
                    categoryFeatures
                  }
                  onBack={() =>
                    setStep("order")
                  }
                  onAdvice={(
                    nextCategoryFeatures,
                  ) => {
                    const merged = {
                      ...categoryFeatures,
                      ...nextCategoryFeatures,
                    };

                    setCategoryFeatures(merged);
                    void saveAnd("advice", merged);
                  }}
                />
              )}

              {step === "advice" && (
                <StepFourGenerateAdvice
                  cars={cars}
                  priorities={priorities}
                  preferences={preferences}
                  categoryFeatures={
                    categoryFeatures
                  }
                  onBack={() =>
                    setStep("preferences")
                  }
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