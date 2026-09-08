"""The five FINN Lens symbols. Each returns markup in a 64x64 grid.

signature: sym(uid, ink, accent, micro=False) -> str
  ink    - the primary form colour
  accent - the single deliberate FINN Accent Blue element, or None for mono
  micro  - use the size-optimised master (for 16/24px renders)

Where a mark needs true negative space and no accent colour is supplied, the
counter is cut with a <mask> so the file stays transparent.
"""
import math
from gen_core import f, vesica, circle_line, pt, N_ANGLE

def _knock(uid, ink, solid, holes, hole_fill):
    """Draw `solid` in ink with `holes` removed - as colour, or true cut-out."""
    if hole_fill is not None:
        return solid.format(fill=ink) + holes.format(fill=hole_fill)
    return (f'<mask id="{uid}" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">'
            f'<rect width="64" height="64" fill="#000"/>'
            + solid.format(fill="#fff") + holes.format(fill="#000") + '</mask>'
            f'<rect width="64" height="64" fill="{ink}" mask="url(#{uid})"/>')

# =====================================================================
# CONCEPT 1 - THE LENS.  A lens element held in its housing.
# The element is a true vesica (the cross-section of a real lens), tilted
# onto the angle of the FINN N's diagonal.
# =====================================================================
def c1(uid, ink, accent, micro=False):
    if micro:
        disc  = '<circle cx="32" cy="32" r="30" fill="{fill}"/>'
        holes = '<path d="' + vesica(32, 32, 21, 9.5, N_ANGLE) + '" fill="{fill}"/>'
        return _knock(uid + "-c1", ink, disc, holes, accent)
    ring = f'<circle cx="32" cy="32" r="27.5" fill="none" stroke="{ink}" stroke-width="7"/>'
    el   = f'<path d="{vesica(32,32,17.5,8,N_ANGLE)}" fill="{accent or ink}"/>'
    return ring + el

# =====================================================================
# CONCEPT 2 - THE MONOCLE.  A gallery ring with one flat edge, two glints
# of light across the glass, and a thin cord. Understated, not comic.
# =====================================================================
def _flat_ring(cx, cy, r, sw, ink, a0=200, a1=250):
    ax, ay = cx + r*math.cos(math.radians(a0)), cy + r*math.sin(math.radians(a0))
    bx, by = cx + r*math.cos(math.radians(a1)), cy + r*math.sin(math.radians(a1))
    return (f'<path d="M {f(ax)} {f(ay)} A {f(r)} {f(r)} 0 1 0 {f(bx)} {f(by)} Z" '
            f'fill="none" stroke="{ink}" stroke-width="{f(sw)}" stroke-linejoin="miter"/>')

def _glint(cx, cy, off, half, sw, col):
    a = math.radians(N_ANGLE)
    ux, uy = math.cos(a), math.sin(a)
    nx, ny = -uy, ux                      # perpendicular, toward lower-left
    gx, gy = cx + off*nx, cy + off*ny
    return (f'<line x1="{f(gx-half*ux)}" y1="{f(gy-half*uy)}" x2="{f(gx+half*ux)}" '
            f'y2="{f(gy+half*uy)}" stroke="{col}" stroke-width="{f(sw)}" stroke-linecap="round"/>')

def c2(uid, ink, accent, micro=False):
    g = accent or ink
    if micro:
        cx, cy, r = 32, 32, 25
        return (_flat_ring(cx, cy, r, 7, ink, 198, 262)
                + _glint(cx, cy, 5, 13, 5, g) + _glint(cx, cy, 12.5, 7, 5, g))
    cx, cy, r = 33, 25, 21
    return (_flat_ring(cx, cy, r, 6, ink, 200, 262)
            + _glint(cx, cy, 4, 10.5, 4.5, g) + _glint(cx, cy, 10, 5.5, 4.5, g)
            + f'<path d="M 9.2 27.5 C 4 35, 5.5 45, 9 53" fill="none" stroke="{ink}" '
              f'stroke-width="3" stroke-linecap="round"/>'
            + f'<circle cx="10.5" cy="57" r="3.4" fill="{ink}"/>')

# =====================================================================
# CONCEPT 3 - THE GLASSES.  A browline pair: the brow bar is the F's arm,
# the doubled lens is FINN's doubled N. One lens is solid - the one thing
# being looked at.
# =====================================================================
def c3(uid, ink, accent, micro=False):
    a = accent or ink
    if micro:
        return (f'<rect x="2" y="13" width="59" height="8" fill="{ink}"/>'
                f'<circle cx="16" cy="35" r="10.5" fill="none" stroke="{ink}" stroke-width="7"/>'
                f'<circle cx="48" cy="35" r="13.2" fill="{a}"/>')
    return (f'<rect x="2" y="14" width="59" height="7" fill="{ink}"/>'
            f'<circle cx="16" cy="35" r="11" fill="none" stroke="{ink}" stroke-width="6"/>'
            f'<circle cx="48" cy="35" r="13.2" fill="{a}"/>')

# =====================================================================
# CONCEPT 4 - LENS + CAR.  Three shapes: a bar, two wheels, and a ring.
# The ring is the car's greenhouse - the lens IS the car's cabin, so you
# are looking through the vehicle rather than at it.
# =====================================================================
def c4(uid, ink, accent, micro=False):
    if micro:
        car = ('<path d="M 7 41 L 7 30 L 17 30 L 24 19 L 41 19 L 48 30 L 57 30 L 57 41 Z" fill="{fill}"/>'
               '<circle cx="21.5" cy="41" r="6" fill="{fill}"/><circle cx="43.5" cy="41" r="6" fill="{fill}"/>')
        return _knock(uid + "-c4", ink, '<circle cx="32" cy="32" r="30" fill="{fill}"/>', car, None)
    car = ('<path d="M 8 40.5 L 8 31 L 17 31 L 24 20.5 L 41 20.5 L 47 31 L 56 31 L 56 40.5 Z" fill="{fill}"/>'
           '<circle cx="22" cy="40.5" r="5.5" fill="{fill}"/><circle cx="43" cy="40.5" r="5.5" fill="{fill}"/>')
    out = _knock(uid + "-c4", ink, '<circle cx="32" cy="32" r="30" fill="{fill}"/>', car, None)
    if accent:   # the glass - same blue-is-glass rule as the monocle and glasses
        out += (f'<path d="M 26 23.5 L 31.5 23.5 L 31.5 29.5 L 22.5 29.5 Z" fill="{accent}"/>'
                f'<path d="M 33.5 23.5 L 39 23.5 L 42.5 29.5 L 33.5 29.5 Z" fill="{accent}"/>')
    return out

# =====================================================================
# CONCEPT 5 - THE FINN-DERIVED MARK.  FINN's four letters contain no
# closed shape at all. Lens adds the one thing FINN does not have: a
# circle. Here the N is bent into that circle - its two stems become
# crescents, its counters are cut away, and its diagonal survives as the
# line of sight.
# =====================================================================
def _c5_geometry():
    cx = cy = 32.0; R = 30.0
    xl, xr = 18.0, 46.0                    # inner edges of the two stems
    dx, dy = 28.0, 42.0                    # the N diagonal's run and rise
    up = (xl, 4.0)                         # upper edge of the diagonal band
    lo = (xl, 18.0)                        # lower edge
    tu = circle_line(cx, cy, R, up[0], up[1], dx, dy)
    tl = circle_line(cx, cy, R, lo[0], lo[1], dx, dy)
    P1 = pt(up[0], up[1], dx, dy, tu[0])   # band's upper edge enters the disc
    Q2 = pt(up[0], up[1], dx, dy, tu[1])   # ... and leaves it
    Q1 = pt(lo[0], lo[1], dx, dy, tl[0])
    P4 = pt(lo[0], lo[1], dx, dy, tl[1])
    dyr = math.sqrt(R*R - (xr - cx)**2)
    P3 = (xr, cy - dyr)                    # right stem's inner edge meets disc
    P6 = (xl, cy + dyr)                    # left stem's inner edge meets disc
    C_ur = (xr, up[1] + dy*((xr - xl)/dx)) # corner: diagonal meets right stem
    C_ll = (xl, lo[1])                     # corner: diagonal meets left stem
    return P1, Q1, Q2, P3, P4, P6, C_ur, C_ll, R

def c5(uid, ink, accent, micro=False):
    P1, Q1, Q2, P3, P4, P6, C_ur, C_ll, R = _c5_geometry()
    A = lambda p: f"A {f(R)} {f(R)} 0 0 1 {f(p[0])} {f(p[1])}"
    L = lambda p: f"L {f(p[0])} {f(p[1])}"
    body = (f"M {f(P1[0])} {f(P1[1])} {L(C_ur)} {L(P3)} {A(P4)} {L(C_ll)} {L(P6)} {A(P1)} Z")
    out = f'<path d="{body}" fill="{ink}"/>'
    if accent:
        band = (f"M {f(P1[0])} {f(P1[1])} {L(Q2)} {A(P4)} {L(Q1)} {A(P1)} Z")
        out += f'<path d="{band}" fill="{accent}"/>'
    return out

CONCEPTS = [
    dict(n=1, key="lens",    name="The Lens",
         tag="A lens element on the N's diagonal.",
         fn=c1, micro=True),
    dict(n=2, key="monocle", name="The Monocle",
         tag="A flat gallery, glints, a hanging cord.",
         fn=c2, micro=True),
    dict(n=3, key="glasses", name="The Glasses",
         tag="A browline pair. One lens is solid.",
         fn=c3, micro=True),
    dict(n=4, key="car",     name="Lens + Car",
         tag="The car cut out of the lens.",
         fn=c4, micro=True),
    dict(n=5, key="finn",    name="FINN-Derived",
         tag="The N bent into a circle.",
         fn=c5, micro=False),
]
