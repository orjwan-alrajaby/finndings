# FINN Lens — Engineering & Product Handoff

> **Status of this document.** A read-only audit of the codebase as of commit `7f3e212`
> (2026-09-02), written to hand the project to another engineer without inviting a
> redesign. It describes what was actually built, not what was planned. Verified at the
> time of writing: `npx tsc --noEmit` clean, `npx vitest run` green (18 files, 329 tests).
>
> Fixes applied *after* this audit are tracked separately in the git history; where the
> two disagree, the code wins.

---

## 1. What FINN Lens is

**The problem.** FINN rents cars by subscription. Its listing pages are good at showing you
*what exists* and bad at telling you *which one is right for you*. A shopper comparing five
subscriptions ends up with five browser tabs, a mental spreadsheet, and no way to weigh
"this one has adaptive cruise" against "this one is €80/month cheaper and emits less."

**Who it's for.** Someone actively shopping on finn.com who has more than one candidate and
a rough sense of what they care about (safety, family, boot space, emissions, cost).

**What the user does.** Installs the extension. Browses finn.com. Clicks a pin button on any
car card or detail page to save it. Opens the extension's Compare page and answers four
questions: which five things matter to you → in what order → which specific features inside
them, plus what your driving actually costs → then reads the advice. Separately, while still
browsing, they can open a side panel on any car to see how that one car scores against the
same settings, and every card on the page gets a Lens control that fills in with a "Strong
match / Good match / …" verdict once there is one to give.

**What it gives them.** One recommended car, with a written argument for it in their own
priority order, a named list of what they're giving up, an estimated all-in monthly cost
against their budget, and the ability to put any of four close alternatives in the "hot seat"
for a head-to-head. It never says "82/100 — trust us"; it says "you put safety first, this
car has 12 of the 15 systems we check, and it doesn't have the blind spot assist you asked
for — the Karoq does."

**Core value proposition.** It is a *reasoning* product, not a filter. The differentiator is
that every claim traces to something the user said and something FINN's data actually
contains, and the compromises are stated as loudly as the recommendation.

---

## 2. Current user flow

**Defaults, and telling them from the reader's answers.** Lens ships a working
configuration: the default profile's priority order, driving assumptions, and — new — five
features raised in each non-numeric category, weighted high/medium/low from published buyer
demand (AutoPacific's Future Attribute Demand Study, Cars.com's 2025 buyer survey, and the
family/long-distance guidance that says the same things). `DEFAULT_CATEGORY_FEATURES` in
`lib/reasoning-engine/constants.ts` carries the reasoning, including why eCall is *not*
raised (mandatory in the EU since 2018, so it separates no cars) and why air conditioning is
raised only moderately.

This is a deliberate reversal. The picks used to ship empty, on the argument that shipping
five puts words in the reader's mouth. The counter-argument, and the reason it changed:
empty was not neutral either — a category with nothing raised is scored on its whole
catalogue, which asserts every feature in it matters equally — and it meant the product's
first answer to a new reader was a form rather than a verdict.

What keeps it honest is `lib/personalisation.ts`. `hasSavedLensSettings()` still reads
absent keys, so a fresh install is still "they have told us nothing", and every surface that
can produce a verdict before the reader has answered labels it: the in-page panel leads with
`defaultsNotice`, the pinned-cars page with `<UsingDefaultsNotice>`, and `fitHeader` swaps
its "measured against your saved settings" line for one that doesn't claim they are the
reader's. **If you add a surface that shows a verdict, it owes the reader that label.**

Known rough edge: the narrative layer writes "you picked out adaptive cruise control"
because it reasons about a `FeatureSelection` and has no idea whose it is. The notice is
worded to own that pronoun rather than contradict it ("it has assumed for you… and calls
those picks yours"), but a provenance-aware engine would say it better.

**Step 0 — on finn.com.** A content script (`entrypoints/content/index.ts`) injects a pin
button into every `product-card` and onto detail pages, and a Lens control onto each card's
photo. The control is drawn in the same synchronous pass as the pin button and needs nothing
but the card; the verdict on it — "Strong match / Good match / …" — is filled in separately
once the settings and the car's data are both in hand, and until then the pill reads "How
does it fit?". Clicking it works throughout: the panel names the car and waits for its data
(`resolveCar(id, { waitMs })`, which wakes on the storage write rather than polling).

That split is deliberate and is the fix for a real defect. The control used to be drawn only
where a verdict could already be worked out, and a verdict needs the car's data, which does
not arrive with the card — the interceptor's copy of FINN's own `/api/cars` response reaches
storage afterwards. So whether a card got a badge came down to whether finn.com happened to
mutate the DOM again after that write, which it does on a busy page and doesn't on a quiet
one. The pin button beside it appeared every time, because it needs nothing. A floating launcher button appears on detail
pages only. Pinning writes the full normalized car into `browser.storage.local` under
`pinnedCars`.

**Setup flow (`entrypoints/onboarding/`).** Opened once, by `runtime.onInstalled` when the
reason is `install` and `needsOnboarding()` agrees. Five screens: what Lens is and what it
does with your data; how it works in three parts; your priorities (the shared
`PriorityOrder` control, profiles offered as explained cards); your driving assumptions; and
a worked example. That last screen runs the real `buildRecommendation` +
`buildAdviceNarrative` over three invented cars from `lib/demo-cars.ts` against the order
just set, so the reader sees the actual output before pinning anything — the cars are
labelled on screen as fictional and their ids are negative so they can never collide with a
FINN vehicle id.

Nothing is written until the reader finishes, and only `priorities` and `preferences` are
written — feature picks, profile toggles and the default profile are left alone so a
returning reader's configuration is not replaced by whatever the flow was holding. Skip is
on every screen, saves nothing, and is recorded separately from finishing.

`lib/onboarding.ts` owns the one storage key (`finnLensOnboarding`: `completedAt`,
`skippedAt`, `seenAdvice`, `checklistDismissed`). `needsOnboarding()` is false if any of
finished, skipped, or `hasSavedLensSettings()` — that last conjunct is what stops the flow
appearing for anyone who configured Lens before it existed.

**Popup.** Shows whether you're on finn.com, pinned-car metrics, the three most recent
pinned cars, and action buttons (Compare, Settings). Compare opens `compare.html` in a tab.
Above all of it, a getting-started checklist — set your priorities, pin two cars, read your
first recommendation — every line derived from the real source rather than a stored copy. It
retires itself once all three are done, and can be dismissed by hand.

**Pinned cars page (`entrypoints/pins/`).** The whole pinned set, which nothing else showed:
the compare flow ranked it and gave no way to change it, the popup showed three, and the pin
button on finn.com could only unpin a car from the page it was pinned on. Rows carry the
car, its fit band and its price; the panel beside them is the full analysis of whichever is
open. Sort by pinned date, fit, price or name; tick rows for a bulk unpin; every removal is
confirmed and broadcasts `PINNED_CARS_UPDATED`. The page also listens for it, so a pin made
on finn.com while it is open lands without a reload.

Scoring is no longer gated on `hasSavedLensSettings()` — Lens ships defaults, so there is
always something honest to say. The flag now decides whether the page shows
`<UsingDefaultsNotice>` above the list, not whether it scores anything. Analyses are built once per car in a
`useMemo` and shared by the row chip and the open panel, so the two can never disagree.

**`components/FitAnalysisView/`.** The in-page panel's reading, in React. The panel is
hand-rolled DOM because it lives in a shadow root inside finn.com and cannot carry React in
there, so the *rendering* exists twice — but nothing that decides anything does: both read
the same `FitAnalysis` fields in the same order, and a claim not in the analysis is on
neither. The strings they shared (`configurationName`, `configurationDetail`,
`describeCoverage`) moved to `lib/car-labels.ts`, since `sections.ts` reaches for the DOM at
import time and an extension page cannot have it.

**Settings → Data (`settings/tabs/DataSettings/`).** An inventory of what is stored, with
live counts, and deletion by category the way clearing browsing data works. Distinct from
"Restore defaults", which puts settings back to the shipped values and leaves the product
working; this removes keys, so afterwards Lens knows nothing about the reader.

`lib/stored-data.ts` is the single list of what the extension stores — a key written
anywhere and missing from `STORED_DATA_GROUPS` is a key the reader cannot delete, and a test
asserts the list is complete. Deletion uses `storage.local.remove`, never a write of empty
values: `hasSavedLensSettings` and `needsOnboarding` both read an absent key as "never
answered", so blanking would delete the settings while leaving the product convinced it was
configured. The settings page resets its own React state and its saved-snapshot when the
settings group goes, or its save bar would offer to write the deleted values back.

**Compare launch screen (`compare/components/Launch.tsx`).** A reader with saved answers
does not get asked for them again: the compare page opens on a summary of their order,
picks, budget and mileage with **See my advice** (straight to step 4, every step marked
visited so the stepper stays walkable) and **Change something first** (step 1). It is not a
step and the stepper hides while it shows. A reader with nothing saved never sees it and
gets step 1 as before.

**Step 1 — Your priorities.** One screen that both chooses and orders. It opens with an
explanation of what a priority is and does (it weighs, it does not filter), then offers the
six fixed profiles as presets — Nervous Driver, City Commuter, Family First, Road Tripper,
Eco-Conscious, Balanced — as cards naming who each is for and the five priorities it would
apply, then the order itself: a draggable list of 3–5 of the seven categories with
arrow-key equivalents and an "add a priority" row. The list is
`components/PriorityOrder.tsx`, shared verbatim with Settings > Priorities; only the framing
around it differs. Collected: an ordered array. This array — and only this array — is
written back to persistent settings when you leave the step.

Until recently this was two steps, choose and then order. They were merged because they are
one decision, and because a reader choosing on one screen could not see the order they were
building on the next.

**Step 2 — Set preferences.** For each chosen priority, optionally single out up to five
features and set each one's influence to Somewhat / Moderately / Highly. Skippable; held in
the run-scoped Zustand store and **not** persisted.

**Step 3 — Set assumptions.** Driving assumptions: monthly km, petrol/diesel/electricity
price, monthly budget, private vs business contract. Skippable, every field ships with a
working value, run-scoped and **not** persisted. This was the second half of step 3 behind
a tab pair, and is now its own step — it asks about the reader rather than the cars, and it
feeds the cost estimate and budget eligibility rather than the ranking.

**Step 4 — Advice.** Reaching it calls `markAdviceSeen()`, which is what retires the popup
checklist. The engine runs over every pinned car. The page shows, in order: budget
notice (if applicable) → hero with the winner and its estimated monthly cost → "Why it wins"
per priority → "What you're giving up" → the four closest alternatives as a picker → hot-seat
head-to-head if one is selected → cost breakdown → "Behind the recommendation" (the ranking
with raw totals and the weight table). Selecting an alternative changes what is *examined*,
never what is recommended.

**In-page panel (parallel path).** Clicking a badge or the launcher opens a shadow-DOM drawer
that docks the page and shows a single-car fit analysis against the *saved* settings — band,
per-priority feature lists, environmental working, cost, tradeoffs. On a model page with
several configurations it lists all of them and lets you switch.

**Settings page.** Four tabs: Priorities (order + per-category feature picks), Profiles
(enable/disable, choose the default), Driving (the same assumptions as step 3), and Data
(what is stored, and deleting it). Explicit Save button; a dirty indicator compares against
a snapshot of what's on disk.

The save button lives in the tab row, which is sticky — it used to be in a bar fixed to the
bottom of the window, which is a thing readers stop seeing. Below the content, a line says
the settings are local to this browser and that changes affect future recommendations; it is
the one question a settings page raises and rarely answers.

**One save, and only one.** The page has a single act that writes anything: the Save button
in the sticky tab row. A priority editor used to keep its own draft behind its own "Save
changes" — the same words as the page's, a few hundred pixels away, and only one of them
wrote to disk, so a reader could press Save, press Save again, and lose the edit.

`PriorityEditor` now holds no state at all. Every toggle and every importance change goes
straight into what the page holds, through `onChangeFeatures`, and the Save button commits
it. There is nothing to keep, nothing to discard, and no second button to mistake for this
one. The five-feature cap moved with it: it is enforced where the selection is made — the
picker greys out the sixth — rather than validated afterwards and reported as an error.
`validatePriorityDraft` survives as the written statement of that rule and says in its own
doc comment that nothing calls it.

Which puts the whole burden on the Save button being noticed, so it says so and pulses. When
the page goes from clean to dirty the label beside it turns amber and reads "Unsaved
changes", and the button runs `.finn-lens-attention` — a box-shadow ring, two beats, then
still, and nothing at all under `prefers-reduced-motion`. It is keyed on the dirty state so
the animation restarts on each fresh change rather than firing once per page load.


---

## 3. Recommendation / scoring engine

Entry point: `buildRecommendation` in `lib/reasoning-engine/index.ts`.

### Inputs

`(vehicles: PinnedFinnCar[], priorities: CategoryId[], preferences: LensPreferences,
categoryFeatures: Record<CategoryId, FeatureSelection>)`.

### Categories

Seven, fixed in `CATEGORIES` (`constants.ts`): `safetyAssistance`, `familyFriendly`,
`practicality`, `longDistance`, `climateSuitability`, `environmental`, `comfort`. Six carry a
**catalogue** of 10–15 features. `environmental` is `numericOnly: true` with an empty
catalogue.

### Feature selection and importance

User may single out ≤5 features per category (`MAX_FEATURES_PER_CATEGORY`). Each carries an
importance with a weight: `high: 4`, `medium: 3`, `low: 2`. Every catalogue feature not
singled out has `BASE_FEATURE_WEIGHT = 1`. Default on pick is `medium`. **Default selection
is empty** — nothing is pre-picked.

### Category score — `categoryDetail` (`scoring.ts`)

```
for each feature f in the category's CATALOGUE:
    w(f) = FEATURE_IMPORTANCE[picked[f]].weight  if the user picked f
         = 1                                      otherwise
    total  += w(f)
    earned += w(f)  if the car has f

featureScore  = round(earned / total * 100)           // drives ranking
coverageScore = round(matched / catalogue.length*100) // plain count, for prose only
```

The catalogue is always the denominator. This is deliberate and load-bearing — the file
documents the earlier design where the *picks* were the denominator, which let one pick drive
a category to 0 or 100.

### Numeric score — `numericScore` (`scoring.ts`)

Only three categories have one. There is deliberately **no cost case** — price never earns a
point.

- **practicality** — boot litres, min-max normalized across the comparison set, higher better.
- **longDistance** — powertrain-aware; see the dedicated section in the git history for the
  post-audit fix. At audit time this compared EV range against combustion consumption on
  incompatible scales (recorded below as a confirmed defect).
- **environmental** — *absolute*, not relative. See below.

`relativeScore(v, values, lowerIsBetter)`: `round(((v - min)/(max - min)) * 100)`, inverted
when lower is better; returns a flat **80** when `max == min`.

### Combining

```
score = round((numericScore + featureScore) / 2)   if both exist
      = whichever exists                            if only one
      = 50                                          if neither  (hasEvidence = false)
```

### Priority weights — `priorityWeights` (`scoring.ts`)

Rank-linear, normalized: `weight(i) = (n - i) / (n(n+1)/2)`, `i` 0-based.
For n=5: **33%, 27%, 20%, 13%, 7%**.

### Final vehicle score

```
total = round( Σ  categoryScore(p) × weight(p) )     // computeAllScores
```

Budget contributes nothing. Cars are ranked descending by `total`; exact ties break via
`breakTieOnPicks`, which walks priorities in the user's order and prefers whichever car holds
more importance-weight of *picked* features. That is the only place picks touch ordering
directly.

### Environmental — the one absolute scale (`environmental.ts`)

CO₂ g/km is placed on the EU Pkw-EnVKV A–G class bands (`A ≤0, B ≤95, C ≤115, D ≤135,
E ≤155, F ≤175, G`). Each class maps to a stretch of the 0–100 scale (`CLASS_POSITION`:
A 100, B 88→70, C 64→52, D 44→34, E 33→28, F 22→14, G 12→0) and the car's position *within*
its class interpolates linearly inside that stretch. Class is recomputed from the figure
rather than trusted from FINN's field.

- **Consumption and fuel type are deliberately not scored.** For a combustion car, CO₂/km
  *is* consumption × carbon-per-litre, so scoring both double-counts; and the CO₂ class has
  been a pure function of CO₂ since the 2024 amendment.
- **Efficiency** is reported separately and never scored — a cohort-relative reading
  ("frugal for a petrol car") against `COMBUSTION_FLEET_CO2 = 136 g/km` and
  `ELECTRIC_FLEET_KWH = 17`, with a ±15% band (`EFFICIENCY_BAND = 20/136`). Returns null for
  PHEVs.
- **PHEVs** are compressed, not clipped: `score × 0.52` (the bottom of class C). Confidence
  marked `optimistic`.
- Caveats (tailpipe-only, no lifecycle, PHEV utility factor) are attached to every assessment.

### Cost (`cost.ts`)

```
totalMonthly = subscription + energy + excessMileage
  subscription   = FINN's advertised b2c_<term> or b2b_<term> price
  energy         = (monthlyKm / 100) × consumption × userEnergyPrice
  excessMileage  = max(0, monthlyKm - 500) × extraKmPrice    // FINN_INCLUDED_MONTHLY_KM = 500
```

Insurance, maintenance and tyres are not in FINN's data and are not invented. Any component
that can't be computed is `available: false` with a typed reason and is **never counted as €0**.

### Budget — hard constraint, three-state

`BudgetStatus` is `within | over | unknown`. `unknown` means "the known costs fit but
something is missing, so we can't confirm." Eligibility pool, in order: cars confirmed
`within` → else cars `unknown` → else everything (flagged `isFallback` with reason
`allOverBudget` or `costUnconfirmed`). `topScorer` and `budgetChangedTheAnswer` are carried
so the UI can say plainly that the budget overrode the score. **This is the only hard
constraint in the product.** Missing a "highly" feature never disqualifies anything.

### Alternatives, reasons, tradeoffs

- `selectAlternatives` — the 4 cars closest to the winner **by absolute total distance** (so
  it can include a higher-scoring, over-budget car). Explicitly not "beats it at one thing."
- **Reasons** — `narrative/verdict.ts`. `describeReasons` takes the top *two* supported
  priorities and summarises each via `summarisePriority`: leads with the user's picks if any,
  else the scored measurement, else "it has N of the M systems this priority covers." Budget
  override is stated in exactly one place (`budgetNote`). A `marginNote` fires only when the
  top two are within `classifyTotalGap ≤ 2`.
- **Tradeoffs** — `narrative/tradeoffs.ts`. Two filters: **relevance** (must trace to a
  ranked priority or the budget) and **restraint** (`MAX_TRADEOFFS = 4`, sourced only from
  the four alternatives). Kinds: `missingSelected`, `priorityDeficit` / `measurementDeficit`
  (raised only at `clear` or better), `cost`, `budget`. Order: money first, then strictly by
  the user's own priority rank.
- **Magnitude thresholds** — `narrative/magnitude.ts`. Category score gap: tie 0 /
  negligible ≤4 / slight ≤12 / clear ≤29 / decisive >29. Overall total gap (stricter): 0 /
  ≤2 / ≤6 / ≤15 / >15. Measurements: proportional, <3% / <12% / <35% / ≥35%. Money: <€1 /
  <€10 & <5% / <€25 / <€75 / ≥€75.

### Single-car mode (`fit.ts`)

Calls the same engine with a set of one, which makes every relative measurement drop out on
its own (`relativeScore` refuses n<2), leaving pure catalogue coverage. Bands the result:
`strong ≥65, good ≥45, partial ≥25, limited` below, `unknown` when there's no evidence.
These four thresholds are a presentation choice not yet calibrated against real inventory —
stated as such in the source.

### Degenerate cases

- **User selects nothing** — a valid answer: every catalogue feature weighs 1 and the
  category is judged on plain coverage. Empty priorities fall back to `DEFAULT_PRIORITIES`.
- **Missing data** — category with no catalogue and no measurement scores a flat **50** with
  `hasEvidence: false`; prose says "FINN's data doesn't tell us enough" rather than dressing
  the 50 up. Cost components go unavailable rather than zero. No equipment list at all →
  `hasEquipmentData` returns false → no verdict on the pill (it keeps its neutral label),
  panel says so.

---

## 4. Data flow

1. **Interception.** `entrypoints/network-interceptor.unlisted.ts` is injected into the
   page's main world and monkey-patches `window.fetch`. Any URL containing `/api/cars` is
   cloned and `postMessage`d back as `{source: "finn-lens", type: "FINN_CARS_RESPONSE"}`.
2. **Mapping.** The content script calls `mapFinnConfigToAll` → `mapFinnConfig`
   (`manipulateApiData.ts`), turning FINN's German `FinnApiConfig` into the internal
   `FinnCar`. Helpers in `lib/helpers.ts`: `extractFeatures` (maps ~50 German equipment
   strings to boolean `hasX` keys via `FEATURE_KEYS`), `extractPricing`,
   `extractAvailability`, `extractDriveType`; `germanToEnglish` in `lib/translate.ts` handles
   fuel/gearbox/colour.
3. **Internal shape.** `FinnCar` (`lib/types.ts`) and
   `PinnedFinnCar extends FinnCar { url, pinnedAt }`. The engine's signatures all take
   `PinnedFinnCar`; the panel synthesizes the two extra fields via `asEvaluatable`.
4. **Stored data** (`browser.storage.local`): `pinnedCars` (durable set),
   `loadedCarsFromFinnApi: {cars, total}` (browsing cache), and six settings keys
   `finnLens{Preferences,Priorities,PriorityDefinitions,Profiles,CategoryFeatures,DefaultProfileId}`.
5. **Settings.** `loadLensSettings` / `saveLensSettings` / `hasSavedLensSettings`. Load runs
   three migrations: `migratePriorityOrder` (drops retired `affordability`, folds `safety` +
   `driverAssistance` into `safetyAssistance`), `migrateCategoryFeatures` (reads three
   historical storage shapes), `migratePreferences` (`annualKm ÷ 12 → monthlyKm`). Profile
   copy and priority order are rebuilt from `PROFILES` every load; only `enabled` is read back.
6. **Recommendation input/output.** `buildReasoningContext` computes costs and scores once
   over every pinned car and returns an immutable `ReasoningContext`; `recommendFrom` turns
   that into a `Recommendation`; `evaluateVehicle` / `evaluateChallenger` produce a
   `VehicleEvaluation`; `buildAdviceNarrative` turns that into an `AdviceNarrative` of typed
   facts and pre-written sentences. The UI renders — it decides nothing.
7. **Cross-surface messaging.** Content script ↔ popup: `GET_PAGE_STATS`. Content script →
   extension pages: broadcast `CARDS_LOADED` (and, post-audit, `PINNED_CARS_UPDATED`).
   Popup/compare → background: `OPEN_COMPARE_PAGE` / `OPEN_SETTINGS_PAGE`, handled by
   `openOrFocusNewPage` in `background.ts`. Settings changes reach live finn.com tabs via
   `browser.storage.onChanged` → `refreshFitBadges` for settings, `applyFitVerdicts`
   (debounced, additive) for `loadedCarsFromFinnApi` / `pinnedCars`.

---

## 5. Current UI / product surface

| Surface | What it does | State at audit |
|---|---|---|
| **Popup** (`popup/App.tsx`) | Page status, metrics, recent pins, actions | **Partially working.** "Detected" always 0; "View all N cars" no-op; "Go To Settings" disabled until you pin something and carries the wrong description |
| **Compare shell** (`compare/root.tsx`) | 4-step stepper, empty/one-car states | **Working** |
| **Step 1 Priorities** | Profile picker + custom picker | **Working** |
| **Step 2 Order** | Drag-rank | **Working** |
| **Step 3 Preferences** | Feature influence picker + driving assumptions | **Working**, best-explained screen in the product |
| **Step 4 Advice** | Hero, WhyItWins, Tradeoffs, ChallengePicker, HotSeat, CostAnalysis, BehindTheRecommendation | **Working.** The strongest screen |
| **Settings — Priorities** | Order + per-category picks | **Working** |
| **Settings — Profiles** | Enable/disable, set default | **Working** |
| **Settings — Driving** | Assumptions | **Working** |
| **Pin buttons** | Pin from card, detail page, config card | **Working**, fragile against FINN DOM changes |
| **Fit badges** (`card-badges.ts`) | Control on each card photo, verdict filled in after | **Working**. `injectFitButtons` is synchronous and unconditional; `applyFitVerdicts` is gated on saved settings and cached data |
| **Lens panel** (`panel.ts` + `sections.ts`) | Shadow-DOM drawer, single-car analysis, config chooser, page dock, card highlight | **Working**, most impressive integration |
| **Custom priorities** | `registerCategoryMeta`, `isCustom`, `slugify`, `generateId`, `PriorityDefinition.enabled` | **Dead.** Full infrastructure, no UI to create one; `isNew` hard-coded `false` |
| **Profile "functionality"** | Enable/disable + default only | **Implemented but questionable** — profiles cannot be created, renamed or reordered by design |

---

## 6. What is genuinely working

**Solid — do not touch.**

- The scoring core: `categoryDetail`, `priorityWeights`, `computeAllScores`. Coherent,
  deliberate, heavily documented, covered by ~100 tests.
- The cost model and three-state budget. `unknown` never counting as "fits" is correct.
- The environmental module. Best-argued file in the codebase; every constant is sourced.
- The settings migration chain. Three feature-storage generations, a retired priority and a
  category merge, all handled non-destructively and tested.
- The fact/narrative separation (`narrative/facts.ts` establishes what's true, the rest
  translates it). This is why the prose doesn't lie.
- The magnitude classifier. One place decides whether a gap is worth a sentence.
- The lens panel's shadow-root isolation and page-dock.
- The test suite: fast and meaningful.

**Works but ugly.**

- `reasoning-engine/index.ts` at ~1200 lines mixing reasoning with settings persistence.
- `lens-panel/sections.ts` at ~980 lines of hand-rolled DOM.
- The settings page's prop-drilling and inconsistent formatting.
- The popup's ad-hoc refresh dance with a 150ms re-poll.

**Technically fragile but currently functional.**

- The `window.fetch` monkey-patch. One `fetch` → `XMLHttpRequest` change at FINN and the
  cache stops filling.
- Every DOM selector: `[data-testid="product-card"]`, `[data-appid="product-details"]`,
  `[data-testid="group-comparison"]`, `[id^="product-"]`, `data-productid`, and reading the
  detail page's `<h1>` in `splitBrandAndModel`.
- The `history.pushState`/`replaceState` patch plus a `MutationObserver` on `documentElement`
  with a 100ms debounce.
- `hasEquipmentData`'s "all-false means missing" heuristic.

---

## 7. What is genuinely broken (at audit time)

### Confirmed bugs

1. **The popup's "Detected" count is always 0.** It counts
   `[data-finn-lens-processed="true"]`; nothing writes that attribute.
2. **The browsing cache is destroyed on every page load.** `content/index.ts` initialises
   `allLoadedSoFar = {cars:{}, total:0}` in `main()` and then writes it to storage without
   reading first. The first `/api/cars` response after any hard navigation overwrites the
   whole cache, and silently discards anything `mergeLoadedCars` wrote.
3. **"View all N cars" in the popup is a no-op** — `onClick={() => {}}`.
4. **Wrong copy on the Settings action button** — reads "Compare pricing and key details."
5. **Settings unreachable from the Actions tab until something is pinned** —
   `disabled={!pinnedCount}` on a button unrelated to pinned cars.
6. **React key collision in the pinned list** — `key={car.name}`, and `name` is
   `"${brand} ${model}"`, so two configurations of the same model collide.
7. **`PINNED_CARS_UPDATED` is never sent.** Both the popup and compare page listen for it;
   live refresh works only incidentally via `CARDS_LOADED`.

### Likely bugs

8. **`longDistance` mixes incomparable scales.** EVs normalized on range *among EVs only*
   while combustion cars are normalized on consumption *across all cars* — and
   `consumption.combined` for an EV is kWh while `consumption.unit` is hard-coded
   `"L/100Km"`. An EV without a range figure lands in the consumption pool at ~17
   "L/100km" and is scored as catastrophically thirsty.
9. **Min-max normalization produces extreme scores on small sets.** The worst car gets 0 and
   the best 100 whatever the spread. The *prose* is protected by the magnitude classifier;
   the *ranking* isn't.
10. **`describeWhyItStillWins` is dead code** (`narrative/priority.ts`) — defined, never
    called.
11. **`hasEquipmentData` can be fooled by `hasTowbar`**, which comes from `config.has_hitch`
    rather than the equipment list.

### Edge cases

12. `relativeScore` returns a magic **80** when every car has the same value.
13. A category with no evidence contributes a fabricated **50** to the weighted total.
14. `resolveBudgetStatus` returns `"within"` when `budget == null`, so "no budget set" and
    "confirmed affordable" are the same state internally.
15. `splitBrandAndModel` falls back to "first word is the brand," wrong for Alfa Romeo /
    Land Rover when the URL slug doesn't match.
16. `addTimeToDate` returns `undefined` on an empty date string; harmless only because
    nothing reads `availability`.

---

## 8. What is questionable

**The default budget of €300 with a hard gate.** FINN subscriptions plus energy plus excess
mileage routinely land at €400–900. A user who never opens Driving settings sees *every*
recommendation flagged as a fallback. The constant is honestly labelled a placeholder in the
source, but the product never forces the user past it.

**Two philosophies about showing a number.** `fit.ts` argues at length that a score out of
100 is a grade the data doesn't support, and the panel shows only bands and counts.
`RecommendationRanking` on the compare page shows `82`, `79`, `74`. Both are defensible;
having both in one product is not obviously coherent.

**The lowest influence level doubles a feature's weight.** "Somewhat" is weight 2 against a
base of 1. Merely *picking* a feature makes it count twice as much as anything else in the
category.

**Picking a feature the car lacks hurts twice.** It raises the denominator *and* fails to
contribute to the numerator. Correct arithmetic, non-obvious to a user.

**PHEV × 0.52.** Well argued, sourced, honest — and still Lens deciding a whole powertrain
class is capped below class C, with no user-facing control.

**Class D reads as "Partial match."** D is the commonest class among combustion cars. This is
intended, and it means an ordinary petrol car reads as a mediocre environmental match to
anyone who ranked environment at all.

**Priorities are editable in two places.** Compare step 1 and Settings > Priorities write
the same key, now through the same shared control. Meanwhile budget and feature picks set in Compare are deliberately run-scoped.
The rule is documented in the store but will read as a bug to a user.

**Profiles are barely a feature.** Six fixed strategies you can only switch on or off.

**The custom-priority machinery** is over-engineering relative to what shipped.

**The narrative layer's surface area.** ~2,500 lines producing generated English across
dozens of branch combinations. Every individual rule is good; collectively it's hard to be
confident there isn't an ungrammatical sentence lurking in some combination.

**Popup branding says "FINNDINGS", everything else says "FINN Lens."**

---

## 9. Technical debt / complexity

**Unnecessarily complicated.** `reasoning-engine/index.ts` does reasoning, alternative
selection, storage I/O and three migration systems in one file. Two rendering paradigms
(React for extension pages, hand-rolled `el()` for the content script). The compare store
carries view state alongside the answers.

**Duplicated.** `openBrowserTab` exists verbatim in `lib/utils.ts` and
`entrypoints/popup/utils.ts` (only the popup one is imported). The four-segment fit meter is
implemented twice. `gitIgnoreThisFolder/browser-extension copy/` is a full second copy of the
source tree in the working directory.

**Accumulated hacks.** The `history` patch + `finnlens:navigate` event + double debounce.
`asEvaluatable` filling in fake `url`/`pinnedAt`. `resolveCurrentConfigId` deliberately *not*
using `extractConfigId` because that helper truncates to five digits.

**Dead code.** `calculateDiscount`, `getAvailabilityTime`, `formatIsoDate`,
`getParamFromUrl` (`lib/utils.ts`); `brand()` (`lib/helpers.ts`); `getAffectedProfiles`,
`slugify`, `generateId`, `isBuiltInPriority` (`PriorityValidation.ts`);
`describeWhyItStillWins`; `FinnCar.availability` (computed, never read).

**Leave alone.** The migration chain, the environmental constants, `categoryDetail`'s
denominator choice, the shadow-root/dock mechanics, and the `PinnedFinnCar`-everywhere type
decision. Each has a documented rationale and non-obvious failure modes if touched.

---

## 10. What remains before this is finished

### MUST FIX

1. The cache-clobbering write in `content/index.ts`.
2. The default budget situation.
3. Popup honesty: the dead "View all" button, the Settings button's copy and `disabled`, the
   fake "Detected" metric.
4. `manifest` / `package.json` identity — the extension currently installs as
   "wxt-react-starter".

### SHOULD FIX

5. `longDistance` mixed-powertrain scoring.
6. React key collision in the pinned list.
7. `PINNED_CARS_UPDATED` — send it or delete it.
8. A real README.
9. Pick one answer on showing raw 0–100 totals, or explain the number.

### IGNORE / SHIP ANYWAY

- All the dead code and the duplicated `openBrowserTab`.
- The `index.ts` file size and formatting inconsistency.
- The two rendering paradigms.
- `relativeScore`'s 80-on-tie and min-max extremes in other categories — fixing normalization
  generally means retuning `fit.ts`'s band thresholds and re-baselining ~100 tests.
- The custom-priority infrastructure. Leave it inert.
- The 50-when-no-evidence placeholder.
- Every "this could be a component" refactor.

---

## 11. Demo readiness (at audit time)

**Strong.** Pin a car on finn.com, watch the badge appear, click it, watch the panel dock the
page and explain that one car. Step 4's tradeoffs section. The environmental method panel.
The three-state budget. A green typecheck and test suite.

**Could embarrass you.** "0 cars on this page" while standing on a full listing page. A dead
"View all" button. The cache-clobber producing "FINN's data for it isn't in hand any more."
A red "none of these fit your budget" banner caused by the €300 default. The extension
appearing as "wxt-react-starter" in `chrome://extensions`.

**Could confuse the viewer.** Why priorities persist from Compare but the budget doesn't. Why
the panel refuses to show a number but the compare ranking shows `82`. What "Somewhat /
Moderately / Highly" actually does. Why profiles can't be edited.

**Questions they will ask.** Where the data comes from (their own `/api/cars` responses,
intercepted client-side — no scraping, no server). How plug-in hybrids are handled. Why price
isn't a scored priority. What happens with cars that have no equipment data. Whether the
engine could run server-side (it's pure functions over a normalized vehicle shape — yes).

**Limitations to acknowledge openly.** Costs exclude insurance, maintenance, registration and
tyres. Boot space, range and CO₂ are scored *relative to the pinned set*, so scores move as
you pin more cars. The 500 km/month allowance is hard-coded. The fit band thresholds are
uncalibrated. Everything depends on FINN's DOM and `/api/cars` shape. The German→English
feature map covers ~50 features; anything outside it is invisible.

---

## 12. Recommended finish line

1. Fix the cache write in `content/index.ts` to read-then-merge.
2. Set a realistic default budget behaviour.
3. Clean up the popup: dead button, wrong copy, `disabled`, the fake metric.
4. Set the extension's name, description and version.
5. `key={car.id}` in the pinned list.
6. Send or delete `PINNED_CARS_UPDATED`.
7. Fix `longDistance` mixed-powertrain scoring.
8. Write a one-page README.

Then stop. Do not touch the engine, the migrations, the narrative layer, or the dead code.

---

## 13. Important files / functions

**Product / UI**

- `entrypoints/onboarding/App.tsx` — the setup flow, its five screens and its one write
- `lib/onboarding.ts` — `needsOnboarding`, and what the product remembers about explaining
  itself
- `lib/demo-cars.ts` — the three invented cars the setup flow's worked example runs on
- `entrypoints/pins/App.tsx` — the pinned set, read and managed
- `components/FitAnalysisView/` — one car against the reader's settings, in React
- `lib/stored-data.ts` — the inventory, `clearStoredData`, `unpinCars`
- `lib/car-labels.ts` — `configurationName`, `configurationDetail`, `describeCoverage`
- `entrypoints/compare/components/Launch.tsx` — what a returning reader sees instead of the
  setup questions
- `entrypoints/compare/root.tsx` — the four-step shell
- `entrypoints/compare/store.ts` — `useCompareStore`, `canEnterStep`, `isStepReachable`,
  `featuresChanged`
- `entrypoints/compare/steps/StepFourGenerateAdvice/index.tsx` — the advice page
- `entrypoints/settings/App.tsx` — settings root, save/restore
- `entrypoints/popup/App.tsx`
- `components/PriorityOrder.tsx` — `ProfilePresets`, `PriorityOrderList`,
  `applicableProfiles`; the priority order control, shared by compare step 1 and settings
- `components/FeatureInfluencePicker.tsx` — pick + influence control, shared by step 2 and
  settings

**Recommendation engine**

- `lib/reasoning-engine/index.ts` — `buildReasoningContext`, `buildRecommendation`,
  `recommendFrom`, `evaluateVehicle`, `evaluateChallenger`, `selectAlternatives`,
  `alternativeOptions`, plus all settings I/O and migrations
- `lib/reasoning-engine/scoring.ts` — `categoryDetail`, `computeAllScores`,
  `priorityWeights`, `numericScore`, `relativeScore`
- `lib/reasoning-engine/cost.ts` — `calculateCost`, `partitionByBudget`, `buildCostAnalysis`
- `lib/reasoning-engine/environmental.ts` — `assessEnvironment`, `positionForCo2`,
  `assessEfficiency`, `ENVIRONMENTAL_METHOD`
- `lib/reasoning-engine/fit.ts` — `buildFitAnalysis`, `classifyFit`, `FIT_BANDS`,
  `hasEquipmentData`
- `lib/reasoning-engine/constants.ts` — `CATEGORIES`, `FEATURES`, `PROFILES`,
  `FEATURE_IMPORTANCE`, all defaults
- `lib/reasoning-engine/narrative/` — `index.ts` (`buildAdviceNarrative`), `facts.ts`,
  `verdict.ts`, `priority.ts`, `tradeoffs.ts`, `cost.ts`, `challenge.ts`, `magnitude.ts`,
  `phrase.ts`
- `lib/reasoning-engine/explain.ts` — `explainHeadToHead`

**Data / API**

- `entrypoints/network-interceptor.unlisted.ts` — the fetch patch
- `entrypoints/content/manipulateApiData.ts` — `mapFinnConfig`, `mapFinnConfigToAll`
- `lib/helpers.ts` — `extractFeatures`, `extractPricing`, `extractAvailability`,
  `FEATURE_KEYS`
- `lib/translate.ts` — `germanToEnglish`
- `entrypoints/content/injectors/inject-pin-button/injectPinCarButtonIntoNode/api.ts` —
  `loadCarsFromFinnApi`, `splitBrandAndModel`
- `entrypoints/content/lens-panel/currentCar.ts` — `resolvePageCars`, `resolveCar`,
  `cardConfigId`, `cardPhoto`

**Storage / state**

- `entrypoints/content/injectors/inject-pin-button/injectPinCarButtonIntoNode/storage.ts` —
  `getPinnedCars`, `updatePinnedCars`, `getLoadedCars`, `mergeLoadedCars`
- `loadLensSettings` / `saveLensSettings` / `hasSavedLensSettings` in
  `lib/reasoning-engine/index.ts`
- `entrypoints/background.ts` — `openOrFocusNewPage`

**Types**

- `lib/types.ts` — `FinnApiConfig`, `FinnCar`, `PinnedFinnCar`
- `lib/reasoning-engine/types.ts` — `LensSettings`, `LensPreferences`, `CategoryDetail`,
  `VehicleScore`, `ReasoningContext`, `Recommendation`, `VehicleEvaluation`,
  `CostBreakdown`, `BudgetStatus`
- `lib/reasoning-engine/narrative/types.ts` — `AdviceNarrative`, `Verdict`, `Tradeoff`,
  `PriorityReasoning`, `FeatureEvidence`

**Testing**

- `recommendation.test.ts`, `fit.test.ts`, `environmental.test.ts`, `narrative.test.ts`,
  `feature-selection.test.ts`, `settings.test.ts`, `cost.test.ts`, `configuration.test.ts`
- DOM-level tests under `entrypoints/content/lens-panel/`
- `lib/reasoning-engine/test-fixtures.ts` — shared vehicle builders
