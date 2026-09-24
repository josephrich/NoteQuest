# Publishing Clefwing to the App Store

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

Already set up in the repo:
- Capacitor 8 iOS project in `ios/` (Swift Package Manager, so no CocoaPods), bundle ID `com.josephrich.notequest` (change it in `capacitor.config.ts` and Xcode if you like)
- The microphone permission text, with export compliance set to "no encryption" in `Info.plist`
- Native storage (`@capacitor/preferences`) and daily practice reminders (`@capacitor/local-notifications`, switched on by a grown-up in Settings)
- The dragon app icon (1024×1024, no transparency) and launch screen

Each time you want to build:
```bash
git pull
npm install
npm run ios      # builds the web app, copies it into ios/, and opens Xcode
```
In Xcode: select the **App** target, open **Signing & Capabilities**, choose your team, plug in the iPad and press ▶.
For TestFlight: **Product › Archive › Distribute App › App Store Connect**.

## App Store Connect checklist

- **Category**: Education, plus the **Kids** category (ages 6–8) if you want it listed there.
  Kids-category apps must have no third-party analytics or ads, and must keep links out of the app
  behind a parental gate.
- **Privacy**: "Data Not Collected" nutrition label. A privacy policy URL is still required; one
  short page saying nothing is collected is enough. It could live on GitHub Pages.
- **Name**: "Clefwing: Piano Note Reading" ("NoteQuest" was already taken). Worth a free search on
  IP Australia's trademark database before investing heavily in the name.
- **Listing text**: avoid presenting the app as official AMEB material. Saying it "helps with
  note reading for AMEB and other grade exams" is safer than using the AMEB name or logo.
- **Screenshots**: iPad 13" (2064×2752) at minimum, plus iPhone sizes if you ship the iPhone version too.
- **Review risk (Guideline 4.2, minimum functionality)**: web wrappers are rejected when they feel
  like a website. Clefwing works offline, uses the microphone, and has native storage and (later)
  notifications, which is enough.

## Worth adding once it's native

- **Streak reminders** with `@capacitor/local-notifications` (e.g. 5 pm: "Ember misses you! 🔥").
  This is the biggest part of Duolingo's daily-habit effect.
- **Native audio input** (optional): a small plugin using `AVAudioSession` measurement mode, giving
  guaranteed unprocessed microphone audio. The web version's field test was already accurate, so
  only do this if review or testing turns up problems.
- **Sync / leagues**: if character leagues or multiple devices need a backend (e.g. Supabase), the
  privacy label and policy must be updated.
