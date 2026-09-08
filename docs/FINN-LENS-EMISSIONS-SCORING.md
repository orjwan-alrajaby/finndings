# Finn Lens — Emissions & Efficiency Scoring

> **Status of this document.** A design record for the Environmental Impact priority as
> rebuilt in commit `7f3e212`, written so another engineer can change it without having to
> re-derive the reasoning. It describes what was actually built and the published evidence
> it rests on. Verified at the time of writing (`7b455be`, 2026-09-05): `npx tsc --noEmit`
> clean, `npx vitest run` green (28 files, 509 tests), 40 of them in `environmental.test.ts`.
>
> `FINN-LENS-HANDOFF.md` §3 summarises this model in a paragraph. This document is the
> long form: why it is the way it is, and what would have to change to change it.
>
> **Amended 2026-09-06.** §12 covers the explanation layer added on top of the model — the
> scoring below is unchanged. Two claims in the copy were corrected at the same time and are
> marked in place: the efficiency benchmark is the combustion fleet average, not "a typical
> petrol car" (§5), and a plug-in hybrid's figure is now labelled for what it is (§6).

---

## 1. Why it was rebuilt

The previous model produced four independent 0–100 sub-scores and averaged them. A reader
saw `CO₂ 49/100 · class 50/100 · consumption 53/100 · fuel type 20/100` and had no way to
interpret any of it.

```
// the shape of the old model
score = mean(
  co2Score,         // 100 × (1 − g/km ÷ 250)
  co2ClassScore,    // A=100 … G=0
  consumptionScore, // 100 × (1 − L or kWh ÷ ceiling)
  powertrainScore,  // Electric 100, PHEV 55, Diesel 20, Petrol 20
)
```

**Three of those four were the same measurement.**

- **The CO₂ class is a pure function of the CO₂ figure.** Since the 2024 Pkw-EnVKV amendment
  the German class is derived from WLTP combined g/km alone.
- **Consumption is the CO₂ figure too**, for anything that burns fuel: CO₂ per km *is*
  litres per km × the carbon in a litre.
- **Fuel type is not a measurement at all.** Scoring it marked a petrol car down twice for
  being petrol — once in its CO₂, once for the fuel that produced that CO₂.

The practical consequence: a user who wanted a petrol car was told *petrol is bad* four
times over, rather than which petrol car was the good one. The arithmetic was false
precision — averaging four numbers, three of which were the same number.

### A separate bug the audit turned up

`lib/translate.ts` had **no entry for `Diesel`** and spelled the hybrid `"Plug-In-Hybrid"`
where FINN sends `"Plug-in Hybrid"`. Both arrived with `fuelType: undefined`.

Blast radius beyond this feature: `energyPriceFor()` in `cost.ts` falls through to the petrol
price for anything not `Electric` or `Diesel`, so **every diesel was costed at petrol
prices**. The PHEV caveat also never fired, for any PHEV. Fixed in the same commit, guarded
by `lib/translate.test.ts`.

---

## 2. What the evidence says

Four findings decided the model. Each is quoted in the header comment of `environmental.ts`
so the reasoning travels with the code; full citations are in §10.

| Finding | Evidence | Consequence |
| --- | --- | --- |
| **Class ≡ CO₂** | Pkw-EnVKV §3a as amended Feb 2024 sets classes on absolute WLTP CO₂: A 0, B ≤95, C ≤115, D ≤135, E ≤155, F ≤175, G ≥176. ADAC on what changed: *"Der Bezug zum Fahrzeuggewicht entfällt."* | Class is displayed, never scored. Before 2024 it was weight-adjusted and did carry extra information; it no longer does. |
| **Consumption ≡ CO₂** | EC real-world monitoring gives petrol's 1.2 L/100 km gap as 28 g CO₂/km — that ratio *is* the 2,330 g of carbon in a litre. Diesel ≈ 2,640 g/L. | Consumption leaves the score entirely and becomes a separate, cohort-relative efficiency answer. |
| **PHEV gap** | ICCT: real-world CO₂ averages ~5× official; the gap grew from 265% (2021) to 400% (2023). Cause is a type-approval utility factor assuming more charging than happens. EC revised it in 2025, again due 2027. | PHEV scale compressed, not corrected. No real-world figure is invented. |
| **Fleet references** | ICCT: combustion incl. hybrids ≈ 136 g/km WLTP, flat since 2021. BEV real-world ≈ 19 kWh/100 km running ~12% above type-approval → ≈ 17 kWh/100 km WLTP. | Every efficiency threshold is derived from these two published numbers rather than chosen. |

---

## 3. The model

Three parts. Only one of them scores.

**Environmental Impact.** Tailpipe CO₂ g/km, placed on the EU's own class scale. *This is
the only thing that moves the category score.* The boundaries are the regulation's.

**Efficiency.** A separate, cohort-relative reading of consumption — "frugal *for a petrol
car*". Contributes zero points. It exists because a litre and a kilowatt-hour are not
comparable quantities, and because a petrol buyer needs to know which petrol car is the
frugal one.

**Powertrain.** Context only. Selects the efficiency cohort and carries the caveats.
Contributes zero points.

**CO₂ class.** Displayed beside the figure as its familiar shorthand — and *computed* from
the figure by `co2ClassFor()` rather than read from FINN's field, because a pre-2024 car can
carry a letter that disagrees with its own emissions.

> **The design principle worth keeping.** The two answers are *allowed to disagree*, and
> that disagreement is the product value. A Mercedes EQS SUV is a *strong environmental
> match* and a *less efficient electric car*. A frugal petrol car is *highly efficient* and
> still a worse emitter than any EV. One score cannot hold both; two answers can.

---

## 4. The CO₂ class ladder

Each class occupies a *stretch* of the 0–100 scale, and every stretch sits wholly inside one
of Lens's existing fit bands (`strong ≥65 · good ≥45 · partial ≥25`, from `fit.ts`). So the
class decides the word the reader sees, and the figure decides where within it.

| Class | CO₂ | Score stretch | Fit band |
| --- | --- | --- | --- |
| **A** | 0 g/km | 100 | Strong match |
| **B** | 1 – 95 g/km | 88 → 70 | Strong match |
| **C** | 96 – 115 g/km | 64 → 52 | Good match |
| **D** | 116 – 135 g/km | 44 → 34 | Partial match |
| **E** | 136 – 155 g/km | 33 → 28 | Partial match |
| **F** | 156 – 175 g/km | 22 → 14 | Limited match |
| **G** | 176 g/km and up | 12 → 0 | Limited match |

Class G has no upper bound in law; the scale stops distinguishing at 195 g/km, one
band-width past where G starts.

`positionForCo2()` interpolates within a class, so a 118 g/km car and a 134 g/km car are
both class D and are *not* reported as the same car — while neither can ever outrank a
class C one.

> **The one product judgement in the file.** The class → position table (`CLASS_POSITION`)
> is calibrated so a car of average emissions reads as a **partial match** to someone who
> put the environment near the top of their list. D is the commonest class among cars that
> burn fuel. That is a deliberate call, not an accident — and it is the single table a
> future engineer would tune. Not the thresholds, not the labels.

---

## 5. Efficiency references are derived, not chosen

No threshold in this model was picked by hand. Each cohort's typical consumption falls out
of the ICCT fleet average read through the fuel's own carbon content:

```
// cohortFor() — environmental.ts
petrol   136 g/km ÷ 2330 g/L × 100  =  5.8 L/100 km   typical
diesel   136 g/km ÷ 2640 g/L × 100  =  5.15 L/100 km  typical
electric (no CO₂ to derive from — every BEV is 0)
                                    =  17 kWh/100 km  typical

// band width: one CO₂ class as a share of the fleet average
EFFICIENCY_BAND = 20 ÷ 136 = 14.7%
```

Using that same proportion for every cohort makes "highly efficient" the same distance from
ordinary whether it is measured in litres or in kilowatt-hours — and it is a width the label
itself already uses rather than one chosen to make cars look good.

### Cohort choice

**Powertrain cohort**, not vehicle class. Vehicle-class cohorts were rejected because FINN's
`cartype` is a free-text field with a single entry in `germanToEnglish` and no values in the
captured detail page — not a benchmark that could be defended. Simplest defensible beat
pretending to a precision the data doesn't support.

### Labels carry their own explanation

`assessEfficiency()` returns the label *and* its explanation together, so no surface
hard-codes the wording:

```ts
{
  level: "high",
  label: "Highly efficient",
  explanation: "Uses noticeably less fuel than the average new car that burns fuel.",
  display: "4,2 L/100km",
  typical: "5,2 L/100km is typical",
}
```

Vocabulary is `Highly efficient` / `Moderately efficient` / `Less efficient`. No
"weakly" or "poorly".

### Corrected 2026-09-06 — what the benchmark actually is

The explanation used to read "a typical new petrol car" / "a typical new diesel car". That
overstated what the reference is. The figure it compares against is the **combustion fleet's
CO₂ average converted through this fuel's carbon content** — 136 g/km read through 2 330 g/L
or 2 640 g/L. No petrol-only or diesel-only WLTP consumption average is published by any of
the sources in §11, so there was no "typical petrol car" behind the number.

The litre thresholds still differ between the two (5.8 vs 5.15 L/100 km) precisely because a
litre of diesel carries more carbon — which is a true and useful thing to tell a reader, and
what the copy now says.

---

## 6. Plug-in hybrids — compressed, not corrected

A PHEV's official CO₂ can be 26 g/km, which on the ladder would sit in class B and read as a
strong match. The ICCT evidence says real emissions run several times higher where the car is
charged less than the test assumes — and that the size of the gap depends on a driver FINN's
data cannot see.

So **nothing is invented**. The figure shown is still FINN's own. What is refused is the top
of the scale:

```ts
if (score != null && fuel === "Plug-in Hybrid") {
  confidence = "optimistic";
  score = Math.round(score * (CLASS_POSITION.C.to / 100));
}
```

**Why compressed rather than clipped.** The first implementation *clipped* at a ceiling. That
made a 26 g/km PHEV and a 75 g/km PHEV come out identical — throwing away the one distinction
the data genuinely supports. Scaling the whole range keeps PHEVs ordered against each other
while keeping all of them below cars whose figures don't need this caveat.

PHEVs also get **no efficiency label**. FINN publishes one weighted figure blending two
energy sources and no separate kWh reading, so there is no cohort it can honestly be placed
in. The UI says so explicitly rather than showing a grade.

---

## 7. Missing data

| What's absent | Score | Behaviour |
| --- | --- | --- |
| CO₂ only | `null` | Efficiency still reported. Band reads "Not enough data". `missing` names the CO₂ figure. |
| Consumption only | scored | Score stands on CO₂. No efficiency label — a missing consumption is *never* read as a frugal one. |
| Powertrain only | scored | Score stands. No cohort, so no efficiency label and no powertrain caveats. |
| CO₂ **and** consumption | — | `assessEnvironment()` returns `null`. The priority reports itself as unanswerable rather than guessing. |

Nothing is ever treated as zero. A 0 g/km reading from an electric car is a *measurement*; an
absent field is an absence, and the two are kept apart throughout.

---

## 8. Code contract

### Exported surface — `lib/reasoning-engine/environmental.ts`

```ts
assessEnvironment(vehicle: FinnCar): EnvironmentalAssessment | null
assessEfficiency(vehicle: FinnCar): EfficiencyAssessment | null
describeEnvironment(assessment): string       // the reader-facing sentence
describeEmissionsVersusEfficiency(assessment)  // the tradeoff aside, or null
co2ClassFor(gPerKm: number): string           // "A" … "G"
positionForCo2(gPerKm: number): number        // 0–100
ENVIRONMENTAL_METHOD: EnvironmentalMethodNote[]  // the collapsed explainer

type EnvironmentalAssessment = {
  score: number | null            // the only thing feeding the engine
  co2: EmissionsAssessment | null
  efficiency: EfficiencyAssessment | null
  powertrain: FuelType | null
  confidence: "measured" | "optimistic" | "unknown"
  caveats: string[]
  missing: string[]
}

// Added 2026-09-06. The figure no longer travels without its meaning.
type EmissionsAssessment = {
  level: "none" | "low" | "moderate" | "high"
  label: string        // "Above-average emissions"
  explanation: string  // what the figure means, in one sentence
  display: string      // "140 g/km · Class E"
  gPerKm: number
  className: string
}
```

### How it reaches the rest of the engine

```
scoring.ts    numericScore("environmental") → assessment.score
              CategoryDetail.environmental  carries the assessment
index.ts      priorityBreakdown()           → PriorityBreakdown.environmental
fit.ts        toFitPriority()               → FitPriority.impact
UI            reads priority.impact / reasoning.environmental
              → components/EnvironmentalResult (React)
              → lens-panel/sections.ts impactBreakdown() (hand-rolled DOM)
```

The category score flows through the existing priority-weighting system untouched — no
environmental multiplier bypasses it, and the priority remains a preference rather than a
hard constraint.

### Files changed in `7f3e212`

| File | Change |
| --- | --- |
| `lib/reasoning-engine/environmental.ts` | Rewritten. The model. |
| `lib/reasoning-engine/environmental.test.ts` | Rewritten. 40 tests. |
| `lib/reasoning-engine/scoring.ts` | `numericScore` environmental branch; `CategoryDetail.environmental`. |
| `lib/reasoning-engine/types.ts` | Assessment type threaded through `CategoryDetail` / `PriorityBreakdown`. |
| `lib/reasoning-engine/fit.ts` | `FitPriority.impact` retyped. |
| `lib/reasoning-engine/narrative/priority.ts` | Prose now comes from `describeEnvironment()`. |
| `entrypoints/content/lens-panel/sections.ts` | Panel section: three readouts, collapsed methodology. |
| `components/EnvironmentalMethod.tsx` | Settings / step-3 explainer rewritten. |
| `lib/translate.ts` | **Bug fix.** Added `Diesel`; fixed PHEV spelling; kept variants. |
| `lib/translate.test.ts` | New. Guards every fuel the API declares. |

Since then the panel has been refactored into `components/FitAnalysisView`, which consumes
the same `priority.impact` contract unchanged.

---

## 9. Sanity results

Eighteen cars run through `assessEnvironment()` and `buildFitAnalysis()`. The rows that
matter are the ones where the two answers diverge.

| Car | Powertrain | CO₂ | Score | Band | Efficiency |
| --- | --- | ---: | ---: | --- | --- |
| Dacia Spring | Electric | 0 · A | 100 | Strong | Highly efficient · 13.9 kWh |
| Tesla Model 3 | Electric | 0 · A | 100 | Strong | Highly efficient · 13.2 kWh |
| BYD Dolphin Surf | Electric | 0 · A | 100 | Strong | Moderately efficient · 15.9 kWh |
| Mercedes EQS SUV | Electric | 0 · A | 100 | Strong | Less efficient · 22.4 kWh |
| Toyota Yaris | Petrol | 102 · C | 60 | Good | Highly efficient · 4.4 L |
| VW Polo | Petrol | 119 · D | 42 | Partial | Moderately efficient · 5.2 L |
| Jeep Compass | Petrol | 127 · D | 38 | Partial | Moderately efficient · 5.6 L |
| VW Golf GTI | Petrol | 168 · F | 17 | Limited | Less efficient · 7.4 L |
| Ford Mustang 5.0 | Petrol | 270 · G | 0 | Limited | Less efficient · 11.6 L |
| Škoda Octavia TDI | Diesel | 112 · C | 54 | Good | Highly efficient · 4.2 L |
| BMW 320d | Diesel | 128 · D | 38 | Partial | Moderately efficient · 4.9 L |
| VW Touareg V6 TDI | Diesel | 199 · G | 0 | Limited | Less efficient · 7.6 L |
| Mercedes A250e | Plug-in hybrid | 26 · B | 43 | Partial | — not graded |
| Range Rover PHEV | Plug-in hybrid | 75 · B | 38 | Partial | — not graded |
| Petrol, no CO₂ | Petrol | — | — | Not enough data | Moderately efficient · 5.1 L |
| Petrol, no consumption | Petrol | 142 · E | 31 | Partial | — not graded |
| EV, no consumption | Electric | 0 · A | 100 | Strong | — not graded |

**What to read in it**

- **EQS SUV** — strong match, *less efficient*. The design working: zero tailpipe CO₂ and a
  thirsty EV are both true.
- **Yaris vs Mustang** — 60 vs 0. Efficient petrol beats inefficient petrol, within the same
  powertrain.
- **Octavia vs Touareg** — 54 vs 0. Same, within diesel.
- **A250e vs Range Rover** — 43 vs 38. PHEVs stay ordered against each other and both stay
  below every BEV.
- **Petrol at 120 vs diesel at 120** — identical scores. No double penalty for what a car
  burns.

---

## 10. Limits and follow-ups

- **No size adjustment.** A large efficient EV and a small thirsty one are judged on the same
  scale. Honest for CO₂; arguably harsh for efficiency. Fixing it needs a vehicle-class
  cohort, which needs `cartype` to become reliable data.
- **Full hybrids are invisible.** `FinnApiConfig.fuel` is a closed union of four, so a mild-
  or full-hybrid petrol arrives as plain petrol. Its lower CO₂ figure still scores correctly
  — but it can't be named as a hybrid, and it is judged against the petrol cohort.
- **Fleet references will drift.** `COMBUSTION_FLEET_CO2` (136) and `ELECTRIC_FLEET_KWH` (17)
  are 2024–25 figures. Both are single named constants with their source in the docstring;
  expect to revisit them annually.
- **The class → position table is tunable.** If the product wants average-emitting cars to
  read better or worse, `CLASS_POSITION` is the one place to change.
- **PHEV utility factors are moving.** The EC revised them in 2025 with another change due
  2027. When FINN's figures reflect the new factors the compression may need loosening;
  `confidence: "optimistic"` is the flag to search for.

---

## 11. Sources

Primary regulation and institutional research only. No blogs, no SEO sites, no
general-interest car press.

- **Pkw-Energieverbrauchskennzeichnungsverordnung (Pkw-EnVKV)** —
  <https://www.gesetze-im-internet.de/pkw-envkv/BJNR103700004.html>
  §3a: the A–G CO₂ class boundaries the ladder is built on.

- **ADAC — Effizienzklasse Pkw: Neues CO₂-Label ist realistischer** —
  <https://www.adac.de/rund-ums-fahrzeug/auto-kaufen-verkaufen/neuwagenkauf/co2-label-pkw-effizienzklassen/>
  Confirms the 2024 amendment dropped the vehicle-weight reference — the finding that makes
  class and figure redundant.

- **European Commission — Real-world CO₂ emissions and fuel consumption of cars and vans
  (2022 data)** —
  <https://climate.ec.europa.eu/news-other-reads/news/publication-real-world-co2-emissions-and-fuel-consumption-cars-and-vans-collected-2022-2024-07-26_en>
  On-board monitoring. Source of the petrol carbon factor and the WLTP-to-real-world gaps.

- **ICCT — Plug-in hybrids in Europe emit five times more than officially reported** —
  <https://theicct.org/pr-plug-in-hybrids-europe-emit-five-times-more-than-officially-reported/>
  The PHEV utility-factor gap: 265% (2021) → 400% (2023). Basis for the compression.

- **ICCT — European Vehicle Market Statistics Pocketbook** —
  <https://theicct.org/publication/european-vehicle-market-statistics-2025-dec25/>
  Combustion fleet average ≈ 136 g/km WLTP — the root of every efficiency reference.

- **ICCT — The bigger the better? How battery size affects real-world consumption** —
  <https://theicct.org/wp-content/uploads/2024/04/ID-80-%E2%80%93-BEVs-size-Report-A4-70138-v9.pdf>
  BEV real-world ≈ 19 kWh/100 km at ~12% above type-approval → the 17 kWh/100 km WLTP
  reference.

Every source above is also cited in the header comment of
`lib/reasoning-engine/environmental.ts`, so the reasoning travels with the code rather than
living only in this document. The constants each carry their own provenance in a docstring.

---

## 12. The explanation layer

> Added 2026-09-06. The scoring model above is untouched. What changed is the order the
> reader meets it in, and what each number arrives carrying.

### The problem

The model was defensible and the presentation was not. Every surface opened on how the
judgement is made — six method cards, expanded — and closed on what the car actually is. The
figures underneath were bare: `CO₂ emissions 140 g/km`, `Consumption 5,4 L/100km`, with
nothing to say whether either was good, bad, or ordinary. A reader who doesn't already know
what 140 g/km means learned nothing from being shown it.

Three surfaces rendered the same assessment at three different levels of completeness, and
one of them had silently lost most of it:

| Surface | Before |
| --- | --- |
| Advice — `compare/advice/components/PrioritySection.tsx` | Sentence + generic measurement table. No class, no efficiency label, no caveat. |
| In-page drawer — `content/lens-panel/sections.ts` | Everything, in the wrong order, methodology first and expanded. |
| Pins drawer — `components/FitAnalysisView` | **One sentence.** Figures, caveats and methodology dropped entirely. |

### The order, now fixed in one place

```
1. what this car is        the emissions result, in words     ← the answer
2. what it rests on        the two figures, each with meaning
3. what they mean together where emissions and efficiency disagree
4. what it doesn't cover   the caveats, kept but shortened
5. how it's worked out     folded away behind one line
```

`components/EnvironmentalResult.tsx` renders this for React (`concise` on the Advice page,
`detailed` in the pins drawer); `impactBreakdown()` in `sections.ts` renders the identical
order in hand-rolled DOM, because the in-page panel lives in a shadow root and may not carry
React. Both read the same fields from the same assessment — if a claim isn't on the
assessment it isn't on the screen.

Threading it to the Advice page needed `PriorityReasoning.environmental`
(`narrative/types.ts`): the assessment now travels whole rather than being flattened into
`measurements`, which is why that page can show a class letter and an efficiency label at all.

### The caveats: compressed, then narrowed to the two that earn their place

They were first shortened (a 200-character ceiling, pinned by test — the plug-in hybrid caveat
previously ran ~300 characters of methodology, which is what made it impossible to place below
the answer without swallowing it) and ordered most-specific-first.

The generic lifecycle line — *this counts what comes out of the car, not what building it
cost* — was then **removed from the per-car caveats and left in the method notes**. It is true
of every car equally, so as a per-car line it told the reader nothing about the car in front of
them, and a line readers learn to skip costs the caveats beside it their credibility. Two
remain, and both name something a reader would otherwise misread:

| Powertrain | Caveat |
| --- | --- |
| Electric | Zero is zero *from the car*; making the electricity isn't free, and FINN's data doesn't say where yours comes from. |
| Plug-in hybrid | The figure assumes regular charging; drive it on petrol and real emissions are several times higher. |
| Petrol / diesel | *(none — nothing about reading "140 g/km" is counter-intuitive)* |

### Two claims the copy was making that the data didn't support

1. **"A typical new petrol car."** See §5. Corrected to the fleet benchmark it actually is.
2. **"Low emissions," on a plug-in hybrid.** The pill said *Low emissions* directly above a
   caveat saying the real figure may be several times higher — the panel arguing with itself.
   The label is now *Low only if you charge it*, drawn in the neutral band rather than the
   flattering one. **The figure and the score are unchanged**: no corrected number is
   invented, for the reasons in §6.

`ENVIRONMENTAL_METHOD` was rewritten to open on what the priority measures rather than on
what it excludes, and `lib/car-labels.ts` no longer subtitles the priority with
"Judged on emissions, not on equipment" — every other priority's subtitle says something
about the car, and that one said something about Finn Lens.

### "Says who?" — the provenance chips

The second round of feedback found the copy was answering *what* without answering *by whose
reckoning*. "Above-average emissions" reads as though a car has failed a standard, and
"Moderately efficient" as though a regulator publishes how much a car ought to burn. Neither is
true, and the three benchmarks in this model are three different kinds of thing:

| Label | What it is measured against | Kind of thing |
| --- | --- | --- |
| `Class E` | Pkw-EnVKV §3a A–G bands | **Set in law.** The only one. |
| `Above-average emissions` | 136 g/km, ICCT registration data | **An observation.** No legal force. |
| `Moderately efficient` | 5.2 / 5.8 L/100 km, 17 kWh/100 km | **Derived here.** Nobody publishes one. |
| `Diesel` | — | Context: it says how to read the other two. |

`environmentalTags(assessment): EnvironmentalTag[]` returns each label with its own `title` and
`body` answering that question, and both renderers hang them behind a tap on the chip — one open
at a time, because this is a footnote and not a second article. The emissions chip is explicit
that EU CO₂ limits bind *a manufacturer's whole range over a year*, so no individual car is over
or under one; the efficiency chip is explicit that its benchmark is worked back from the same
136 g/km through the carbon in a litre, which is also why the petrol and diesel figures differ.

A plug-in hybrid gets a different emissions chip — its own figure is the thing in question, so
comparing it with what other cars emit would answer a question nobody asked.

The powertrain also now appears on the recommendation itself (`AdviceHero`, `ChallengePicker`),
not only inside the environmental reading. What a car runs on is among the first things that
decides whether a reader can live with it.

### What is pinned

`environmental.test.ts` gained a `the shape of the explanation` block: emissions lead the
prose (the regression it catches is the old sentence opening on the efficiency half), every
figure carries a label and an explanation, caveats survive and stay short, the tradeoff aside
appears only where the two figures genuinely disagree, and no copy anywhere — sentences,
labels, caveats, method notes — matches the marketing vocabulary this model can't support
("green choice", "clean car", "sustainable", "zero-impact", and the rest).

A `where each number comes from` block pins the provenance: that the class chip names the law,
that the emissions chip says the average is "not set by anyone as a target" and that EU limits
bind a manufacturer's range rather than a car, that the efficiency chip admits no official
figure exists, and that neither the electric car nor the plug-in hybrid is shown a fleet
comparison it doesn't have.
