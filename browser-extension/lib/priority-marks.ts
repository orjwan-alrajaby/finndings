/**
 * The two tones each mark is drawn in: a dark line and a pale inside.
 *
 * A single flat colour made every mark one silhouette, which reads at a
 * glance and says nothing about the shape once it gets small — a filled sofa
 * and a filled car are two coloured blobs. Splitting the drawing in two puts
 * the outline back without giving up the weight: the line carries the shape,
 * the fill carries the colour, and both come from the same hue so the mark
 * still reads as one thing rather than as an outline with something behind it.
 *
 * Tailwind's own palette, by class rather than by hex. The seven category
 * hues are not a new choice — `CATEGORIES[id].color` has held blue, orange,
 * cyan, amber, sky, green and pink since long before anything drew them, and
 * every one of those values is already a Tailwind 600. This names the hue it
 * was always using and takes the two steps either side of it.
 *
 * 700 and 200 specifically. 800/100 was the other candidate and the pale end
 * of it disappears: these sit on `finn-pale-blue` as often as on white, and a
 * 100-level fill on that ground is not a fill. 200 holds on both.
 *
 * Class strings rather than hex values so the built stylesheet owns the
 * colours — which is also why they are written out in full here. Tailwind
 * finds class names by scanning source text, so `text-blue-700` has to appear
 * as those characters somewhere. Composed at runtime, it would be scanned,
 * not found, and never generated.
 *
 * This lives apart from the React component that usually draws these, because
 * the panel injected into finn.com is not React and needs the same answer.
 */
export interface MarkTone {
    /** The outline. */
    line: string;
    /** The inside. */
    fill: string;
}

/**
 * What an unrecognised mark is drawn in.
 *
 * Also the fallback priority's own pair, since "we don't know which one this
 * is" and "this one has no hue of its own" want the same quiet grey.
 */
export const NEUTRAL_TONE: MarkTone = {
    line: "text-slate-700",
    fill: "fill-slate-200",
};

export const MARK_TONES: Record<string, MarkTone> = {
    /* Categories, in the hue each one's `color` already named. */
    shield: { line: "text-blue-700", fill: "fill-blue-200" },
    users: { line: "text-orange-700", fill: "fill-orange-200" },
    backpack: { line: "text-cyan-700", fill: "fill-cyan-200" },
    road: { line: "text-amber-700", fill: "fill-amber-200" },
    snowflake: { line: "text-sky-700", fill: "fill-sky-200" },
    leaf: { line: "text-green-700", fill: "fill-green-200" },
    sofa: { line: "text-pink-700", fill: "fill-pink-200" },

    /* Profiles that aren't also categories, and so have no hue to inherit. */
    compass: { line: "text-indigo-700", fill: "fill-indigo-200" },
    scale: { line: "text-violet-700", fill: "fill-violet-200" },

    /* The fallback for a custom priority: present, and deliberately quiet. */
    car: NEUTRAL_TONE,
};

/**
 * The same hues, for the surfaces around a mark rather than the mark itself.
 *
 * A mark in its colour inside a white row is a spot of colour on a list that
 * otherwise looks like every other list: five identical rows, five identical
 * blue rank numbers, and nothing to tell Safety from Comfort at a glance but
 * the words. Carrying the hue out to the row — its tile, its rank, its share
 * of the result — lets a reader find a priority by colour and follow it when
 * it moves.
 *
 * The rank badge is the 700, not the 600: white numerals on amber-600 or
 * green-600 fall below 4.5:1, and the badge is small bold text. 700 clears it
 * for every hue here.
 */
export interface SurfaceTone {
    /** A pale ground for a tile or card. */
    ground: string;
    /** The ground on hover, one step up. */
    groundHover: string;
    /** A resting edge on that ground. */
    edge: string;
    /** The edge on hover. */
    edgeHover: string;
    /** The edge of a selected card. */
    edgeStrong: string;
    /** Text in the hue, legible on white and on `ground`. */
    ink: string;
    /** A solid ground that carries white text. */
    solid: string;
    /** A bar or meter fill — not text. */
    bar: string;
    /** The empty part of that meter. */
    track: string;
    /** The start of a gradient wash, for `bg-linear-*` backgrounds. */
    wash: string;
}

export const NEUTRAL_SURFACE: SurfaceTone = {
    ground: "bg-slate-50",
    groundHover: "hover:bg-slate-100",
    edge: "ring-slate-200",
    edgeHover: "hover:ring-slate-400",
    edgeStrong: "ring-slate-600",
    ink: "text-slate-700",
    solid: "bg-slate-700",
    bar: "bg-slate-500",
    track: "bg-slate-100",
    wash: "from-slate-100",
};

export const SURFACE_TONES: Record<string, SurfaceTone> = {
    shield: {
        ground: "bg-blue-50",
        groundHover: "hover:bg-blue-100",
        edge: "ring-blue-200",
        edgeHover: "hover:ring-blue-400",
        edgeStrong: "ring-blue-600",
        ink: "text-blue-700",
        solid: "bg-blue-700",
        bar: "bg-blue-500",
        track: "bg-blue-100",
        wash: "from-blue-100",
    },
    users: {
        ground: "bg-orange-50",
        groundHover: "hover:bg-orange-100",
        edge: "ring-orange-200",
        edgeHover: "hover:ring-orange-400",
        edgeStrong: "ring-orange-600",
        ink: "text-orange-700",
        solid: "bg-orange-700",
        bar: "bg-orange-500",
        track: "bg-orange-100",
        wash: "from-orange-100",
    },
    backpack: {
        ground: "bg-cyan-50",
        groundHover: "hover:bg-cyan-100",
        edge: "ring-cyan-200",
        edgeHover: "hover:ring-cyan-400",
        edgeStrong: "ring-cyan-600",
        ink: "text-cyan-700",
        solid: "bg-cyan-700",
        bar: "bg-cyan-500",
        track: "bg-cyan-100",
        wash: "from-cyan-100",
    },
    road: {
        ground: "bg-amber-50",
        groundHover: "hover:bg-amber-100",
        edge: "ring-amber-200",
        edgeHover: "hover:ring-amber-400",
        edgeStrong: "ring-amber-600",
        ink: "text-amber-700",
        solid: "bg-amber-700",
        bar: "bg-amber-500",
        track: "bg-amber-100",
        wash: "from-amber-100",
    },
    snowflake: {
        ground: "bg-sky-50",
        groundHover: "hover:bg-sky-100",
        edge: "ring-sky-200",
        edgeHover: "hover:ring-sky-400",
        edgeStrong: "ring-sky-600",
        ink: "text-sky-700",
        solid: "bg-sky-700",
        bar: "bg-sky-500",
        track: "bg-sky-100",
        wash: "from-sky-100",
    },
    leaf: {
        ground: "bg-green-50",
        groundHover: "hover:bg-green-100",
        edge: "ring-green-200",
        edgeHover: "hover:ring-green-400",
        edgeStrong: "ring-green-600",
        ink: "text-green-700",
        solid: "bg-green-700",
        bar: "bg-green-500",
        track: "bg-green-100",
        wash: "from-green-100",
    },
    sofa: {
        ground: "bg-pink-50",
        groundHover: "hover:bg-pink-100",
        edge: "ring-pink-200",
        edgeHover: "hover:ring-pink-400",
        edgeStrong: "ring-pink-600",
        ink: "text-pink-700",
        solid: "bg-pink-700",
        bar: "bg-pink-500",
        track: "bg-pink-100",
        wash: "from-pink-100",
    },
    compass: {
        ground: "bg-indigo-50",
        groundHover: "hover:bg-indigo-100",
        edge: "ring-indigo-200",
        edgeHover: "hover:ring-indigo-400",
        edgeStrong: "ring-indigo-600",
        ink: "text-indigo-700",
        solid: "bg-indigo-700",
        bar: "bg-indigo-500",
        track: "bg-indigo-100",
        wash: "from-indigo-100",
    },
    scale: {
        ground: "bg-violet-50",
        groundHover: "hover:bg-violet-100",
        edge: "ring-violet-200",
        edgeHover: "hover:ring-violet-400",
        edgeStrong: "ring-violet-600",
        ink: "text-violet-700",
        solid: "bg-violet-700",
        bar: "bg-violet-500",
        track: "bg-violet-100",
        wash: "from-violet-100",
    },
    car: NEUTRAL_SURFACE,
};

export function surfaceTone(mark: string | undefined): SurfaceTone {
    return (mark && SURFACE_TONES[mark]) || NEUTRAL_SURFACE;
}
