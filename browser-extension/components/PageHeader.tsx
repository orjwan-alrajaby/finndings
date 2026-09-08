import type { ReactNode } from "react";

/**
 * The bar every Finn Lens page wears.
 *
 * The three pages were each introducing themselves differently — one with a
 * sticky bar of pills, two with a block of prose and a couple of buttons
 * floated opposite it — which meant moving between them felt like moving
 * between products. The way *out* of a page is the part that has to be in the
 * same place every time; the page's own title is not.
 *
 * So the header carries only the mark and the controls, and the page title
 * belongs to the page underneath it. Whatever a page can send the reader to
 * goes in here, in the same shape, at the same end.
 */
export function PageHeader({
    children,
    sticky = true,
}: {
    /** The page's controls — `NavButton`s, in order of usefulness. */
    children: ReactNode;
    /**
     * Whether the bar follows the reader down the page. Settings says no: it
     * has its own sticky row for the tabs and the Save button, and the one
     * control that must never scroll away there is Save.
     */
    sticky?: boolean;
}) {
    return (
        <header
            className={[
                "flex flex-wrap items-center justify-between gap-3",
                "border-b border-finn-cotton/70 bg-finn-snow/90 px-4 py-3",
                "backdrop-blur-md sm:px-6 lg:px-10",
                sticky ? "sticky top-0 z-30" : "",
            ].join(" ")}
        >
            <p className="text-xs font-black uppercase tracking-[0.16em] text-finn-accent-blue">
                Finn Lens
            </p>

            <nav className="flex flex-wrap items-center gap-2">{children}</nav>
        </header>
    );
}

/**
 * One control in that bar.
 *
 * Labels collapse below `sm` and the icon carries the meaning, so a narrow
 * window loses the words rather than the buttons. Every page keeps its one
 * primary action — the thing that page is a step towards — and everything
 * else stays quiet.
 */
export function NavButton({
    icon,
    label,
    onClick,
    variant = "quiet",
    disabled,
    title,
    active,
    expanded,
}: {
    icon: ReactNode;
    label: string;
    onClick: () => void;
    variant?: "primary" | "quiet";
    disabled?: boolean;
    /** Shown on hover — the place to say why a disabled control is disabled. */
    title?: string;
    /** Marks a control whose effect is currently on screen. */
    active?: boolean;
    /** For a control that opens something: its state. */
    expanded?: boolean;
}) {
    const primary = variant === "primary";

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            aria-expanded={expanded}
            className={[
                "inline-flex h-10 items-center gap-2 rounded-full px-3.5",
                "text-xs font-black shadow-sm transition-colors",
                disabled
                    ? "cursor-not-allowed bg-finn-cotton text-finn-iron shadow-none"
                    : active
                      ? "bg-finn-accent-blue text-white"
                      : primary
                        ? "bg-finn-accent-blue text-white hover:bg-finn-highlight-navy"
                        : "bg-white text-finn-black hover:bg-finn-pale-blue",
            ].join(" ")}
        >
            <span aria-hidden="true" className="shrink-0">
                {icon}
            </span>

            <span className="hidden sm:inline">{label}</span>
        </button>
    );
}
