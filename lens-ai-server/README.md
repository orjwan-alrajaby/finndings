# Lens AI server (experimental)

The smallest server-side boundary that lets Finn Lens talk to a language model
without putting an API key in the extension.

**AI handles natural language. Lens handles the decision.** The model never
scores a car, picks a winner or calculates anything. It does two jobs:

```
"two kids, really hot, nervous driver…"      Lens recommendation + narrative
            │                                          │
            ▼                                          ▼
   POST /v1/interpret                        buildLensFacts (extension)
            │                                          │
            ▼                                          ▼
   ProposedChange (JSON, enum-constrained)   POST /v1/ask ──► answer from facts
            │                                          │      or a ProposedChange
            ▼                                          ▼
   validateChange  ──►  Answers  ──►  buildRecommendation (the existing engine)
   (extension)          reviewed          │
                        by the reader     ▼
                                     compareOutcomes: "Here's what changed"
```

Everything Lens-specific — the vocabulary, the facts, validation, applying a
change, the before/after — lives in the extension under
`browser-extension/lib/lens-ai/`. This server holds the credential, the
instructions and the provider adapter, and nothing else.

## Run it

Requires Node 22.18+ (runs the TypeScript directly; no build step).

```bash
cd lens-ai-server
npm install

# No key: keyword-matching mock, good for clicking through the UI
npm run mock

# Gemini (free tier)
cp .env.example .env        # then set GEMINI_API_KEY
npm start                   # or npm run dev to restart on edits
```

It listens on `http://127.0.0.1:8787`. Then run the extension as usual
(`cd browser-extension && npm run dev`) and open **Compare pinned cars**.
With the server down, the compare page is exactly what it was; in development
a single line says the experiment is offline.

## Where it's used

- **Ask Lens on finn.com** — the "Ask Lens" bubble on listing and car pages
  opens a compact chat (`browser-extension/entrypoints/lens-chat`, framed in by
  `entrypoints/content/lens-chat/bubble.ts`). It compares the cars on the page
  Lens has data for, your pinned cars, or the car you're looking at, and says
  which.
- **The compare page** — "Tell Lens" above the recommendation and "Ask Lens"
  under it.

Both render nothing that depends on this server when it's down: the chat says
it can't read free text and still gives a match from your Lens settings, "Why
this car?", comparisons and pinning.

## Configuration

| Variable | Default | |
|---|---|---|
| `GEMINI_API_KEY` | — | Free from [Google AI Studio](https://aistudio.google.com/apikey), no card. Server-side only. |
| `LENS_AI_PROVIDER` | `gemini` if a key is set, else `mock` | |
| `LENS_AI_MODELS` | every free-tier flash model, newest first | Comma-separated, tried in order. Each free model has its own daily quota, so the list is what keeps Lens answering after one runs out. |
| `LENS_AI_MODEL` | — | A single model and no fallbacks. |
| `LENS_AI_PORT` / `LENS_AI_HOST` | `8787` / `127.0.0.1` | |
| `LENS_AI_ALLOWED_ORIGINS` | any `chrome-extension://` / `moz-extension://` | Set to your extension's exact origin to lock it down. |
| `LENS_AI_DEBUG` | off | `1` logs raw model output. |

The extension reads `WXT_LENS_AI_URL` if the server lives elsewhere.

## The free tier, honestly

- Google may use free-tier prompts and responses to improve its products. Here
  that means what the reader types and the facts about their pinned cars.
  Don't put anything in it you wouldn't want read.
- Quotas are small and per model — on a new key, 20 requests a day for each
  (see [AI Studio](https://aistudio.google.com/rate-limit)). The server moves
  down its model list when one is out, overloaded or not offered to the key,
  and skips a spent model until its window ends. When every model is spent,
  Lens says so and everything that doesn't need the AI keeps working.
- Each chat message that needs the AI costs one request. Explaining a match,
  comparing and pinning cost none.

## Adding a provider

Implement `LensAiAdapter` (`src/adapters/types.ts`) — `interpret` and `ask`,
returning the shapes in `browser-extension/lib/lens-ai/contract.ts` — and pick
it in `chooseAdapter` in `src/server.ts`. The extension doesn't change.

## Logging

One line per request with provider and latency, and for Gemini the token
counts, including thinking and implicitly cached tokens. Request bodies aren't logged. In the extension,
development builds trace every request, response and validation result to the
console under `[Lens AI]`.
