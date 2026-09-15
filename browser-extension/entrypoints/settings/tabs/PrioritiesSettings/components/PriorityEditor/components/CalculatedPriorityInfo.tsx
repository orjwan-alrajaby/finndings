import {
    ArrowRight,
    Check,
    Cloud,
    Gauge,
    ListOrdered,
    PlugZap,
    Tag,
    Zap,
    type LucideIcon,
} from "lucide-react";

import type { PriorityDefinition } from "@/lib/reasoning-engine/types";
import {
    ENVIRONMENTAL_LEAD,
    EnvironmentalMethodDetail,
} from "@/components/EnvironmentalMethod";
import { surfaceTone, type SurfaceTone } from "@/lib/priority-marks";
import {
    CO2_CLASSES,
    positionForCo2,
} from "@/lib/reasoning-engine/environmental";
import { classifyFit, FIT_BANDS } from "@/lib/reasoning-engine/fit";

interface CalculatedPriorityInfoProps {
    priority: PriorityDefinition;
    onClose: () => void;
}

/**
 * What opens under a priority that has nothing to pick.
 *
 * Every other priority opens into a list of features, and the list is the
 * explanation: a reader sees fifteen things and understands what is counted.
 * Environmental Impact has no list, and it used to open into two paragraphs,
 * a fold, a gap and a "Done" button drawn white on a white card — the one
 * priority whose method is a number, explained with no numbers on screen.
 *
 * So it now shows the method as the shape it is: one figure, turned into a
 * class, turned into a match — and the scale itself, A to G, with the range
 * each letter covers and the match it gives. Every boundary and every band on
 * it is read from the engine (`CO2_CLASSES`, `positionForCo2`, `classifyFit`)
 * rather than written here, so the picture cannot drift from the scoring.
 */
export function CalculatedPriorityInfo({
    priority,
    onClose,
}: CalculatedPriorityInfoProps) {
    const tone = surfaceTone(priority.icon);
    const environmental = priority.id === "environmental";

    return (
        <div className="space-y-4 p-4 sm:p-5">
            <header className="flex items-start gap-3">
                <span
                    aria-hidden="true"
                    className={[
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm",
                        tone.solid,
                    ].join(" ")}
                >
                    <Gauge className="h-5 w-5" />
                </span>

                <div className="min-w-0 flex-1">
                    <p
                        className={[
                            "text-[10px] font-black uppercase tracking-[0.14em]",
                            tone.ink,
                        ].join(" ")}
                    >
                        Calculated, not configured
                    </p>

                    <p className="mt-0.5 text-base font-black text-finn-black">
                        How {priority.label} is scored
                    </p>

                    <p className="mt-1 max-w-[620px] text-xs leading-5 text-finn-iron">
                        {environmental
                            ? ENVIRONMENTAL_LEAD
                            : "Lens works this one out from the car's own published figures rather than from a list of equipment."}
                    </p>
                </div>
            </header>

            {environmental && (
                <>
                    <Steps tone={tone} />
                    <ClassScale tone={tone} />
                    <EnvironmentalMethodDetail tone={tone} />
                </>
            )}

            <div
                className={[
                    "flex gap-3 rounded-2xl bg-linear-to-r to-white p-3.5 ring-1",
                    tone.wash,
                    tone.edge,
                ].join(" ")}
            >
                <span
                    aria-hidden="true"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm"
                >
                    <ListOrdered className={["h-4 w-4", tone.ink].join(" ")} />
                </span>

                <div className="min-w-0">
                    <p className="text-xs font-black text-finn-black">
                        Nothing to pick here
                    </p>

                    <p className="mt-0.5 text-xs leading-5 text-finn-iron">
                        Because it's judged on figures rather than equipment,
                        there's no feature list here to single one out of. Where
                        this priority sits in your order is what decides how
                        much it counts.
                    </p>
                </div>
            </div>

            <button
                type="button"
                onClick={onClose}
                className={[
                    "inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-white text-xs font-black shadow-sm ring-1 transition",
                    tone.ink,
                    tone.edge,
                    tone.edgeHover,
                    tone.groundHover,
                ].join(" ")}
            >
                <Check aria-hidden="true" className="h-4 w-4" />
                Done
            </button>
        </div>
    );
}

/**
 * The method in three moves, left to right.
 *
 * The lead sentence says all of this, and a reader skims past a sentence. As
 * three steps it is something they can check against a car: find its CO₂
 * figure, find its letter, and they know what Lens will say.
 */
function Steps({ tone }: { tone: SurfaceTone }) {
    const steps: { icon: LucideIcon; title: string; body: string }[] = [
        {
            icon: Cloud,
            title: "The car's CO₂",
            body: "Grams per kilometre, from the EU's official test.",
        },
        {
            icon: Tag,
            title: "Its A–G class",
            body: "The letter on German car listings, worked out from that figure.",
        },
        {
            icon: Gauge,
            title: "Your match",
            body: "A cleaner class is a better match. Your order decides how much it counts.",
        },
    ];

    return (
        <ol className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-stretch">
            {steps.map((step, index) => (
                <li key={step.title} className="contents">
                    <div
                        className={[
                            "flex gap-2.5 rounded-2xl p-3 ring-1",
                            tone.ground,
                            tone.edge,
                        ].join(" ")}
                    >
                        <span
                            aria-hidden="true"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm"
                        >
                            <step.icon className={["h-4 w-4", tone.ink].join(" ")} />
                        </span>

                        <div className="min-w-0">
                            <p className="text-xs font-black text-finn-black">
                                <span className={["mr-1 tabular-nums", tone.ink].join(" ")}>
                                    {index + 1}.
                                </span>
                                {step.title}
                            </p>

                            <p className="mt-0.5 text-[11px] leading-4 text-finn-iron">
                                {step.body}
                            </p>
                        </div>
                    </div>

                    {index < steps.length - 1 && (
                        <span
                            aria-hidden="true"
                            className="hidden items-center justify-center sm:flex"
                        >
                            <ArrowRight className={["h-4 w-4", tone.ink].join(" ")} />
                        </span>
                    )}
                </li>
            ))}
        </ol>
    );
}

/**
 * The label's own colours, cleanest first.
 *
 * The German CO₂ label runs dark green to red as the letters go down, and a
 * reader who has seen one on a listing recognises the shape before the
 * letters. Dark ends of each hue where the letter is white, so a white "B" on
 * green clears 4.5:1; black letters on the light middle three.
 */
const CLASS_LOOK: Record<string, string> = {
    A: "bg-emerald-800 text-white",
    B: "bg-green-700 text-white",
    C: "bg-lime-500 text-finn-black",
    D: "bg-yellow-400 text-finn-black",
    E: "bg-amber-500 text-finn-black",
    F: "bg-orange-700 text-white",
    G: "bg-red-700 text-white",
};

/**
 * A to G, as arrows that lengthen the way the label's do, with each class's
 * range and the match it gives.
 *
 * The match is `classifyFit` applied to the score `positionForCo2` gives the
 * class's upper bound — the engine keeps every class wholly inside one band,
 * so either end of a class gives the same answer.
 *
 * The plug-in note takes its ceiling from the same place the engine does:
 * `assessEnvironment` scales a plug-in hybrid's score by where class C ends,
 * so the best a plug-in can do is the score of the top of class C.
 */
function ClassScale({ tone }: { tone: SurfaceTone }) {
    const rows = CO2_CLASSES.map((band, index) => ({
        ...band,
        fit: classifyFit(positionForCo2(band.upTo)),
        last: index === CO2_CLASSES.length - 1,
    }));

    const classC = CO2_CLASSES.find((band) => band.letter === "C");
    const plugInBest = classC
        ? classifyFit(Math.round(positionForCo2(0) * (positionForCo2(classC.upTo) / 100)))
        : null;

    return (
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-finn-cotton px-3.5 py-2.5">
                <p className="flex items-center gap-2 text-xs font-black text-finn-black">
                    <Tag aria-hidden="true" className={["h-3.5 w-3.5", tone.ink].join(" ")} />
                    The CO₂ scale
                </p>

                <p className="text-[10px] font-bold text-finn-iron">
                    g CO₂ per km · the match it gives
                </p>
            </div>

            {/* Held to a measure, so the range and the match stay beside their arrow on a wide page. */}
            <ol className="max-w-xl space-y-1.5 px-3.5 py-3">
                {rows.map((row, index) => (
                    <li key={row.letter} className="flex items-center gap-3">
                        {/*
                          * Arrow widths grow from 40% to 100% down the list —
                          * the label's silhouette — inside a fixed track, so
                          * the range and the match stay in columns.
                          */}
                        <span className="w-24 shrink-0 sm:w-40">
                            <span
                                className={[
                                    "flex h-6 items-center pl-2 text-xs font-black [clip-path:polygon(0_0,calc(100%-10px)_0,100%_50%,calc(100%-10px)_100%,0_100%)]",
                                    CLASS_LOOK[row.letter] ?? "bg-finn-iron text-white",
                                ].join(" ")}
                                style={{ width: `${40 + (60 * index) / (rows.length - 1)}%` }}
                            >
                                {row.letter}
                            </span>
                        </span>

                        {/*
                          * The unit is in the header, so a phone drops it from
                          * each row rather than wrap "116–135 g/km" onto two
                          * lines seven times.
                          */}
                        <span className="min-w-0 flex-1 whitespace-nowrap text-[11px] font-bold tabular-nums text-finn-black sm:w-32 sm:flex-none">
                            {row.upTo === 0 ? (
                                "0"
                            ) : row.last ? (
                                <>
                                    <span className="sm:hidden">{row.from}+</span>
                                    <span className="hidden sm:inline">
                                        {row.from} and over
                                    </span>
                                </>
                            ) : (
                                `${row.from}–${row.upTo}`
                            )}
                            <span className="hidden font-normal text-finn-iron sm:inline">
                                {" "}
                                g/km
                            </span>
                        </span>

                        <span
                            className={[
                                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black",
                                FIT_BANDS[row.fit.level].chipClass,
                            ].join(" ")}
                        >
                            {row.fit.label}
                        </span>
                    </li>
                ))}
            </ol>

            <div className="grid gap-2 border-t border-finn-cotton bg-finn-snow px-3.5 py-3 sm:grid-cols-2">
                <Note icon={Zap} tone={tone}>
                    <strong className="font-black text-finn-black">Electric cars</strong>{" "}
                    emit nothing while driving: 0 g/km, class A.
                </Note>

                {plugInBest && (
                    <Note icon={PlugZap} tone={tone}>
                        <strong className="font-black text-finn-black">Plug-in hybrids</strong>{" "}
                        are scaled down, so the best they reach is a{" "}
                        {plugInBest.label.toLowerCase()}.
                    </Note>
                )}
            </div>
        </section>
    );
}

function Note({
    icon: Icon,
    tone,
    children,
}: {
    icon: LucideIcon;
    tone: SurfaceTone;
    children: React.ReactNode;
}) {
    return (
        <p className="flex gap-2 text-[11px] leading-4 text-finn-iron">
            <span
                aria-hidden="true"
                className={[
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                    tone.ground,
                ].join(" ")}
            >
                <Icon className={["h-3.5 w-3.5", tone.ink].join(" ")} />
            </span>
            <span className="pt-1">{children}</span>
        </p>
    );
}
