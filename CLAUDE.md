# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single self-contained static landing page for "La Margarita", a cabin/bungalow rental in Ytu Guasu, Caacupé, Paraguay. There is no build system, package manager, framework, or test suite — everything (HTML, CSS, JS) lives inline in `index.html`. Media assets (photos/videos, some with `.webp`/`.jpg` pairs via `<picture>`) live in `media/`.

This is not a git repository.

## Running / previewing

There's no dev server or build step. Open `index.html` directly in a browser, or serve the directory with any static file server (e.g. `python -m http.server`) so the `/media/...` absolute paths resolve correctly.

## Structure of index.html

The file is organized top-to-bottom as: `<style>` block (design tokens as CSS custom properties in `:root`, then component styles per section) → body sections in page order → a single `<script>` block at the end.

- **Design tokens**: colors are defined once as CSS variables in `:root` (`--forest`, `--sage`, `--taupe`, `--champagne`, etc.) and reused throughout — change the palette there, not per-rule.
- **Sections** (in DOM order, matching nav anchors): WhatsApp floating button → header/nav + mobile hamburger overlay → `#top` hero → `#sobre` (about) → amenities (`#amenities`) → gallery (`#galeria`) → location/map (`#ubicacion`) → contact/reservas (`#reservas`) → footer.
- **Contact/booking flow**: there is no form — all CTAs are `wa.me` deep links to a hardcoded WhatsApp number with a prefilled message. That phone number (`595982429777`) is repeated in multiple places (WhatsApp float, header CTA, mobile nav, hero, contact section, footer) — update all occurrences together when it changes.
- **Media**: images use `<picture>` with a `.webp` source and `.jpg` fallback; gallery items are `<video>` elements with a `.jpg` poster and `.mp4` source. Filenames are UUID-based; when adding new media, follow the existing pattern of dropping files into `media/` and referencing them with root-relative `/media/...` paths.
- **JS** (vanilla, no dependencies): IntersectionObserver-driven scroll-reveal (`.reveal` / `.is-visible`), header scroll-shrink effect, and hamburger/mobile-nav toggle logic. All three are independent, small, and self-contained at the bottom of the file.

## Editing conventions already in place

- Spanish-language content (`lang="es"`); keep copy in Spanish.
- Section comments use a consistent `<!-- ===== SECTION NAME ===== -->` banner style — follow it when adding sections.
- Responsive breakpoints used throughout: `900px` (nav collapses to hamburger, grids go single/stacked) and `640px` (mobile padding/spacing tightens).
