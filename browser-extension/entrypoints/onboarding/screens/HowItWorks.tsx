import {
    ArrowLeftIcon,
    ArrowRightIcon,
    BookmarkIcon,
    ChatBubbleBottomCenterTextIcon,
    QueueListIcon,
} from "@heroicons/react/24/outline";
import type { ReactNode } from "react";

import { withFinnLinks } from "@/components/FinnLink";

/**
 * The mental model, in three parts, before anything is asked of the reader.
 *
 * Not a UI tour. Tours point at buttons the reader cannot see yet and are
 * forgotten by the time they can; what survives is knowing what the product
 * *does*, which is what makes the buttons findable later. So: you mark cars,
 * Lens ranks them against an order you set, and it explains the answer
 * including what it costs you. Three sentences, and the rest of the flow
 * fills in the second one.
 */
export function HowItWorks({
    onBack,
    onNext,
}: {
    onBack: () => void;
    onNext: () => void;
}) {
    return (
        <div>
            <div className="text-center">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-finn-accent-blue">
                    How it works
                </p>

                <h1 className="mx-auto mt-3 max-w-2xl text-3xl font-black leading-tight tracking-tight text-finn-black sm:text-4xl">
                    Three moving parts, and you only supply one
                </h1>

                <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-finn-iron">
                    You mark the cars you're weighing up. Lens ranks them
                    against an order you set once. Then it argues the result
                    back to you in your own terms.
                </p>
            </div>

            <ol className="mt-9 grid gap-4 md:grid-cols-3">
                <Step
                    index={1}
                    icon={<BookmarkIcon className="h-5 w-5" />}
                    title="Pin, while you browse"
                    body={withFinnLinks(
                        "Lens adds a pin button to every car on finn.com. Pin the ones you're weighing up — as many as you like, over as many visits as you like.",
                    )}
                    aside="Nothing is compared until you have at least two."
                />

                <Step
                    index={2}
                    icon={<QueueListIcon className="h-5 w-5" />}
                    title="Rank, against your order"
                    body="You tell Lens what matters — safety, space, running costs — and in what order. Every pinned car is scored against that order, and the top one is the recommendation."
                    aside="This is the part you set up next."
                    highlight
                />

                <Step
                    index={3}
                    icon={
                        <ChatBubbleBottomCenterTextIcon className="h-5 w-5" />
                    }
                    title="Explain, in your terms"
                    body="You get one recommendation, the reasons for it, what you give up by taking it, and what it really costs a month — subscription plus energy plus excess mileage."
                    aside="Every claim traces to your order and FINN's data."
                />
            </ol>

            <p className="mx-auto mt-7 max-w-2xl rounded-[22px] bg-finn-pale-blue px-5 py-4 text-center text-xs leading-5 text-finn-highlight-navy">
                <strong className="font-black">
                    Where Lens can't answer, it says so.
                </strong>{" "}
                FINN doesn't publish everything. When the data can't settle a
                question, Lens tells you that instead of guessing and
                presenting the guess as a finding.
            </p>

            <div className="mt-9 flex items-center justify-center gap-3">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex h-13 w-13 items-center justify-center rounded-full border-2 border-finn-cotton text-finn-iron transition hover:bg-white hover:text-finn-black"
                    aria-label="Back to the welcome"
                >
                    <ArrowLeftIcon className="h-5 w-5" />
                </button>

                <button
                    type="button"
                    onClick={onNext}
                    className="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-finn-accent-blue px-8 text-sm font-black text-white shadow-md transition hover:bg-finn-highlight-navy"
                >
                    Set up my ranking
                    <ArrowRightIcon className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

function Step({
    index,
    icon,
    title,
    body,
    aside,
    highlight,
}: {
    index: number;
    icon: ReactNode;
    title: string;
    body: ReactNode;
    aside: string;
    /** Marks the one part the reader is about to supply. */
    highlight?: boolean;
}) {
    return (
        <li
            className={[
                "flex flex-col rounded-[26px] p-5 transition",
                highlight
                    ? "bg-white shadow-[0_0_0_2px] shadow-finn-accent-blue"
                    : "bg-white shadow-sm",
            ].join(" ")}
        >
            <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-finn-pale-blue text-finn-accent-blue">
                    {icon}
                </span>

                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-finn-snow text-[11px] font-black text-finn-iron">
                    {index}
                </span>
            </div>

            <p className="mt-4 text-base font-black text-finn-black">
                {title}
            </p>

            <p className="mt-1.5 flex-1 text-xs leading-5 text-finn-iron">
                {body}
            </p>

            <p
                className={[
                    "mt-3 border-t pt-3 text-[11px] leading-4",
                    highlight
                        ? "border-finn-pale-blue font-bold text-finn-accent-blue"
                        : "border-finn-cotton text-finn-iron",
                ].join(" ")}
            >
                {aside}
            </p>
        </li>
    );
}
