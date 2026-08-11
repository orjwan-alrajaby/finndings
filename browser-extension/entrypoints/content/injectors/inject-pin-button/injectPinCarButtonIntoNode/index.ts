import { createAddButton, setPinButtonPinnedState } from "../../../creators/PinButton";
import { getPageContext, resolveCarConfigId } from "./page-context";
import { loadCarsFromFinnApi } from "./api";
import { updatePinnedCars, mergeLoadedCars, getPinnedCars, getLoadedCars } from "./storage";
import { buildCarUrl, showToast } from "./utils";
import { mapFinnConfigToAll } from "../../../manipulateApiData";
import type { FinnCar } from "@/lib/types";

let pinQueue = Promise.resolve();

async function handlePinButtonClick(
  event: MouseEvent,
  anchorElement: HTMLElement,
  button: HTMLButtonElement
) {
  pinQueue = pinQueue.then(() => doHandlePinButtonClick(event, anchorElement, button));
  return pinQueue;
}

async function doHandlePinButtonClick(
  event: MouseEvent,
  anchorElement: HTMLElement,
  button: HTMLButtonElement
) {
  event.preventDefault();
  event.stopPropagation();

  const context = getPageContext(anchorElement);
  const carConfigId = resolveCarConfigId(anchorElement, context);

  if (!carConfigId) {
    showToast("Couldn't determine which car to pin.", "error", null);
    return;
  }

  const carUrl = context.isDetailsPage
    ? window.location.href
    : anchorElement.querySelector<HTMLAnchorElement>("h3 a[href]")?.href ?? "";

  let carDetails: FinnCar | null = null;

  try {
    carDetails = (await getLoadedCars())[carConfigId] ?? null;

    if (!carDetails) {
      const response = await loadCarsFromFinnApi({ ...context, anchorElement, carConfigId });
      const formattedRes = mapFinnConfigToAll(response.results) ?? {};

      await mergeLoadedCars(formattedRes);

      carDetails =
        formattedRes[carConfigId] ??
        Object.values(formattedRes).find((car) => car.id === carConfigId) ??
        null;

      if (!carDetails) {
        throw new Error(`No car found for config ID ${carConfigId}`);
      }
    }

    const { wasPinned } = await updatePinnedCars(carConfigId, {
      ...carDetails,
      url: buildCarUrl(carUrl, carConfigId),
    });

    setPinButtonPinnedState(button, !wasPinned);
    showToast(
      wasPinned ? `Unpinned:` : `Pinned:`,
      wasPinned ? "info" : "success",
      {
        name: carDetails.name,
        engine: carDetails.engine,
        trim: carDetails.trim ?? "",
        equipmentLine: carDetails.equipmentLine ?? "",
      }
    );
  } catch (error) {
    console.error("Failed to pin/unpin car:", error);
    showToast(
      "Something went wrong while pinning this car.",
      "error",
      carDetails
        ? {
            name: carDetails.name,
            engine: carDetails.engine,
            trim: carDetails.trim ?? "",
            equipmentLine: carDetails.equipmentLine ?? "",
          }
        : null
    );
  }
}

async function syncInitialPinnedState(anchorElement: HTMLElement, button: HTMLButtonElement) {
  const context = getPageContext(anchorElement);
  const carConfigId = resolveCarConfigId(anchorElement, context);
  if (!carConfigId) return;

  const pinnedCars = await getPinnedCars();
  if (pinnedCars[carConfigId]) {
    setPinButtonPinnedState(button, true);
  }
}

export function injectPinCarButtonIntoNode(anchorElement: HTMLElement): HTMLButtonElement | null {
  const existingButton = anchorElement.querySelector<HTMLButtonElement>(".finn-lens-add-car-btn");
  if (existingButton) return null;

  anchorElement.classList.add("relative");

  const button = createAddButton();
  const context = getPageContext(anchorElement);

  button.addEventListener("click", (event) =>
    handlePinButtonClick(event, anchorElement, button)
  );

  if (context.anchorElementIsAConfigCardItem) {
    const carCardTopHalf = anchorElement.querySelector<HTMLDivElement>(":scope > div:first-child.relative");
    carCardTopHalf?.appendChild(button);
  } else {
    anchorElement.appendChild(button);
  }

  syncInitialPinnedState(anchorElement, button);

  return button;
}