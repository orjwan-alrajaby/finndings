import {
    ScaleIcon,
    DocumentArrowDownIcon,
    ArrowTopRightOnSquareIcon,
    EyeIcon,
} from "@heroicons/react/24/outline";
import * as RadixTabs from "@radix-ui/react-tabs";
import { ActionButton } from "./ActionButton";
import { CarPreviewCard } from "./CarPreviewCard";
import { FINN_BASE_URL } from "@/lib/constants";
import { calculateTimeAgo, sortAndSlicePinnedCars } from "@/lib/utils";
import type { PinnedFinnCar } from "@/lib/types";
import { openBrowserTab } from "../../utils";

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
                className="flex gap-1 p-1.5"
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
                                        key={car.name}
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
                        <button
                            onClick={() => openBrowserTab("OPEN_REVIEW_TAB")}
                            className={`mt-3 flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-xs font-bold text-white shadow-sm transition active:scale-[0.99] sm:col-span-2 ${accent
                                ? "bg-finn-accent-blue hover:bg-finn-highlight-navy"
                                : "bg-finn-black hover:bg-finn-black/90"
                                }`}
                        >
                            View all {pinnedCount} cars
                            <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                        </button>
                    </div>
                )}
            </RadixTabs.Content>

            {/* Actions tab */}
            <RadixTabs.Content value="actions" className="p-4 focus-visible:outline-none sm:p-5">
                <div className="space-y-2 sm:grid sm:grid-cols-1 sm:gap-2 sm:space-y-0">
                    <ActionButton
                        title="Review Pinned Cars"
                        description="Compare pricing and key details."
                        icon={<EyeIcon className="h-5 w-5" />}
                        disabled={!pinnedCount}
                        onClick={() => openBrowserTab("OPEN_REVIEW_TAB")}
                        accent={accent}
                    />
                    <ActionButton
                        title="Compare Pinned Cars"
                        description="Compare pricing and key details."
                        icon={<ScaleIcon className="h-5 w-5" />}
                        disabled={!pinnedCount}
                        onClick={() => openBrowserTab("OPEN_COMPARE_TAB")}
                        accent={accent}
                    />
                    <ActionButton
                        title="Download as PDF"
                        description="Export your selected vehicles."
                        icon={<DocumentArrowDownIcon className="h-5 w-5" />}
                        disabled={!pinnedCount}
                        onClick={() => openBrowserTab("OPEN_DOWNLOAD_AS_PDF_PAGE")}
                        accent={accent}
                    />
                </div>
            </RadixTabs.Content>
        </RadixTabs.Root>
    );
}

export default Tabs;