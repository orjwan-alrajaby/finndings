import { ExternalLink, Pin } from "lucide-react";

import { FINN_BASE_URL } from "@/lib/constants";
import { EmptyState } from "@/components/EmptyState";
import { FinnLink } from "@/components/FinnLink";

/** The whole page, before anything has been pinned. */
export function NothingPinned() {
    return (
        <EmptyState
            icon={<Pin aria-hidden="true" className="h-7 w-7" />}
            title="Nothing pinned yet"
        >
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-finn-iron">
                Lens adds a pin button to every car on <FinnLink />. Pin the ones
                you're weighing up and they collect here, ready to compare.
            </p>

            <a
                href={FINN_BASE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-finn-accent-blue px-6 text-sm font-black text-white shadow-sm transition hover:bg-finn-highlight-navy"
            >
                Open finn.com
                <ExternalLink aria-hidden="true" className="h-4 w-4" />
            </a>
        </EmptyState>
    );
}
