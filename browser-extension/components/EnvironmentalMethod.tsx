import {
    ENVIRONMENTAL_METHOD,
    ENVIRONMENTAL_METHOD_NOTES,
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

                        <p className="mt-1 text-[11px] leading-4 text-finn-iron">
                            {step.scale}
                        </p>
                    </div>
                </div>
            ))}

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
