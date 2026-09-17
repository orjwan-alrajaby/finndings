import type { ConversationScope, ScopeKind } from "@/lib/lens-ai/contract";
import type { PageContext } from "@/lib/lens-chat/messages";
import type { FinnCar, PinnedFinnCar } from "@/lib/types";
import { configurationName } from "@/lib/car-labels";

/**
 * What the chat can be talking about, kept strictly apart.
 *
 * - **Cars on this page** — cards finn.com has drawn here *and* whose data
 *   reached Lens. A card whose data hasn't arrived is counted, and said, but
 *   never scored on a guess.
 * - **My pinned cars** — the set the reader chose. Nothing the chat does adds
 *   to it except the reader pressing Pin.
 * - **This car** — on a details page, the configuration it is about.
 *
 * Every scope is a temporary candidate set: the engine runs over it and
 * nothing is written anywhere.
 */

export interface Scope {
    kind: ScopeKind;
    label: string;
    /** "Comparing 12 cars on this page". */
    headline: string;
    /** For the model and the fine print: exactly what Lens has, and hasn't. */
    description: string;
    cars: PinnedFinnCar[];
    /** Cards on the page Lens has no data for yet. Page scope only. */
    missing: number;
}

export interface StoredCars {
    pinned: Record<number, PinnedFinnCar>;
    loaded: Record<number, FinnCar>;
}

export async function readStoredCars(): Promise<StoredCars> {
    const stored = await browser.storage.local.get(["pinnedCars", "loadedCarsFromFinnApi"]);

    const pinned = (stored.pinnedCars ?? {}) as Record<number, PinnedFinnCar>;
    const loaded = ((stored.loadedCarsFromFinnApi as { cars?: Record<number, FinnCar> } | undefined)
        ?.cars ?? {}) as Record<number, FinnCar>;

    return { pinned, loaded };
}

function withUrl(url: string, id: number): string {
    try {
        const next = new URL(url);
        next.searchParams.set("selected_config", String(id));
        return next.toString();
    } catch {
        return url;
    }
}

/** A car the engine can take: the pinned copy when there is one, else the cached one. */
function evaluatable(id: number, stored: StoredCars, page: PageContext | null): PinnedFinnCar | null {
    const pinned = stored.pinned[id];
    if (pinned) return pinned;

    const car = stored.loaded[id];
    if (!car) return null;

    return {
        ...car,
        url: page?.carUrls[id] ?? (page ? withUrl(page.url, id) : ""),
        pinnedAt: "",
    };
}

const plural = (count: number, one: string, many = `${one}s`) =>
    `${count} ${count === 1 ? one : many}`;

export function buildScopes(page: PageContext | null, stored: StoredCars): Record<ScopeKind, Scope> {
    const pageIds = page?.pageCarIds ?? [];
    const pageCars = pageIds
        .map((id) => evaluatable(id, stored, page))
        .filter((car): car is PinnedFinnCar => car != null);
    const missing = pageIds.length - pageCars.length;

    const pinnedCars = Object.values(stored.pinned).sort(
        (a, b) => Date.parse(b.pinnedAt) - Date.parse(a.pinnedAt),
    );

    const current =
        page?.currentCarId != null ? evaluatable(page.currentCarId, stored, page) : null;

    return {
        page: {
            kind: "page",
            label: "Cars on this page",
            headline: pageCars.length
                ? `Comparing ${plural(pageCars.length, "car")} on this page`
                : "No cars on this page have reached Lens yet",
            description: `the ${plural(pageCars.length, "configuration")} on this finn.com page that Lens has data for${
                missing > 0 ? ` (${missing} more on the page haven't reached Lens yet and aren't included)` : ""
            } — not every car FINN offers`,
            cars: pageCars,
            missing,
        },
        pinned: {
            kind: "pinned",
            label: "My pinned cars",
            headline: pinnedCars.length
                ? `Comparing your ${plural(pinnedCars.length, "pinned car")}`
                : "You haven't pinned any cars",
            description: `the ${plural(pinnedCars.length, "car")} the reader pinned`,
            cars: pinnedCars,
            missing: 0,
        },
        thisCar: {
            kind: "thisCar",
            label: "This car",
            headline: current ? `Looking at ${current.name} ${configurationName(current)}` : "No single car on this page",
            description: current
                ? `only the configuration the reader is looking at: ${current.name} ${configurationName(current)}${
                      page?.currentFromUrl ? "" : " (the first configuration this page lists)"
                  }`
                : "no single configuration",
            cars: current ? [current] : [],
            missing: 0,
        },
    };
}

/** The scope a conversation starts in: this car on a car's page, else the page. */
export function defaultScope(page: PageContext | null, scopes: Record<ScopeKind, Scope>): ScopeKind {
    if (page?.kind === "details" && scopes.thisCar.cars.length) return "thisCar";
    if (scopes.page.cars.length) return "page";
    if (scopes.pinned.cars.length) return "pinned";
    return "page";
}

/** The scopes as the model is told about them. */
export function conversationScope(current: ScopeKind, scopes: Record<ScopeKind, Scope>): ConversationScope {
    return {
        current,
        available: (Object.values(scopes) as Scope[]).map((scope) => ({
            kind: scope.kind,
            description: scope.description,
            count: scope.cars.length,
        })),
    };
}
