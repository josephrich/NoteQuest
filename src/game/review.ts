// Daily Review: an endless, fresh practice lesson built from every note he has learned so far,
// leaning on the notes he reads slowest or misses most. This is what keeps the app useful after
// the course runs out.
import { REVIEW_ID, isNoteItem, itemClef, itemLetter, itemNote, type ItemId, type LessonDef } from './content';
import { buildLesson, nameOptions, needWeight, tapped, type Challenge, type ItemStat } from './lesson';
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

// Notes he has practised (interval stats are kept alongside, but the review is about notes).
export function learnedItems(stats: Record<ItemId, ItemStat>): ItemId[] {
  return Object.keys(stats).filter((id) => isNoteItem(id) && stats[id].seen > 0);
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
  // Slot each one in next to a challenge of the same kind (tap or play), so the review keeps its
  // blocks instead of switching modes more often.
  const out = [...base];
  focusChallenges.forEach((c, i) => {
    const same = out.map((o, j) => (tapped(o) === tapped(c) ? j : -1)).filter((j) => j >= 0);
    const at = same.length ? same[Math.floor(((i % FOCUS_COUNT) + 0.5) * (same.length / FOCUS_COUNT)) % same.length] + 1 : out.length;
    out.splice(at, 0, c);
  });
  return out;
}
