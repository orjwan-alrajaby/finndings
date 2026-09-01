# FINN Lens — browser extension

The extension itself. See the [repository README](../README.md) for what FINN Lens is, how
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
| `entrypoints/popup/` | page status, recent pins, actions |
| `entrypoints/compare/` | the four-step flow (React + Zustand) |
| `entrypoints/settings/` | priorities, profiles, driving assumptions |
| `lib/reasoning-engine/` | scoring, cost, environmental, narrative — pure, UI-free |
| `lib/types.ts` | `FinnApiConfig` → `FinnCar` → `PinnedFinnCar` |
| `lib/helpers.ts` | the German → internal field mapping |
