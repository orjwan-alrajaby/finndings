import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_core import *
from gen_symbols import CONCEPTS, c1, c2, c3, c4, c5, _c5_geometry
import gen_core as G

ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def doc(w, h, body, title, desc=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {f(w)} {f(h)}" '
            f'width="{f(w)}" height="{f(h)}" role="img" aria-label="{title}">\n'
            f'<title>{title}</title>\n<desc>{desc}</desc>\n{body}\n</svg>\n')

def place(mk, x, y, size):
    return f'<g transform="translate({f(x)},{f(y)}) scale({f(size/64.0)})">{mk}</g>'

def esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def txt(x, y, s, size=13, fill=IRON, weight="400", anchor="start", track=0):
    s = esc(s)
    ls = f' letter-spacing="{f(track)}"' if track else ""
    return (f'<text x="{f(x)}" y="{f(y)}" font-family="{FONT}" font-size="{f(size)}" '
            f'font-weight="{weight}" fill="{fill}" text-anchor="{anchor}"{ls}>{s}</text>')

def rect(x, y, w, h, fill, rx=0):
    return f'<rect x="{f(x)}" y="{f(y)}" width="{f(w)}" height="{f(h)}" rx="{f(rx)}" fill="{fill}"/>'

# ---------------------------------------------------------------- lockup
def lockup(concept, uid, dark=False, cap=30, sym=48):
    ink    = SNOW if dark else BLACK
    second = "#9BA3AE" if dark else IRON
    accent = BLUE
    mk = concept["fn"](uid, ink, accent)
    fw, fwid, _ = finn_wordmark(ink, 0, 0, cap)
    lw, lwid, _ = lens_word(second, 0, 0, cap, track=12)
    gap1, gap2 = cap * 0.80, cap * 0.95
    top = (sym - cap) / 2.0
    x = 0
    parts = [place(mk, x, 0, sym)]
    x += sym + gap1
    parts.append(f'<g transform="translate({f(x)},{f(top)})">{fw}</g>')
    x += fwid + gap2
    parts.append(f'<g transform="translate({f(x)},{f(top)})">{lw}</g>')
    x += lwid
    return "".join(parts), x, sym

# ------------------------------------------------------- derivation cells
def n_glyph(fill, diag=None):
    """The placeholder N, optionally with its diagonal picked out."""
    adv, poly = GLYPHS["N"]
    pts = " ".join(f"{f(px)},{f(py)}" for px, py in poly)
    out = f'<polygon points="{pts}" fill="{fill}"/>'
    if diag:
        out += f'<polygon points="10,0 26,27 26,40 10,13" fill="{diag}"/>'
    return out, adv

GUIDE = f'stroke="{BLUE}" stroke-width="0.8" fill="none" opacity="0.55"'
DASH  = f'stroke="{IRON}" stroke-width="0.7" fill="none" opacity="0.5" stroke-dasharray="2.5 2"'

def construction(n):
    """Middle cell of the derivation strip: the geometric move, in 64 grid."""
    if n == 1:
        a = math.radians(N_ANGLE); ux, uy = math.cos(a), math.sin(a)
        return (f'<circle cx="32" cy="32" r="27.5" {DASH}/>'
                f'<line x1="{f(32-26*ux)}" y1="{f(32-26*uy)}" x2="{f(32+26*ux)}" y2="{f(32+26*uy)}" {GUIDE}/>'
                f'<path d="{vesica(32,32,17.5,8,N_ANGLE)}" {GUIDE}/>')
    if n == 2:
        return (f'<circle cx="33" cy="25" r="21" {DASH}/>'
                f'<line x1="9.2" y1="27.5" x2="9.2" y2="57" {DASH}/>'
                f'<path d="M 9.2 27.5 C 4 35, 5.5 45, 9 53" {GUIDE}/>'
                f'<line x1="6.4" y1="18.5" x2="23.2" y2="1.7" {GUIDE}/>')
    if n == 3:
        return (f'<rect x="2" y="14" width="59" height="7" {DASH}/>'
                f'<circle cx="16" cy="35" r="14" {DASH}/><circle cx="48" cy="35" r="13.2" {DASH}/>'
                f'<line x1="16" y1="35" x2="48" y2="35" {GUIDE}/>'
                f'<line x1="2" y1="17.5" x2="61" y2="17.5" {GUIDE}/>')
    if n == 4:
        return (f'<circle cx="32" cy="32" r="30" {DASH}/>'
                f'<path d="M 8 40.5 L 8 31 L 17 31 L 24 20.5 L 41 20.5 L 47 31 L 56 31 L 56 40.5 Z" {GUIDE}/>'
                f'<circle cx="22" cy="40.5" r="5.5" {GUIDE}/><circle cx="43" cy="40.5" r="5.5" {GUIDE}/>')
    P1, Q1, Q2, P3, P4, P6, C_ur, C_ll, R = _c5_geometry()
    return (f'<circle cx="32" cy="32" r="30" {DASH}/>'
            f'<g transform="translate(14,12) scale(0.9)"><polygon points="'
            + " ".join(f"{f(px)},{f(py)}" for px, py in GLYPHS["N"][1]) + f'" {DASH}/></g>'
            f'<line x1="18" y1="2" x2="18" y2="62" {GUIDE}/><line x1="46" y1="2" x2="46" y2="62" {GUIDE}/>'
            f'<line x1="{f(P1[0])}" y1="{f(P1[1])}" x2="{f(Q2[0])}" y2="{f(Q2[1])}" {GUIDE}/>'
            f'<line x1="{f(Q1[0])}" y1="{f(Q1[1])}" x2="{f(P4[0])}" y2="{f(P4[1])}" {GUIDE}/>')

DERIV = {
 1: ("The N's diagonal", "Swung onto a circle", "The lens element"),
 2: ("FINN closes nothing", "One circle, one cord", "The monocle"),
 3: ("The F's arm, the two N's", "A brow and two lenses", "The glasses"),
 4: ("The field of view", "A car cut into it", "Lens + car"),
 5: ("The N", "Bent into the circle", "The Lens mark"),
}
CAPTION = {
 1: "FINN's N leans at 59.3°. That angle becomes the axis of the lens element, so the symbol tilts the same way the wordmark does.",
 2: "FINN's four letters contain no closed shape. The monocle adds exactly one, and the cord hangs from the side — never radial, so it can't read as a handle.",
 3: "The brow bar is the F's arm. The doubled lens is FINN's doubled N. One lens is solid: the single thing being looked at.",
 4: "The circle is the field of view. The car is cut out of it, so inside the lens everything inverts — and the silhouette stays a solid disc.",
 5: "The N's stems bend into the circle and become crescents; its counters are cut away; its diagonal survives as the line of sight.",
}
HL = {1: "N-diagonals", 2: "no closed counters", 3: "F-arm + double N", 4: "—", 5: "the N"}

def finn_hl(n, ink, cap=34):
    """FINN wordmark with the part this concept borrows picked out in blue."""
    s = cap / 40.0
    if n in (1, 5):
        mk, x = [], 0.0
        for ch in "FINN":
            adv, poly = GLYPHS[ch]
            pts = " ".join(f"{f(px+x)},{f(py)}" for px, py in poly)
            mk.append(f'<polygon points="{pts}" fill="{ink}"/>')
            if ch == "N":
                d = " ".join(f"{f(px+x)},{f(py)}" for px, py in [(10,0),(26,27),(26,40),(10,13)])
                mk.append(f'<polygon points="{d}" fill="{BLUE}"/>')
            x += adv + 8
        body, w = "".join(mk), x - 8
    elif n == 3:
        mk, x = [], 0.0
        for ch in "FINN":
            adv, poly = GLYPHS[ch]
            pts = " ".join(f"{f(px+x)},{f(py)}" for px, py in poly)
            mk.append(f'<polygon points="{pts}" fill="{BLUE if ch=="N" else ink}"/>')
            if ch == "F":
                mk.append(f'<polygon points="{f(x)},0 {f(x+30)},0 {f(x+30)},10 {f(x)},10" fill="{BLUE}"/>')
            x += adv + 8
        body, w = "".join(mk), x - 8
    else:
        body, w = word("FINN", ink)
    return f'<g transform="scale({f(s)})">{body}</g>', w * s, cap
