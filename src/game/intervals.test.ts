import { describe, expect, test } from 'vitest';
import { STAFF_NOTES, UNITS, findLesson, intervalExample, intervalItem, intervalLabel, itemClef, itemNote, shiftItem } from './content';
import { buildLesson, challengeAnswer } from './lesson';
import { LessonRun } from './run';
import { finishLesson, initialProgress, isUnlocked } from './progress';
import { learnedItems } from './review';
import { seededRandom } from '../engine/test-synth';

const pos = (id: string) => itemNote(id).octave * 7 + itemNote(id).letter;
const span = (a: string, b: string) => Math.abs(pos(a) - pos(b)) + 1;
const intervalLessons = UNITS.find((u) => u.id === 'intervals')!.lessons;

describe('interval content', () => {
  test('shiftItem moves by letter names across octaves', () => {
    expect(shiftItem('treble:E4', 2)).toBe('treble:G4');
    expect(shiftItem('treble:B4', 1)).toBe('treble:C5');
    expect(shiftItem('bass:C3', -1)).toBe('bass:B2');
    expect(shiftItem('bass:C3', 7)).toBe('bass:C4');
  });

  test('examples are the right size and on the staff', () => {
    for (const size of [2, 3, 4, 5, 8]) {
      for (const clef of ['treble', 'bass'] as const) {
        const [a, b] = intervalExample(size, clef);
        expect(span(a, b)).toBe(size);
        expect(STAFF_NOTES[clef]).toContain(a);
        expect(STAFF_NOTES[clef]).toContain(b);
      }
    }
  });

  test('the unit is playable, not "coming soon"', () => {
    const unit = UNITS.find((u) => u.id === 'intervals')!;
    expect(unit.comingSoon).toBeFalsy();
    expect(unit.lessons.length).toBeGreaterThanOrEqual(6);
  });
});

describe('building interval lessons', () => {
  test('every challenge matches its interval and stays on the staff, for every lesson and seed', () => {
    for (const lesson of intervalLessons) {
      const spec = lesson.intervals!;
      for (let seed = 1; seed <= 30; seed++) {
        for (const mic of [true, false]) {
          const cs = buildLesson(lesson, {}, { mic, rnd: seededRandom(seed) });
          for (const c of cs) {
            const clef = itemClef(c.items[0]);
            expect(spec.clefs).toContain(clef);
            for (const id of c.items) {
              expect(itemClef(id)).toBe(clef);
              expect(STAFF_NOTES[clef]).toContain(id);
            }
            if (c.kind === 'meet' || c.kind === 'interval' || c.startHint) {
              expect(c.items).toHaveLength(2);
              expect(span(c.items[0], c.items[1])).toBe(c.interval);
            }
            if (c.kind === 'interval') expect(c.options).toContain(challengeAnswer(c));
            if (c.kind === 'burst') {
              for (let i = 1; i < c.items.length; i++) {
                const size = span(c.items[i - 1], c.items[i]);
                expect(spec.sizes).toContain(size);
                expect(size).toBeGreaterThan(1); // repeated notes are never played
              }
            }
          }
          if (!mic) expect(cs.every((c) => c.kind === 'meet' || c.kind === 'interval')).toBe(true);
        }
      }
    }
  });

  test('new intervals get a meet card until they have been practised', () => {
    const lesson = findLesson('intervals-4').lesson;
    const first = buildLesson(lesson, {}, { mic: true, rnd: seededRandom(1) });
    expect(first.slice(0, 2).map((c) => [c.kind, c.interval])).toEqual([
      ['meet', 4],
      ['meet', 5],
    ]);
    const seen = { seen: 3, correct: 3, wrong: 0, avgMs: 1000, lastSeen: 0 };
    const later = buildLesson(lesson, { [intervalItem(4)]: seen, [intervalItem(5)]: seen }, { mic: true, rnd: seededRandom(1) });
    expect(later.some((c) => c.kind === 'meet')).toBe(false);
  });
});

describe('playing an interval lesson', () => {
  test('naming, a two-note meet card and a played pair', () => {
    const run = new LessonRun(
      'intervals-2',
      [
        { kind: 'meet', items: ['treble:E4', 'treble:G4'], interval: 3 },
        { kind: 'interval', items: ['treble:D4', 'treble:F4'], interval: 3, options: ['2nd · step', '3rd · skip'] },
        { kind: 'burst', items: ['treble:C5', 'treble:A4'], interval: 3, startHint: true },
      ],
      0,
      seededRandom(1),
    );
    // Meet card: play E then G.
    expect(run.play(64, 100)?.correct).toBe(true);
    expect(run.phase).toBe('asking');
    expect(run.expected).toBe('treble:G4');
    run.play(67, 200);
    expect(run.phase).toBe('correct');
    run.next(300);
    // A wrong interval name is asked again at the end.
    expect(run.tap(intervalLabel(2), 400)?.correct).toBe(false);
    expect(run.queue).toHaveLength(4);
    expect(run.queue[3].kind).toBe('interval');
    run.next(500);
    run.play(72, 600);
    run.play(69, 700);
    expect(run.phase).toBe('correct');
    run.next(800);
    expect(run.tap('3rd · skip', 900)?.correct).toBe(true);
    run.next(1000);
    const out = run.outcome(0);
    expect(out.answers.filter((a) => a.id === 'interval:3').map((a) => a.correct)).toEqual([false, true]);
  });

  test('interval stats never leak into the note-based Daily Review', () => {
    const p = initialProgress();
    const result = finishLesson(
      p,
      {
        lessonId: 'intervals-1',
        xp: 10,
        chest: { rarity: 'common', gems: 5, freeze: false },
        ms: 1000,
        accuracy: 1,
        answers: [
          { id: 'interval:2', correct: true, ms: 900 },
          { id: 'treble:C4', correct: true, ms: 900 },
        ],
      },
      new Date(),
    );
    expect(learnedItems(result.progress.items)).toEqual(['treble:C4']);
  });
});

describe('unlocking every lesson', () => {
  test('the grown-ups switch opens later units straight away', () => {
    const p = initialProgress();
    expect(isUnlocked(p, 'intervals-1')).toBe(false);
    expect(isUnlocked({ ...p, settings: { ...p.settings, unlockAll: true } }, 'intervals-check')).toBe(true);
  });
});
