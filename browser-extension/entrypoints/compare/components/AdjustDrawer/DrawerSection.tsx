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
 */
export function DrawerSection({
    value,
    title,
    summary,
    children,
}: {
    /** Identifies this section to the accordion around it. */
    value: string;
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
                <Accordion.Trigger className="group flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-finn-snow">
                    <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black text-finn-black">
                            {title}
                        </span>

                        <span className="mt-0.5 block text-[11px] leading-4 text-finn-iron">
                            {summary}
                        </span>
                    </span>

                    <ChevronDown
                        aria-hidden="true"
                        className="mt-0.5 h-4 w-4 shrink-0 text-finn-iron transition-transform group-data-[state=open]:rotate-180"
                    />
                </Accordion.Trigger>
            </Accordion.Header>

            <Accordion.Content className="px-4 pb-4">
                {children}
            </Accordion.Content>
        </Accordion.Item>
    );
}
