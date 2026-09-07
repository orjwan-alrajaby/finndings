import { ArrowRight, Clock, EyeOff, Scale } from "lucide-react";
import type { ReactNode } from "react";

import { withFinnLinks } from "@/components/FinnLink";
import Logo from "/icon/128.png";

/**
 * The first screen, which has one job: say what this is.
 *
 * A reader arrives here straight off an install, having read a store
 * listing at most. What they need is the single idea — FINN tells you what
 * exists, Lens tells you which one is right for you — and the two facts
 * that decide whether they trust a browser extension with a shopping site:
 * who made it, and where their answers go. Everything else waits.
 */
export function Welcome({ onNext }: { onNext: () => void }) {
    return (
        <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-sm">
                <img
                    src={Logo}
                    alt=""
                    className="h-9 w-9 object-contain"
                />
            </div>

            <p className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-finn-accent-blue">
                Welcome to FINN Lens
            </p>

            <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-black leading-tight tracking-tight text-finn-black sm:text-5xl">
                FINN shows you what exists.
                <br className="hidden sm:inline" /> Lens tells you which one
                is right.
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-finn-iron">
                Comparing car subscriptions means five tabs and a mental
                spreadsheet, with no way to weigh "this one has adaptive
                cruise control" against "this one is €80 a month cheaper".
                Lens does that weighing out loud, using the data FINN already
                publishes — and shows its working, every time.
            </p>

            <div className="mx-auto mt-9 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
                <Point
                    icon={<Clock aria-hidden="true" className="h-5 w-5" />}
                    title="About a minute"
                    body="Two questions, both with sensible answers ready to accept. You only do this once."
                />

                <Point
                    icon={<EyeOff aria-hidden="true" className="h-5 w-5" />}
                    title="Nothing leaves your browser"
                    body="Your answers and your pinned cars are stored locally. There is no account and no server."
                />

                <Point
                    icon={<Scale aria-hidden="true" className="h-5 w-5" />}
                    title="Unofficial"
                    body={withFinnLinks(
                        "Lens is not affiliated with FINN. It reads what finn.com already shows you and reasons about it.",
                    )}
                />
            </div>

            <button
                type="button"
                onClick={onNext}
                className="mt-10 inline-flex h-14 items-center justify-center gap-2 rounded-full bg-finn-accent-blue px-9 text-sm font-black text-white shadow-md transition hover:bg-finn-highlight-navy"
            >
                Show me how it works
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
        </div>
    );
}

function Point({
    icon,
    title,
    body,
}: {
    icon: ReactNode;
    title: string;
    body: ReactNode;
}) {
    return (
        <div className="rounded-[22px] bg-white p-5 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-finn-pale-blue text-finn-accent-blue">
                {icon}
            </span>

            <p className="mt-3 text-sm font-black text-finn-black">{title}</p>

            <p className="mt-1 text-xs leading-5 text-finn-iron">{body}</p>
        </div>
    );
}
