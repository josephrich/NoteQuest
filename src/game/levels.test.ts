import { describe, expect, test } from 'vitest';
import { STAFF_NOTES, findLesson, type ItemId } from './content';
import { LEVEL_AT, RUN_LENGTH, MELODY_LENGTH, buildLesson, readingLevel, type ItemStat } from './lesson';
import { buildReview } from './review';
import { seededRandom } from '../engine/test-synth';

const fluent: ItemStat = { seen: 10, correct: 10, wrong: 0, avgMs: 1200, lastSeen: 0 };
const shaky: ItemStat = { seen: 10, correct: 6, wrong: 4, avgMs: 2600, lastSeen: 0 };
const stats = (ids: ItemId[], s: ItemStat = fluent) => Object.fromEntries(ids.map((id) => [id, s]));
const allNotes = [...STAFF_NOTES.treble, ...STAFF_NOTES.bass];

describe('reading level', () => {
  test('goes up with the number of notes read quickly and accurately', () => {
    expect(readingLevel({})).toBe(0);
    expect(readingLevel(stats(allNotes.slice(0, LEVEL_AT[1] - 1)))).toBe(0);
    expect(readingLevel(stats(allNotes.slice(0, LEVEL_AT[1])))).toBe(1);
    expect(readingLevel(stats(allNotes.slice(0, LEVEL_AT[2])))).toBe(2);
    // Slow or error-prone notes don't count; nor do intervals or chords.
    expect(readingLevel(stats(allNotes, shaky))).toBe(0);
    expect(readingLevel(stats(['interval:2', 'interval:3', 'chord:treble:C4']))).toBe(0);
  });
});

describe('more runs of notes as he gets better', () => {
  const lesson = findLesson('both-4').lesson;
  const runs = (level: 0 | 1 | 2) => buildLesson(lesson, stats(allNotes), { mic: true, rnd: seededRandom(3), level }).filter((c) => c.kind === 'burst');

  test('runs come up more often, and get longer', () => {
    expect(runs(0)).toHaveLength(2);
    expect(runs(1)).toHaveLength(4);
    expect(runs(2)).toHaveLength(6);
    for (const level of [0, 1, 2] as const) for (const c of runs(level)) expect(c.items).toHaveLength(RUN_LENGTH[level]);
  });

  test('the level comes from his stats unless given', () => {
    const cs = buildLesson(lesson, stats(allNotes), { mic: true, rnd: seededRandom(3) });
    expect(cs.filter((c) => c.kind === 'burst').every((c) => c.items.length === RUN_LENGTH[2])).toBe(true);
  });

  test('a lesson with notes he has never met stays gentler', () => {
    const newNotes = findLesson('ledger-1').lesson;
    const cs = buildLesson(newNotes, stats(allNotes), { mic: true, rnd: seededRandom(3) });
    expect(Math.max(...cs.filter((c) => c.kind === 'burst').map((c) => c.items.length))).toBe(RUN_LENGTH[1]);
  });

  test('interval lessons get longer melodies', () => {
    const intervals = findLesson('intervals-3').lesson;
    const cs = buildLesson(intervals, {}, { mic: true, rnd: seededRandom(3), level: 2 });
    const melodies = cs.filter((c) => c.kind === 'burst' && !c.startHint);
    expect(melodies.length).toBeGreaterThanOrEqual(5);
    for (const m of melodies) expect(m.items).toHaveLength(MELODY_LENGTH[2]);
  });

  test('the Daily Review mixes in melodies and chords once they are learned', () => {
    const learned = { ...stats(allNotes), 'interval:3': fluent, 'interval:5': fluent, 'chord:treble:C4:major': fluent, 'chord:treble:F4:major': fluent, 'chord:treble:A4:minor': fluent };
    const review = buildReview(learned, { mic: true, rnd: seededRandom(5) });
    expect(review.filter((c) => c.chord && c.kind === 'play')).toHaveLength(1);
    expect(review.filter((c) => c.chord && c.kind === 'burst')).toHaveLength(1);
    expect(review.filter((c) => c.kind === 'burst' && !c.chord && c.items.length === MELODY_LENGTH[2]).length).toBeGreaterThanOrEqual(2);
    expect(review.length).toBe(15);
    // A beginner's review is unchanged: no chords, short runs.
    const beginner = buildReview(stats(allNotes.slice(0, 4), shaky), { mic: true, rnd: seededRandom(5) });
    expect(beginner.some((c) => c.chord)).toBe(false);
    expect(Math.max(...beginner.filter((c) => c.kind === 'burst').map((c) => c.items.length))).toBe(3);
    // Without a microphone, everything is still tapped.
    expect(buildReview(learned, { mic: false, rnd: seededRandom(5) }).every((c) => c.kind === 'name')).toBe(true);
  });
});
