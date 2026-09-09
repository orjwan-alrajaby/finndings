# Finn Lens — browser extension

The extension itself. See the [repository README](../README.md) for what Finn Lens is, how
the scoring works and what its limitations are, and `../docs/FINN-LENS-HANDOFF.md` for the
engineering write-up.

## Commands

```bash
npm install
npm run dev        # Chrome, with hot reload
npm run build      # → .output/chrome-mv3
npm run compile    # tsc --noEmit
npm test           # vitest run
```

Load unpacked from `.output/chrome-mv3` via `chrome://extensions` → Developer mode.

## Layout

| Path | What lives there |
|---|---|
| `entrypoints/background.ts` | opens and focuses the extension's own tabs |
| `entrypoints/network-interceptor.unlisted.ts` | patches `window.fetch` in the page context |
| `entrypoints/content/` | pin buttons, card badges, the in-page analysis panel |
| `entrypoints/popup/` | page status, recent pins, the getting-started checklist, actions |
| `entrypoints/onboarding/` | the five-screen setup flow, opened once on install |
| `entrypoints/pins/` | the pinned set as a board — where it stands, then a card each |
| `entrypoints/compare/` | the four-step flow (React + Zustand) |
| `entrypoints/settings/` | priorities, profiles, driving assumptions, and your stored data |
| `components/FitAnalysisView/` | one car judged against your settings, in React |
| `lib/reasoning-engine/` | scoring, cost, environmental, narrative — pure, UI-free |
| `lib/onboarding.ts` | whether the reader has been shown the setup flow, and how far they got |
| `lib/stored-data.ts` | the one list of what the extension stores, and how to delete it |
| `lib/car-labels.ts` | how a configuration and its coverage are named on every surface |
| `lib/demo-cars.ts` | three invented cars the setup flow's mock listing and worked example run on |
| `lib/types.ts` | `FinnApiConfig` → `FinnCar` → `PinnedFinnCar` |
| `lib/helpers.ts` | the German → internal field mapping |
