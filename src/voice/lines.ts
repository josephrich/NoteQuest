// Every line the app can read aloud. The recording script records exactly these, and the app plays
// the recording when there is one (falling back to the device's voice when there isn't).
import { GUIDES } from '../game/guides';
import { INTERVAL_TIPS, UNITS, chordTip, isNoteItem, noteTip } from '../game/content';

// Lesson questions, one per kind of challenge.
export const PROMPTS = {
  meetNote: 'New note!',
  meetJump: 'New jump!',
  name: 'What note is this?',
  interval: 'How far apart are they?',
  pair: 'Play both notes',
  burst: 'Play these notes in order',
  play: 'Play this note',
  meetChord: 'New chord!',
  chordName: 'Which chord is this?',
  chord: 'Play this chord',
  chordRun: 'Play these chords in order',
} as const;

// What a mini-lesson says after a wrong answer to one of its questions.
export const quizWrongLine = (why: string) => `Not quite. ${why} Try again!`;

export function spokenLines(): string[] {
  const lines = new Set<string>(Object.values(PROMPTS));
  for (const guide of Object.values(GUIDES)) {
    for (const card of guide.cards) {
      lines.add(card.text);
      if (card.kind === 'quiz') {
        lines.add(card.why);
        lines.add(quizWrongLine(card.why));
      }
    }
  }
  for (const unit of UNITS) for (const lesson of unit.lessons) for (const id of lesson.pool) if (isNoteItem(id)) lines.add(noteTip(id));
  for (const tip of Object.values(INTERVAL_TIPS)) lines.add(tip);
  for (const unit of UNITS) for (const lesson of unit.lessons) for (const root of lesson.chords?.newRoots ?? []) lines.add(chordTip(root));
  return [...lines];
}
