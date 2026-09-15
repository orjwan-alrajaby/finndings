import "@/assets/tailwind.css";
import { useEffect, useState } from "react";
import type { PinnedFinnCar } from "@/lib/types";
import CompareTab from "./root";
import { openBrowserTab } from "@/lib/utils";

async function getPinnedCars(): Promise<PinnedFinnCar[]> {
  const stored = await browser.storage.local.get("pinnedCars");
  const value = stored.pinnedCars as
    | Record<number, PinnedFinnCar>
    | undefined;

  return value ? Object.values(value) : [];
}

export default function ReviewOrCompare() {
  /*
   * null, not an empty array, until storage has answered. Starting empty
   * meant every visit opened on "Nothing to compare yet" for a frame or
   * two before the pinned cars arrived — the page telling the reader they
   * had pinned nothing, and then contradicting itself.
   */
  const [cars, setCars] = useState<PinnedFinnCar[] | null>(null);

  const refreshCars = async () => {
    const pinnedCars = await getPinnedCars();
    setCars(pinnedCars)
  };

  useEffect(() => {
    void refreshCars();

    const listener = (message: { type?: string }) => {
      if (
        message.type === "PINNED_CARS_UPDATED" ||
        message.type === "CARDS_LOADED"
      ) {
        void refreshCars();
      }
    };

    browser.runtime.onMessage.addListener(listener);

    return () => {
      browser.runtime.onMessage.removeListener(listener);
    };
  }, []);

  /*
   * No wrapper element of its own. This used to render a `<main>` around the
   * page, which already draws one — two nested `<main>`s, so a screen reader
   * asked for the page's main landmark got a choice of two. The shell, the
   * bar and the ground all belong to `CompareTab`, in one place, the way the
   * pinned-cars and settings pages have theirs.
   */
  return (
    <CompareTab
      cars={cars}
      onSettings={() => openBrowserTab("OPEN_SETTINGS_PAGE")}
      onReadCar={(carId) => openBrowserTab("OPEN_PINS_PAGE", { carId })}
    />
  );
}