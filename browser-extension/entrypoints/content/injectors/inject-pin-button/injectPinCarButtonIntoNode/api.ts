import type { FinnApiConfig } from "@/lib/types";
import type { PageContext } from "./page-context";

export type FinnCarsResponse = {
  offset: number;
  results: FinnApiConfig[];
  total_results: number;
};

type LoadCarsParams = PageContext & {
  anchorElement: HTMLElement;
  carConfigId: number;
};

async function finnFetch<T = any>(path: string): Promise<T> {
  const response = await fetch(`https://www.finn.com${path}`, {
    credentials: "include",
    headers: {
      "x-finn-actor": "ua_frontend",
      "x-language-tag": document.documentElement.lang || "de-DE",
    },
  });

  if (!response.ok) {
    throw new Error(`FINN API returned ${response.status}`);
  }

  return response.json();
}

export async function loadCarsFromFinnApi({
  isHomePage,
  isListingsPage,
  isDetailsPage,
  anchorElementIsAListItem,
  anchorElementIsAConfigCardItem,
  carConfigId,
}: LoadCarsParams): Promise<FinnCarsResponse> {
  const onDetailsPage = Boolean(isDetailsPage);

  if ((isHomePage || isListingsPage) && anchorElementIsAListItem) {
    return finnFetch<FinnCarsResponse>(
      "/api/cars?group_by=brand-model&hide_related=true&limit=20&pricing_type=downpayment&view=available_cars"
    );
  }

  // Swapping to a specific config from a list item shown on the details page.
  if (onDetailsPage && anchorElementIsAListItem) {
    return finnFetch<FinnCarsResponse>(
      `/api/cars?group_by=brand-model&hide_related=true&limit=20&pricing_type=downpayment&swap_config_id=${carConfigId}&view=available_cars`
    );
  }

  if (onDetailsPage && anchorElementIsAConfigCardItem) {
    // Config comparison cards only show trim/spec text, not the full car
    // name — so brand/model must come from the details page's own <h1>,
    // not from the card that was clicked.
    const title = isDetailsPage?.querySelector("h1")?.textContent?.trim() ?? "";
    if (!title) {
      throw new Error("Couldn't determine car name.");
    }

    const [brand, ...modelParts] = title.split(" ");

    return finnFetch<FinnCarsResponse>(
      `/api/cars?brands=${encodeURIComponent(brand ?? "")}&hide_related=true&limit=50&models=${encodeURIComponent(
        modelParts.join(" ")
      )}&pricing_type=downpayment&view=available_cars`
    );
  }

  throw new Error("Couldn't determine which FINN API endpoint to call.");
}