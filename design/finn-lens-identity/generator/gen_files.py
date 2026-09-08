import os, sys, itertools
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_core import *
from gen_build import *
from gen_symbols import CONCEPTS

_ctr = itertools.count()
def uid(): return "u%d" % next(_ctr)

W, M = 1200, 40
CW = W - 2 * M
SIZES = [128, 48, 32, 24, 16]

def seclabel(y, s):
    return txt(M, y, s, 11, IRON, "600", track=1.4)

def write(path, s):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, "w").write(s)

def icon_doc(c, ink, accent, micro=False, bg=None, title=""):
    body = c["fn"](uid(), ink, accent, micro=micro and c["micro"])
    pre = rect(0, 0, 64, 64, bg) if bg else ""
    return doc(64, 64, pre + body, title, c["tag"])

# ------------------------------------------------------------------ sheet
def sheet(c):
    n, name = c["n"], c["name"]
    H = 1640
    A_Y, B_Y, C_Y, D_Y, E_Y, F_Y = 152, 376, 628, 848, 1100, 1394
    P = [rect(0, 0, W, H, SNOW)]
    P.append(txt(M, 56, f"CONCEPT {n}", 12, BLUE, "700", track=2))
    P.append(txt(M, 90, name, 30, BLACK, "700"))
    P.append(txt(M + 280, 90, c["tag"], 15, IRON))

    # 1 - primary logo
    P.append(seclabel(A_Y - 12, "1 \u00b7 PRIMARY LOGO"))
    P.append(rect(M, A_Y, CW, 170, COTTON, 6))
    lk, lw, lh = lockup(c, uid(), dark=False, cap=30, sym=48)
    P.append(f'<g transform="translate({f(M+56)},{f(A_Y+(170-lh)/2)})">{lk}</g>')

    # 2/3/4 - standalone icon in all four required renditions
    P.append(seclabel(B_Y - 12, "2 \u00b7 STANDALONE ICON \u2014 3 \u00b7 MONOCHROME \u2014 4 \u00b7 BRAND COLOUR"))
    tw = (CW - 3 * 16) / 4.0
    tiles = [("Brand colour", COTTON, BLACK, BLUE), ("Monochrome", PUREW, PUREK, None),
             ("Monochrome reversed", BLACK, PUREW, None), ("Brand on dark", BLACK, SNOW, BLUE)]
    for i, (lab, bg, ink, acc) in enumerate(tiles):
        tx = M + i * (tw + 16)
        P.append(rect(tx, B_Y, tw, 200, bg, 6))
        P.append(place(c["fn"](uid(), ink, acc), tx + tw/2 - 46, B_Y + 44, 92))
        P.append(txt(tx + tw/2, B_Y + 178, lab, 11,
                     IRON if bg in (COTTON, PUREW) else "#9BA3AE", "500", "middle"))

    # 5/6 - small-size preview on light and on dark
    P.append(seclabel(C_Y - 12, "5 \u00b7 SMALL-SIZE PREVIEW \u2014 6 \u00b7 LIGHT AND DARK"))
    for j, (py, bg, ink, lab) in enumerate([(C_Y, COTTON, BLACK, "On light"),
                                            (D_Y, BLACK, SNOW, "On dark")]):
        P.append(rect(M, py, CW, 200, bg, 6))
        sub = IRON if j == 0 else "#9BA3AE"
        P.append(txt(M + 24, py + 28, lab, 11, sub, "600", track=1.2))
        x = M + 190
        for s in SIZES:
            P.append(place(c["fn"](uid(), ink, BLUE, micro=(s <= 24 and c["micro"])),
                           x, py + 150 - s, s))
            P.append(txt(x + s/2, py + 172, f"{s}px", 10, sub, "400", "middle"))
            x += s + 62
        P.append(txt(M + CW - 24, py + 28,
                     "same master at every size" if not c["micro"]
                     else "16 / 24px use the simplified master", 10, sub, "400", "end"))

    # 7 - how the wordmark becomes the symbol
    P.append(seclabel(E_Y - 12, "7 \u00b7 RELATIONSHIP: FINN WORDMARK \u2192 LENS SYMBOL"))
    P.append(rect(M, E_Y, CW, 250, COTTON, 6))
    steps, cellw = DERIV[n], 240
    for i in range(3):
        cx = M + 70 + i * (cellw + 90)
        if i == 0:
            mk, ww, ch = finn_hl(n, BLACK, 34)
            P.append(f'<g transform="translate({f(cx + (cellw-ww)/2)},{f(E_Y+78)})">{mk}</g>')
        else:
            art = construction(n) if i == 1 else c["fn"](uid(), BLACK, BLUE)
            P.append(place(art, cx + cellw/2 - 46, E_Y + 58, 92))
        P.append(txt(cx + cellw/2, E_Y + 190, steps[i], 12, BLACK, "600", "middle"))
        if i < 2:
            ax = cx + cellw + 34
            P.append(f'<path d="M {f(ax)} {f(E_Y+123)} L {f(ax+26)} {f(E_Y+123)} '
                     f'M {f(ax+20)} {f(E_Y+118)} L {f(ax+26)} {f(E_Y+123)} L {f(ax+20)} {f(E_Y+128)}" '
                     f'stroke="{IRON}" stroke-width="1.4" fill="none"/>')
    P.append(txt(M + 70, E_Y + 224, CAPTION[n], 12, IRON))

    # the lockup reversed
    P.append(seclabel(F_Y - 12, "PRIMARY LOGO \u00b7 REVERSED"))
    P.append(rect(M, F_Y, CW, 170, BLACK, 6))
    lk2, lw2, lh2 = lockup(c, uid(), dark=True, cap=30, sym=48)
    P.append(f'<g transform="translate({f(M+56)},{f(F_Y+(170-lh2)/2)})">{lk2}</g>')
    P.append(txt(M, H - 32, 'The FINN wordmark shown is a PLACEHOLDER \u2014 swap the '
                            '<g id="finn-wordmark"> group for the official FINN SVG. '
                            'The symbol geometry is final.', 11, IRON))
    return doc(W, H, "\n".join(P), f"FINN Lens \u2014 Concept {n}: {name}", c["tag"])


# --------------------------------------------------------------- overview
def overview():
    PITCH, RH, COL0 = 206, 190, M + 430
    H = 236 + len(CONCEPTS) * PITCH + 110
    P = [rect(0, 0, W, H, SNOW)]
    P.append(txt(M, 60, "FINN LENS", 12, BLUE, "700", track=2))
    P.append(txt(M, 98, "Five directions for the Lens symbol", 30, BLACK, "700"))
    P.append(txt(M, 130, "FINN shows you cars. FINN Lens helps you see them.", 15, IRON))
    P.append(txt(M, 168, "One rule holds all five together: FINN's four letters contain no closed "
                         "shape. Lens supplies the circle FINN never draws \u2014 and blue always means glass.",
                 13, BLACK))
    hx = COL0
    for s in SIZES:
        P.append(txt(hx + s/2, 220, f"{s}px", 10, IRON, "500", "middle"))
        hx += s + 62
    for i, c in enumerate(CONCEPTS):
        y = 236 + i * PITCH
        P.append(rect(M, y, CW, RH, COTTON if i % 2 == 0 else "#EDEDED", 6))
        P.append(place(c["fn"](uid(), BLACK, BLUE), M + 34, y + RH/2 - 46, 92))
        P.append(txt(M + 150, y + RH/2 - 8, f"{c['n']}  {c['name']}", 15, BLACK, "700"))
        P.append(txt(M + 150, y + RH/2 + 14, c["tag"], 12, IRON))
        x = COL0
        for s in SIZES:
            P.append(place(c["fn"](uid(), BLACK, None, micro=(s <= 24 and c["micro"])),
                           x, y + 150 - s, s))
            x += s + 62
        P.append(rect(M + CW - 146, y + RH/2 - 62, 124, 124, BLACK, 6))
        P.append(place(c["fn"](uid(), SNOW, BLUE), M + CW - 130, y + RH/2 - 46, 92))
    P.append(txt(M, H - 52, "Left: brand colour. Centre: monochrome at true pixel sizes "
                            "(16 and 24px use each concept's simplified master). Right: reversed on FINN Black.",
                 12, IRON))
    return doc(W, H, "\n".join(P), "FINN Lens \u2014 five directions", "Overview contact sheet")

# ------------------------------------------------------------------ emit
for c in CONCEPTS:
    d = f"{ROOT}/concept-{c['n']}-{c['key']}"
    write(f"{d}/sheet.svg", sheet(c))
    write(f"{d}/icon-brand.svg",      icon_doc(c, BLACK, BLUE, title=f"FINN Lens icon — {c['name']}"))
    write(f"{d}/icon-brand-dark.svg", icon_doc(c, SNOW,  BLUE, title=f"FINN Lens icon reversed — {c['name']}"))
    write(f"{d}/icon-black.svg",      icon_doc(c, PUREK, None, title=f"FINN Lens icon mono — {c['name']}"))
    write(f"{d}/icon-white.svg",      icon_doc(c, PUREW, None, title=f"FINN Lens icon mono reversed — {c['name']}"))
    write(f"{d}/icon-16-black.svg",   icon_doc(c, PUREK, None, micro=True, title=f"FINN Lens 16px master — {c['name']}"))
    write(f"{d}/icon-16-white.svg",   icon_doc(c, PUREW, None, micro=True, title=f"FINN Lens 16px master reversed — {c['name']}"))
    for dark in (False, True):
        lk, lw, lh = lockup(c, uid(), dark=dark, cap=32, sym=52)
        pad = 40
        bg = rect(0, 0, lw + pad*2, lh + pad*2, BLACK if dark else SNOW)
        write(f"{d}/lockup-{'dark' if dark else 'light'}.svg",
              doc(lw + pad*2, lh + pad*2, bg + f'<g transform="translate({f(pad)},{f(pad)})">{lk}</g>',
                  f"FINN Lens lockup — {c['name']}", c["tag"]))
write(f"{ROOT}/00-overview.svg", overview())
print("files written:")
for r, dd, ff in sorted(os.walk(ROOT)):
    for x in sorted(ff): print(" ", os.path.relpath(os.path.join(r, x), ROOT))
