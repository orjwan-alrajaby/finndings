import { Check, EyeOff, Globe, Scale } from "lucide-react";
import type { ReactNode } from "react";

import { withFinnLinks } from "@/components/FinnLink";
import Logo from "/icon/128.png";

import { SCREEN_ORDER, SCREEN_PROMISE, type OnboardingScreen } from "../types";

/**
 * The first screen, which has two jobs: say what this is, and say what the
 * next four screens are going to do to the reader.
 *
 * The first job was always here. A reader arrives straight off an install,
 * having read a store listing at most, and what they need is the single idea
 * — FINN tells you what exists, Lens tells you which one is right for you —
 * and the two facts that decide whether they trust a browser extension with
 * a shopping site: who made it, and where their answers go.
 *
 * The way on is not here. It is in the header, with the way on from every
 * other screen — a reader who finds it once should not have to hunt for it
 * again on the next screen because the first one kept its own. What the
 * header cannot do is *explain*, which is what the rest of this screen is
 * for, and the list below is the half of that explaining which is new.
 *
 * The second job is new, and it is the fix for the complaint that this flow
 * was vague. "Two questions, about a minute" is a promise with no shape: it
 * does not say what the questions are, which screens ask for anything, or
 * what the reader gets at the end. So the four screens are simply listed,
 * with the two that ask for something marked as asking. Nobody should have
 * to walk into a setup flow to find out what is in it — and a reader who
 * reads this list and decides to skip has made a real decision rather than a
 * defensive one.
 */
export function Welcome() {
    const steps = SCREEN_ORDER.filter(
        (screen): screen is Exclude<OnboardingScreen, "welcome"> =>
            screen !== "welcome",
    );

    return (
        <div>
            <div className="text-center">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-sm">
                    <img
                        src={Logo}
                        alt=""
                        className="h-20 w-20 object-contain"
                    />
                </div>

                <p className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-finn-accent-blue">
                    Welcome to Finn Lens
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
                    Lens does that weighing out loud, using the data FINN
                    already publishes — and shows its working, every time.
                </p>
            </div>

            <section className="mx-auto mt-9 max-w-3xl rounded-[26px] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <h2 className="text-base font-black text-finn-black">
                        What setting up involves
                    </h2>

                    <p className="text-[11px] font-bold text-finn-iron">
                        {steps.length} screens · about a minute · once
                    </p>
                </div>

                <ol className="mt-4 flex flex-col gap-2.5">
                    {steps.map((screen, index) => {
                        const promise = SCREEN_PROMISE[screen];

                        return (
                            <li
                                key={screen}
                                className="flex items-start gap-3 rounded-2xl bg-finn-snow px-4 py-3"
                            >
                                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-finn-accent-blue text-[11px] font-black text-white">
                                    {index + 1}
                                </span>

                                <span className="min-w-0 flex-1">
                                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                        <span className="text-sm font-black text-finn-black">
                                            {promise.title}
                                        </span>

                                        {/*
                                          * Only the two screens that ask for
                                          * something are marked, which is the
                                          * whole point of the list: a reader
                                          * can see at a glance that three
                                          * fifths of this flow wants nothing
                                          * from them.
                                          */}
                                        <span
                                            className={[
                                                "rounded-full px-2 py-0.5 text-[10px] font-black",
                                                promise.asks
                                                    ? "bg-finn-pale-blue text-finn-accent-blue"
                                                    : "bg-finn-cotton text-finn-iron",
                                            ].join(" ")}
                                        >
                                            {promise.asks
                                                ? "Asks you something"
                                                : "Just shows you"}
                                        </span>
                                    </span>

                                    <span className="mt-0.5 block text-xs leading-5 text-finn-iron">
                                        {promise.body}
                                    </span>
                                </span>
                            </li>
                        );
                    })}
                </ol>

                <p className="mt-4 flex items-start gap-2 text-[11px] leading-4 text-finn-iron">
                    <Check
                        aria-hidden="true"
                        className="mt-px h-3.5 w-3.5 shrink-0 text-finn-accent-blue"
                    />

                    <span>
                        Both questions already have workable answers filled in,
                        so you can accept them and move on. Nothing is written
                        down until the last screen, and{" "}
                        <strong className="font-black text-finn-black">
                            Skip setup
                        </strong>{" "}
                        at the top works on every screen — Lens runs on its own
                        defaults afterwards, and won't ask you again.
                    </span>
                </p>
            </section>

            <div className="mx-auto mt-6 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
                {/*
                  * Not "about a minute" any more — the list above says that
                  * twice already, and a trust row that repeats the roadmap
                  * spends three cards saying two things. This is the fact a
                  * new reader actually wants and nothing else on the flow
                  * states: the extension is inert everywhere but one site.
                  * See the content script's `matches` in wxt.config.ts.
                  */}
                <Point
                    icon={<Globe aria-hidden="true" className="h-5 w-5" />}
                    title="Only on finn.com"
                    body={withFinnLinks(
                        "Lens runs on finn.com pages and nowhere else. On every other site it does nothing at all.",
                    )}
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
