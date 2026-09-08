import type { PinnedFinnCar } from "@/lib/types";
import { EFFICIENCY_TONE, readUsage } from "@/lib/usage-copy";

/**
 * How much energy this car uses, and how that was judged.
 *
 * The advice page's answer to the question the panel answers in "How much it
 * uses", and it is here for the same reason: consumption used to be reported
 * only inside the environmental-impact priority, so whether a reader was told
 * a car drinks 9 L/100km depended on whether they had ranked the environment.
 * It is on their bill every month either way.
 *
 * The reading itself — which of the three answers this car gets, and the words
 * it gets them in — comes from `readUsage`, shared with the panel and the
 * pinned car's card. This file only lays it out, in this page's larger type
 * and on its own ground.
 *
 * Follows the cost section rather than leading, because it is the explanation
 * of one line in it: what a car uses is why the energy figure above is the
 * size it is.
 */
export function EnergyUse({ car }: { car: PinnedFinnCar }) {
    const reading = readUsage(car);

    return (
        /*
          * Pale blue, the page's neutral ground for a section that reports
          * rather than judges. The green belongs to cost and the grey to the
          * hot seat, and this is neither.
          */
        <section className="rounded-[28px] bg-finn-pale-blue/60 p-6 sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-finn-accent-blue">
                Energy use
            </p>

            <h2 className="mt-2 text-2xl font-black">
                How much {car.name} uses
            </h2>

            <div className="mt-4 flex flex-wrap items-center gap-2">
                {/*
                  * What it runs on, first and loudest. It is the single fact
                  * that decides everything below — which cohort the figure is
                  * measured against, what "typical" means, and whether it can
                  * be graded at all.
                  */}
                {reading.fuel && (
                    <span className="inline-flex items-center rounded-full bg-finn-highlight-navy px-3 py-1.5 text-xs font-black text-white">
                        {reading.fuel}
                    </span>
                )}

                <span
                    className={[
                        "inline-flex items-center rounded-full px-3 py-1.5",
                        "text-xs font-black",
                        reading.kind === "graded"
                            ? EFFICIENCY_TONE[reading.efficiency.level]
                            : "bg-finn-cotton text-finn-iron",
                    ].join(" ")}
                >
                    {reading.kind === "graded"
                        ? reading.efficiency.label
                        : reading.verdict}
                </span>
            </div>

            {reading.kind === "graded" ? (
                <>
                    <div className="mt-5 flex flex-wrap gap-x-12 gap-y-4 rounded-[22px] bg-white p-5 sm:p-6">
                        <Readout
                            label="This car"
                            value={reading.efficiency.display}
                        />

                        <Readout
                            label="Typical for its kind"
                            value={reading.efficiency.typical.replace(
                                " is typical",
                                "",
                            )}
                        />
                    </div>

                    <p className="mt-4 text-sm leading-6 text-finn-black">
                        {reading.efficiency.reasoning}
                    </p>

                    {/* After the answer, not in front of it. */}
                    <p className="mt-3 text-xs leading-5 text-finn-iron">
                        {reading.efficiency.caveat}
                    </p>
                </>
            ) : (
                <p className="mt-4 text-sm leading-6 text-finn-black">
                    {reading.body}
                </p>
            )}
        </section>
    );
}

function Readout({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-finn-iron">
                {label}
            </p>

            <p className="mt-1 text-xl font-black leading-6 text-finn-black">
                {value}
            </p>
        </div>
    );
}
