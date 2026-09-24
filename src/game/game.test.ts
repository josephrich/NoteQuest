import { describe, expect, test } from 'vitest';
import { UNITS, LESSON_ORDER, findLesson, itemMidi, noteTip, type ItemId } from './content';
import { buildLesson, needWeight, updateStat, type Challenge } from './lesson';
import { LessonRun, XP } from './run';
import { currentStreak, dayKey, finishLesson, initialProgress, isUnlocked, nextLessonId, type LessonOutcome } from './progress';
import { seededRandom } from '../engine/test-synth';

const at = (s: string) => new Date(`${s}T17:00:00`);

describe('content', () => {
  test('every lesson note is inside the detectable, staff-readable range', () => {
    for (const unit of UNITS) {
      for (const lesson of unit.lessons) {
        for (const id of lesson.pool) {
          const m = itemMidi(id);
          expect(m, id).toBeGreaterThanOrEqual(38); // D2
          expect(m, id).toBeLessThanOrEqual(84); // C6
        }
        for (const id of lesson.newNotes) expect(lesson.pool).toContain(id);
      }
    }
  });

  test('every note has a tip', () => {
    const all = new Set(UNITS.flatMap((u) => u.lessons.flatMap((l) => l.pool)));
    for (const id of all) expect(noteTip(id).length, id).toBeGreaterThan(10);
    expect(noteTip('treble:D4')).toBe('This is D, in a space. It is one step above middle C.');
    expect(noteTip('treble:B4')).toBe('This is B, on a line. It is one step below treble C.');
    expect(noteTip('bass:A3')).toBe('This is A, on a line. It is a skip (two steps) below middle C.');
  });

  test('lesson ids are unique', () => {
    expect(new Set(LESSON_ORDER).size).toBe(LESSON_ORDER.length);
  });
});

describe('building lessons', () => {
  const lesson = findLesson('treble-3').lesson;

  test('new notes are introduced first, then 12 practice challenges', () => {
    const cs = buildLesson(lesson, {}, { mic: true, rnd: seededRandom(1) });
    expect(cs.slice(0, 3).map((c) => c.kind)).toEqual(['meet', 'meet', 'meet']);
    expect(cs.slice(0, 3).map((c) => c.items[0])).toEqual(lesson.newNotes);
    expect(cs).toHaveLength(3 + 12);
    for (const c of cs.slice(3)) for (const id of c.items) expect(lesson.pool).toContain(id);
  });

  test('without a microphone every challenge is tap-to-name', () => {
    const cs = buildLesson(lesson, {}, { mic: false, rnd: seededRandom(2) });
    expect(cs.filter((c) => c.kind !== 'meet').every((c) => c.kind === 'name')).toBe(true);
  });

  test('name options include the answer once, in musical order', () => {
    const cs = buildLesson(lesson, {}, { mic: false, rnd: seededRandom(3) });
    for (const c of cs.filter((c) => c.kind === 'name')) {
      const letter = c.items[0].split(':')[1][0];
      expect(c.options).toHaveLength(4);
      expect(c.options!.filter((o) => o === letter)).toHaveLength(1);
      expect([...c.options!].sort((a, b) => 'CDEFGAB'.indexOf(a) - 'CDEFGAB'.indexOf(b))).toEqual(c.options);
    }
  });

  test('bursts stay in one clef and never repeat a note back to back', () => {
    const mixed = findLesson('both-check').lesson;
    for (let seed = 1; seed < 30; seed++) {
      for (const c of buildLesson(mixed, {}, { mic: true, rnd: seededRandom(seed) }).filter((c) => c.kind === 'burst')) {
        expect(new Set(c.items.map((i) => i.split(':')[0])).size).toBe(1);
        expect(c.items[0]).not.toBe(c.items[1]);
        expect(c.items[1]).not.toBe(c.items[2]);
      }
    }
  });

  test('slow and error-prone notes are practised more', () => {
    let slow = updateStat(undefined, { correct: true, ms: 4000, now: 0 });
    slow = updateStat(slow, { correct: false, ms: null, now: 0 });
    let fast = undefined;
    for (let i = 0; i < 8; i++) fast = updateStat(fast, { correct: true, ms: 700, now: 0 });
    expect(needWeight(slow, false)).toBeGreaterThan(needWeight(fast, false) * 2);

    const pool = findLesson('treble-2').lesson;
    const stats = { 'treble:C4': fast!, 'treble:G4': fast!, 'treble:C5': slow };
    const counts: Record<ItemId, number> = {};
    for (let seed = 1; seed < 40; seed++) {
      for (const c of buildLesson(pool, stats, { mic: true, rnd: seededRandom(seed) })) for (const id of c.items) counts[id] = (counts[id] ?? 0) + 1;
    }
    expect(counts['treble:C5']).toBeGreaterThan(counts['treble:C4']);
  });
});

describe('a lesson in progress', () => {
  const play = (id: ItemId): Challenge => ({ kind: 'play', items: [id] });

  test('fast correct plays earn lightning XP and build a combo with a bonus at 5', () => {
    const run = new LessonRun('x', Array.from({ length: 5 }, () => play('treble:G4')), 0, () => 0);
    let t = 0;
    for (let i = 0; i < 5; i++) {
      const fb = run.play(67, t + 900)!;
      expect(fb.correct).toBe(true);
      expect(fb.lightning).toBe(true);
      t += 1000;
      run.next(t);
    }
    expect(run.combo).toBe(5);
    expect(run.xp).toBe(5 * (XP.play + XP.lightning) + XP.comboBonus);
    const out = run.outcome();
    expect(out.perfect).toBe(true);
    expect(out.xp).toBe(run.xp + XP.complete + XP.perfect);
  });

  test('a wrong note is reported (with octave slips) and he can try again', () => {
    const run = new LessonRun('x', [play('treble:C5')], 0);
    const wrong = run.play(60, 1000)!;
    expect(wrong).toMatchObject({ correct: false, heard: 'C', octaveSlip: true });
    expect(run.phase).toBe('asking');
    const right = run.play(72, 2000)!;
    expect(right).toMatchObject({ correct: true, xp: 1, lightning: false });
    expect(run.accuracy).toBe(0);
  });

  test('after three misses the answer is revealed', () => {
    const run = new LessonRun('x', [play('treble:C5'), play('treble:C5')], 0);
    run.play(60, 100);
    run.play(62, 200);
    run.play(64, 300);
    expect(run.phase).toBe('reveal');
    expect(run.next(400)).toBe(true);
    expect(run.phase).toBe('asking');
  });

  test('a wrong name is shown, then asked again at the end', () => {
    const run = new LessonRun('x', [{ kind: 'name', items: ['bass:F3'], options: ['C', 'D', 'F', 'G'] }], 0, () => 0);
    const fb = run.tap('G', 800)!;
    expect(fb.correct).toBe(false);
    expect(run.phase).toBe('wrong');
    expect(run.queue).toHaveLength(2);
    expect(run.next(2000)).toBe(true);
    expect(run.tap('F', 2500)!.correct).toBe(true);
    run.next(3000);
    expect(run.phase).toBe('done');
    expect(run.accuracy).toBe(0.5);
  });

  test('bursts are played note by note', () => {
    const run = new LessonRun('x', [{ kind: 'burst', items: ['treble:C4', 'treble:D4', 'treble:E4'] }], 0);
    expect(run.play(60, 500)!.correct).toBe(true);
    expect(run.step).toBe(1);
    expect(run.play(65, 900)!.correct).toBe(false);
    expect(run.play(62, 1300)!.correct).toBe(true);
    const done = run.play(64, 1700)!;
    expect(done.correct).toBe(true);
    expect(run.phase).toBe('correct');
    expect(run.stepResults).toEqual([true, false, true]);
    expect(run.expected).toBe('treble:E4');
    expect(done.xp).toBe(2 * XP.burstNote);
  });

  test('meet cards never mark a note wrong', () => {
    const run = new LessonRun('x', [{ kind: 'meet', items: ['treble:G4'] }], 0);
    expect(run.play(60, 100)).toBeNull();
    expect(run.play(67, 200)!.correct).toBe(true);
  });
});

describe('progress and streaks', () => {
  const outcome = (ms: number): LessonOutcome => ({ lessonId: 'treble-1', xp: 20, gems: 8, ms, accuracy: 0.9, answers: [{ id: 'treble:C4', correct: true, ms: 900 }] });

  test('reaching 10 minutes in a day extends the streak once', () => {
    let p = initialProgress();
    let r = finishLesson(p, outcome(4 * 60_000), at('2026-09-24'));
    expect(r.streakExtended).toBe(false);
    r = finishLesson(r.progress, outcome(7 * 60_000), at('2026-09-24'));
    expect(r.goalReachedNow).toBe(true);
    expect(r.progress.streak.count).toBe(1);
    r = finishLesson(r.progress, outcome(5 * 60_000), at('2026-09-24'));
    expect(r.streakExtended).toBe(false);
    p = r.progress;
    expect(p.xp).toBe(60);
    expect(p.gems).toBe(24);
    expect(p.items['treble:C4'].correct).toBe(3);
  });

  test('consecutive days build the streak; a missed day uses a freeze; two missed days reset it', () => {
    let p = initialProgress();
    p = finishLesson(p, outcome(600_000), at('2026-09-20')).progress;
    p = finishLesson(p, outcome(600_000), at('2026-09-21')).progress;
    expect(p.streak.count).toBe(2);
    // Missed the 22nd: the freeze keeps the streak alive.
    expect(currentStreak(p, at('2026-09-23'))).toBe(2);
    const r = finishLesson(p, outcome(600_000), at('2026-09-23'));
    expect(r.freezesUsed).toBe(1);
    p = r.progress;
    expect(p.streak).toMatchObject({ count: 3, freezes: 0 });
    // Missed two days with no freezes left.
    expect(currentStreak(p, at('2026-09-26'))).toBe(0);
    p = finishLesson(p, outcome(600_000), at('2026-09-26')).progress;
    expect(p.streak.count).toBe(1);
    expect(p.streak.best).toBe(3);
  });

  test('a week-long streak earns a freeze', () => {
    let p = initialProgress();
    p.streak.freezes = 0;
    let earned = false;
    for (let d = 1; d <= 7; d++) {
      const r = finishLesson(p, outcome(600_000), at(`2026-09-0${d}`));
      earned ||= r.freezeEarned;
      p = r.progress;
    }
    expect(earned).toBe(true);
    expect(p.streak.freezes).toBe(1);
  });

  test('lessons unlock in order', () => {
    let p = initialProgress();
    expect(nextLessonId(p)).toBe('treble-1');
    expect(isUnlocked(p, 'treble-2')).toBe(false);
    p = finishLesson(p, outcome(1000), at('2026-09-24')).progress;
    expect(nextLessonId(p)).toBe('treble-2');
    expect(isUnlocked(p, 'treble-2')).toBe(true);
    expect(isUnlocked(p, 'treble-1')).toBe(true);
  });

  test('day keys use the local calendar', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});
