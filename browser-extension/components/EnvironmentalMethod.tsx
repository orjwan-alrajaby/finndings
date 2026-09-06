import { ENVIRONMENTAL_METHOD } from "@/lib/reasoning-engine/environmental";

/**
 * What ranking this priority high will actually do, said in one line.
 *
 * Lives here rather than at each call site because it was written twice and
 * both copies went stale together: they described "four figures, each read
 * against a fixed scale" long after the model had been cut down to one.
 */
export const ENVIRONMENTAL_LEAD =
    "Rank this high and Lens will favour cars that put less CO₂ into the air per kilometre — an electric car over a petrol one, a frugal petrol car over a thirsty one. It's the only priority judged on the car's own figures rather than on the equipment it carries.";

/**
 * How environmental impact is judged, explained where there is no car yet.
 *
 * Every other priority explains itself through the list of features beneath
 * it: a reader opens Safety, sees fifteen things, and understands what the
 * score is counting. This one has no list, so what it needs to say instead is
 * which figure decides the result and — more usefully — which figures
 * deliberately don't.
 *
 * That is most of what changed here. The old version described four signals
 * counted equally, which was an honest account of a model that shouldn't have
 * existed: three of the four were the CO₂ figure in other units. The text now
 * says there is one measurement, why the others are shown but not counted, and
 * what the result does not cover.
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
            <p className="text-xs leading-5 text-finn-iron">
                {ENVIRONMENTAL_LEAD}
            </p>

            {ENVIRONMENTAL_METHOD.map((note) => (
                <div
                    key={note.heading}
                    className={`rounded-2xl ${card} px-3 py-2.5`}
                >
                    <p className="text-xs font-black text-finn-black">
                        {note.heading}
                    </p>

                    <p className="mt-1 text-[11px] leading-4 text-finn-iron">
                        {note.body}
                    </p>
                </div>
            ))}
        </div>
    );
}
