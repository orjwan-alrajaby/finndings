import { PriorityIcon } from "@/components/PriorityIcon";
import { surfaceTone } from "@/lib/priority-marks";
import type {
    CategoryId,
    PriorityDefinition,
} from "@/lib/reasoning-engine/types";

/**
 * A profile's five priorities, as chips in the colours the order list uses.
 *
 * Both places that show a profile as a card — the setup flow's presets and
 * the Profiles tab in Settings — used to print these as identical white pills
 * reading "1 · Safety & Driver Assistance". That is the order, but not a
 * picture of it: six cards of the same grey chips give a reader nothing to
 * compare at a glance. In each priority's own hue, with its mark, a reader can
 * see that Family First opens on orange and Nervous Driver on blue before
 * reading a word — and the same colours meet them in the list the profile
 * fills in.
 *
 * A priority the reader has switched off keeps the warning style it had: the
 * profile still names it, and applying it would bring it back, which is worth
 * more than a colour.
 */
export function ProfileOrderChips({
    priorities,
    priorityDefinitions,
}: {
    priorities: CategoryId[];
    priorityDefinitions: PriorityDefinition[];
}) {
    return (
        /* Spans with list roles, not `<ol>`: the setup flow draws these inside a button, which may only hold phrasing content. */
        <span role="list" className="flex flex-wrap gap-1.5">
            {priorities.map((id, index) => {
                const definition = priorityDefinitions.find(
                    (priority) => priority.id === id,
                );
                const off = definition?.enabled === false;
                const tone = surfaceTone(definition?.icon);

                return (
                    <span
                        role="listitem"
                        key={id}
                        className={[
                            "inline-flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2.5 text-[11px] font-bold ring-1",
                            off
                                ? "bg-finn-warning/10 text-finn-warning ring-finn-warning/25"
                                : `bg-white text-finn-black ${tone.edge}`,
                        ].join(" ")}
                    >
                        <span
                            className={[
                                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white",
                                off ? "bg-finn-warning" : tone.solid,
                            ].join(" ")}
                        >
                            {index + 1}
                        </span>

                        <PriorityIcon
                            name={definition?.icon ?? "car"}
                            className="h-3.5 w-3.5 shrink-0"
                            tinted={!off}
                        />

                        {definition?.label ?? "Unknown priority"}
                        {off && " (off)"}
                    </span>
                );
            })}
        </span>
    );
}
