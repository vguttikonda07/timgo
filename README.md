# Timgo

A segmented timer. Split a session into branches — each one beeps and hands off to the next.

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

<kbd>Space</kbd> start / pause · <kbd>→</kbd> skip segment · <kbd>R</kbd> reset
