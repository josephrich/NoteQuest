# NoteQuest

A Duolingo-style note-reading game for a young pianist, built for a **normal acoustic piano**: the
iPad sits on the music stand and listens through its microphone. No MIDI needed.

**Play it:** https://josephrich.github.io/NoteQuest/. In Safari on the iPad, use *Share › Add to
Home Screen* for a full-screen app with the dragon icon.

See [`docs/PLAN.md`](docs/PLAN.md) for the product plan and roadmap, and
[`docs/APP_STORE.md`](docs/APP_STORE.md) for the plan to publish it on the App Store.

## What's in it (Phase 1)

- **Onboarding**: the player's name and a name for their dragon (both kept on the device only),
  plus a quick "play any note" mic check.
- **Path of lessons** in four units: Treble Landmarks, Bass Landmarks, Both Hands and Ledger Lines.
  New notes are taught relative to landmark notes (middle C, the G line, the F line, treble and bass C).
- **Challenge types**:
  - *Meet the note*: a tip explaining where the note sits
  - *What note is this?*: tap the letter
  - *Play this note*: heard through the mic
  - *Play these notes in order*: three-note bursts
- **Adaptive practice**: every note's reading time and accuracy is tracked, and slow or missed
  notes come up more often.
- **Rewards**:
  - XP, with ⚡ lightning bonuses for fast reads and 🔥 combo bonuses
  - A treasure chest after each lesson with a random prize: Common (5–12 gems), Rare (15–25), Epic (30–50) or Legendary (100 gems + a streak freeze). A perfect lesson improves the odds, and four Common chests in a row guarantee a better one
  - A daily goal (10 minutes by default) that builds a 🔥 streak, protected by streak freezes 🧊
    (one earned per week of streak)
- **Gem shop**:
  - Dragon colours and accessories to try on and buy (hats, crown, glasses, bow tie…)
  - Streak freezes
  - Real-world **prizes** a grown-up sets up (e.g. "Choose Friday dinner"). The child claims one
    with gems and the grown-up marks it as given
  - Chest odds are published in the shop. Gems can only be earned, never bought
- **Mistakes are gentle**: no lives. A wrong name is shown and asked again later. A wrong note says
  what was heard, with a hint after two misses and the answer after three.
- **Grown-ups area** (behind a times-table question):
  - 14-day practice chart
  - Per-note reading speed
  - Piano tuning
  - Settings and reset
- The original **mic test page** is at `/mic-test.html` for troubleshooting.

Progress lives in Safari's local storage on the device. Nothing is sent anywhere.

## Development

```bash
npm install
npm run dev        # http://localhost:5173 (add ?debug to enable window.__nq.note(midi) for testing)
npm test           # unit tests: detection, lessons, scoring, streaks
npm run build      # type-check and build to dist/
```

Pushing to `main` runs the tests, builds, and publishes `dist/` to the `gh-pages` branch
(`.github/workflows/deploy.yml`).

Safari only allows the microphone on https pages (or localhost). To try the dev server on an iPad,
use the deployed site or an https tunnel.

## How detection works

- **Single notes**: the McLeod Pitch Method (`src/engine/pitch.ts`) on a 2048-sample window. A note is
  confirmed after a detected attack plus three consistent high-clarity readings
  (`src/engine/trackers.ts`). A repeat of the same note within 250 ms counts as the same key press.
- **Chords**: verified rather than transcribed (`src/engine/chord.ts`). Every expected note's
  fundamental must be present, and at least 80% of the spectral energy must be explained by the
  harmonics of those notes.
- **Tuning**: notes are matched relative to the piano's measured A.
- **Reward sounds** are pitched above the detector's range and only play while the app isn't listening.

Field test on an iPad and an acoustic piano: 0 misjudged notes out of 41 and 0 misjudged chords out
of 34. Median detection time was 67 ms for notes and 117 ms for chords.

## Layout

```
src/engine/   audio capture, pitch & chord detection, note events, music theory, staff drawing
src/game/     course content, lesson building, lesson rules (XP/combos), chests, shop, progress & streaks
src/platform/ device storage (swap point for native storage in the App Store build)
src/ui/       React screens: Welcome, Home, Lesson, Results, Parent; the Dragon
src/mictest/  the Phase 0 microphone test page
public/       icons and web app manifest
```
