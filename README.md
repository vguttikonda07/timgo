# Timgo

A segmented timer. Split a session into branches — each one beeps and hands off to the next.

> Your day, structured. Ready, set, timgo.

Save any configuration as a **preset** and reload it in one tap: a meditation sequence,
the timings for a recipe, an interval workout. Pin up to three favourites to the main
screen; the rest live in the library drawer, searchable, with export and import to JSON.

Installable as a Progressive Web App: works offline, keeps the screen awake while running,
and remembers your segments between launches.

**Live:** https://vguttikonda07.github.io/timgo/

## Files

| File | Purpose |
|---|---|
| `index.html` | The entire app — markup, styles, logic |
| `manifest.json` | PWA metadata (name, icons, standalone display) |
| `sw.js` | Service worker; caches everything for offline use |
| `icon-*.png` | App icons, including Android maskable variants |

No build step, no dependencies. Open `index.html` in any browser.

## Install on Android

1. Visit the live URL in Chrome.
2. Menu (⋮) → **Add to Home screen**.
3. Launch it once so the service worker finishes caching.

It then runs fully offline.

## Shortcuts

<kbd>Space</kbd> start / pause · <kbd>→</kbd> skip segment · <kbd>R</kbd> reset · <kbd>Esc</kbd> close

## Starter library

Twenty-eight presets ship with the app and seed on first run, grouped by category in
the library drawer. Anything you save yourself lands under **Yours**.

Several exercise the second-scale timing: **Tabata** (20s work / 10s rest), **Pour Over**
(45s bloom), **Plank Ladder**, **Gesture Drawing**, and **Tadka** (30s for the mustard
seeds to pop).

Seeding happens exactly once. Delete them all and they stay deleted.

## Durations

Segments are stored in whole seconds and accept several shorthands:

| You type | You get |
|---|---|
| `45s` | 45 seconds |
| `1:30` | 1 min 30 sec |
| `25` | 25 minutes |
| `2m30s` | 2 min 30 sec |

Bare numbers are read as minutes. Anything from 1 second to 24 hours is valid.

## Accuracy

The clock is anchored to a wall-clock timestamp, not to `setInterval`. If the tab is
backgrounded or throttled, Timgo reconciles on resume — replaying any segment boundaries
it slept through — so a three-minute timer takes three minutes.

## Data

Presets are stored in `localStorage` on the device. Nothing leaves the browser, and there is
no account or server. Use **Export** in the library drawer to back them up or move them to
another phone.
