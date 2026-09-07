import { ExternalLink, Globe } from "lucide-react";
import { FINN_BASE_URL } from "@/lib/constants";
import { FinnLink } from "@/components/FinnLink";

export function GoToFinnSection() {
    return (
        <section className="px-4 pt-8 pb-6">
            <div className="flex flex-col items-center rounded-[22px] border border-dashed border-finn-cotton bg-white px-6 py-9 text-center shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-finn-black/10 text-finn-black">
                    <Globe aria-hidden="true" className="h-6 w-6" />
                </div>

                <p className="mt-4 text-sm font-bold text-finn-black">
                    Head to <FinnLink /> to get started
                </p>

                <p className="mt-1.5 max-w-60 text-xs leading-5 text-finn-iron">
                    FINN Lens activates while you browse car listings, so it can detect
                    and pin cars for you.
                </p>

                <a
                    href={FINN_BASE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-finn-black px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-finn-black/90 active:scale-[0.99]"
                >
                    Open finn.com
                    <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                </a>
            </div>
        </section>
    );
}