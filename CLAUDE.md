# Clefwing — project notes

Clefwing is a gamified piano sight-reading app for kids (around AMEB Grade 1–3). The child reads a note,
plays it on a real piano, and the app hears it through the microphone. It runs on the web and as an
iOS app (Capacitor), shipped through TestFlight and the App Store. Built by Joseph Rich, a sole trader
in Melbourne.

## Stack and commands

- Vite, React 19, TypeScript, Vitest, VexFlow 4 (staff drawing), Capacitor 8 (iOS).
- `npm run dev` — dev server. Add `?debug` to the URL for test hooks: `window.__nq.note(midi)`,
  `.chord(midis)`, `.notes(midis)` simulate playing.
- `npm test` — all tests (some detection tests are slow, ~1 min total). `npm run typecheck`.
- `npm run ios` — checks voice lines, builds, syncs and opens Xcode. Then Archive in Xcode.
- Format with Prettier: `--single-quote --print-width 160` (there is no config file).
- iOS build number: `CURRENT_PROJECT_VERSION` in `ios/App/App.xcodeproj/project.pbxproj`; bump it for
  each TestFlight upload.

## Where things live

- `src/engine/` — audio detection: pitch, chords (`chord.ts`), trackers (notes, chords, note sets),
  listener, staff rendering.
- `src/game/` — content (units, lessons, guides), lesson builder, run logic, rewards, shop, progress,
  players. Pure functions with tests.
- `src/ui/` — React screens. `src/ui/app.css` — all styles (fits one screen on iPad; compact layout on
  phones, which are portrait-only).
- `src/voice/` + `scripts/voices.mjs` — read-aloud voice lines, recorded with OpenAI TTS (voice
  "shimmer") into `public/voice/`. `npm run voices` records missing lines; it needs the OpenAI key typed
  in or from an env var. Never store or commit the key.
- `docs/APP_STORE_LISTING.md` — App Store text. `store-media/` — store screenshots and preview videos.
- `public/privacy.html`, `public/support.html` — hosted on GitHub Pages.

## Rules

- Work on `main` and push straight to it. Don't open pull requests unless asked.
- Commit as `15165335+josephrich@users.noreply.github.com`. Keep Joseph's personal email out of the repo,
  commits and public files. The public contact is clefwingnotes@gmail.com.
- The son's name stays on the device only — never in the repo, tests or examples.
- Real-device testing matters: note and chord detection must be checked on a real piano and iPad/iPhone,
  not just the tests.
