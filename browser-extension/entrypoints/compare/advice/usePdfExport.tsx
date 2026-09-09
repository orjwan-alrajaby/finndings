import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";

import { Spinner } from "@/components/Spinner";

import {
    advicePdfOptions,
    PDF_MARGIN_MM,
    placeLinks,
    type LinkRect,
} from "@/lib/advice-pdf";

/**
 * Saving one view of this page as a file.
 *
 * Extracted when the recommendation and the challenge became two views, for
 * the reason the split itself happened: one PDF that contained both was a
 * document that argued for a car and then argued against it, and a reader
 * sending it to somebody could not say which half was the answer. Each view
 * now exports itself, so the file has one subject and its own name.
 *
 * The work is done in an effect rather than in the click handler, because the
 * capture has to happen *after* React has drawn the export version of the
 * page — the controls hidden, the picker gone. Setting the flag and reading
 * the DOM in the same tick would photograph the screen version and put a row
 * of dead buttons in the file.
 *
 * The library is imported at that moment too. It brings html2canvas and jsPDF
 * with it, which together are larger than the rest of this page; loading them
 * when a reader actually asks for a file keeps them out of the cost of
 * opening it.
 */
export function usePdfExport(fileName: string | null) {
    const printable = useRef<HTMLDivElement>(null);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        if (!exporting || !fileName) return;

        let alive = true;

        void (async () => {
            try {
                const { default: generatePDF } = await import("react-to-pdf");

                const pdf = await generatePDF(
                    printable,
                    advicePdfOptions(fileName),
                );

                if (!pdf) return;

                addLinks(pdf, printable.current);

                await pdf.save(fileName, { returnPromise: true });
            } catch (error) {
                console.error("Finn Lens: could not export the PDF", error);
            } finally {
                if (alive) setExporting(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [exporting, fileName]);

    return { printable, exporting, start: () => setExporting(true) };
}

export function ExportButton({
    exporting,
    onExport,
}: {
    exporting: boolean;
    onExport: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onExport}
            disabled={exporting}
            className="finn-lens-screen-only inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-finn-cotton px-4 text-xs font-black text-finn-black transition-colors hover:bg-finn-pale-blue hover:text-finn-accent-blue disabled:cursor-wait disabled:text-finn-iron"
        >
            {exporting ? (
                <>
                    <Spinner className="h-4 w-4" />
                    Building your PDF…
                </>
            ) : (
                <>
                    <Download aria-hidden="true" className="h-4 w-4" />
                    Save as PDF
                </>
            )}
        </button>
    );
}

/** Only the parts of jsPDF this file touches. */
interface PdfInternals {
    pageSize: { width: number; height: number };
}

type LinkTarget = (
    x: number,
    y: number,
    width: number,
    height: number,
    options: { url: string },
) => void;

/**
 * Re-attaching the page's links to the picture of the page.
 *
 * html2canvas produces pixels, so every anchor in the capture arrives as a
 * button that cannot be pressed. PDF carries link annotations separately from
 * what is drawn, which means the hotspots can simply be laid back over the
 * image where the anchors were.
 *
 * Measured after the capture, while the page is still in its export state:
 * anything hidden for the file reports a zero-sized rect and is dropped on
 * that basis rather than by knowing which elements were hidden and why.
 */
function addLinks(
    pdf: {
        setPage: (page: number) => void;
        link: LinkTarget;
        internal: PdfInternals;
    },
    element: HTMLElement | null,
): void {
    if (!element) return;

    const base = element.getBoundingClientRect();

    const links: LinkRect[] = [
        ...element.querySelectorAll<HTMLAnchorElement>("a[href]"),
    ].map((anchor) => {
        const rect = anchor.getBoundingClientRect();

        return {
            /* `.href` rather than the attribute: already absolute. */
            url: anchor.href,
            x: rect.left - base.left,
            y: rect.top - base.top,
            width: rect.width,
            height: rect.height,
        };
    });

    const placements = placeLinks(links, {
        elementWidth: base.width,
        pageWidth: pdf.internal.pageSize.width,
        pageHeight: pdf.internal.pageSize.height,
        margin: PDF_MARGIN_MM,
    });

    for (const placement of placements) {
        pdf.setPage(placement.page);
        pdf.link(placement.x, placement.y, placement.width, placement.height, {
            url: placement.url,
        });
    }
}
