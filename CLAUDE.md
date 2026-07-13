# CLAUDE.md — Timgo

Timgo is a segmented timer PWA: one session split into a chain of segments, each beeping
and handing off to the next. Live at https://vguttikonda07.github.io/timgo/ — this repo
IS the deployment; GitHub Pages serves it as-is. No build step, no dependencies, one
inline `<script>` in `index.html`.

## Non-negotiables (each of these was a shipped bug once)

1. **Bump the cache key in `sw.js` on EVERY deploy** (`timgo-vNN`). Without it, installed
   apps serve the stale cached copy forever. Users must open the app twice to update.
2. **Never rebuild `#list` innerHTML while an input has focus** — it destroys the focused
   node and Android dismisses the keyboard. `buildList()` runs only on structural change;
   `render()` (called 10×/sec while running) may only patch attributes.
3. **`const` does not hoist.** Three separate TDZ bugs shipped or nearly shipped here.
   Any new helper used by `buildList`/`render`/engine goes in the helpers block near the
   top. `tests/run.js` catches ordering only if a test actually executes the path.
4. **Never `Global?.property` on a possibly-undeclared global** (`Notification?.x` threw
   ReferenceError and killed Start). Use `"Notification" in window`.
5. **Escape everything interpolated into HTML with `esc()`** — including attribute values.
   A lone `"` replace corrupted segment names on round-trip.
6. **Double-quoted attributes only** in template strings; `esc()` doesn't escape `'`.
7. **A global `button{border-radius:999px}` exists.** Any small/square button must set
   its own radius or it renders as a circle.
8. **No native `confirm()`/`alert()`** — use `askConfirm()` (the styled sheet).
9. Every flex/grid ancestor of a horizontal scroller needs `min-width:0`, or the page
   grows a sideways scroll on phones.

## Data model (all persisted in localStorage)

- Segment: `{ id, name, sec, snd? }` — **seconds are canonical**; `sec` 1..86400.
  `snd` is an optional per-segment voice key into `SOUNDS`. Legacy records had `min`
  (whole minutes); `migrate()` upgrades on read, idempotently.
- Keys: `timgo` (working segments), `timgo.presets`, `timgo.sound`, `timgo.seeded`.
- Presets: `{ id, name, hue 0-5, cat?, fav?, segs[] }`. `id` from `newId()` (monotonic —
  `Date.now()` alone collides within one ms). `cat` only from `CAT_ORDER`; user saves
  have none and group under "Yours". Saving over an existing name overwrites but keeps
  `id/hue/cat` (`Object.assign(clash, snapshot, ...)` — snapshot deliberately omits them).
- Seeding runs ONCE (`timgo.seeded` flag). Deleted presets stay deleted; never reseed.

## Engine truths

- `endsAt` (wall-clock ms) is the source of truth; `left` is derived. `sync()` reconciles
  on every tick and on `visibilitychange`, replaying slept-through boundaries with ONE
  catch-up beep. Boundary check uses `Math.ceil` — `round` fired beeps 250ms early,
  audible on 20s Tabata intervals. Poll is 100ms; `sync()` is idempotent.
- `started` flag = session underway (running OR paused mid-way). `rewind()` may reset the
  idle preview ONLY when `!started` — without that check, editing any duration while
  paused silently reset the whole session (real bug, fixed, regression-tested).
- While hidden, the AUDIO CLOCK owns the beeps: `armSchedule()` pre-schedules every
  remaining boundary sample-accurately (JS timers get throttled; the audio timeline does
  not), held open by a 40 Hz keepalive. On return, sync() runs BEFORE disarm so the
  replay is silent (`schedArmed` suppresses), then JS resumes as beep authority. Never
  reorder that listener and never remove the suppression — either mistake double-beeps.
  Catch-up from a plain suspend (no visibilitychange) must still beep: bg.js guards it.
- Boundary sound = the voice of the segment STARTING (`sndOf(active)` after increment);
  the 3-beep completion flourish uses the app-wide voice.
- `liveResize(consumed)` retimes the running segment on blur (never per keystroke —
  typing "6" en route to "60" must not truncate the session).
- Reorder/delete during a session tracks the active segment BY ID, never by index.

## Testing protocol

`node tests/run.js` — 223 tests, 12 suites, a DOM/clock harness in `tests/harness.js`
(controllable `Date.now`, manual ticks, fake elements). **Run before every deploy; add a
regression test for every bug fixed.** Two lessons paid for: (a) tests that reimplement
app logic instead of calling it certify nothing — three "failures" here were stale tests;
(b) string-matching validators miss whole bug classes; only executed behavior counts.
Drag-and-drop reorder is the one path the harness cannot exercise — verify on a phone.

## Deploy loop

Edit → `node tests/run.js` → bump `sw.js` cache → commit → push → Pages live in ~60s →
open installed app twice. `manifest.json` paths are relative (`./`), so the repo works at
any mount point.

## Current state & open items

v17 (cache `timgo-v17`). Presets are shareable via URL fragment (#p=…) — `sanitizePreset()` is the single gate for BOTH file imports and shared links; never add a third entry path that bypasses it. Fragment (not query) is deliberate: it keeps shared links servable from the SW cache offline. Play Store: Console account paid; next steps live in
`PLAYSTORE.md` (assetlinks needs TWO fingerprints — PWABuilder's AND Play App Signing's;
keystore backup is the one irreversible step). `privacy.html` needs a real contact email
before committing. Known debts: a promised "Restore starter presets" button (seeded users
never receive newly added starters); `drawChain()` rebuilds SVG every tick (harmless,
inelegant); no stats/history; presets are per-device (Export/Import is the sync story).
