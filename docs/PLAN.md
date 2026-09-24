# NoteQuest: product plan

## The problem

Our son (8, AMEB Grade 3 for leisure) plays from memory and looks at his hands instead of reading.
Simply Piano is fun but doesn't build real note or chord recognition. Notaforte taught good
concepts (anchor notes) but ran out of content within a week.

## Principles

1. **Automatic recognition.** Stave position → key in under a second, without counting up from anchors.
2. **Time keeps moving.** Reading exercises run at a steady pulse, so there's no time to look down.
3. **Feel the keyboard.** Steps, skips and leaps, and black-key groups, so his hands know where to go.
4. **Easy material, in quantity.** Sight-reading practice sits a level or two *below* his playing level.
5. **Adaptive and endless.** Record response time for every note and chord, bring back weak items
   (spaced repetition), and generate exercises procedurally so content never runs out.

## Decisions so far

| Decision | Outcome |
|---|---|
| Input | **Microphone on an acoustic piano.** No MIDI. |
| Platform | **Web app (PWA) on iPad** first, if the Phase 0 mic test passes. Native iOS (AVAudioEngine) is the fallback. |
| Gamification | **Duolingo-style**: XP, streaks, leagues, gems, prizes |
| Leaderboard | **Character opponents**: named characters with XP set to his level, weekly promotion and relegation |
| Chord detection | Verify against the expected notes; don't transcribe |

## Game design

- **Lessons**: 12–15 quick challenges, 3–5 minutes each. Challenge types: tap the note name,
  play the note, play the interval, play the chord, read along with a bar at a steady beat.
- **XP**, with speed bonuses ("Lightning read!") and combos for correct notes in a row. Speed of
  reading is what gets rewarded.
- **Streaks** with streak freezes, and a daily XP goal.
- **Path map** of units: Treble landmarks → Bass landmarks → Steps & skips → Ledger lines →
  Intervals → Triads → Keys of G/D/F → Grade 3 chords → sight-reading boss levels. Checkpoints,
  plus a gold "legendary" re-run.
- **Gems and a shop**: mascot outfits, backgrounds, sound packs, streak freezes.
- **Real-world prizes** set by a parent (e.g. 1,000 gems = pick Friday dinner).
- **Daily quests and chests**, plus achievements.
- **No hearts or lives** by default. Losing lives for mistakes makes kids freeze up while reading.
- **Leagues**: weekly boards of character opponents whose XP pace tracks his recent activity, so
  races stay winnable but not automatic. Top of the league promotes, bottom relegates.
- **Eyes-up bonus** (later): the iPad front camera plus MediaPipe face tracking. Double XP for
  eyes-up streaks; never a penalty.
- **Parent dashboard**: minutes practised, weak notes and chords, reading-speed trend, goal setting.

## Roadmap

| Phase | Build | Outcome |
|---|---|---|
| 0 | Mic detection test page + tuning calibration | Proof it works on our piano (**this repo, now**) |
| 1 | Note Sprint lessons + XP + streak + mascot | Daily habit |
| 2 | Path map, units, gems, shop, parent-set prizes | The Duolingo pull |
| 3 | Scrolling reader with a visual beat, intervals, triads | Real sight-reading and chords |
| 4 | Character leagues, eyes-up bonus, parent dashboard | Competition and tracking weak spots |

## Technical notes

- A metronome click from the iPad speaker would leak into the mic, so use a **visual beat** (or earphones).
- Calibrate to the piano's real tuning; match notes within ±45 cents.
- Early levels can accept the right note name in any octave; later levels require the exact octave.
- Stack for later phases: Next.js + TypeScript PWA, VexFlow, Supabase for progress, IndexedDB offline.
