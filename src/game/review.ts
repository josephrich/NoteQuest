// Daily Review: an endless, fresh practice lesson built from every note he has learned so far,
// leaning on the notes he reads slowest or misses most. This is what keeps the app useful after
// the course runs out.
import { REVIEW_ID, chordRoot, isChordItem, isNoteItem, itemInterval, itemClef, itemLetter, itemNote, type ItemId, type LessonDef } from './content';
import { MELODY_LENGTH, buildLesson, intervalMelody, nameOptions, needWeight, readingLevel, tapped, type Challenge, type ItemStat, type Level } from './lesson';
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

// "middle C", "treble G", "bass F" and so on, for showing to a child; "the C chord" for a chord.
export function friendlyName(id: ItemId): string {
  if (isChordItem(id)) return `the ${itemLetter(chordRoot(id))} chord`;
  const n = itemNote(id);
  if (n.letter === 0 && n.octave === 4 && n.acc === 0) return 'middle C';
  return `${itemClef(id)} ${itemLetter(id)}`;
}

// Chords he has practised, by bottom note.
export function learnedChords(stats: Record<ItemId, ItemStat>): ItemId[] {
  return Object.keys(stats)
    .filter((id) => isChordItem(id) && stats[id].seen > 0)
    .map(chordRoot);
}

// Jumps he has practised that can be played (not repeated notes).
function learnedJumps(stats: Record<ItemId, ItemStat>): number[] {
  return Object.keys(stats)
    .map((id) => (stats[id].seen > 0 ? itemInterval(id) : null))
    .filter((s): s is number => s !== null && s > 1);
}

const pick = <T>(arr: T[], rnd: Rnd): T => arr[Math.floor(rnd() * arr.length)];

// The harder, multi-note challenges a review adds as he gets better: melodies built from the jumps
// he knows, and chords once he has learned some. Only for playing, so only with a piano to play.
export function advancedChallenges(stats: Record<ItemId, ItemStat>, level: Level, rnd: Rnd): Challenge[] {
  const out: Challenge[] = [];
  const jumps = learnedJumps(stats);
  if (level >= 1 && jumps.length) {
    for (let i = 0; i < level; i++) out.push({ kind: 'burst', items: intervalMelody(rnd() < 0.5 ? 'treble' : 'bass', jumps, MELODY_LENGTH[level], rnd) });
  }
  const chords = learnedChords(stats);
  if (chords.length >= 2) {
    out.push({ kind: 'play', items: [pick(chords, rnd)], chord: true });
    const clef = itemClef(pick(chords, rnd));
    const same = chords.filter((r) => itemClef(r) === clef);
    if (level >= 2 && same.length >= 2) {
      const items = [pick(same, rnd)];
      while (items.length < 3) items.push(pick(same.filter((r) => r !== items[items.length - 1]), rnd));
      out.push({ kind: 'burst', items, chord: true });
    }
  }
  return out;
}

export function buildReview(stats: Record<ItemId, ItemStat>, { mic, rnd = Math.random, level }: { mic: boolean; rnd?: Rnd; level?: Level }): Challenge[] {
  const learned = learnedItems(stats);
  const focus = focusItems(stats);
  const extra = focus.length * FOCUS_REPEATS;
  const lvl = level ?? readingLevel(stats);
  // As he gets better, the review makes room for melodies and chords (only with a piano to play).
  const harder = mic ? advancedChallenges(stats, lvl, rnd) : [];
  const lesson: LessonDef = { id: REVIEW_ID, title: REVIEW_TITLE, pool: learned, newNotes: [] };
  const base = buildLesson(lesson, stats, { mic, rnd, length: REVIEW_LENGTH - extra - harder.length, level: lvl });
  // Spread them through the playing parts of the review.
  harder.forEach((c, i) => {
    const plays = base.map((o, j) => (tapped(o) ? -1 : j)).filter((j) => j >= 0);
    const at = plays.length ? plays[Math.floor(((i + 0.5) * plays.length) / harder.length)] + 1 : base.length;
    base.splice(at, 0, c);
  });

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
