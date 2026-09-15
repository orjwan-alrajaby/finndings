import Logo from "/icon/128.png";

/**
 * The mark at the top of the exported file, and only there.
 *
 * On screen these two documents sit under the page's own bar, which already
 * carries the lockup; a second one directly beneath it would be the page
 * signing itself twice. But the PDF is a photograph of the printable subtree
 * alone — the bar is not in it — so a file that somebody forwards to a
 * partner or a manager arrived with nothing on it saying who worked the
 * numbers out. This is that line, and `finn-lens-export-only` is what keeps
 * it out of the reading.
 *
 * Deliberately not spun: `BRAND_IDLE_SPIN` is a sign of life for a live page,
 * and a capture of a rotating element freezes the wheel at whatever angle it
 * happened to be at, which in a document reads as a crooked logo.
 */
export function ExportMasthead() {
    return (
        <div className="finn-lens-export-only mb-5 border-b border-finn-cotton pb-4">
            <span className="flex items-center gap-2">
                <img
                    src={Logo}
                    alt=""
                    aria-hidden="true"
                    className="h-7 w-7 shrink-0 object-contain"
                />

                <span className="text-sm font-black uppercase tracking-[0.16em] text-finn-accent-blue">
                    Finn Lens
                </span>
            </span>
        </div>
    );
}
