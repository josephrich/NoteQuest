# Publishing NoteQuest to the App Store

The plan is to wrap the same web app with [Capacitor](https://capacitorjs.com/), not rewrite it.
Capacitor packages the built `dist/` folder inside a native iOS app, so the game runs offline, and
native features (storage, notifications, and later native audio) can be added as plugins.

## Already done so the code is ready for this

| Requirement | Status |
|---|---|
| Works from any path, no server needed | Relative asset paths (`base: './'`); all assets are bundled, no CDN |
| Storage can be swapped for native storage | All saving goes through `src/platform/storage.ts` |
| No data leaves the device | No analytics, ads, accounts or tracking. The player's name stays local |
| Parental gate | The Grown-ups area (settings, prizes, external/test links) is behind a times-table question |
| Random rewards disclosed | Chest odds are shown in the shop (Guideline 3.1.1), calculated from the same numbers the chest uses |
| No real-money purchases | Gems can only be earned. Selling gems or a "Pro" unlock later **must** use Apple In-App Purchase |
| Microphone works in an app web view | `getUserMedia` works in WKWebView on iOS 14.3+; needs a usage description (below) |

## Steps (on your Mac, with Xcode installed)

1. **Join the Apple Developer Program**: US$99/year (A$149). As a sole trader you can enrol as an
   individual, and your personal name then shows as the seller. Enrolling as an organisation needs
   a D-U-N-S number and a registered business.
2. Add Capacitor:
   ```bash
   npm install @capacitor/core @capacitor/ios @capacitor/preferences
   npm install -D @capacitor/cli
   npx cap init NoteQuest com.yourname.notequest --web-dir dist
   npm run build && npx cap add ios
   ```
3. In `ios/App/App/Info.plist` add the microphone permission text:
   `NSMicrophoneUsageDescription` = "NoteQuest listens to your piano so it can tell which notes you play."
4. **Storage**: point `src/platform/storage.ts` at `@capacitor/preferences`. iOS can clear a web
   view's localStorage when space is low, but it won't clear native app storage. Preferences is
   async, so load it once at startup and write through on every change.
5. **App icon**: export a 1024×1024 PNG of the dragon with no transparency (generate it the same
   way as `public/icon-512.png`).
6. `npx cap open ios`, set the signing team, and run on the iPad. Then *Product › Archive* uploads
   to App Store Connect. Use **TestFlight** to put it on the family iPad before public release.

## App Store Connect checklist

- **Category**: Education, plus the **Kids** category (ages 6–8) if you want it listed there.
  Kids-category apps must have no third-party analytics or ads, and must keep links out of the app
  behind a parental gate.
- **Privacy**: "Data Not Collected" nutrition label. A privacy policy URL is still required; one
  short page saying nothing is collected is enough. It could live on GitHub Pages.
- **Name**: check that "NoteQuest" is available on the App Store and isn't a trademark conflict.
  Have a backup name ready.
- **Listing text**: avoid presenting the app as official AMEB material. Saying it "helps with
  note reading for AMEB and other grade exams" is safer than using the AMEB name or logo.
- **Screenshots**: iPad 13" (2064×2752) at minimum, plus iPhone sizes if you ship the iPhone version too.
- **Review risk (Guideline 4.2, minimum functionality)**: web wrappers are rejected when they feel
  like a website. NoteQuest works offline, uses the microphone, and has native storage and (later)
  notifications, which is enough.

## Worth adding once it's native

- **Streak reminders** with `@capacitor/local-notifications` (e.g. 5 pm: "Ember misses you! 🔥").
  This is the biggest part of Duolingo's daily-habit effect.
- **Native audio input** (optional): a small plugin using `AVAudioSession` measurement mode, giving
  guaranteed unprocessed microphone audio. The web version's field test was already accurate, so
  only do this if review or testing turns up problems.
- **Sync / leagues**: if character leagues or multiple devices need a backend (e.g. Supabase), the
  privacy label and policy must be updated.
