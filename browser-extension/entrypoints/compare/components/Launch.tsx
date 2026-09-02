import {
    AdjustmentsHorizontalIcon,
    ArrowRightIcon,
    BoltIcon,
    BookmarkIcon,
    Cog6ToothIcon,
    PencilSquareIcon,
} from "@heroicons/react/24/outline";

import { CATEGORIES } from "@/lib/reasoning-engine/constants";
import { useCompareStore } from "../store";

/**
 * What a reader who has already answered sees instead of the questions.
 *
 * The compare flow used to open on step 1 for everybody, which meant the
 * price of looking at a recommendation was walking back through a setup you
 * finished weeks ago — every time, for the rest of the product's life. That
 * is the wrong trade: the answers are saved, they are the same answers, and
 * re-asking them teaches the reader that the product does not remember.
 *
 * So the setup is shown rather than asked. The reader sees exactly what Lens
 * is about to reason with — their order, their picks, their budget — and
 * either takes it or goes and changes it. Both paths lead into the same four
 * steps; this only decides where they enter.
 *
 * Shown only to someone with saved answers. A first-time reader has nothing
 * to review, so they get step 1 and this never appears.
 */
export function Launch({
    carCount,
    onSettings,
    onManagePins,
}: {
    carCount: number;
    onSettings: () => void;
    onManagePins: () => void;
}) {
    const priorities = useCompareStore((state) => state.priorities);
    const features = useCompareStore((state) => state.features);
    const preferences = useCompareStore((state) => state.preferences);

    const startFromSaved = useCompareStore((state) => state.startFromSaved);
    const startFromStepOne = useCompareStore(
        (state) => state.startFromStepOne,
    );

    const raised = priorities.reduce(
        (total, categoryId) => total + (features[categoryId]?.length ?? 0),
        0,
    );

    return (
        <div className="w-full max-w-3xl">
            <div className="text-center">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-finn-accent-blue">
                    Ready when you are
                </p>

                <h1 className="mt-3 text-3xl font-black tracking-tight text-finn-black sm:text-4xl">
                    {carCount} pinned cars, ranked your way
                </h1>

                <button
                    type="button"
                    onClick={onManagePins}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-finn-accent-blue underline-offset-2 transition hover:underline"
                >
                    <BookmarkIcon className="h-3.5 w-3.5" />
                    See or change what's pinned
                </button>

                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-finn-iron">
                    Lens already has your answers — you don't have to give them
                    again. Here's what it's about to reason with.
                </p>
            </div>

            <section className="mt-7 rounded-[28px] bg-white p-5 shadow-sm sm:p-6">
                <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.14em] text-finn-iron">
                    <AdjustmentsHorizontalIcon className="h-3.5 w-3.5" />
                    Your priority order
                </p>

                <ol className="mt-3 flex flex-wrap gap-2">
                    {priorities.map((categoryId, index) => (
                        <li
                            key={categoryId}
                            className="inline-flex items-center gap-1.5 rounded-full bg-finn-snow px-3 py-1.5 text-[11px] font-bold text-finn-black"
                        >
                            <span
                                className={[
                                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black text-white",
                                    index === 0
                                        ? "bg-finn-accent-blue"
                                        : "bg-finn-accent-blue/70",
                                ].join(" ")}
                            >
                                {index + 1}
                            </span>

                            <span aria-hidden="true">
                                {CATEGORIES[categoryId]?.icon ?? "•"}
                            </span>

                            {CATEGORIES[categoryId]?.label ?? categoryId}
                        </li>
                    ))}
                </ol>

                <dl className="mt-5 grid gap-3 border-t border-finn-cotton pt-4 sm:grid-cols-3">
                    <Fact
                        label="Features raised"
                        value={
                            raised === 0
                                ? "None"
                                : `${raised} across your priorities`
                        }
                        detail={
                            raised === 0
                                ? "Each category judged as a whole"
                                : "Counting for extra influence"
                        }
                    />

                    <Fact
                        label="Monthly budget"
                        value={
                            preferences.monthlyBudget > 0
                                ? `€${preferences.monthlyBudget}`
                                : "No limit"
                        }
                        detail={
                            preferences.monthlyBudget > 0
                                ? "Total, including running costs"
                                : "Every pinned car is eligible"
                        }
                    />

                    <Fact
                        label="You drive"
                        value={`${preferences.monthlyKm} km/month`}
                        detail={`${preferences.contractType === "business" ? "Business" : "Private"} contract prices`}
                    />
                </dl>
            </section>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                    type="button"
                    onClick={startFromSaved}
                    className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-finn-accent-blue text-sm font-black text-white shadow-md transition hover:bg-finn-highlight-navy"
                >
                    <BoltIcon className="h-4 w-4" />
                    See my advice
                    <ArrowRightIcon className="h-4 w-4" />
                </button>

                <button
                    type="button"
                    onClick={startFromStepOne}
                    className="flex h-14 items-center justify-center gap-2 rounded-full border-2 border-finn-cotton px-6 text-sm font-bold text-finn-black transition hover:bg-white"
                >
                    <PencilSquareIcon className="h-4 w-4" />
                    Change something first
                </button>
            </div>

            <p className="mt-4 text-center text-[11px] leading-4 text-finn-iron">
                Changing something here applies to this comparison only — your
                saved answers stay as they are, apart from the priority order,
                which Lens keeps.{" "}
                <button
                    type="button"
                    onClick={onSettings}
                    className="inline-flex items-center gap-1 font-bold text-finn-accent-blue underline-offset-2 transition hover:underline"
                >
                    <Cog6ToothIcon className="h-3 w-3" />
                    Edit your saved settings
                </button>
            </p>
        </div>
    );
}

function Fact({
    label,
    value,
    detail,
}: {
    label: string;
    value: string;
    detail: string;
}) {
    return (
        <div>
            <dt className="text-[10px] font-black uppercase tracking-wide text-finn-iron">
                {label}
            </dt>

            <dd className="mt-1 text-sm font-black text-finn-black">
                {value}
            </dd>

            <dd className="mt-0.5 text-[11px] leading-4 text-finn-iron">
                {detail}
            </dd>
        </div>
    );
}
