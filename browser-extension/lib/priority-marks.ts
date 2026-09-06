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
