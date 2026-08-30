import {
    ENVIRONMENTAL_METHOD,
    ENVIRONMENTAL_METHOD_NOTES,
    ENVIRONMENTAL_METHOD_TOTAL,
} from "@/lib/reasoning-engine/environmental";

/**
 * How environmental impact is judged, explained where there is no car yet.
 *
 * Every other priority explains itself by the list of features underneath it:
 * a reader opens Safety, sees fifteen things, and understands immediately what
 * the score is counting. This one has no list, and what stood here instead was
 * "calculated automatically from the vehicle's emissions and efficiency data"
 * — which tells the reader that something happens and nothing about what.
 *
 * So the four figures are named, with the scale each is read against. The same
 * text is shown in Settings and in step 3 of the compare flow, because it is
 * the same question asked in two places, and it is built from the constants
 * the scoring actually uses so it cannot quietly go out of date.
 */
export function EnvironmentalMethod({
    tone = "light",
}: {
    /** `light` sits on white; `snow` sits on the flow's tinted panels. */
    tone?: "light" | "snow";
}) {
    const card = tone === "light" ? "bg-finn-snow" : "bg-white";

    return (
        <div className="space-y-2">
            {ENVIRONMENTAL_METHOD.map((step, index) => (
                <div
                    key={step.id}
                    className={`flex gap-3 rounded-2xl ${card} p-3`}
                >
                    <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-finn-pale-blue text-[10px] font-black text-finn-accent-blue"
                        aria-hidden="true"
                    >
                        {index + 1}
                    </span>

                    <div className="min-w-0">
                        <p className="text-xs font-black text-finn-black">
                            {step.label}
                        </p>

                        <p className="mt-0.5 text-[11px] leading-4 text-finn-black">
                            {step.reads}
                        </p>

                        {/*
                          * The rule itself, not a description of it. A reader
                          * who can see the arithmetic can apply it to a car
                          * in front of them and check the answer; one who is
                          * only told there is a scale has to take it on
                          * trust.
                          */}
                        <p className="mt-1 rounded-md bg-white px-2 py-1 font-mono text-[10px] leading-4 tabular-nums text-finn-highlight-navy">
                            {step.formula}
                        </p>

                        <p className="mt-1 text-[11px] leading-4 text-finn-iron">
                            {step.scale}
                        </p>
                    </div>
                </div>
            ))}

            <div className={`flex gap-3 rounded-2xl ${card} p-3`}>
                <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-finn-accent-blue text-[10px] font-black text-white"
                    aria-hidden="true"
                >
                    =
                </span>

                <div className="min-w-0">
                    <p className="text-xs font-black text-finn-black">
                        The score
                    </p>

                    <p className="mt-0.5 text-[11px] leading-4 text-finn-black">
                        {ENVIRONMENTAL_METHOD_TOTAL}
                    </p>

                    <p className="mt-1 rounded-md bg-white px-2 py-1 font-mono text-[10px] leading-4 tabular-nums text-finn-highlight-navy">
                        (mark + mark + mark + mark) ÷ 4
                    </p>
                </div>
            </div>

            {ENVIRONMENTAL_METHOD_NOTES.map((note) => (
                <p
                    key={note}
                    className="px-1 text-[11px] leading-4 text-finn-iron"
                >
                    {note}
                </p>
            ))}
        </div>
    );
}
