# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository shape

Two unrelated practice projects living side by side. They share no assets, no code, and no conventions beyond "plain HTML/CSS/JS, Korean content":

- `day1/` — a static portfolio site plus a standalone card-draw page.
- `day2/` — a browser-local mock exam app, specified by `PRD.md` and `DESIGN.md` and implemented in a single `index.html`.

Do not refactor toward shared assets across the two folders; the separation is intentional. Each folder has its own `CLAUDE.md` with the details that matter when editing inside it.

## Tooling

There is no build step, package manager, test suite, or linter here — no `package.json`. Do not assume npm/node tooling exists.

This **is** a git repository, and it is deployed to Vercel from GitHub: pushing the default branch publishes the site. Treat pushes as outward-facing.

`node` happens to be installed on this machine but is **not** a project dependency. Its only use is ad-hoc syntax checking of inline scripts.

## Running

Every page opens directly from the filesystem. To serve instead:

```
python -m http.server 8000
```

## Gotchas when scripting against these files

Read them as UTF-8 explicitly. PowerShell 5.1's `Get-Content` defaults to ANSI and mangles the Korean text and the circled numerals (`①`–`⑩`) that `day2` relies on.

## Conventions

- Plain HTML/CSS/JS, no dependencies. Keep new styling and scripting inline or in a sibling file; do not introduce a framework, bundler, or package manager.
- Content is Korean. Keep `<meta charset="UTF-8">` and `lang="ko"` in place when editing.
- `day1` uses a sibling stylesheet for the portfolio and inlines everything for `fortune.html`; `day2` is a single fully-inline file. Follow whichever pattern the file you are editing already uses.
