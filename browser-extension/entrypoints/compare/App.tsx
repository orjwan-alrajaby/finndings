import "@/assets/tailwind.css";
import { useEffect, useState } from "react";
import type { PinnedFinnCar } from "@/lib/types";
import CompareTab from "./root";
import { openBrowserTab } from "../popup/utils";

async function getPinnedCars(): Promise<PinnedFinnCar[]> {
  const stored = await browser.storage.local.get("pinnedCars");
  const value = stored.pinnedCars as
    | Record<number, PinnedFinnCar>
    | undefined;

  return value ? Object.values(value) : [];
}

export default function ReviewOrCompare() {
  const [cars, setCars] = useState<PinnedFinnCar[]>([]);

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

  return (
    <main className="min-h-screen bg-finn-snow">
      <CompareTab
        cars={cars}
        onSettings={() => openBrowserTab("OPEN_SETTINGS_PAGE")}
        onManagePins={() => openBrowserTab("OPEN_PINS_PAGE")}
      />
    </main>
  );
}