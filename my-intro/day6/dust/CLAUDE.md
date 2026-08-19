# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Scoped to `day6/dust/`. Repo-wide tooling and conventions are in the root `CLAUDE.md` — but read the Tooling section there carefully: it delegates "does this folder have a build step" to each folder's own `CLAUDE.md`, and this is the second folder in the repo (after `day5/news`) that answers yes.

## What this is

A 도시별 미세먼지 조회 서비스 (`미세먼지_서비스_PRD.md`): pick one of 17 시/도 chips, see a real-time PM10/PM2.5/통합대기환경지수 card plus a 24-hour trend chart. Spec'd against React/Next.js/Recharts in the PRD, and — like `day5/news` — actually built that way, because the hard requirement (never let the AirKorea service key reach the browser) needs a real server to enforce.

**Current scope is intentionally smaller than the full PRD.** The PRD's v1 also describes Geolocation-based auto city detection (§6.1) and a 7~30-day daily trend view with a period toggle (§6.3). Both were deliberately deferred — see "Not built yet" below — so what exists today is: 17 city chips (서울 default), the realtime card, and the 24-hour hourly chart only.

## Why this folder is different

Every other folder in this repo except `day5/news` is plain HTML/CSS/JS opened straight from the filesystem or served statically, no build step. This folder has its own `package.json`, `node_modules/`, and a `next build` step, because the alternative — calling AirKorea from client JS — means shipping `AIRKOREA_SERVICE_KEY` to every visitor's browser. There was no way to satisfy the PRD's key-protection requirement without a server, so this is the same deliberate, isolated exception `day5/news` already established.

## Tooling

```
npm run dev     # localhost:3000
npm run build   # type-checks, lints, production build — run this before considering anything done
npm run start   # serve the production build
npm run lint
```

One runtime dependency beyond what `day5/news`'s baseline has: **`recharts`**, for the trend chart. This isn't an undirected addition — the PRD (§11) names Recharts explicitly for its React-component-based, responsive line charts. Everything else (fetch, request-state hook, grade/formatting helpers) is hand-rolled in `src/lib`/`src/hooks`, same philosophy as `day5/news` — one query shape, no cross-component cache to share, so a data-fetching library buys nothing here.

## Environment variables

- `day6/dust/.env.local` (gitignored, not committed) holds one key:
  ```
  AIRKOREA_SERVICE_KEY=...
  ```
  This is the data.go.kr(공공데이터포털) service key for 한국환경공단 에어코리아 "대기오염정보 조회 서비스". Read only inside `src/app/api/dust/route.ts`, via `process.env`. **Never** prefix it with `NEXT_PUBLIC_`.
- Unlike `day5/news`, this folder **does** ship a committed `.env.example` (with the var name and a one-line comment, no value). Reason for the divergence: `day5/news`'s CLAUDE.md judged a template unnecessary because its two vars are fully explained in prose there. This folder's env var carries a genuinely easy-to-hit failure mode (see the encoding gotcha below) that's worth a permanent, discoverable pointer right next to where someone would create `.env.local`, not just prose in this file.
- **Double-encoding gotcha (data.go.kr-specific):** data.go.kr issues both an *Encoding* key and a *Decoding* key for the same credential. AirKorea's endpoint wants the **raw Decoding key** — `fetch`/`URLSearchParams` will percent-encode it when building the query string. If you paste the *Encoding* key instead (already percent-encoded, e.g. contains literal `%2B`/`%2F`), it gets encoded a second time and every call fails auth in a way that looks identical to a wrong or expired key. `route.ts` checks for a `%XX`-shaped substring in the key at request time and `console.warn`s a hint — but the real fix is using the Decoding key in `.env.local` to begin with.
- Before any commit in this folder, run `git status` and confirm `.env.local` is not listed (it's covered by the repo's `.env*` gitignore pattern, with `.env.example` explicitly un-ignored).

## Architecture decisions

- `src/app/api/dust/route.ts` is the only place that talks to AirKorea. It calls **`getMsrstnAcctoRltmMesureDnsty`** (측정소별 실시간 측정정보) with `dataTerm=DAILY`, not `getCtprvnRltmMesureDnsty` (시/도별) as the PRD's §7 sketch implies. Reasoning: the 시/도별 endpoint only returns current values with no history parameter, so charts would still need a second call to a different endpoint. The 측정소별 endpoint accepts `dataTerm` and returns an array of hourly records newest-first for one station — one upstream call therefore serves **both** the realtime card (first row) and the 24-hour chart (the rest of the array). This also keeps quota usage low: 17 cities × 24 possible cache refreshes/day, well under data.go.kr's default 1,000/day quota.
- **대표 측정소 매핑** (`src/lib/stations.ts`): one representative station name per 시/도, since the PRD explicitly asks for a single representative value per province rather than 시/군/구 granularity. **Only 7 of 17 are live-verified** (서울/부산/대구/인천/광주/대전/울산) — confirmed against the real AirKorea endpoint with the real service key during implementation. The other 10 (세종/경기/강원/충북/충남/전북/전남/경북/경남/제주) are unverified: the first-round guesses (plain city names like "수원", "청주", "제주") were live-tested and confirmed **wrong** (clean `NO_DATA`, not a fluke), and were replaced with plausible 동-level names that themselves were never confirmed because the AirKorea gateway started rate-limiting this key partway through verification (every call started returning `SERVICETIMEOUT_ERROR`, even for names already known to work). Selecting one of these 10 cities today reliably shows the app's `NO_DATA` error state — a real user-visible gap, not a crash. **Before trusting this table further, either wait for the rate limit to clear and continue the live spot-check, or look up the correct 동-level names manually at https://www.airkorea.or.kr/web/stationInfo and update `stations.ts` directly** — the sido-level endpoint (`getCtprvnRltmMesureDnsty`) was tried as a way to discover station names dynamically instead of guessing, but returned `SERVICETIMEOUT_ERROR` even for guaranteed-valid inputs (`sidoName=서울`) throughout testing, so it isn't a reliable fallback on this key either.
- Error mapping in `route.ts` follows the same discipline as `day5/news/src/app/api/news/route.ts`: never leak the raw AirKorea response, status, or key to the client. It maps to a closed set (`INVALID_CITY` / `UPSTREAM_CONFIG_ERROR` / `AUTH_ERROR` / `RATE_LIMITED` / `NO_DATA` / `UPSTREAM_ERROR`), reading both the HTTP status and AirKorea's own `resultCode` envelope field (data.go.kr sometimes returns a 200 with an error `resultCode`, and sometimes returns a non-JSON XML fault body — even when `returnType=json` is requested — specifically for auth failures. `route.ts` handles both: it parses the response as text first, and if `JSON.parse` fails, pattern-matches the raw text for auth-related keywords before falling back to a generic upstream error).
- `next: { revalidate: 3600 }` on the outbound `fetch` gives the 1-hour server cache the PRD (§11) asks for, matching AirKorea's own hourly update cadence.
- `src/hooks/useDustData.ts` owns all request state, mirroring `useNewsSearch.ts`: `loading` fires immediately, `showSkeleton` only after a 300ms timer so fast responses never flash a skeleton, `AbortController` cancels the previous in-flight request on city change, and the selected city is synced to `?city=` in the URL so refresh/share preserves it.
- Grade colors are never shown without an adjacent text label (`GradeBadge`), per the PRD's colorblind-accessibility requirement (§9) — this is centralized in one component specifically so it can't regress in one place but not another.

## Not built yet (deferred from PRD v1 by explicit choice)

- **위치 기반 자동 지역 감지** (Geolocation, PRD §6.1) — not implemented. Selecting a city is manual only; default is 서울.
- **7~30일 일별 추이 그래프** (daily trend + period toggle, PRD §6.3) — not implemented. Only the 24-hour hourly chart exists.
- Both were deferred at implementation time because they carry the highest verification risk: geolocation needs a real device/permission prompt to test meaningfully, and the daily view depends on aggregating AirKorea's hourly history data in a way that hadn't been verified against live responses yet. If picked up later: geolocation can reuse a small hardcoded 17-city centroid table + haversine nearest-match (no geo library needed); the daily view can reuse the same `getMsrstnAcctoRltmMesureDnsty` call with a longer `dataTerm` (`MONTH`/`3MONTH`) and a server-side group-by-date average, but the exact row count/coverage that `dataTerm` values actually return past a few days should be confirmed live before committing to it.

## project-hub / deployment — not done yet

- **Deployment**: the repo's single Vercel project serves everything else as zero-config static passthrough and can't also run `next build` for this subfolder. This needs a **second Vercel project** with Root Directory set to `day6/dust`, plus `AIRKOREA_SERVICE_KEY` registered there as a real environment variable. That's a manual dashboard step, not something to script.
- **project-hub registration**: `project-hub/index.html`'s `PROJECTS` array gets a new card once this ships, but its `liveUrl` needs a real deployed URL (same reasoning as `day5/news`'s still-pending registration) and a thumbnail in `project-hub/thumbs/` — do this after the deploy above, as `no: '08'`.

## Checking your work

No test suite. Before considering a change done:

```
npm run build     # type-checks + lints + production build in one shot
npm run dev        # then exercise the UI by hand
```

With a real key in `.env.local`: cycle through several city chips and confirm the card + hourly chart update, confirm grade colors always carry a text label, check a 360px mobile viewport (no horizontal overflow), and spot-check a few `stations.ts` entries against what AirKorea actually returns for that station name (region should match the intended city).

Without a real key (or with `.env.local` empty): `AIRKOREA_SERVICE_KEY is not set` logs server-side and the UI shows the `UPSTREAM_CONFIG_ERROR` friendly message + retry button — confirmed working. To exercise `AUTH_ERROR` specifically, use an ASCII placeholder value (e.g. `invalid-key`) rather than leaving the var empty.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
