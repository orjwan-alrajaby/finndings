import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

/**
 * One question in the drawer, open by default and closable.
 *
 * All three start open because the reader opened the drawer to change
 * something and does not yet know which of the three it is. Closing one is how
 * they keep the other two on screen while they work.
 *
 * Radix's accordion rather than a `useState` and a `<button>`: the header is a
 * real heading, the trigger carries `aria-expanded` and `aria-controls`, and
 * the panel is a region pointing back at the trigger — none of which the
 * hand-rolled version had. It used to fake the heading with `role="heading"`
 * on a span inside the button, which put a heading inside a control and gave
 * a screen reader a heading it could not navigate to.
 *
 * Each section carries its own hue, on a tinted header behind a marked tile.
 * Three white cards on a near-white ground gave a reader scrolling a long
 * drawer nothing to navigate by — every question looked like the last one,
 * and the only way back to the one they wanted was to read the headings
 * again. A colour per question is a landmark they can aim at.
 */
export interface SectionTone {
    /** The header's ground, pale enough for black text on it. */
    header: string;
    /** The icon tile: its ground and its ink. */
    tile: string;
    /** The eyebrow above the title. */
    eyebrow: string;
}

export function DrawerSection({
    value,
    tone,
    icon,
    eyebrow,
    title,
    summary,
    children,
}: {
    /** Identifies this section to the accordion around it. */
    value: string;
    tone: SectionTone;
    icon: React.ReactNode;
    /** What kind of question this is, in two or three words. */
    eyebrow: string;
    title: string;
    summary: string;
    children: React.ReactNode;
}) {
    return (
        <Accordion.Item
            value={value}
            className="overflow-hidden rounded-[22px] bg-white shadow-sm"
        >
            <Accordion.Header className="flex">
                <Accordion.Trigger
                    className={[
                        "group flex w-full items-start gap-3 px-4 py-3.5 text-left transition-opacity hover:opacity-90",
                        tone.header,
                    ].join(" ")}
                >
                    <span
                        aria-hidden="true"
                        className={[
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                            tone.tile,
                        ].join(" ")}
                    >
                        {icon}
                    </span>

                    <span className="min-w-0 flex-1">
                        <span
                            className={[
                                "block text-[10px] font-black uppercase tracking-[0.14em]",
                                tone.eyebrow,
                            ].join(" ")}
                        >
                            {eyebrow}
                        </span>

                        <span className="mt-0.5 block text-sm font-black text-finn-black">
                            {title}
                        </span>

                        <span className="mt-0.5 block text-[11px] leading-4 text-finn-iron">
                            {summary}
                        </span>
                    </span>

                    <ChevronDown
                        aria-hidden="true"
                        className="mt-1.5 h-4 w-4 shrink-0 text-finn-iron transition-transform group-data-[state=open]:rotate-180"
                    />
                </Accordion.Trigger>
            </Accordion.Header>

            <Accordion.Content className="px-4 py-4">
                {children}
            </Accordion.Content>
        </Accordion.Item>
    );
}

/**
 * A hue per question, so the drawer can be navigated by colour.
 *
 * Blue for the order, because it is the reader's own ranking and blue is what
 * this product uses for the reader's own statements. Emerald for influence,
 * which is where the influence scale's calmest hue already lives. Amber for
 * the driving figures, which are the ones that decide money — the same family
 * the over-budget verdict is drawn in.
 */
export const SECTION_TONE = {
    order: {
        header: "bg-finn-pale-blue",
        tile: "bg-white text-finn-accent-blue",
        eyebrow: "text-finn-accent-blue",
    },
    influence: {
        header: "bg-finn-influence-emerald-pale",
        tile: "bg-white text-finn-influence-emerald",
        eyebrow: "text-finn-influence-emerald",
    },
    driving: {
        header: "bg-finn-warning-lift/60",
        tile: "bg-white text-finn-warning-deep",
        eyebrow: "text-finn-warning-deep",
    },
} as const satisfies Record<string, SectionTone>;
