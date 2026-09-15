import type { ReactNode } from "react";
import { Pin, Scale, Settings } from "lucide-react";

import { BRAND_IDLE_SPIN } from "@/lib/brand-spinner";
import type { ActionType } from "@/lib/types";
import { openBrowserTab } from "@/lib/utils";
import Logo from "/icon/128.png";

export type AppPage = "compare" | "pins" | "settings";

/**
 * The pages a reader moves between, in the order the bar shows them.
 *
 * Fixed here rather than chosen by each page. Every page used to list the
 * *other* two, so the set of buttons changed shape from page to page and the
 * one you were on was never in it — nothing in the bar said where you were.
 * The same three, in the same place, with the current one filled in, does.
 */
const PAGES: {
    page: AppPage;
    label: string;
    icon: ReactNode;
    action: ActionType;
}[] = [
    {
        page: "compare",
        label: "Recommendation",
        icon: <Scale aria-hidden="true" className="h-4 w-4" />,
        action: "OPEN_COMPARE_PAGE",
    },
    {
        page: "pins",
        label: "Pinned cars",
        icon: <Pin aria-hidden="true" className="h-4 w-4" />,
        action: "OPEN_PINS_PAGE",
    },
    {
        page: "settings",
        label: "Settings",
        icon: <Settings aria-hidden="true" className="h-4 w-4" />,
        action: "OPEN_SETTINGS_PAGE",
    },
];

/**
 * The bar every Finn Lens page wears.
 *
 * The three pages were each introducing themselves differently — one with a
 * sticky bar of pills, two with a block of prose and a couple of buttons
 * floated opposite it — which meant moving between them felt like moving
 * between products. The way *out* of a page is the part that has to be in the
 * same place every time; the page's own title is not.
 *
 * So the header carries only the mark, the page switcher and any controls of
 * the page's own, and the page title belongs to the page underneath it.
 */
export function PageHeader({
    current,
    pinnedCount,
    children,
    sticky = true,
}: {
    /** The page this bar sits on — highlighted in the switcher. */
    current: AppPage;
    /**
     * How many cars are pinned, if the page knows. At zero the
     * recommendation has nothing behind it, so its link is disabled
     * everywhere except on the recommendation page itself, which has an
     * empty state of its own to explain that.
     */
    pinnedCount?: number | null;
    /** Controls that belong to this page only — `NavButton`s. */
    children?: ReactNode;
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
            {/*
              * The mark and the name, together, at the same end of every bar.
              *
              * The name alone was doing the work of saying whose page this is,
              * and a line of small blue capitals is not something a reader
              * recognises across three pages, a popup and a panel drawn inside
              * somebody else's site. The wheel is — it is the icon in their
              * toolbar and the disc on the pill over the photograph. Set
              * beside the words it turns a label into the product signing its
              * own page.
              *
              * `aria-hidden` on the image because the text next to it already
              * says the name; announcing both would read it twice.
              */}
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-finn-accent-blue">
                <img
                    src={Logo}
                    alt=""
                    aria-hidden="true"
                    className={`h-6 w-6 shrink-0 object-contain ${BRAND_IDLE_SPIN}`}
                />

                Finn Lens
            </p>

            <div className="flex flex-wrap items-center gap-2">
                {children}

                <nav aria-label="Finn Lens pages">
                    <ul className="flex items-center gap-1 rounded-full bg-white p-1 shadow-sm">
                        {PAGES.map(({ page, label, icon, action }) => {
                            const unavailable =
                                page === "compare" && pinnedCount === 0;

                            return (
                                <li key={page}>
                                    <PageLink
                                        icon={icon}
                                        label={label}
                                        current={page === current}
                                        onClick={() => void openBrowserTab(action)}
                                        disabled={unavailable}
                                        title={
                                            unavailable
                                                ? "Pin a car first — there's nothing to recommend yet"
                                                : undefined
                                        }
                                    />
                                </li>
                            );
                        })}
                    </ul>
                </nav>
            </div>
        </header>
    );
}

/**
 * One segment of the page switcher.
 *
 * The current page is filled and is not a button: pressing it would only
 * refocus the tab the reader is already looking at. `aria-current` tells a
 * screen reader the same thing the fill tells everyone else.
 */
function PageLink({
    icon,
    label,
    current,
    onClick,
    disabled,
    title,
}: {
    icon: ReactNode;
    label: string;
    current: boolean;
    onClick: () => void;
    disabled?: boolean;
    title?: string;
}) {
    const shape =
        "inline-flex h-8 items-center gap-2 rounded-full px-3 text-xs font-black transition-colors";

    if (current) {
        return (
            <span
                aria-current="page"
                title={label}
                className={`${shape} bg-finn-accent-blue text-white`}
            >
                {icon}
                <span className="sr-only sm:not-sr-only">{label}</span>
            </span>
        );
    }

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title ?? label}
            className={[
                shape,
                disabled
                    ? "cursor-not-allowed text-finn-iron/60"
                    : "text-finn-black hover:bg-finn-pale-blue",
            ].join(" ")}
        >
            {icon}
            <span className="sr-only sm:not-sr-only">{label}</span>
        </button>
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
                      ? /* Not the switcher's fill — that means "you are here". */
                        "bg-finn-pale-blue text-finn-highlight-navy ring-1 ring-finn-accent-blue"
                      : primary
                        ? "bg-finn-accent-blue text-white hover:bg-finn-highlight-navy"
                        : "bg-white text-finn-black hover:bg-finn-pale-blue",
            ].join(" ")}
        >
            <span aria-hidden="true" className="shrink-0">
                {icon}
            </span>

            <span className="sr-only sm:not-sr-only">{label}</span>
        </button>
    );
}
