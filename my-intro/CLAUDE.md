# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A small static site with no shared assets between pages. `index.html` is a portfolio / self-introduction page styled by its sibling `style.css`; `fortune.html` is a standalone page that keeps all of its CSS and JS inline. Korean-language content throughout (`lang="ko"`, UTF-8).

There is no build step, package manager, test suite, or version control here — no `package.json`, no `.git`. Do not assume npm/node tooling exists; do not run `git` commands unless the user initializes a repo first.

## Running it

Open `index.html` directly in a browser, or serve the directory:

```
python -m http.server 8000
```

## Conventions

- Plain HTML/CSS/JS with no dependencies. If styling or scripting is needed, keep it inline or in sibling files next to `index.html` rather than introducing a framework or bundler.
- Content is in Korean; keep the `<meta charset="UTF-8">` and `lang="ko"` in place when editing.
