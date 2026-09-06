import { useState, type ReactNode } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Info } from "lucide-react";

interface InfoTipProps {
    /** What the reader is asking about — used as the accessible label. */
    subject: string;
    children: ReactNode;
}

/**
 * A small "i" that explains a term without sending the reader to Google.
 *
 * Opens on hover and on focus like a normal tooltip, and *stays* open when
 * clicked — the explanations here are a sentence or two long, and a panel
 * that vanishes when the pointer drifts is no use for reading.
 *
 * Built on the Radix tooltip the compare page already provides, so it
 * inherits the existing positioning, portalling and dismissal behaviour
 * rather than introducing a second interaction model.
 */
export function InfoTip({ subject, children }: InfoTipProps) {
    const [hovered, setHovered] = useState(false);
    const [pinned, setPinned] = useState(false);

    return (
        <Tooltip.Root
            open={pinned || hovered}
            onOpenChange={setHovered}
            delayDuration={150}
        >
            <Tooltip.Trigger asChild>
                <button
                    type="button"
                    aria-label={`What is ${subject}?`}
                    onClick={() => setPinned((value) => !value)}
                    className={[
                        "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full align-middle transition",
                        pinned
                            ? "text-finn-accent-blue"
                            : "text-finn-iron hover:text-finn-accent-blue",
                    ].join(" ")}
                >
                    <Info className="h-4 w-4" />
                </button>
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
