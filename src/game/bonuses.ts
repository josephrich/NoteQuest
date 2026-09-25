// XP bonuses that reward effort and growth, not just being good already.
//
// On a roll: the 2nd and 3rd lessons of a sitting earn extra, but only until the daily goal is met,
// so it rewards staying on for a proper practice without encouraging marathons.
//
// Improvement: a note that was slow or often missed getting faster or more accurate than it was
// before this lesson. That's where a struggling reader's hard work shows, so it earns a bonus.
import type { ItemId } from './content';
import type { ItemStat } from './lesson';

// A lesson started within this long of the last one ending continues the sitting.
export const ROLL_GAP_MS = 5 * 60_000;
// Multiplier for the nth lesson in a sitting (1st, 2nd, 3rd and after).
export const ROLL_MULTIPLIER = [1, 1.25, 1.5] as const;

export function rollMultiplier(count: number): number {
  return ROLL_MULTIPLIER[Math.min(count, ROLL_MULTIPLIER.length) - 1] ?? 1;
}

// Under this, a note is read fluently (the same line the Grown-ups area uses).
export const FLUENT_MS = 1500;
// Only notes with some history count, so a note's first few goes don't look like "improvement".
const MIN_SEEN = 5;
const FASTER_BY = 0.85;
const MAX_SHOWN = 3;
export const IMPROVEMENT_XP = { fluent: 5, faster: 3, accurate: 3 } as const;

export type ImprovementKind = keyof typeof IMPROVEMENT_XP;

export interface Improvement {
  id: ItemId;
  kind: ImprovementKind;
  xp: number;
}

export function findImprovements(
  before: Record<ItemId, ItemStat>,
  after: Record<ItemId, ItemStat>,
  answers: { id: ItemId; correct: boolean }[],
): Improvement[] {
  const found: Improvement[] = [];
  for (const id of new Set(answers.map((a) => a.id))) {
    const b = before[id];
    const a = after[id];
    if (!b || !a || b.seen < MIN_SEEN) continue;
    const mine = answers.filter((x) => x.id === id);
    let kind: ImprovementKind | null = null;
    if (b.avgMs !== null && a.avgMs !== null && b.avgMs > FLUENT_MS) {
      if (a.avgMs <= FLUENT_MS) kind = 'fluent';
      else if (a.avgMs <= b.avgMs * FASTER_BY) kind = 'faster';
    }
    // A note that was missed a lot, answered right every time (at least twice) this lesson.
    if (!kind && b.wrong / b.seen >= 0.3 && mine.length >= 2 && mine.every((x) => x.correct)) kind = 'accurate';
    if (kind) found.push({ id, kind, xp: IMPROVEMENT_XP[kind] });
  }
  return found.sort((x, y) => y.xp - x.xp).slice(0, MAX_SHOWN);
}
