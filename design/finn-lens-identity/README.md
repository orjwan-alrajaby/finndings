# Finn Lens — logo & extension icon exploration

Five alternative identity systems for Finn Lens. Everything here is SVG.

> **FINN shows you cars. Finn Lens helps you see them.**

## ⚠️ The FINN wordmark is a placeholder

No FINN logo SVG was supplied, so every lockup uses a drawn geometric stand-in,
isolated in a single group:

```xml
<!-- PLACEHOLDER WORDMARK - replace this entire <g> with the official FINN SVG -->
<g id="finn-wordmark" transform="translate(x,y) scale(s)"> … </g>
```

Swap that one group per lockup file and the lockups are production-ready.
**The symbol geometry is final and independent of it.**

## Files

| Path | What it is |
|---|---|
| `00-overview.svg` | All five marks side by side, at true pixel sizes |
| `concept-N-*/sheet.svg` | Full spec sheet: deliverables 1–7 |
| `concept-N-*/icon-brand.svg` | Standalone icon, FINN Black + Accent Blue |
| `concept-N-*/icon-brand-dark.svg` | Standalone icon, reversed |
| `concept-N-*/icon-black.svg` / `icon-white.svg` | Monochrome, pure black / white |
| `concept-N-*/icon-16-black.svg` / `icon-16-white.svg` | **16/24px master** (see below) |
| `concept-N-*/lockup-light.svg` / `lockup-dark.svg` | Primary logo |

## The system

One observation holds all five together, and it is true of the FINN wordmark
whatever typeface it is set in:

- **F, I, N, N contain no closed shape.** The wordmark is entirely open strokes.
  Lens supplies the one thing FINN never draws: **the circle.**
- **The N's diagonal is the wordmark's signature stroke.** It sets the angle
  (59.3°) used by every lens axis, glint and accent in the system.
- **Blue always means glass** — the lens element, the glints, the solid lens,
  the car's windows, the line of sight. It is never decoration.

## Two masters, not one

Marks 1–4 ship a **simplified 16/24px master** alongside the full one. This is
deliberate, not a fallback: at 16px the details that carry meaning at 128px
become noise. Concept 5 needs no simplification — one master at every size.

The most consequential case is Concept 2. At full size the monocle's cord is
what makes it a monocle; at 16px that same cord is exactly what makes it read
as a magnifying-glass handle. So the 16px master drops it.

## Geometry

All marks are built on a 64-unit grid with a ≥6-unit minimum stroke, so no
stroke falls below 1.5 device pixels at 16×16. Circle/line intersections are
solved rather than eyeballed — see `_c5_geometry()` in `generator/gen_symbols.py`.

The whole set regenerates with `python3 generator/gen_files.py`, so a change to a
radius or stroke weight propagates to all 46 files at once.

Every mark was rasterised through headless Chrome at 16/24/32/48px and
inspected pixel-by-pixel. All five hold a recognisable silhouette at 16px.
Concept 3 is the weakest of the five there — its two lenses nearly merge —
and Concepts 1, 4 and 5 are the strongest, because each presents a solid disc.
