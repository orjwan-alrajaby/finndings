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
import {
    Briefcase,
    Car,
    CarFront,
    Leaf,
    Navigation,
    Scale,
    ShieldCheck,
    Snowflake,
    Sofa,
    Users,
    type LucideIcon,
} from "lucide-react";

import { MARK_COLOUR } from "@/lib/priority-marks";

/**
 * The marks, chosen to survive being filled.
 *
 * Lucide has no solid set — every icon in it is line art — so "solid" here
 * means filling the outline, and whether that works is a property of the
 * shape. An icon drawn as one closed silhouette fills into a solid version of
 * itself; one that relies on internal detail loses the detail, and one built
 * from an outer ring plus something inside becomes a disc.
 *
 * Two marks were changed for that reason rather than for meaning. A filled
 * `Backpack` is a featureless lozenge — the straps and pocket that make it a
 * backpack are interior lines — where a briefcase reads as a case at 16px.
 * A filled `Compass` is the worst case of all: the needle is inside the ring,
 * so it fills to a plain circle and says nothing. `Navigation` is the same
 * idea drawn as a solid arrow, and it is the one that survives.
 *
 * `ShieldCheck` keeps its name though the tick inside it disappears when
 * filled, because the tick comes back the moment `solid` is off and choosing
 * the plain `Shield` here would quietly throw that away.
 */
const ICONS: Record<string, LucideIcon> = {
    /* Categories. */
    shield: ShieldCheck,
    users: Users,
    backpack: Briefcase,
    road: CarFront,
    snowflake: Snowflake,
    leaf: Leaf,
    sofa: Sofa,

    /* Profiles that aren't also categories. */
    compass: Navigation,
    scale: Scale,

    /* The fallback for a priority with no mark of its own. */
    car: Car,
};

export function PriorityIcon({
    name,
    className = "h-4 w-4",
    tinted = true,
    solid = true,
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
    /**
     * Whether to fill the mark rather than draw it as an outline.
     *
     * On by default. At the sizes these actually appear — mostly 12 to 20
     * pixels — a filled shape survives the reduction and an outline starts
     * losing the detail that distinguishes it. `Snowflake` is the exception
     * and always looks the same, because it is all strokes and encloses
     * nothing for a fill to reach.
     */
    solid?: boolean;
}) {
    const Icon = ICONS[name];

    if (!Icon) {
        /* An emoji from a previous version's stored settings. */
        return <span aria-hidden="true">{name}</span>;
    }

    return (
        <Icon
            className={className}
            color={tinted ? MARK_COLOUR[name] : "currentColor"}
            fill={solid ? "currentColor" : "none"}
            aria-hidden="true"
        />
    );
}
