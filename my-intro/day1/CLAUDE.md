# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Scoped to `day1/`. Repo-wide tooling and conventions are in the root `CLAUDE.md`.

## What this is

A small static site with no shared assets between pages. `index.html` is a portfolio / self-introduction page styled by its sibling `style.css`; `fortune.html` is a standalone page that keeps all of its CSS and JS inline and only links back to `index.html`.

## Theme system

The only part of this folder that spans files. `<html data-theme>` has **three** states: `"dark"`, `"light"`, and unset — unset means follow the OS via `prefers-color-scheme`. Two consequences:

- `style.css` declares every color token **three times**: bare `:root`, `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }`, and `:root[data-theme="dark"]`. A new token must be added to all three or it silently falls back to the light value.
- `index.html` runs a small inline script in `<head>`, before the stylesheet link, that reads `localStorage.theme` and stamps `data-theme`. It exists to prevent a flash of the wrong theme; keep it in the head and keep it synchronous.

## fortune.html

Self-contained. The card data lives in the `FORTUNES` array at the top of its script; everything else is presentation.
