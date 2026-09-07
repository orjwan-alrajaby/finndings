import { useState, type ReactNode } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Info } from "lucide-react";

/**
 * An explanation attached to something, without sending the reader to Google.
 *
 * Opens on hover and on focus like a normal tooltip, and *stays* open when
 * clicked — the explanations here are a sentence or two long, and a panel
 * that vanishes when the pointer drifts is no use for reading.
 *
 * Built on the Radix tooltip the compare page already provides, so it
 * inherits the existing positioning, portalling and dismissal behaviour
 * rather than introducing a second interaction model.
 *
 * `Tip` is the shell and takes whatever should trigger it; `InfoTip` is the
 * common case, where that trigger is a small "i". They share one
 * implementation so the two never drift into two behaviours — a tooltip that
 * pins on click in one place and evaporates in another is worse than either.
 */
export function Tip({
    subject,
    children,
    trigger,
}: {
    /** What is being explained — the tooltip's own heading. */
    subject: string;
    children: ReactNode;
    /**
     * The element that opens it. Must accept a ref and the props Radix puts
     * on a trigger, so a plain element or a `button` — not a fragment.
     */
    trigger: ReactNode;
}) {
    const [hovered, setHovered] = useState(false);
    const [pinned, setPinned] = useState(false);

    return (
        <Tooltip.Root
            open={pinned || hovered}
            onOpenChange={setHovered}
            delayDuration={150}
        >
            <Tooltip.Trigger asChild onClick={() => setPinned((value) => !value)}>
                {trigger}
            </Tooltip.Trigger>

            <Tooltip.Portal>
                <Tooltip.Content
                    side="top"
                    align="center"
                    sideOffset={6}
                    collisionPadding={12}
                    onPointerDownOutside={() => setPinned(false)}
                    onEscapeKeyDown={() => setPinned(false)}
                    className="z-50 max-w-[260px] rounded-xl bg-finn-black px-3 py-2.5 text-[11px] leading-4 text-white shadow-lg"
                >
                    <p className="font-black">{subject}</p>
                    <p className="mt-1 text-white/80">{children}</p>
                    <Tooltip.Arrow className="fill-finn-black" />
                </Tooltip.Content>
            </Tooltip.Portal>
        </Tooltip.Root>
    );
}

interface InfoTipProps {
    /** What the reader is asking about — used as the accessible label. */
    subject: string;
    children: ReactNode;
}

/** The common case: a small "i" that explains a term. */
export function InfoTip({ subject, children }: InfoTipProps) {
    return (
        <Tip
            subject={subject}
            trigger={
                <button
                    type="button"
                    aria-label={`What is ${subject}?`}
                    /* Radix marks its own trigger open, which is how the
                       pinned state survives the trigger being handed in from
                       outside rather than owned here. */
                    className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full align-middle text-finn-iron transition hover:text-finn-accent-blue data-[state=open]:text-finn-accent-blue"
                >
                    <Info aria-hidden="true" className="h-4 w-4" />
                </button>
            }
        >
            {children}
        </Tip>
    );
}
