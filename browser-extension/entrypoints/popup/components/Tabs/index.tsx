import { Bookmark, Cog, ExternalLink, Scale } from "lucide-react";
import * as RadixTabs from "@radix-ui/react-tabs";
import { ActionButton } from "./ActionButton";
import { CarPreviewCard } from "./CarPreviewCard";
import { FINN_BASE_URL } from "@/lib/constants";
import {
    calculateTimeAgo,
    openBrowserTab,
    sortAndSlicePinnedCars,
} from "@/lib/utils";
import type { PinnedFinnCar } from "@/lib/types";

type TabsType = {
    pinnedCount: number;
    pinnedCars: Record<number, PinnedFinnCar>;
    accent?: boolean;
};

function Tabs({ pinnedCount, pinnedCars, accent }: TabsType) {
    return (
        <RadixTabs.Root
            defaultValue="pinned"
            className="mt-3 overflow-hidden rounded-[22px] bg-white shadow-sm"
        >
            <RadixTabs.List
                className={["flex gap-1 m-1.5 rounded-[22px]", accent ? "bg-finn-pale-blue" : "bg-finn-cotton"].join(" ")}
                aria-label="FINN Lens views"
            >
                {(["pinned", "actions"] as const).map((val) => (
                    <RadixTabs.Trigger
                        key={val}
                        value={val}
                        className={`
                            flex-1 rounded-full py-2 text-xs font-bold capitalize transition-all
                            text-finn-iron
                            hover:text-finn-black
                            ${accent ? "data-[state=inactive]:text-finn-accent-blue" : "data-[state=inactive]:text-finn-black"}
                            ${accent ? "data-[state=active]:bg-finn-accent-blue" : "data-[state=active]:bg-finn-black"}
                            data-[state=active]:text-white
                            data-[state=active]:shadow-sm
                            focus-visible:outline-none focus-visible:ring-2
                            ${accent ? "focus-visible:ring-finn-accent-blue/30" : "focus-visible:ring-finn-black/30"}
                        `}
                    >
                        {val === "pinned" ? `Pinned (${pinnedCount})` : "Actions"}
                    </RadixTabs.Trigger>
                ))}
            </RadixTabs.List>

            <div className="border-t border-dashed border-finn-cotton" />

            <RadixTabs.Content value="pinned" className="p-4 focus-visible:outline-none sm:p-5">
                {pinnedCount == 0 ? (
                    <div className="rounded-[18px] bg-finn-cotton px-4 py-7 text-center">
                        <p className="text-sm font-bold text-finn-black">No cars pinned yet</p>
                        <p className="mt-1.5 text-xs leading-5 text-finn-iron">
                            Browse{" "}
                            <a href={FINN_BASE_URL} target="_blank" rel="noopener noreferrer" className="text-finn-accent-blue underline underline-offset-2">
                                finn.com
                            </a>{" "}
                            and pin cars to review them here.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
                        {sortAndSlicePinnedCars(pinnedCars)?.slice(0, 3)
                            .map((car) => {
                                return (
                                    <CarPreviewCard
                                        /*
                                         * The config id, not the name. Two
                                         * configurations of one model share a
                                         * name — "BYD Dolphin" is both of them
                                         * — so keying on it collapses them to
                                         * one row and leaves React reusing the
                                         * wrong card when the set changes.
                                         */
                                        key={car.id}
                                        name={car.name}
                                        price={car.pricing?.customerMonthly?.price}
                                        url={car?.url}
                                        imgUrl={car?.images?.thumbnail}
                                        period={"month"}
                                        pinnedAt={calculateTimeAgo(car.pinnedAt)}
                                        accent={accent}
                                    />
                                )
                            })
                        }
                        {/*
                          * The pinned-cars page, not Compare. The popup shows
                          * three of the set; "view all" means see the set —
                          * which is a different request from "rank them", and
                          * the only one of the two that also lets the reader
                          * remove something.
                          */}
                        <button
                            type="button"
                            onClick={() => openBrowserTab("OPEN_PINS_PAGE")}
                            className={`mt-3 flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-xs font-bold text-white shadow-sm transition active:scale-[0.99] sm:col-span-2 ${accent
                                ? "bg-finn-accent-blue hover:bg-finn-highlight-navy"
                                : "bg-finn-black hover:bg-finn-black/90"
                                }`}
                        >
                            View all {pinnedCount} cars
                            <ExternalLink className="h-3 w-3" />
                        </button>
                    </div>
                )}
            </RadixTabs.Content>
            <RadixTabs.Content value="actions" className="p-4 focus-visible:outline-none sm:p-5">
                <div className="space-y-2 sm:grid sm:grid-cols-1 sm:gap-2 sm:space-y-0">
                    {/*
                      * Named for what the page now does rather than for the
                      * work it used to ask for. There is no comparison to
                      * walk through any more: with two cars pinned Lens has
                      * everything it needs, so the button offers the answer.
                      *
                      * Two, not one, because that is the point at which the
                      * label stops being a promise — a single pinned car
                      * lands on "pin another one", which is not a
                      * recommendation.
                      */}
                    <ActionButton
                        title="See my recommendation"
                        description={
                            pinnedCount === 1
                                ? "Pin one more car and Lens can rank them for you."
                                : "One car, the reasons for it, and what it really costs."
                        }
                        icon={<Scale className="h-5 w-5" />}
                        disabled={pinnedCount < 2}
                        onClick={() => openBrowserTab("OPEN_COMPARE_PAGE")}
                        accent={accent}
                    />
                    <ActionButton
                        title="Manage Pinned Cars"
                        description="See everything you pinned, read how each one suits you, and unpin what you're done with."
                        icon={<Bookmark className="h-5 w-5" />}
                        disabled={!pinnedCount}
                        onClick={() => openBrowserTab("OPEN_PINS_PAGE")}
                        accent={accent}
                    />
                    <ActionButton
                        title="Go To Settings"
                        description="Set your priorities, what counts inside each one, and your driving assumptions."
                        icon={<Cog className="h-5 w-5" />}
                        /*
                         * Never gated on pinned cars. Settings is where a reader
                         * tells Lens what they care about, and it is what the
                         * in-page badges and panel read — both of which stay
                         * silent until it has been filled in. Requiring a pinned
                         * car first made the one screen that unlocks the product
                         * the last one you could reach.
                         */
                        onClick={() => openBrowserTab("OPEN_SETTINGS_PAGE")}
                        accent={accent}
                    />
                </div>
            </RadixTabs.Content>
        </RadixTabs.Root>
    );
}

export default Tabs;