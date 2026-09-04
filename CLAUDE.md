# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A self-contained static landing page for "La Margarita", a cabin/bungalow rental in Ytu Guasu, Caacupé, Paraguay. There is no build system, package manager, or frontend framework — everything (HTML, CSS, JS) lives inline in `index.html`. Media assets (photos/videos, some with `.webp`/`.jpg` pairs via `<picture>`) live in `media/`. The one exception to "static" is a single Vercel serverless function in `api/` (see below).

This is a git repository, deployed on Vercel (auto-deploy from `main`) at https://lamargarita-one.vercel.app/.

## Running / previewing

For pure HTML/CSS/JS changes: open `index.html` directly in a browser, or serve the directory with any static file server (e.g. `python -m http.server`) so the `/media/...` absolute paths resolve correctly. This will NOT serve `/api/availability` (see below) — that endpoint only exists once deployed to Vercel, or when run through `vercel dev` / an equivalent local proxy.

## Availability calendar (`api/availability.js`)

The booking form's check-in/check-out calendar shows real, near-live availability pulled from a Google Calendar the owner maintains exclusively for cabin reservations (one all-day event per booking). Since browsers can't read Google's iCal feed directly (no CORS), a small Vercel Node serverless function at `api/availability.js` fetches and parses that calendar's public iCal feed server-side and returns the occupied nights as JSON (`{ busyNights: ["YYYY-MM-DD", ...] }`), cached for 5 minutes. The calendar's iCal URL is hardcoded in that file (it's a read-only feed, not a secret). If the owner ever changes which Google Calendar they use for reservations, update `CALENDAR_ICS_URL` there.

The frontend's custom date-picker (see below) fetches this endpoint once on page load and disables/greys out any date in `busyNights`, plus blocks selecting a check-out that would cross an occupied night.

## Structure of index.html

The file is organized top-to-bottom as: `<style>` block (design tokens as CSS custom properties in `:root`, then component styles per section) → body sections in page order → a single `<script>` block at the end.

- **Design tokens**: colors are defined once as CSS variables in `:root` (`--forest`, `--sage`, `--taupe`, `--champagne`, etc.) and reused throughout — change the palette there, not per-rule.
- **Sections** (in DOM order, matching nav anchors): WhatsApp floating button → header/nav + mobile hamburger overlay → `#top` hero → `#sobre` (about) → amenities (`#amenities`) → gallery (`#galeria`) → location/map (`#ubicacion`) → contact/reservas (`#reservas`) → footer.
- **Contact/booking flow**: the `#reservas` section has a real `<form id="booking-form">` (name, guests, check-in/check-out via a custom date-picker, optional message). On submit it validates client-side and opens a prefilled `wa.me`/`api.whatsapp.com` deep link to a hardcoded WhatsApp number — there's still no backend that receives the form itself. That phone number (`595982429777`) is repeated in multiple places (WhatsApp float, header CTA, mobile nav, hero, contact section, footer) — update all occurrences together when it changes.
- **Date picker**: the check-in/check-out fields are plain readonly text inputs (not native `<input type="date">`, which can't be styled per-day) paired with a custom-built calendar dropdown (`.date-picker` markup + JS in the booking-form script section). It reads occupied nights from `/api/availability` (see below) and greys out unavailable dates.
- **Media**: images use `<picture>` with a `.webp` source and `.jpg` fallback; gallery items are `<video>` elements with a `.jpg` poster and `.mp4` source. Filenames are UUID-based; when adding new media, follow the existing pattern of dropping files into `media/` and referencing them with root-relative `/media/...` paths.
- **JS** (vanilla, no dependencies): IntersectionObserver-driven scroll-reveal (`.reveal` / `.is-visible`), header scroll-shrink effect, hamburger/mobile-nav toggle logic, the booking form + date-picker logic. All are independent, small, and self-contained at the bottom of the file.

## Editing conventions already in place

- Spanish-language content (`lang="es"`); keep copy in Spanish.
- Section comments use a consistent `<!-- ===== SECTION NAME ===== -->` banner style — follow it when adding sections.
- Responsive breakpoints used throughout: `900px` (nav collapses to hamburger, grids go single/stacked) and `640px` (mobile padding/spacing tightens).
