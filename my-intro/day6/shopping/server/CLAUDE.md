# CLAUDE.md

Scoped to `day6/shopping/server/`. This is not an independent app — read `day6/shopping/CLAUDE.md` first; this file only covers the Next.js-specific bits of the proxy that lives in this subfolder.

## What this is

The Gemini proxy for the "쇼핑리뷰분석" Chrome extension (`day6/shopping/extension/`). One route, `POST /api/analyze` (`src/app/api/analyze/route.ts`), that receives parsed reviews from the extension and returns sentiment/insights/keywords. `src/app/page.tsx` is just a one-line human-readable status page for sanity-checking a deploy — nobody uses this as a website.

## Tooling

```
npm run dev     # localhost:3000
npm run build   # type-checks, lints, production build — run this before considering anything done
npm run start   # serve the production build
npm run lint
```

Same baseline deps as `day5/news`/`day6/dust` (`next`, `react`, `react-dom`), no Tailwind — there's no real page to style here.

## Environment variables

- `GEMINI_API_KEY` — Google AI Studio Gemini key, read only in `src/lib/gemini.ts` via `process.env`. Never prefix with `NEXT_PUBLIC_`. `.env.local` (gitignored) now has a real key filled in.
- `MOCK_ANALYSIS` — set to `1` to skip the real Gemini call entirely and return `src/lib/mockResponse.ts`'s fixed sample response (each string suffixed `(mock 데이터)` so it's never mistaken for a real result). Lets the extension's popup/dashboard/xlsx-export be built and tested without a real key. `.env.local` now has this set to `0` — the real Gemini path is live; flip back to `1` if you need deterministic output without burning API quota.
- `.env.example` is committed with both var names, no values.

## Not built yet

- **Durable rate limiting.** `src/lib/rateLimit.ts` is an in-memory `Map` keyed by `x-forwarded-for`, best-effort only — it resets on cold start and isn't shared across concurrent serverless instances. Before any real public launch this should move to Vercel KV/Upstash Redis with a real shared counter.
- ~~Gemini model id / endpoint verification~~ — done: a real `curl` request with a real `GEMINI_API_KEY` against `/api/analyze` (5-review payload) returned a `responseSchema`-matching `AnalyzeResponseBody` with no `(mock 데이터)` markers, confirming `src/lib/constants.ts`'s `GEMINI_MODEL`/`GEMINI_API_BASE` resolve correctly.
- **300-review requests were slow and occasionally failed — this was real, observed, not hypothetical.** A real end-to-end run through the extension (Coupang, ~300 reviews) hit `TimeoutError` at the old 25s `GEMINI_TIMEOUT_MS` — a ~300-review prompt (up to 300×1000 chars of review text plus a `responseSchema`-constrained `reviewLabels[]` of the same length) is genuinely heavy, not just occasionally slow. On retry, Gemini itself returned `503 "This model is currently experiencing high demand"` — real transient Google-side overload on `gemini-flash-latest`, outside our control. Fixed the timeout part: `GEMINI_TIMEOUT_MS` raised 25s → 50s, and `route.ts` now sets `export const maxDuration = 60` so a future Vercel deploy doesn't kill the function before Gemini responds (Vercel's default serverless timeout would otherwise cut this off regardless of our own `AbortSignal`). Separately, `extension/lib/config.js`'s `MAX_REVIEWS_TARGET` was lowered 300 → 150 by explicit choice — this deviates from the PRD's stated 100~300 range, traded off against the PRD's "~30초 내외" end-to-end latency target (§ "상품 페이지 방문 → 클릭 한 번 → 30초 내외"), which a 300-review prompt alone could blow past (close to 50s) even without "high demand" delays. `MAX_REVIEWS` in `src/lib/constants.ts` is unchanged at 300 — it's just the server-side upper cap `sanitizeReviews()` slices to, still fine since 150 < 300.
- Separately, `src/lib/rateLimit.ts`'s `RATE_LIMIT_MAX_REQUESTS = 10` per `RATE_LIMIT_WINDOW_MS` (1 hour, see `src/lib/constants.ts`) is easy to self-trip during local dev: `rateLimitKeyFromRequest()` reads `x-forwarded-for`, which plain `localhost:3000` requests never set, so every local request collapses onto one shared `"unknown"` bucket — a handful of manual test runs exhausts it for an hour. Confirmed by hitting it during this session's testing; the in-memory bucket only clears on a dev-server restart (`buckets` is a module-level `Map`, reset on process start). Not changed (see "Durable rate limiting" above for the real fix), but worth knowing before assuming a 429 means something broke.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
