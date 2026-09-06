import {
    Backpack,
    Car,
    Compass,
    Leaf,
    Route,
    Scale,
    Shield,
    Snowflake,
    Sofa,
    Users,
    type LucideIcon,
} from "lucide-react";

/**
 * The mark for one priority or profile.
 *
 * These used to be emoji held as strings in `CATEGORIES` and `PROFILES`, which
 * had the one virtue of travelling anywhere a string goes — into the vanilla
 * panel on finn.com, into the PDF, into stored settings — and a list of
 * problems that virtue paid for. An emoji is drawn by the operating system, so
 * the same priority was a different picture on Windows, macOS and Android, and
 * on none of them did it match the drawn icons beside it. 👨‍👩‍👧 is a
 * four-codepoint sequence that falls back to three separate people where the
 * font is short, 🛡️ carries a variation selector that some renderers ignore,
 * and none of them take a colour, so they could not be dimmed or tinted with
 * the text they sit in.
 *
 * The data now carries a name instead, and the picture is chosen here. The
 * field stays a `string` rather than a union, for two reasons: the panel on
 * finn.com is not React and looks the name up in its own table, and settings
 * saved by an older build still hold an emoji. That second case is why an
 * unknown name renders as itself — a reader who upgrades keeps the mark they
 * had rather than losing it to a placeholder.
 */
const ICONS: Record<string, LucideIcon> = {
    /* Categories. */
    shield: Shield,
    users: Users,
    backpack: Backpack,
    route: Route,
    snowflake: Snowflake,
    leaf: Leaf,
    sofa: Sofa,

    /* Profiles that aren't also categories. */
    compass: Compass,
    scale: Scale,

    /* The fallback for a priority with no mark of its own. */
    car: Car,
};

/** Whether a name resolves to a drawn icon rather than to legacy text. */
export function isPriorityIconName(name: string): boolean {
    return name in ICONS;
}

export function PriorityIcon({
    name,
    className = "h-4 w-4",
}: {
    name: string;
    /** Sized by the caller, because these sit in boxes from 12px to 28px. */
    className?: string;
}) {
    const Icon = ICONS[name];

    if (!Icon) {
        /* An emoji from a previous version's stored settings. */
        return <span aria-hidden="true">{name}</span>;
    }

    return <Icon className={className} aria-hidden="true" />;
}
