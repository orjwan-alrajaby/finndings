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
export function EnergyUse({
    car,
    against,
}: {
    car: PinnedFinnCar;
    /**
     * The recommendation, when this section is describing a challenger.
     *
     * Same reason the cost section takes one: a comparison page that shows
     * only the challenger's figure asks the reader to remember the winner's.
     * Null on the recommendation view, where there is nothing to be next to.
     */
    against?: { name: string; car: PinnedFinnCar } | null;
}) {
    const reading = readUsage(car);
    const rival = against ? readUsage(against.car) : null;

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

            {against && rival && (
                <Rival name={against.name} reading={rival} />
            )}
        </section>
    );
}

/**
 * The recommendation's own figure, for the challenger to be read against.
 *
 * Deliberately a line rather than a second copy of the section above it. The
 * question on the challenge tab is "would swapping cost me more to run", and
 * that is answered by two numbers next to each other — repeating the cohort
 * reasoning, the readouts and the WLTP caveat for a car the reader has already
 * read about under the other tab would bury the one line they came for.
 *
 * Two cars on different fuels are still worth putting side by side even though
 * their figures are not directly comparable: the labels are, because each was
 * graded against its own kind. So the verdict leads and the raw figure follows
 * it, rather than the other way round.
 */
function Rival({
    name,
    reading,
}: {
    name: string;
    reading: ReturnType<typeof readUsage>;
}) {
    return (
        <p className="mt-4 rounded-[22px] bg-white p-5 text-sm leading-6 text-finn-black">
            <span className="font-black">{name}</span>
            {", the recommendation, is "}
            {reading.kind === "graded" ? (
                <>
                    <span className="font-black">
                        {reading.efficiency.label.toLowerCase()}
                    </span>
                    {/*
                      * No "for a Petrol" clause here. It needed an article the
                      * fuel name cannot supply — "a Electric" — and it was not
                      * carrying its weight anyway: the label already means
                      * "for its kind", and the unit says which kind.
                      */}
                    {` at ${reading.efficiency.display}.`}
                </>
            ) : (
                <>
                    {reading.kind === "ungradable"
                        ? "a plug-in hybrid, which can't be graded on one blended figure."
                        : "a car FINN publishes no consumption for, so there is nothing to set against this."}
                </>
            )}
        </p>
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
