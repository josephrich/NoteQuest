// Daily Review: an endless, fresh practice lesson built from every note he has learned so far,
// leaning on the notes he reads slowest or misses most. This is what keeps the app useful after
// the course runs out.
import { REVIEW_ID, itemClef, itemLetter, itemNote, type ItemId, type LessonDef } from './content';
import { buildLesson, nameOptions, needWeight, type Challenge, type ItemStat } from './lesson';
import { dayKey, type Progress } from './progress';

export { REVIEW_ID };
export const REVIEW_TITLE = 'Daily Review';
export const REVIEW_COLOR = '#ff8a1f';
export const REVIEW_LENGTH = 15;
// How many "tricky" notes each review focuses on, and how many extra times each one comes up.
export const FOCUS_COUNT = 3;
const FOCUS_REPEATS = 2;
// Needs a few notes before a review is worth doing.
export const MIN_LEARNED = 2;

type Rnd = () => number;

export function learnedItems(stats: Record<ItemId, ItemStat>): ItemId[] {
  return Object.keys(stats).filter((id) => stats[id].seen > 0);
}

export function reviewUnlocked(p: Progress): boolean {
  return learnedItems(p.items).length >= MIN_LEARNED;
}

export function reviewDoneToday(p: Progress, now: Date): boolean {
  return p.review.lastDay === dayKey(now);
}

// The notes that most need practice, hardest first.
export function focusItems(stats: Record<ItemId, ItemStat>, n = FOCUS_COUNT): ItemId[] {
  return learnedItems(stats)
    .map((id) => ({ id, w: needWeight(stats[id], false), ms: stats[id].avgMs ?? Infinity }))
    .sort((a, b) => b.w - a.w || b.ms - a.ms)
    .slice(0, n)
    .map((x) => x.id);
}

// "middle C", "treble G", "bass F" and so on, for showing to a child.
export function friendlyName(id: ItemId): string {
  const n = itemNote(id);
  if (n.letter === 0 && n.octave === 4 && n.acc === 0) return 'middle C';
  return `${itemClef(id)} ${itemLetter(id)}`;
}

export function buildReview(stats: Record<ItemId, ItemStat>, { mic, rnd = Math.random }: { mic: boolean; rnd?: Rnd }): Challenge[] {
  const learned = learnedItems(stats);
  const focus = focusItems(stats);
  const extra = focus.length * FOCUS_REPEATS;
  const lesson: LessonDef = { id: REVIEW_ID, title: REVIEW_TITLE, pool: learned, newNotes: [] };
  const base = buildLesson(lesson, stats, { mic, rnd, length: REVIEW_LENGTH - extra });

  // Each tricky note comes up twice: once as a quick read, once played (or tapped without a mic),
  // spread out through the review so it isn't just the same note back to back.
  const focusChallenges: Challenge[] = [];
  for (let r = 0; r < FOCUS_REPEATS; r++) {
    for (const id of focus) {
      const play = mic && r === 1;
      focusChallenges.push(play ? { kind: 'play', items: [id] } : { kind: 'name', items: [id], options: nameOptions(id, rnd) });
    }
  }
  const out = [...base];
  const gap = Math.max(1, Math.floor(out.length / focusChallenges.length));
  focusChallenges.forEach((c, i) => out.splice(Math.min(out.length, 1 + i * (gap + 1)), 0, c));
  return out;
}
