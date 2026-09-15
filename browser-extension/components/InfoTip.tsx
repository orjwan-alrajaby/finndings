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
            <Tooltip.Trigger
                asChild
                onClick={() => setPinned((value) => !value)}
                /*
                 * Pinned is this component's state, not Radix's, so it is
                 * handed to the trigger as an attribute — the only way a
                 * trigger passed in from outside can style "you clicked me"
                 * differently from "the pointer is over me".
                 */
                data-pinned={pinned ? "" : undefined}
            >
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
                    /*
                     * Above everything, because a tooltip is by definition
                     * the thing most recently asked for. At `z-50` it was
                     * below two surfaces that can contain one — the priority
                     * panel is `z-[61]` and the setup flow's bars are `z-60`
                     * and `z-[62]` — and both portal to the same body, so an
                     * explanation opened from inside either simply rendered
                     * behind it.
                     */
                    className="z-[70] max-w-[260px] rounded-xl bg-finn-black px-3 py-2.5 text-[11px] leading-4 text-white shadow-lg"
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
                    /*
                     * Two states, told apart. Showing on hover or focus, the
                     * "i" takes the accent; pinned open by a click, it fills
                     * solid with a halo, the way a selected priority "i" does.
                     *
                     * Radix marks a tooltip trigger `delayed-open` or
                     * `instant-open`, never `open` — the `data-[state=open]`
                     * this used to rely on never matched, so the "i" gave no
                     * sign at all that its explanation was showing.
                     */
                    className={[
                        "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full align-middle text-finn-iron transition",
                        "hover:text-finn-accent-blue not-data-[state=closed]:text-finn-accent-blue",
                        "data-pinned:scale-110 data-pinned:bg-finn-accent-blue data-pinned:text-white data-pinned:shadow-md",
                        "data-pinned:ring-2 data-pinned:ring-finn-accent-blue data-pinned:ring-offset-2 data-pinned:ring-offset-white",
                    ].join(" ")}
                >
                    <Info aria-hidden="true" className="h-4 w-4" />
                </button>
            }
        >
            {children}
        </Tip>
    );
}
