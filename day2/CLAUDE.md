# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Scoped to `day2/`. Repo-wide tooling and conventions are in the root `CLAUDE.md`.

## What this is

A browser-local mock exam app for someone studying for a certification: register your own past-exam questions, sit the exam repeatedly, and let wrong answers accumulate into a review list automatically. Single user, no accounts, no server.

Three files, and the relationship between them is the whole architecture:

| File | Role |
|---|---|
| `PRD.md` | Product spec — functional requirements (FR-1…FR-7), data model, design rationale |
| `DESIGN.md` | Design tokens — the authoritative color/typography/spacing/component values |
| `index.html` | The implementation of both, in one self-contained file |

## Document contract

`index.html`'s `:root` blocks mirror DESIGN.md's YAML frontmatter — `colors`, `typography`, `rounded`, `spacing` — one CSS variable per token, same values. **Changing a token means changing both files.** The frontmatter is authoritative; the prose below it is descriptive commentary.

DESIGN.md is an extraction of MongoDB's brand system and predates the app, so it is missing things the app needs. Anything added beyond it — success/error semantics, choice-marking buttons, the answer strip, timer, progress bar — carries a `확장` comment naming the departure and why. Preserve that marking when adding more.

Fonts (`Euclid Circular A`, `Source Code Pro`) are named in DESIGN.md but not bundled, and no external CDN is permitted. The CSS lists them first in a fallback stack ending in Korean-capable system faces. Do not add a webfont link.

## Data model

All state lives in `localStorage` under the keys defined in PRD §6:

| Key | Holds |
|---|---|
| `exams:index` | exam metadata array — `{id, name, createdAt, questionCount, attempts, lastScore, lastAttemptAt}` |
| `exam:{examId}:questions` | question array |
| `exam:{examId}:stats` | per-question wrong-answer stats, keyed by question id |
| `img:{examId}:{questionId}` | one base64 image |
| `app:currentExam` | id of the selected exam |

Images get their own key **per question** deliberately: a single localStorage item is capped around 5MB, so inlining images into the question array breaks once a few exist. Keep that split.

Every read and write goes through the `store` wrapper, which falls back to an in-memory object when localStorage throws (blocked storage, quota exceeded). Never call `localStorage` directly.

## Traps

- **`answer` is 0-based.** For `single`/`multi` questions it holds choice indices starting at 0, while the UI renders 1-based circled numerals (`①`–`⑩`). Convert at the boundary. For `short` questions it holds acceptable answer strings instead.
- **Grading is strict by design** (PRD §5): `multi` requires an exact set match with no partial credit; `short` compares after stripping all whitespace and lowercasing; unanswered counts as wrong.
- **Wrong-note lifecycle**: a wrong answer sets `inNote = true` and resets `streak` to 0; two consecutive correct answers set `inNote = false`. All of it happens in `grade()`.
- **No native `confirm` / `prompt` / `alert`.** PRD §8 rules them out because sandboxed environments block them and the page just looks frozen. Use the promise-based `dialog()` and `toast()` helpers.
- **`[hidden] { display: none !important; }` is load-bearing.** Several component classes set `display` themselves, which otherwise beats the UA's `[hidden]` rule and leaves supposedly-hidden elements visible.
- All JS is one IIFE using `var`/`function` with no modules, so the page works over `file://`. Match that style.

## Implementation status

FR-1 and FR-3 through FR-7 are implemented. **FR-2 (PDF auto-extraction) is not** — it needs an AI API endpoint and key, which a dependency-free static file has nowhere to put. Its tab renders as an inert placeholder with an explanatory note.

Open questions that would change behavior are parked in PRD §11; do not resolve them unilaterally.

## Checking your work

There is no test suite. A typo inside the inline `<script>` fails silently in the browser, so syntax-check it after non-trivial edits:

```
node -e "const fs=require('fs');fs.writeFileSync('check.js',fs.readFileSync('day2/index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1])"
node --check check.js
```

`node` is not a project dependency — this is an ad-hoc check only.
