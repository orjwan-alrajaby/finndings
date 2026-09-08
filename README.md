# Finn Lens

A browser extension that helps you choose between [FINN](https://www.finn.com) car
subscriptions.

FINN's listings are good at showing you what exists and bad at telling you which one is
right for you. Comparing five subscriptions means five tabs, a mental spreadsheet, and no
way to weigh "this one has adaptive cruise control" against "this one is €80/month cheaper
and emits less." Finn Lens is the thing that does that weighing, out loud, using the data
FINN already publishes.

It is unofficial and not affiliated with FINN.

---

## What it does

You pin cars while you browse. Lens asks what matters to you and in what order, then ranks
everything you pinned and explains the result:

- **one recommendation**, argued in your own priority order;
- **what you're giving up** to take it, named — the equipment it lacks, the car that has it,
  and why you should care given what you told us;
- **what it actually costs** per month — subscription plus estimated energy plus estimated
  excess mileage — against a budget you can set;
- **four close alternatives** you can put in a hot seat for a head-to-head, which changes
  what is *examined* and never what is recommended.

While you're still on finn.com, every card gets a Lens button — appearing with the pin
button, and filling in with a match verdict once Lens has the car's data — and a side panel
scores whichever car you're looking at against the same settings.

The design rule throughout: every claim traces to something you said and something FINN's
data contains. Where the data can't answer, the product says so instead of guessing.

---

## How it works

```
finn.com
   │
   │  window.fetch is patched in the page's own context
   ▼
/api/cars response  ──postMessage──►  content script
                                          │
                     German API shape ──► FinnCar (normalised, English)
                                          │
                                          ▼
                            browser.storage.local
                            ├─ pinnedCars              what you chose to compare
                            ├─ loadedCarsFromFinnApi   browsing cache
                            └─ finnLens*               your settings
                                          │
                        ┌─────────────────┴─────────────────┐
                        ▼                                   ▼
              Compare page (React)                 In-page panel (shadow DOM)
              rank the pinned set                  score one car you're viewing
                        │                                   │
                        └────────► reasoning engine ◄───────┘
                                   (pure functions)
```

There is no server and no scraping. Lens reads the same `/api/cars` responses FINN's own
pages request, normalises them once, and keeps them locally.

**Reasoning engine** (`lib/reasoning-engine/`) is pure and UI-free. It takes vehicles,
priorities and preferences, and returns a `Recommendation` containing every score, cost,
comparison and pre-written sentence. The UI renders it and decides nothing. A separate
`narrative/` layer establishes what is *true* (`facts.ts`) before anything turns it into
English, which is why the prose can't claim something the data doesn't support.

---

## The scoring concept

**Priorities are ranked, not rated.** You pick 3–5 of seven categories and order them.
Position decides weight — rank-linear and normalised, so for five priorities they account
for 33 / 27 / 20 / 13 / 7 percent of the result.

**Categories are scored 0–100** from two sources, averaged when both exist:

- *Equipment.* Each category has a catalogue of 10–15 features. A car's score is the share
  of that catalogue it carries. You may single out up to five features and say how much each
  should influence things (Somewhat / Moderately / Highly → weights 2 / 3 / 4 against a base
  of 1). The **catalogue stays the denominator**, so no single pick can drive a category to
  0 or 100.
- *Measurements.* Boot space for practicality; range or consumption for long-distance travel;
  CO₂ for environmental impact.

**A car's total** is the weighted sum of its category scores. That total is the ranking.

**Two measurements are deliberately not relative to the pinned set:**

- *Environmental impact* is absolute. CO₂ g/km is placed on the EU's own A–G class scale
  from the Pkw-EnVKV. Consumption and fuel type are reported but not scored — for anything
  burning fuel, CO₂ per km *is* consumption times the carbon in a litre, so scoring both
  would mark the same car down twice for one fact. Plug-in hybrids are compressed rather than
  corrected: their official figure assumes a charging habit FINN's data can't confirm, so
  they can't reach the top of the scale.
- *Long-distance travel* is cohort-relative. Kilometres of range, litres per 100 km and
  kilowatt-hours per 100 km are three different quantities, so a car is only ranked against
  cars carrying the same reading, and no cross-powertrain ordering is claimed.

**Price is never a priority.** Your budget is a hard eligibility constraint, checked after
scoring — it never adds or removes a point. It is three-state on purpose: `within`, `over`,
or `unknown` when part of the cost couldn't be estimated. A car that can't be confirmed
affordable never wins ahead of one that can. Set no budget and nothing is ruled out on price.

**Missing data is a stated answer, not a zero.** A cost component FINN doesn't supply is
reported as missing rather than counted as €0. A car with no equipment list reads as
"not enough data", never as a car that has nothing.

---

## Limitations

Worth knowing before trusting a number:

- **Cost is incomplete by construction.** Insurance, maintenance, registration and tyres
  aren't in FINN's data, so they aren't in the estimate. It is subscription + energy +
  excess mileage and nothing else.
- **Some scores move as you pin more cars.** Boot space and long-distance readings are
  relative to the set you're comparing. The same car can score differently in a different
  comparison. Environmental impact is the exception — it's absolute.
- **The included mileage allowance (500 km/month) is hard-coded.** If FINN changes it, the
  excess-mileage estimate goes stale.
- **Energy cost uses one flat price you enter.** No mixed home/public charging model, no
  tariff awareness.
- **The match bands (Strong / Good / Partial / Limited) are a presentation choice** that has
  not been calibrated against real FINN inventory.
- **The equipment vocabulary is a fixed map of ~50 German feature names.** Anything FINN
  lists outside it is invisible to Lens.
- **It is coupled to FINN's front end.** The extension depends on `/api/cars` being fetched
  with `window.fetch` and on several `data-testid` attributes. A redesign on FINN's side
  will break parts of it.
- **This is not a lifecycle assessment.** Environmental impact covers what the car emits per
  kilometre. Manufacturing, the battery, the electricity mix and disposal are out of scope
  and are not estimated.

---

## Running it locally

Requires Node 20+ and Chrome.

```bash
cd browser-extension
npm install

npm run dev        # launches Chrome with the extension loaded and hot reload
```

To build and load it yourself:

```bash
npm run build      # outputs .output/chrome-mv3
```

Then open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked** and
select `browser-extension/.output/chrome-mv3`.

Firefox is configured (`npm run dev:firefox`, `npm run build:firefox`) but Chrome is what
this has been developed and tested against.

### Checks

```bash
npm run compile    # tsc --noEmit
npm test           # vitest run
npm run test:watch
```

### Trying it out

1. On install, Lens opens a setup flow: what it is, how it works, your priorities, your
   driving, and a worked example run against three cars that don't exist. It takes about a
   minute and it is the only time you are asked. Skipping is fine — everything below still
   works on the defaults, and you can reopen it from Settings → **Setup guide**.
2. Browse finn.com and pin two or more cars with the ⊕ button on any card.
3. Open the popup → **Compare Pinned Cars**. Once you've been set up, that opens on your
   saved answers with **See my advice** rather than asking again; **Change something first**
   walks the four steps.

Lens works before you answer anything: it ships a starting priority order and, in each
priority, the five features buyer surveys say drivers care about most. Everywhere it shows a
verdict built from those rather than from your own answers, it says so and offers to swap
them — an assumption you can see is a different thing from one you can't.

**Pinned cars** (popup → Manage Pinned Cars) is the whole set: open any one for the same
reading the in-page panel gives, unpin what you're no longer weighing up, and sort by fit,
price or when you pinned it.

**Settings → Data** lists everything Lens has stored, with live counts, and deletes any of
it by category — your settings, your pinned cars, the browsing cache, your setup progress.

---

## Layout

```
browser-extension/
├─ entrypoints/
│  ├─ background.ts              opens/focuses the extension's tabs
│  ├─ network-interceptor…ts     patches window.fetch in the page context
│  ├─ content/                   pin buttons, card badges, the in-page panel
│  ├─ popup/                     status, getting-started checklist, actions
│  ├─ onboarding/                the five-screen setup flow, opened on install
│  ├─ pins/                      the pinned set: read one, unpin what you're done with
│  ├─ compare/                   the four-step flow (React + Zustand)
│  └─ settings/                  priorities, profiles, driving, and your stored data
└─ lib/
   ├─ reasoning-engine/          scoring, cost, environmental, narrative
   ├─ onboarding.ts              what the product remembers about explaining itself
   ├─ stored-data.ts             the one list of what is stored, and how to delete it
   ├─ car-labels.ts              how a car and its coverage are named, everywhere
   ├─ demo-cars.ts               three cars that don't exist, for the setup flow
   ├─ types.ts                   FinnApiConfig → FinnCar → PinnedFinnCar
   └─ helpers.ts                 the German → internal field mapping
```

`docs/FINN-LENS-HANDOFF.md` is the fuller engineering write-up: what works, what's fragile,
and what was deliberately left alone.
