import { useState } from "react";
import { ChevronDown } from "lucide-react";

import {
    describeEmissionsVersusEfficiency,
    describeEnvironment,
    environmentalTags,
    type EnvironmentalAssessment,
    type EnvironmentalTag,
} from "@/lib/reasoning-engine/environmental";
import { formatNumber } from "@/lib/reasoning-engine/format";
import { EnvironmentalMethod } from "@/components/EnvironmentalMethod";
import { ExportTable, type ExportRow } from "@/components/ExportTable";

/**
 * The environmental reading, in the order a reader needs it.
 *
 * Every surface that showed this priority used to open on how the judgement is
 * made and close on what the car actually is: six method cards, then a table of
 * bare figures, and the interpretation nowhere. That is the wrong way round.
 * Somebody looking at a car wants the result first, the numbers behind it
 * second, what those numbers mean together third, the limits fourth — and the
 * method only if they go looking for it.
 *
 * So the order here is fixed and the same everywhere:
 *
 *   1. what this car is        — the emissions result, in words
 *   2. what it's tagged with   — powertrain, class, emissions, efficiency,
 *                                each one tappable for "says who?"
 *   3. what it's built on      — the two figures
 *   4. what they mean together — where emissions and efficiency disagree
 *   5. what it doesn't cover   — the caveats this car actually needs
 *   6. how it's worked out     — folded away
 *
 * `concise` stops after the caveat, for the Advice page where this is one
 * priority among five. `detailed` runs the whole thing, for a drawer opened
 * about one car.
 */
export function EnvironmentalResult({
    assessment,
    variant = "detailed",
}: {
    assessment: EnvironmentalAssessment;
    variant?: "concise" | "detailed";
}) {
    const { co2, efficiency, missing } = assessment;
    const detailed = variant === "detailed";

    const tags = environmentalTags(assessment);

    const interpretation = detailed
        ? describeEmissionsVersusEfficiency(assessment)
        : null;

    /*
     * One caveat on the Advice page, all of them in the drawer. They are
     * ordered most-specific-first in the engine, so the one that survives the
     * cut is the one about this kind of car rather than the one every car
     * carries.
     */
    const caveats = detailed
        ? assessment.caveats
        : assessment.caveats.slice(0, 1);

    return (
        <div className="mt-3 flex flex-col gap-3">
            {/* 1. The result. */}
            <p className="text-[13px] leading-5 text-finn-black">
                {describeEnvironment(assessment)}
            </p>

            {/* 2. What it's tagged with, and where each tag comes from. */}
            <TagRow tags={tags} />

            {/* 3. The figures the tags are read off. */}
            {(co2 || efficiency) && (
                <dl className="grid gap-1.5 sm:grid-cols-2">
                    {co2 && (
                        <Readout
                            label="CO₂ while driving"
                            value={`${formatNumber(co2.gPerKm)} g/km`}
                            meaning="Measured under the EU's official test"
                        />
                    )}

                    {efficiency && (
                        <Readout
                            label="Energy it uses"
                            value={efficiency.display}
                            meaning={`${efficiency.typical} for this kind of car`}
                        />
                    )}

                    {/*
                      * A plug-in hybrid's consumption is shown and not
                      * graded. One blended figure covering two energy
                      * sources has no cohort to be frugal within, and FINN
                      * publishes no separate electric consumption to build
                      * one from.
                      */}
                    {!efficiency &&
                        assessment.powertrain === "Plug-in Hybrid" && (
                            <Readout
                                label="Energy it uses"
                                value="One combined figure"
                                meaning="FINN publishes a single blended number for plug-in hybrids, which can't be compared with either petrol or electric cars."
                            />
                        )}
                </dl>
            )}

            {/* 4. What the two figures mean when read together. */}
            {interpretation && (
                <div className="rounded-2xl bg-finn-pale-blue px-3 py-2.5">
                    <p className="text-[12px] font-black text-finn-black">
                        {interpretation.heading}
                    </p>

                    <p className="mt-1 text-[11px] leading-4 text-finn-iron">
                        {interpretation.body}
                    </p>
                </div>
            )}

            {/* 5. What it can't tell you. Kept, but after the answer. */}
            {caveats.length > 0 && (
                <div className="flex flex-col gap-1">
                    {caveats.map((caveat) => (
                        <p
                            key={caveat}
                            className="text-[11px] leading-4 text-finn-iron"
                        >
                            {caveat}
                        </p>
                    ))}
                </div>
            )}

            {missing.length > 0 && (
                <p className="text-[11px] leading-4 text-finn-iron">
                    FINN doesn't publish {listOf(missing)} for this car, so
                    that part is left out rather than guessed.
                </p>
            )}

            {/* 6. The method, for whoever wants to check it. */}
            {detailed && <MethodDisclosure />}
        </div>
    );
}

/** A figure and, next to it, what that figure means. */
function Readout({
    label,
    value,
    meaning,
}: {
    label: string;
    value: string;
    meaning: string;
}) {
    return (
        <div className="rounded-xl bg-finn-cotton px-3 py-2">
            <dt className="text-[10px] font-black uppercase tracking-wide text-finn-iron">
                {label}
            </dt>

            <dd>
                <span className="block text-sm font-black text-finn-black">
                    {value}
                </span>

                <span className="mt-0.5 block text-[11px] leading-4 text-finn-iron">
                    {meaning}
                </span>
            </dd>
        </div>
    );
}

/**
 * The method, closed.
 *
 * It used to be six cards sitting open above the car's own result, which meant
 * the first thing a reader met was a defence of the model rather than an
 * answer about the car. Nothing has been removed — it is one click away, and
 * the label says plainly what is behind it.
 */
function MethodDisclosure() {
    const [open, setOpen] = useState(false);

    return (
        <div>
            <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((was) => !was)}
                className="flex items-center gap-1 text-[11px] font-black text-finn-accent-blue"
            >
                How Finn Lens works this out

                <ChevronDown
                    aria-hidden="true"
                    className={[
                        "h-3.5 w-3.5 transition-transform",
                        open ? "rotate-180" : "",
                    ].join(" ")}
                />
            </button>

            {open && (
                <div className="mt-2">
                    <EnvironmentalMethod />
                </div>
            )}
        </div>
    );
}

/**
 * The labels, each one a question the reader can ask.
 *
 * "Above-average emissions" and "Moderately efficient" both invite the same
 * question — average by whose reckoning, efficient against what? — and the
 * answers are genuinely different in kind: the class letter is set in law, the
 * emissions average is an observation with no legal force, and the consumption
 * benchmark is derived here because none is published. None of that belongs in
 * the reader's way, and all of it belongs one tap from the claim it justifies.
 *
 * One open at a time: this is a footnote, not a second article.
 */
function TagRow({ tags }: { tags: EnvironmentalTag[] }) {
    const [openId, setOpenId] = useState<string | null>(null);

    if (tags.length === 0) return null;

    const open = tags.find((tag) => tag.id === openId) ?? null;

    return (
        <div>
            {/*
              * Tappable on screen, where one open footnote at a time is the
              * whole point of the design. In an exported file none of them
              * can be opened, so every answer is spelled out below instead.
              */}
            <div className="finn-lens-screen-only flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                    <button
                        key={tag.id}
                        type="button"
                        aria-expanded={tag.id === openId}
                        onClick={() =>
                            setOpenId((was) =>
                                was === tag.id ? null : tag.id,
                            )
                        }
                        className={[
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-1",
                            "text-[11px] font-black transition",
                            TAG_CLASS[tag.tone],
                            tag.id === openId
                                ? "ring-2 ring-finn-accent-blue/40"
                                : "",
                        ].join(" ")}
                    >
                        {tag.label}

                        <span
                            aria-hidden="true"
                            className="grid h-3.5 w-3.5 place-items-center rounded-full border border-current text-[8px] leading-none opacity-70"
                        >
                            i
                        </span>
                    </button>
                ))}
            </div>

            {open && (
                <div className="finn-lens-screen-only mt-2 rounded-2xl bg-finn-cotton px-3 py-2.5">
                    <p className="text-[12px] font-black text-finn-black">
                        {open.title}
                    </p>

                    <p className="mt-1 text-[11px] leading-4 text-finn-iron">
                        {open.body}
                    </p>
                </div>
            )}

            <ExportTable
                caption="What this car is tagged with, and where each tag comes from"
                subjectHeading="Tag · how it reads"
                detailHeading="Says who?"
                rows={tags.map(exportRow)}
            />
        </div>
    );
}

/**
 * A tag with its footnote already unfolded.
 *
 * The "how it reads" line is the tag's tone said in words. On screen the
 * colour carries it and the reader has the other chips beside it for scale;
 * on a printed sheet, where a row may be read alone and possibly in grey,
 * the colour cannot be the only thing saying whether this is the good answer
 * or the poor one.
 */
const TAG_STANDING: Record<EnvironmentalTag["tone"], string> = {
    positive: "The strong answer",
    caution: "Worth weighing",
    neutral: "Neither good nor bad",
};

function exportRow(tag: EnvironmentalTag): ExportRow {
    return {
        key: tag.id,
        tone: tag.tone,
        subject: tag.label,
        standing: TAG_STANDING[tag.tone],
        detail: (
            <>
                <span className="block font-black text-finn-black">
                    {tag.title}
                </span>

                <span className="mt-0.5 block text-finn-iron">{tag.body}</span>
            </>
        ),
    };
}

/**
 * Coloured by what the label says, so cars separate in a list before they are
 * read. Deliberately not a red-to-green scale: this measures one quantity, and
 * traffic lights would read as a verdict on the car.
 */
const TAG_CLASS: Record<EnvironmentalTag["tone"], string> = {
    positive: "bg-finn-pale-blue text-finn-accent-blue",
    neutral: "bg-finn-cotton text-finn-iron",
    caution: "bg-finn-warning/10 text-finn-warning",
};

/** "its CO₂ figure and what it consumes". */
function listOf(items: string[]): string {
    if (items.length <= 1) return items[0] ?? "";

    return `${items.slice(0, -1).join(", ")} or ${items[items.length - 1]}`;
}
