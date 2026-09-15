import { BandChip } from "@/components/FitAnalysisView/parts";
import { ComparisonTable } from "@/components/ComparisonTable";
import { readEnvironment, type EnvironmentReading } from "@/lib/environment-copy";
import type { EnvironmentalAssessment } from "@/lib/reasoning-engine/environmental";
import type { FitBand } from "@/lib/reasoning-engine/fit";
import { ROW_TONE } from "@/lib/row-tone";
import { goToUsage } from "@/lib/usage-anchor";

/**
 * The environmental result, in the order a reader asks for it.
 *
 *   1. the verdict       what the figure means in plain words, the figure
 *                        itself in one sentence, and — where this is the only
 *                        place carrying them — the number, the class and the
 *                        match. Somebody who knows nothing about cars can stop
 *                        here and be right about this car.
 *   2. the plug-in note  only for a plug-in hybrid, and above the table it
 *                        changes how to read
 *   3. the table         this car's CO₂ against the FINN Lens benchmark, with a
 *                        bar for the relationship between the two figures,
 *                        the class pill beside the row's name, an "i" at its
 *                        far right, and a disclaimer
 *   4. the meaning       where the car lands against the comparison point, and
 *                        why that is the match it got
 *   5. the usage line    for a petrol or diesel car, that its fuel use goes
 *                        with this result, and where to find it
 *
 * The reordering is the point. This used to open with a paragraph carrying the
 * figure, the comparison and the conclusion at once, which meant the section's
 * plainest fact arrived welded to two claims about how FINN Lens scores things.
 *
 * How the priority is worked out is not here, and not because it doesn't
 * matter: it is a question about the reader's own setup rather than about the
 * car in front of them, and it is answered in full where the priority is set
 * — `EnvironmentalMethod`, in the settings editor and the compare drawer.
 * Carried here as well, it put six notes on the regulation under every car a
 * reader looked at.
 *
 * Every word comes from `readEnvironment`, which the in-page panel's
 * `impactBreakdown` reads too; this file only lays it out, in the table
 * `ComparisonTable` draws for this section and for "How much it uses".
 */
export function EnvironmentalResult({
    assessment,
    band,
    showHeadline = false,
    roomy = false,
}: {
    /**
     * Null when FINN published nothing this priority can use; the result
     * then says so rather than disappearing.
     */
    assessment: EnvironmentalAssessment | null;
    /** The priority's own band, as the engine produced it. */
    band: FitBand;
    /**
     * The CO₂ number and the band, above the answer. Off where the host's
     * header already carries them, as the panel's and the pinned card's do.
     */
    showHeadline?: boolean;
    /** The advice page's larger reading size. */
    roomy?: boolean;
}) {
    const reading = readEnvironment(assessment, band);

    const body = roomy
        ? "text-sm leading-6 text-finn-black"
        : "text-[13px] leading-5 text-finn-black";

    return (
        /*
          * gap-4 rather than gap-3. Four things sit here — the answer, the
          * evidence, the reasoning and the method — and at three they read as
          * one undifferentiated column of boxes.
          */
        <div className="@container mt-3 flex flex-col gap-4">
            <Verdict
                reading={reading}
                band={band}
                showHeadline={showHeadline}
                roomy={roomy}
            />

            {reading.note && (
                <div className="rounded-[20px] bg-finn-warning-lift/60 px-4 py-3.5">
                    <p className="text-[12px] font-black text-finn-warning-ink">
                        {reading.note.title}
                    </p>

                    <p className="mt-1.5 text-[12px] leading-[18px] text-finn-warning-ink/90">
                        {reading.note.body}
                    </p>
                </div>
            )}

            <ComparisonTable reading={reading} />

            {reading.meaning.map((line) => (
                <p key={line} className={body}>
                    {line}
                </p>
            ))}

            {/*
              * Where fuel use meets this result, last and quieter: a pointer to
              * "How much it uses" rather than a second copy of it, with its
              * last words taking the reader there.
              */}
            {reading.usage && (
                <p
                    data-usage=""
                    className={
                        roomy
                            ? "text-[13px] leading-5 text-finn-iron"
                            : "text-[12px] leading-[18px] text-finn-iron"
                    }
                >
                    {`${reading.usage.text} `}
                    <button
                        type="button"
                        data-usage-link=""
                        onClick={(event) => goToUsage(event.currentTarget)}
                        className="cursor-pointer font-bold text-finn-accent-blue underline underline-offset-2 hover:text-finn-highlight-navy"
                    >
                        {reading.usage.section}
                    </button>
                    {"."}
                </p>
            )}
        </div>
    );
}

/**
 * The answer, before any of the working, and the largest thing on the screen.
 *
 * A filled card on the tone's own pale ground: the reading in words set as a
 * heading — "Moderate emissions" — over one plain sentence, with the figure,
 * the class and the match on a quiet line above. Green, amber, orange or red
 * before a word of it is read, so a reader who has never seen a g/km figure
 * has the answer from its colour and its largest line.
 *
 * No coloured edge. The card is already a field of the tone, and a 4px rule
 * down the side of a filled card is the visual language of a documentation
 * callout — which is the thing this section was trying to stop being.
 *
 * The figure, the class and the match appear only where this component is the
 * only thing carrying them: inside the in-page panel and the pinned car's card
 * the priority header above has already said the number and the band, and the
 * class pill is on the CO₂ card below.
 */
function Verdict({
    reading,
    band,
    showHeadline,
    roomy,
}: {
    reading: EnvironmentReading;
    band: FitBand;
    showHeadline: boolean;
    roomy: boolean;
}) {
    const tone = ROW_TONE[reading.verdict.tone];

    return (
        <div
            className={`rounded-[22px] ${tone.ground} ${roomy ? "px-5 py-5" : "px-4 py-4"}`}
        >
            {showHeadline && (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                    {reading.headline && (
                        <span className="text-[15px] font-black tabular-nums text-finn-black">
                            {reading.headline}
                        </span>
                    )}

                    {reading.rating && (
                        <span
                            className={`inline-flex items-center rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-black ${ROW_TONE[reading.rating.tone].ink}`}
                        >
                            {reading.rating.label}
                        </span>
                    )}

                    <BandChip level={band.level} label={band.label} compact />
                </div>
            )}

            {/*
              * The plain words, at heading size. Tightened tracking because
              * `font-black` at this size sets loose, and these are two or
              * three words that have to read as one object.
              */}
            <p
                className={`font-black tracking-[-0.015em] ${tone.ink} ${roomy ? "text-[24px] leading-7" : "text-[18px] leading-6"}`}
            >
                {reading.verdict.words}
            </p>

            <p
                className={`mt-2 ${roomy ? "text-sm leading-6" : "text-[13px] leading-5"} text-finn-black/85`}
            >
                {reading.verdict.plain}
            </p>
        </div>
    );
}
