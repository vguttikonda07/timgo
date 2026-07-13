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

## Background & silent mode

Beeps land **on time even when Timgo is in the background**: the moment the app is
hidden mid-session, every remaining boundary is pre-scheduled on the device's audio
clock — which, unlike JavaScript timers, is never throttled — and a sub-audible tone
keeps the pipeline awake. Return to the app and it hands control back seamlessly;
nothing ever beeps twice. Sounds play on **media volume**, so Android's silent/vibrate
mode doesn't mute them — but media volume at zero, or DND configured to mute media,
will (no app can override your volume, by design). Battery cost applies only while a
session is running in the background, comparable to playing a silent song.

## Sharing presets

Every preset has a share button (the ⤴ on its chip or library row). It builds a link that
IS the preset — segments, durations, sounds, colour — encoded in the URL fragment, so it
opens instantly from the offline cache and touches no server. On phones it opens the
native share sheet, straight into any chat. The recipient gets one prompt — "Add
'Sunday Rajma'? 47m · 4 segments" — and it lands in their library, loaded and ready.
Links survive chat-app mangling (trailing punctuation is stripped), collide politely
(a duplicate name arrives as "… (shared)"), and pass through the same sanitiser as file
imports: hostile links get clamped, not executed.

## Themes

Two looks, one app: **Ember** (the original editorial dark) and **Pop** — dopamine hues
on warm paper, candy chain ring, round caps. Pick in the Theme control below the segment
list; the choice persists. Every color runs through CSS custom properties, so a new theme
is one variable block plus six hues.

## While it runs

**+1m** stretches the segment on the clock. **⏮** restarts it (or steps back if you just
arrived — music-player rules); it also reopens a finished session. **⏭** works paused too.
When a session completes, the Start button becomes **Run again**.

## Building timers

Drag the **⠿** grip to reorder. The **⋯** on each row opens duplicate, move, delete, and a
**per-segment sound** — Tabata ships with a blip for work and a wood block for rest, so you
can tell them apart face-down in a plank. **⧉ Repeat all ×2** doubles the list: a work/rest
pair becomes eight rounds in three taps. Editing the running segment's duration applies on
blur, keeping the time you've already spent.

## Durations

Segments are stored in whole seconds and accept several shorthands:

Type a number, then tap **m** or **s**. The toggle sets what the number means — `10`
under `s` is ten seconds, under `m` it is ten minutes.

For a mixed duration, type it directly: `1:30`, `1:05:30`, `2h`, `45s`, `2m30s`. The field
switches to free-form and shows the colon form back to you.

Anything from 1 second to 24 hours is valid, and every value round-trips losslessly.

## Sound

Seven synthesized voices — Chime, Bell, Blip, Wood, Rise, Gong, Silent — chosen from the
picker below the segment list. No audio files, so the app stays offline. Your choice
persists. Silent also suppresses vibration.

## Accuracy

The clock is anchored to a wall-clock timestamp, not to `setInterval`. If the tab is
backgrounded or throttled, Timgo reconciles on resume — replaying any segment boundaries
it slept through — so a three-minute timer takes three minutes.

## Data

Presets are stored in `localStorage` on the device. Nothing leaves the browser, and there is
no account or server. Use **Export** in the library drawer to back them up or move them to
another phone.
