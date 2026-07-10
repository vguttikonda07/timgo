# Timgo → Google Play: the complete runbook

Work through the phases in order. The order matters: the asset-links file needs
fingerprints that only exist after later steps, which is why it has two placeholder slots.

---

## Phase 0 — Today (~30 min, mostly waiting on Google)

**1. Commit `privacy.html` to the `timgo` repo.**
Open `privacy.html` first and replace `YOUR-EMAIL@example.com` with a real address —
Google checks that the policy has a contact. After pushing, confirm it loads at:
`https://vguttikonda07.github.io/timgo/privacy.html`

**2. Create the origin-root repo.**
The asset-links file must be served from the *root* of your origin, not from `/timgo/`:

```
https://vguttikonda07.github.io/.well-known/assetlinks.json
```

GitHub Pages serves the root only from a repo named exactly `vguttikonda07.github.io`. So:

- github.com/new → name it `vguttikonda07.github.io` → Public → Create
- Add file → Create new file → type `.well-known/assetlinks.json` as the filename
  (typing the `/` creates the folder) → paste the contents of the `assetlinks.json`
  I gave you → Commit
- This repo auto-publishes; no Pages settings needed.

The two fingerprints are placeholders for now. That's expected.

**3. Register the Play Console account.**
`play.google.com/console/signup` → **Personal** account → $25 one-time.
Google will ask for identity verification (ID document). This can take a day or two to
clear — start it now so it's not the bottleneck later.

---

## Phase 1 — Package the app (~10 min)

**1.** Go to **pwabuilder.com**, paste `https://vguttikonda07.github.io/timgo/`, let it
analyze, then **Package for stores → Android**.

**2.** In the options dialog:

| Field | Value |
|---|---|
| Package ID | `io.github.vguttikonda07.timgo` |
| App name | Timgo |
| Version | 1.0.0 (version code 1) |
| Signing key | **Create new** |
| Display | Standalone (default) |

Everything else: defaults are fine. Download the zip.

**3. THE KEYSTORE. Read this twice.**
The zip contains `signing.keystore` and a text file with its passwords. If you ever lose
them, you can **never update Timgo again** under this listing — Google has no recovery.
Right now, before anything else: copy both files to (a) Google Drive, (b) an email to
yourself, (c) a second device. Three places, minimum.

**4. First fingerprint.**
The zip's readme (or PWABuilder's success screen) shows the signing key's
**SHA-256 fingerprint** — a long string like `A1:B2:C3:…`. Paste it into the FIRST slot of
`.well-known/assetlinks.json` in the root repo, replacing
`REPLACE-WITH-PWABUILDER-SIGNING-KEY-SHA256`. Commit.

**5. Sideload test.**
The zip also contains a plain `.apk`. Copy it to your phone, install it (allow
"unknown sources" when asked), open it. If the asset links file is correct you'll see
**no browser bar** — just the app, full screen. If a grey URL bar appears across the top,
the fingerprint or the file's location is wrong; fix before continuing, because Google's
reviewers will see exactly what you see.

---

## Phase 2 — Play Console (~45 min of forms)

**Create app:** Console → Create app → name **Timgo: Segmented Timer** → App →
Free → accept declarations.

**Upload:** Testing → **Closed testing** → Create track → upload the **`.aab`** from the
zip (the `.apk` was only for sideloading; Play wants the bundle).

**Store listing** — copy-paste ready:

- **App name (30 max):** `Timgo: Segmented Timer`
- **Short description (80 max):**
  `Chain timed segments that beep and hand off — for cooking, workouts, and focus.`
- **Full description:**

> Timgo splits one session into a chain of timed segments. Each one sounds when it ends
> and hands off to the next — set it once, then cook, train, or work without watching
> a clock.
>
> **Built for real routines.** 28 ready-made presets: Pomodoro, Tabata, pour-over coffee,
> dal tadka, bread proofing, sketch sessions, and more. Save your own, pin favourites,
> and rebuild an interval workout in three taps with Repeat All.
>
> **Precise to the second.** Segments run from 1 second to 24 hours. The clock is anchored
> to real time — switch apps mid-session and Timgo lands every boundary exactly where it
> should.
>
> **Hear where you are.** Seven built-in sounds, and each segment can have its own — a
> blip for work, a wood block for rest — so you can follow a workout with your eyes shut.
>
> **In control while it runs.** Add a minute when the rice isn't done. Step back if you
> fat-finger Skip. Reorder, duplicate, or retime segments live.
>
> **Private by construction.** No account, no ads, no analytics, no server. Everything
> stays on your device, and it works fully offline.

- **App icon:** upload `icon-maskable-512.png` (full-bleed — Play applies its own mask,
  so the transparent-cornered one would show black wedges)
- **Feature graphic:** upload `feature-graphic.png`
- **Screenshots (2–8 required):** take these on your phone from the installed test APK —
  Google requires genuine captures. Suggested four: the dial mid-Pomodoro, the segment
  list with the m/s toggles, the preset library drawer, a Tabata run. Portrait,
  straight screenshots, no framing needed.
- **Category:** Productivity. **Contact email:** same one as the privacy policy.
- **Privacy policy URL:** `https://vguttikonda07.github.io/timgo/privacy.html`

**App content declarations** (Policy → App content):

| Question | Answer |
|---|---|
| Privacy policy | the URL above |
| Ads | No, contains no ads |
| App access | All functionality available without special access |
| Content rating questionnaire | Utility → answer No to everything → rates Everyone |
| Target audience | **18 and over** (a timer suits all ages, but selecting younger groups triggers the Families policy track and its extra review — not worth it for v1) |
| News app | No |
| Data safety | **No data collected. No data shared.** All three data questions: No. Notification permission is on-device only; localStorage never leaves the phone — that is not "collection" under Play's definitions. |

---

## Phase 3 — Second fingerprint (5 min, right after first upload)

Play re-signs your app with **its own** key for store installs. Without this fingerprint,
sideloaded installs look right but STORE installs get the browser bar.

Console → **Setup → App signing** → copy the **SHA-256** under *App signing key
certificate* → paste into the SECOND slot of `.well-known/assetlinks.json` → commit.
Keep both fingerprints; each covers one install path.

---

## Phase 4 — The 12×14 test, then production

Google requires personal accounts to run a **closed test with at least 12 testers,
continuously opted in and installed, for 14 consecutive days** before production access.

- Closed testing track → Testers tab → paste 12+ Gmail addresses → save → copy the
  **opt-in link** and send it to your friends.
- Each tester: open the link signed into that Gmail → **Become a tester** → install from
  the Play link. They don't have to *use* it — but Google's reviewers look for signs of a
  genuine test, so a note like "open it once or twice this fortnight" is worth sending.
- The clock **resets** if you drop below 12. Recruit 15 to be safe.
- Pushing updated builds to the track during the window is fine and doesn't reset it.
- After 14 days a **Apply for production access** button appears. Answer its short
  questionnaire honestly (tested with friends, feedback incorporated, etc.).
- First production review typically takes a few days.

---

## The one real risk, named

Google rejects "webview wrappers" — apps that are just a website in a shell with no
value as an app. Timgo's mitigations are already built: it works fully offline, installs
with no URL bar, keeps the screen awake, fires notifications, and behaves natively.
If a reviewer still bounces it as low-functionality, the appeal answer is those exact
facts, plus the per-segment sound and background-accurate clock — capabilities a
bookmark doesn't have.

## Update cycle, for later

New version = push to GitHub Pages (users get it automatically — that's the PWA magic)
**and**, for the store shell only when you change icons/name/permissions, regenerate in
PWABuilder with **the same keystore** (upload yours, don't create new), bump the version
code, upload the new `.aab`.
