import "@/assets/tailwind.css";
import { useEffect, useState } from "react";
import { Bookmark, Settings, SlidersHorizontal, Sparkles } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";

import type { PinnedFinnCar } from "@/lib/types";
import { FinnLink } from "@/components/FinnLink";
import { NavButton, PageHeader } from "@/components/PageHeader";

import { AdjustDrawer } from "./components/AdjustDrawer";
import { Advice } from "./advice";
import { Challenge } from "./advice/Challenge";
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

  /**
   * Which of the two readings is on screen.
   *
   * They used to be one page, and the trouble with that was not length but
   * subject: the recommendation argued for a car and the hot seat argued for
   * a different one, with a control halfway down deciding which the cost
   * section was currently about. The PDF settled it — the export flattened
   * both into a document that recommended and challenged at once, and a
   * reader sending it on could not say which car it was for.
   *
   * Local rather than in the store: which tab is open is not one of the
   * reader's answers and has no bearing on the reasoning. The *challenger*
   * they picked does live in the store, so crossing between tabs and back
   * finds the hot seat as they left it.
   */
  const [view, setView] = useState<"advice" | "challenge">("advice");

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
            Pin a few cars on <FinnLink /> first. Finn Lens will
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
            Keep browsing and pin another car. Finn Lens compares
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
          {/*
            * Two readings of one set of answers, and the tabs say which is
            * which before either is read. Above the page rather than inside
            * it, because they switch the whole subject — a control that
            * changed the page from under its own heading is what this split
            * was undoing.
            */}
          <div
            role="tablist"
            aria-label="Advice views"
            className="finn-lens-screen-only mb-6 inline-flex rounded-full bg-finn-cotton p-1"
          >
            <ViewTab
              id="advice"
              current={view}
              onSelect={setView}
              label="The recommendation"
            />

            <ViewTab
              id="challenge"
              current={view}
              onSelect={setView}
              label="Challenge it"
            />
          </div>

          {view === "advice" ? (
            <Advice cars={cars} onAdjust={() => setAdjusting(true)} />
          ) : (
            <Challenge cars={cars} onAdjust={() => setAdjusting(true)} />
          )}
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

/**
 * One of the two views, as a tab.
 *
 * `role="tab"` with `aria-selected` rather than two buttons that merely look
 * chosen: a reader on a screen reader is being told these are alternatives and
 * which one they are in, which is the whole content of the control.
 *
 * Hidden from the PDF along with every other control. Each view exports
 * itself, so a row of tabs in the file would be a picture of a choice the
 * reader has already made.
 */
function ViewTab({
  id,
  current,
  onSelect,
  label,
}: {
  id: "advice" | "challenge";
  current: "advice" | "challenge";
  onSelect: (view: "advice" | "challenge") => void;
  label: string;
}) {
  const selected = current === id;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={() => onSelect(id)}
      className={[
        "rounded-full px-4 py-2 text-xs font-black transition-colors",
        selected
          ? "bg-white text-finn-black shadow-sm"
          : "text-finn-iron hover:text-finn-black",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
