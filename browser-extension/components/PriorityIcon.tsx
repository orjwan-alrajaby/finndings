import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
    Backpack01Icon,
    Car01Icon,
    CarFrontIcon,
    CompassIcon,
    Leaf01Icon,
    ScaleIcon,
    ShieldCheckIcon,
    SnowflakeIcon,
    Sofa01Icon,
    UserGroupIcon,
} from "@hugeicons/core-free-icons";

import { MARK_COLOUR } from "@/lib/priority-marks";

/**
 * The mark for one priority or profile.
 *
 * These used to be emoji held as strings in `CATEGORIES` and `PROFILES`, which
 * had the one virtue of travelling anywhere a string goes — into the vanilla
 * panel on finn.com, into the PDF, into stored settings — and a list of
 * problems that virtue paid for. An emoji is drawn by the operating system, so
 * the same priority was a different picture on Windows, macOS and Android, and
 * on none of them did it match the drawn icons beside it.
 *
 * The data now carries a name instead, and the picture is chosen here. The
 * field stays a `string` rather than a union, for two reasons: the panel on
 * finn.com is not React and looks the name up in its own table, and settings
 * saved by an older build still hold an emoji. That second case is why an
 * unknown name renders as itself — a reader who upgrades keeps the mark they
 * had rather than losing it to a placeholder.
 */
const ICONS: Record<string, IconSvgElement> = {
    /* Categories. */
    shield: ShieldCheckIcon,
    users: UserGroupIcon,
    backpack: Backpack01Icon,
    road: CarFrontIcon,
    snowflake: SnowflakeIcon,
    leaf: Leaf01Icon,
    sofa: Sofa01Icon,

    /* Profiles that aren't also categories. */
    compass: CompassIcon,
    scale: ScaleIcon,

    /* The fallback for a priority with no mark of its own. */
    car: Car01Icon,
};

export function PriorityIcon({
    name,
    className = "h-4 w-4",
    tinted = true,
}: {
    name: string;
    /** Sized by the caller, because these sit in boxes from 12px to 28px. */
    className?: string;
    /**
     * Whether to draw the mark in its own colour.
     *
     * On by default, and turned off where the mark sits on a ground that has
     * already claimed a colour — a selected chip that goes solid blue, say.
     * A fixed hue there would either fight the background or fail against it,
     * and inheriting is the only thing that stays legible through a state
     * change the icon knows nothing about.
     */
    tinted?: boolean;
}) {
    const icon = ICONS[name];

    if (!icon) {
        /* An emoji from a previous version's stored settings. */
        return <span aria-hidden="true">{name}</span>;
    }

    return (
        <HugeiconsIcon
            icon={icon}
            className={className}
            color={tinted ? MARK_COLOUR[name] : "currentColor"}
            aria-hidden="true"
        />
    );
}
