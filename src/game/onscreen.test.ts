import { expect, test } from 'vitest';
import { LessonRun, XP } from './run';
import { UNITS, itemClef, itemMidi } from './content';
import { finishLesson, initialProgress } from './progress';
import { keyboardKeys } from '../ui/PlayKeyboard';
import { seededRandom } from '../engine/test-synth';

const challenges = () => [
  { kind: 'play' as const, items: ['treble:C4'] },
  { kind: 'play' as const, items: ['treble:G4'] },
];

test('the on-screen piano earns half XP and no lightning bonus', () => {
  const real = new LessonRun('treble-1', challenges(), 0, seededRandom(1));
  const screen = new LessonRun('treble-1', challenges(), 0, seededRandom(1), true);
  for (const run of [real, screen]) {
    run.play(60, 500); // fast: lightning on a real piano
    run.next(600);
    run.play(67, 3600);
    run.next(3700);
  }
  expect(real.feedback).toBeNull();
  const r = real.outcome(0);
  const s = screen.outcome(0);
  expect(r.xp).toBe(XP.play + XP.lightning + XP.play + XP.complete + XP.perfect);
  expect(s.xp).toBe(Math.ceil(XP.play / 2) * 2 + Math.ceil((XP.complete + XP.perfect) / 2));
  expect(s.onScreen).toBe(true);
  // Screen timings don't count towards reading speeds.
  expect(s.answers.every((a) => a.ms === null)).toBe(true);
  expect(r.answers.every((a) => a.ms !== null)).toBe(true);
});

test('on-screen practice counts towards the daily goal and is logged separately', () => {
  const p = initialProgress();
  const base = { lessonId: 'treble-1', xp: 5, chest: null, accuracy: 1, answers: [] };
  const now = new Date('2026-09-26T17:00:00');
  let q = finishLesson(p, { ...base, ms: 120_000 }, now).progress;
  q = finishLesson(q, { ...base, ms: 60_000, onScreen: true }, now).progress;
  expect(q.days['2026-09-26'].ms).toBe(180_000);
  expect(q.days['2026-09-26'].screenMs).toBe(60_000);
});

test('the on-screen keyboard has every note the course uses, in the right clef', () => {
  // White keys, and the black key after each C, D, F, G and A.
  const keys = (clef: 'treble' | 'bass') => keyboardKeys(clef).flatMap((k) => ([0, 1, 3, 4, 5].includes(k.letter) ? [k.midi, k.midi + 1] : [k.midi]));
  const ranges = { treble: keys('treble'), bass: keys('bass') };
  for (const unit of UNITS) for (const lesson of unit.lessons) for (const id of lesson.pool) expect(ranges[itemClef(id)], id).toContain(itemMidi(id));
});

test('the on-screen option is offered to everyone, including saves from the old opt-in setting', async () => {
  const { parseProgress } = await import('./progress');
  expect(initialProgress().settings.hideScreenPiano).toBe(false);
  const old = { ...initialProgress(), settings: { ...initialProgress().settings, onScreenPiano: false } } as unknown as Parameters<typeof parseProgress>[0];
  delete (old.settings as Partial<typeof old.settings>).hideScreenPiano;
  expect(parseProgress(old).settings.hideScreenPiano).toBe(false);
});
