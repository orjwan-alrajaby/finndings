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
 * What it says now is why there are four figures and not one. Each row is a
 * signal, why it counts, and — the part that makes the set make sense — what
 * it can't see and which of the others covers for it. The arithmetic that
 * turns them into a number is deliberately not here: knowing that a car scores
 * 47 on energy use is worth much less than knowing why energy use is the only
 * thing separating two electric cars.
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

                        <p className="mt-0.5 text-[11px] leading-4 text-finn-iron">
                            {step.reads}
                        </p>

                        <p className="mt-1.5 text-[11px] leading-4 text-finn-black">
                            {step.matters}
                        </p>

                        {/*
                          * The blind spot, and which of the others covers it.
                          * This is the row that stops the four reading as four
                          * attempts at the same measurement.
                          */}
                        <p className="mt-1 border-l-2 border-finn-cotton pl-2 text-[11px] leading-4 text-finn-iron">
                            {step.relates}
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
