# NoteQuest

A gamified sight-reading trainer for an 8-year-old learning piano (AMEB Grade 3), designed for a
**normal acoustic piano**: the iPad listens through its microphone, with no MIDI needed.

This repo is currently at **Phase 0: the microphone test page**. It answers one question before we
build the game: *can an iPad on the music stand reliably hear single notes and chords on our piano?*

See [`docs/PLAN.md`](docs/PLAN.md) for the full product plan.

## Running it

It's plain HTML and ES modules, with no build step.

```bash
npm start        # serves on http://localhost:5173
npm test         # detection tests against synthetic piano audio
```

### Getting it onto the iPad

Safari only allows the microphone on **https://** pages (or `localhost`), so the easiest route is
to deploy it:

- **Vercel**: *Add New… › Project*, import this repo, framework preset **Other**, no build command.
  Every push then gets its own https URL.
- **Netlify** or **Cloudflare Pages**: same idea, publish directory `.`.

Then open the URL in Safari on the iPad. Optionally use *Share › Add to Home Screen*.

## How to run the test (about 20 minutes)

1. Put the iPad on the music stand, where it would sit during practice.
2. **Start listening** and allow the microphone. Open *Diagnostics* and check that
   `echoCancellation`, `noiseSuppression` and `autoGainControl` all say `false`.
3. **Calibrate**: play the A above middle C three times.
4. **Single notes**: play about 40 notes. Mix in some deliberately wrong notes and some in the wrong
   octave. Whenever the app judges wrongly, tap **"The app judged that wrong"**.
5. **Chords**: play about 30 triads (try a few wrong ones too). Repeat with *Inversions* and
   *Bass clef too* switched on.
6. Untick **Raw audio** and repeat a shorter round of each. This compares Safari's default voice
   processing against raw audio.
7. Tap **Copy results** and paste them back to Claude.

### What counts as a pass

| Test | Go ahead with the web app if… |
|---|---|
| Single notes (raw) | App accuracy ≥ 95%, median detect time under 150 ms |
| Chords (raw) | App accuracy ≥ 90% |

If it falls short, the fallback is a native iOS app (AVAudioEngine in measurement mode, which
gives completely unprocessed audio) running the same detection logic.

## How detection works

- **Single notes**: the McLeod Pitch Method (`src/pitch.js`) on a 2048-sample window. A note
  is confirmed after a detected attack plus three consistent high-clarity readings
  (`src/trackers.js`).
- **Chords**: we *verify* rather than transcribe (`src/chord.js`). The app knows which chord it
  asked for, so it checks that each expected note's fundamental is present and that at least 80%
  of the spectral energy is explained by the harmonics of those notes. A wrong note shows up as
  energy that nothing explains.
- **Tuning**: calibration stores the piano's actual A, and notes are matched relative to that.
- **Sound**: the page makes no sound of its own, so nothing leaks back into the mic.

## Layout

```
index.html, styles.css   test page
src/app.js               UI wiring, judging, results
src/audio.js             mic capture (AnalyserNode)
src/pitch.js             single-note pitch detection
src/chord.js             chord verification + chroma display
src/trackers.js          attack detection, note/chord event logic
src/music.js             note spelling, keys, random targets
src/staff.js             VexFlow rendering
test/                    node:test suites + synthetic piano generator
vendor/vexflow.js        VexFlow 4.2.5 (MIT)
```
