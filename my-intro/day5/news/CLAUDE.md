# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Scoped to `day5/news/`. Repo-wide tooling and conventions are in the root `CLAUDE.md` — but read the Tooling section there carefully: it delegates "does this folder have a build step" to each folder's own `CLAUDE.md`, and this is the one folder in the repo that answers yes.

## What this is

A Naver News search site (`PRD.md`): search box, popular-keyword chips, sort by accuracy/date, infinite "더보기" pagination. Spec'd against Next.js/TypeScript/Tailwind in the PRD, and — unlike every other folder here — actually built that way, because the one hard requirement (never let the Naver API key reach the browser) needs a real server to enforce.

## Why this folder is different

Every other folder in this repo (`day1`, `day2`, `day5/weather`, `project-hub`) is plain HTML/CSS/JS opened straight from the filesystem or served statically, no build step. This folder has its own `package.json`, `node_modules/`, and a `next build` step, because the alternative — calling Naver from client JS — means shipping the `X-NCP-APIGW-API-KEY` secret to every visitor's browser. There was no way to satisfy PRD §4 (API 키 보호) without a server, so this is a deliberate, isolated exception rather than something to imitate elsewhere in the repo.

## Tooling

```
npm run dev     # localhost:3000
npm run build   # type-checks, lints, production build — run this before considering anything done
npm run start   # serve the production build
npm run lint
```

No extra runtime dependencies beyond what `create-next-app` installed (`next`, `react`, `react-dom`, Tailwind v4 via `@tailwindcss/postcss`). Data fetching, HTML sanitization, and relative-time formatting are all hand-rolled in `src/lib`/`src/hooks` rather than adding SWR/TanStack Query/dayjs — the app has exactly one query shape and no cross-component cache to share, so a general-purpose library buys nothing here. Don't add a dependency without a reason stronger than that.

## Environment variables

- `day5/news/.env.local` (gitignored, not committed) holds two keys:
  ```
  X-NCP-APIGW-API-KEY-ID=...
  X-NCP-APIGW-API-KEY=...
  ```
  As of 2026-07-31 these come from **NAVER API HUB / NCP** (developers.naver.com stopped issuing new Search Open API keys), see https://api.ncloud-docs.com/docs/naver-api-hub-search-news for the current spec if this ever needs re-verifying. There's no committed template file in this folder — the old placeholder-only example was removed since it added nothing beyond what's written here; these two variables are all the app reads.
- `.env.local` is already gitignored. Before any commit in this folder, run `git status` and confirm `.env.local` is not listed.
- **Never** prefix these with `NEXT_PUBLIC_`. That prefix bundles a variable into client JS — the entire point of this folder's architecture is that `X-NCP-APIGW-API-KEY-ID`/`X-NCP-APIGW-API-KEY` are read only inside `src/app/api/news/route.ts`, server-side, via `process.env['X-NCP-APIGW-API-KEY-ID']` (bracket notation — the hyphens make dot access a syntax error).
- `.env.local` (gitignored, local-only) currently holds a real NAVER API HUB key pair — live search was verified end-to-end against `naverapihub.apigw.ntruss.com` on 2026-08-18. If `.env.local` ever gets emptied or reset to placeholder text, search results/empty-state/429/60s-cache all go back to being unobservable locally — see "Checking your work" below for what still works without a real key.

## Architecture

- `src/app/api/news/route.ts` is the only place that talks to Naver. It calls `https://naverapihub.apigw.ntruss.com/search/v1/news` — **NAVER API HUB / NCP API Gateway**, not the legacy `openapi.naver.com`. As of 2026-07-31, developers.naver.com stopped issuing new Search Open API keys and this became the only way to get a working key/endpoint pair; see https://api.ncloud-docs.com/docs/naver-api-hub-search-news for the current spec if this ever needs re-verifying. It maps every upstream failure to one of four client-facing shapes (`INVALID_QUERY` / `AUTH_ERROR` / `RATE_LIMITED` / `UPSTREAM_ERROR`, see PRD §7.3) — the browser never sees a raw Naver status code or error body; `console.error` gets the real detail.
- **Pagination trick**: instead of `start=(page-1)*10+1, display=10`, every request asks for `start=1, display=page*10`. One upstream call per page-count therefore reconstructs the *entire* list so far, which means the URL's `page` value alone is enough to restore state on refresh/share — no replaying N sequential fetches client-side. The cost: Naver caps `display` at 100, so a query tops out at page 10 (100 items) and "더보기" disables itself there. This is a known ceiling, not a bug.
- `next: { revalidate: 60 }` on the outbound `fetch` gives the 60s server cache PRD §8 asks for, independent of the route handler itself being "dynamic" (it reads `searchParams`, which only affects the route's own render mode — the Data Cache on the outbound fetch is separate).
- `src/lib/naverHtml.ts` (`parseNaverHighlights`) is the only thing standing between Naver's response and the page. Naver embeds literal `<b>`/`</b>` around matched keywords plus a handful of HTML entities. Nothing here ever uses `dangerouslySetInnerHTML` — segments are split into `{ text, bold }` and rendered as ordinary React children (`<strong>` or plain text), so even a hostile upstream response can't inject markup. If you touch this file, re-run the manual check below.
- `src/hooks/useNewsSearch.ts` owns all request state (`loading` fires immediately; `showSkeleton` only after a 300ms timer, so fast responses never flash a skeleton) and aborts the previous request via `AbortController` whenever a new one starts.

## project-hub / deployment — not done yet

- **Deployment**: the repo's single Vercel project serves everything else as zero-config static passthrough and can't also run `next build` for this subfolder. This needs a **second Vercel project** with Root Directory set to `day5/news` in the Vercel dashboard, plus `X-NCP-APIGW-API-KEY-ID`/`X-NCP-APIGW-API-KEY` registered there as real environment variables. That's a manual dashboard step, not something to script.
- **project-hub registration**: `project-hub/index.html`'s `PROJECTS` array normally gets a new card once a project ships, but its `liveUrl` needs a real deployed URL — there isn't one yet since this app has no static `index.html` to link to directly. Don't add a placeholder/fake entry; do this after the deploy above.

## Checking your work

No test suite. Before considering a change done:

```
npm run build     # type-checks + lints + production build in one shot
npm run dev        # then exercise the UI by hand
```

The one real injection boundary in this app is `parseNaverHighlights`. After touching it, manually feed it a string mixing a legitimate `<b>` pair with `<script>alert(1)</script>` and an attributed `<b onclick="...">`, and confirm only the plain bolded text survives.

With the real key pair currently in `.env.local`, live search, sorting, and pagination are all directly verifiable with `npm run dev` — already confirmed working. A genuine zero-result query and `429` behavior still depend on what you search for / how much you hit the API, so they're not guaranteed on any given run.

If `.env.local` ever ends up empty or holding non-ASCII placeholder text, the fullest thing you can verify without real credentials is the error path — though not quite the way you'd expect: `fetch()` rejects non-ASCII header values outright (`Cannot convert argument to a ByteString`), so a Korean placeholder never even reaches Naver. It throws inside the route's `try/catch` and surfaces as `UPSTREAM_ERROR` via `ErrorState`, not `AUTH_ERROR` — still confirms the "app never crashes, shows a friendly screen" acceptance criterion from PRD §5.7, just via a different branch of the error table than a real invalid key would hit. To actually exercise `AUTH_ERROR` (401/403) without a real key, use ASCII placeholder values (e.g. `invalid-id` / `invalid-secret`) instead.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
