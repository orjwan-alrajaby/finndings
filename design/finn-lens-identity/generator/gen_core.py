"""FINN Lens identity exploration - geometry core.

All symbols live in a 64x64 unit grid. Strokes are >= 6 units so that at a
16px render every stroke is >= 1.5 device pixels. Nothing here is eyeballed:
circle/line intersections are solved, so the marks stay true when scaled.
"""
import math

# ---------------------------------------------------------------- palette
BLACK  = "#191919"
BLUE   = "#0072EA"
NAVY   = "#003087"
IRON   = "#707070"
COTTON = "#F3F3F3"
SNOW   = "#F8F8F8"
PALE   = "#EAF4FF"
PUREK  = "#000000"
PUREW  = "#FFFFFF"

FONT = "system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

def f(v):
    """Trim floats so the SVG source stays readable."""
    return f"{v:.2f}".rstrip("0").rstrip(".")

# ------------------------------------------------------- geometry helpers
def circle_line(cx, cy, r, px, py, dx, dy):
    """Params t where (px,py)+t*(dx,dy) meets the circle. Returns sorted list."""
    fx, fy = px - cx, py - cy
    a = dx * dx + dy * dy
    b = 2 * (fx * dx + fy * dy)
    c = fx * fx + fy * fy - r * r
    disc = b * b - 4 * a * c
    if disc < 0:
        return []
    s = math.sqrt(disc)
    return sorted([(-b - s) / (2 * a), (-b + s) / (2 * a)])

def pt(px, py, dx, dy, t):
    return (px + t * dx, py + t * dy)

def vesica(cx, cy, half_len, half_wid, ang_deg):
    """A lens (vesica) of given length/width, long axis at ang_deg."""
    a = math.radians(ang_deg)
    ux, uy = math.cos(a), math.sin(a)
    x1, y1 = cx - half_len * ux, cy - half_len * uy
    x2, y2 = cx + half_len * ux, cy + half_len * uy
    # radius whose sagitta over the half-chord equals half_wid
    R = (half_len ** 2 + half_wid ** 2) / (2 * half_wid)
    return (f"M {f(x1)} {f(y1)} A {f(R)} {f(R)} 0 0 1 {f(x2)} {f(y2)} "
            f"A {f(R)} {f(R)} 0 0 1 {f(x1)} {f(y1)} Z")

# The signature stroke of the FINN wordmark: the diagonal of the N.
# Measured off the placeholder N below (rise 27 over run 16) and reused as the
# angle of every lens axis, glint and accent band in the system.
N_ANGLE = math.degrees(math.atan2(27.0, 16.0))   # ~59.3 deg from horizontal

# ----------------------------------------------------- placeholder letters
# Cap height 40, stem 10. Straight-sided geometric grotesque standing in for
# the official FINN wordmark until the real SVG is dropped in.
GLYPHS = {
    "F": (30, [(0,0),(30,0),(30,10),(10,10),(10,15),(26,15),(26,25),(10,25),(10,40),(0,40)]),
    "I": (10, [(0,0),(10,0),(10,40),(0,40)]),
    "N": (36, [(0,40),(0,0),(10,0),(26,27),(26,0),(36,0),(36,40),(26,40),(10,13),(10,40)]),
    "L": (28, [(0,0),(10,0),(10,30),(28,30),(28,40),(0,40)]),
    "E": (30, [(0,0),(30,0),(30,10),(10,10),(10,15),(26,15),(26,25),(10,25),(10,30),(30,30),(30,40),(0,40)]),
}
S_PATH = "M 18.75 6 A 7.5 7.5 0 1 0 15 20 A 7.5 7.5 0 1 1 11.25 34"
S_ADV = 28

def word(text, fill, track=8):
    """Render placeholder caps at cap-height 40. Returns (markup, width)."""
    out, x = [], 0.0
    for ch in text:
        if ch == " ":
            x += 16 + track
            continue
        if ch == "S":
            out.append(f'<path d="{S_PATH}" transform="translate({f(x)},0)" fill="none" '
                       f'stroke="{fill}" stroke-width="10" stroke-linecap="butt"/>')
            x += S_ADV + track
            continue
        adv, poly = GLYPHS[ch]
        pts = " ".join(f"{f(px + x)},{f(py)}" for px, py in poly)
        out.append(f'<polygon points="{pts}" fill="{fill}"/>')
        x += adv + track
    return "\n".join(out), x - track

def finn_wordmark(fill, x=0, y=0, cap=40):
    """The swappable placeholder. Replace this whole <g> with the real file."""
    mk, w = word("FINN", fill)
    s = cap / 40.0
    g = (f'<!-- PLACEHOLDER WORDMARK - replace this entire <g> with the official FINN SVG -->\n'
         f'<g id="finn-wordmark" transform="translate({f(x)},{f(y)}) scale({f(s)})">\n{mk}\n</g>')
    return g, w * s, cap

def lens_word(fill, x=0, y=0, cap=40, track=10):
    mk, w = word("LENS", fill, track=track)
    s = cap / 40.0
    return (f'<g id="lens-wordmark" transform="translate({f(x)},{f(y)}) scale({f(s)})">\n{mk}\n</g>',
            w * s, cap)
