import { describe, expect, test } from 'vitest';
import { finishLesson, initialProgress, type LessonOutcome } from './progress';
import { findImprovements } from './bonuses';
import { LessonRun, XP } from './run';
import { seededRandom } from '../engine/test-synth';

const at = (hm: string) => new Date(`2026-09-26T${hm}:00`);
const lesson = (ms: number, extra: Partial<LessonOutcome> = {}): LessonOutcome => ({
  lessonId: 'treble-2',
  xp: 20,
  chest: null,
  ms,
  accuracy: 1,
  answers: [],
  ...extra,
});

describe('on a roll', () => {
  test('the 2nd and 3rd lessons in a sitting earn ×1.25 and ×1.5', () => {
    let p = { ...initialProgress(), settings: { ...initialProgress().settings, dailyGoalMin: 20 } };
    let r = finishLesson(p, lesson(3 * 60_000), at('17:03'));
    expect([r.rollCount, r.rollBonus, r.xp]).toEqual([1, 0, 20]);
    r = finishLesson(r.progress, lesson(3 * 60_000), at('17:07')); // started 1 min after the last ended
    expect([r.rollCount, r.rollBonus, r.xp]).toEqual([2, 5, 25]);
    r = finishLesson(r.progress, lesson(3 * 60_000), at('17:11'));
    expect([r.rollCount, r.rollBonus, r.xp]).toEqual([3, 10, 30]);
    r = finishLesson(r.progress, lesson(3 * 60_000), at('17:15'));
    expect(r.rollBonus).toBe(10); // stays at ×1.5
    p = r.progress;
    expect(p.xp).toBe(20 + 25 + 30 + 30);
  });

  test('a long break starts a new sitting', () => {
    let r = finishLesson(initialProgress(), lesson(3 * 60_000), at('17:03'));
    r = finishLesson(r.progress, lesson(3 * 60_000), at('17:30'));
    expect([r.rollCount, r.rollBonus]).toEqual([1, 0]);
  });

  test('the bonus stops once the daily goal is met, so it never rewards marathons', () => {
    let r = finishLesson(initialProgress(), lesson(11 * 60_000), at('17:11')); // goal (10 min) met
    r = finishLesson(r.progress, lesson(3 * 60_000), at('17:15'));
    expect(r.rollCount).toBe(2);
    expect(r.rollBonus).toBe(0);
  });

  test("a guide in between doesn't break the roll or count towards it", () => {
    let r = finishLesson(initialProgress(), lesson(3 * 60_000), at('17:03'));
    r = finishLesson(r.progress, lesson(60_000, { lessonId: 'guide-steps' }), at('17:05'));
    expect(r.rollBonus).toBe(0);
    r = finishLesson(r.progress, lesson(3 * 60_000), at('17:09'));
    expect([r.rollCount, r.rollBonus]).toEqual([2, 5]);
  });
});

describe('improvement bonus', () => {
  const stat = (avgMs: number | null, seen = 8, wrong = 0) => ({ seen, correct: seen - wrong, wrong, avgMs, lastSeen: 0 });

  test('a slow note that becomes fluent, or much faster, earns a bonus', () => {
    const before = { 'treble:G4': stat(1800), 'treble:A4': stat(3000), 'treble:C4': stat(900) };
    const after = { 'treble:G4': stat(1400), 'treble:A4': stat(2400), 'treble:C4': stat(700) };
    const answers = ['treble:G4', 'treble:A4', 'treble:C4'].map((id) => ({ id, correct: true }));
    expect(findImprovements(before, after, answers)).toEqual([
      { id: 'treble:G4', kind: 'fluent', xp: 5 },
      { id: 'treble:A4', kind: 'faster', xp: 3 },
    ]);
  });

  test('a note that was often missed, now right every time, earns a bonus', () => {
    const before = { 'bass:A2': stat(2000, 10, 4) };
    const after = { 'bass:A2': stat(1950, 12, 4) };
    const answers = [
      { id: 'bass:A2', correct: true },
      { id: 'bass:A2', correct: true },
    ];
    expect(findImprovements(before, after, answers)).toEqual([{ id: 'bass:A2', kind: 'accurate', xp: 3 }]);
  });

  test('new notes, already-fluent notes and small changes earn nothing', () => {
    const before = { 'treble:D4': stat(3000, 2), 'treble:E4': stat(1000), 'treble:F4': stat(2000) };
    const after = { 'treble:D4': stat(1000, 3), 'treble:E4': stat(800), 'treble:F4': stat(1900) };
    const answers = ['treble:D4', 'treble:E4', 'treble:F4'].map((id) => ({ id, correct: true }));
    expect(findImprovements(before, after, answers)).toEqual([]);
  });

  test('improvements are added to the lesson XP', () => {
    const p = { ...initialProgress(), items: { 'treble:G4': stat(1800) } };
    const r = finishLesson(p, lesson(3 * 60_000, { answers: [1000, 1000, 1000].map((ms) => ({ id: 'treble:G4', correct: true, ms })) }), at('17:03'));
    expect(r.improvements.map((i) => i.kind)).toEqual(['fluent']);
    expect(r.xp).toBe(25);
  });
});

test('finishing a three-note run after a slip still earns XP', () => {
  const run = new LessonRun('treble-1', [{ kind: 'burst', items: ['treble:C4', 'treble:D4', 'treble:E4'] }], 0, seededRandom(1));
  run.play(61, 100); // wrong
  run.play(60, 5000);
  run.play(61, 5100); // wrong
  run.play(62, 9000);
  run.play(63, 9100); // wrong
  const fb = run.play(64, 14000);
  expect(fb?.xp).toBe(XP.burstNote);
});
