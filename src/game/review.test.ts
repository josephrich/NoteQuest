import { describe, expect, test } from 'vitest';
import { buildReview, focusItems, friendlyName, learnedItems, reviewDoneToday, reviewUnlocked, REVIEW_ID, REVIEW_LENGTH } from './review';
import { updateStat, type ItemStat } from './lesson';
import { finishLesson, initialProgress, nextLessonId } from './progress';
import { seededRandom } from '../engine/test-synth';

// A few learned notes: most fast and reliable, two slow or error-prone.
function stats(): Record<string, ItemStat> {
  const s: Record<string, ItemStat> = {};
  const practise = (id: string, results: [boolean, number | null][]) => {
    for (const [correct, ms] of results) s[id] = updateStat(s[id], { correct, ms, now: 0 });
  };
  for (const id of ['treble:C4', 'treble:G4', 'treble:D4', 'treble:E4']) practise(id, Array(8).fill([true, 700]));
  practise('treble:C5', [[true, 3500], [false, null], [true, 3000]]);
  practise('bass:F3', [[false, null], [false, null], [true, 2800]]);
  practise('treble:B4', [[true, 1600], [true, 1500], [true, 1400], [true, 1500]]);
  return s;
}

describe('daily review', () => {
  test('focuses on the slowest and most-missed notes', () => {
    expect(focusItems(stats())).toEqual(['bass:F3', 'treble:C5', 'treble:B4']);
  });

  test('uses only learned notes, never introduces new ones, and has 15 challenges', () => {
    const s = stats();
    for (let seed = 1; seed < 20; seed++) {
      const cs = buildReview(s, { mic: true, rnd: seededRandom(seed) });
      expect(cs).toHaveLength(REVIEW_LENGTH);
      expect(cs.some((c) => c.kind === 'meet')).toBe(false);
      for (const c of cs) for (const id of c.items) expect(learnedItems(s)).toContain(id);
    }
  });

  test('each tricky note comes up at least twice, and is played at least once with a mic', () => {
    const s = stats();
    const cs = buildReview(s, { mic: true, rnd: seededRandom(3) });
    for (const id of focusItems(s)) {
      expect(cs.filter((c) => c.items.includes(id)).length, id).toBeGreaterThanOrEqual(2);
      expect(cs.some((c) => c.kind === 'play' && c.items[0] === id), id).toBe(true);
    }
  });

  test('without a mic it is all tap-to-name', () => {
    const cs = buildReview(stats(), { mic: false, rnd: seededRandom(4) });
    expect(cs.every((c) => c.kind === 'name')).toBe(true);
  });

  test('is different each time', () => {
    const a = buildReview(stats(), { mic: true, rnd: seededRandom(5) });
    const b = buildReview(stats(), { mic: true, rnd: seededRandom(6) });
    expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
  });

  test('unlocks once a couple of notes are learned', () => {
    const p = initialProgress();
    expect(reviewUnlocked(p)).toBe(false);
    expect(reviewUnlocked({ ...p, items: stats() })).toBe(true);
  });

  test('finishing a review marks today done without touching the course path', () => {
    const p = { ...initialProgress(), items: stats() };
    const now = new Date('2026-09-24T17:00:00');
    const r = finishLesson(p, { lessonId: REVIEW_ID, xp: 25, chest: { rarity: 'rare', gems: 20, freeze: false }, ms: 240_000, accuracy: 0.9, answers: [{ id: 'bass:F3', correct: true, ms: 1900 }] }, now);
    expect(reviewDoneToday(r.progress, now)).toBe(true);
    expect(reviewDoneToday(r.progress, new Date('2026-09-25T17:00:00'))).toBe(false);
    expect(r.progress.review.total).toBe(1);
    expect(r.progress.lessons[REVIEW_ID]).toBeUndefined();
    expect(nextLessonId(r.progress)).toBe('treble-1');
    // Review time still counts towards the daily goal, and the practice updates note stats.
    expect(r.progress.days['2026-09-24'].ms).toBe(240_000);
    expect(r.progress.items['bass:F3'].seen).toBe(4);
  });

  test('friendly names for the card', () => {
    expect(friendlyName('treble:C4')).toBe('middle C');
    expect(friendlyName('bass:C4')).toBe('middle C');
    expect(friendlyName('bass:F3')).toBe('bass F');
    expect(friendlyName('treble:B4')).toBe('treble B');
  });
});
