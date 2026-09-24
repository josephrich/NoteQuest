// Builds a lesson's list of challenges, weighting practice towards the notes he reads slowest
// or gets wrong most.
import { LETTERS } from '../engine/music';
import { itemClef, itemLetter, type ItemId, type LessonDef } from './content';

export type ChallengeKind = 'meet' | 'name' | 'play' | 'burst';

export interface Challenge {
  kind: ChallengeKind;
  items: ItemId[];
  // Letter choices for 'name' challenges.
  options?: string[];
}

export interface ItemStat {
  seen: number;
  correct: number;
  wrong: number;
  // Smoothed first-try reading time in ms, for correct answers.
  avgMs: number | null;
  lastSeen: number;
}

export const newStat = (): ItemStat => ({ seen: 0, correct: 0, wrong: 0, avgMs: null, lastSeen: 0 });

export function updateStat(stat: ItemStat | undefined, { correct, ms, now }: { correct: boolean; ms: number | null; now: number }): ItemStat {
  const s = { ...(stat ?? newStat()) };
  s.seen++;
  s.lastSeen = now;
  if (correct) {
    s.correct++;
    if (ms !== null) s.avgMs = s.avgMs === null ? ms : Math.round(0.7 * s.avgMs + 0.3 * ms);
  } else {
    s.wrong++;
  }
  return s;
}

// How much a note needs practice: unfamiliar, error-prone or slow notes score higher.
export function needWeight(stat: ItemStat | undefined, isNew: boolean): number {
  if (!stat || stat.seen === 0) return isNew ? 4 : 3;
  const errorRate = stat.wrong / Math.max(1, stat.seen);
  const slowness = stat.avgMs === null ? 1 : Math.min(2, Math.max(0, (stat.avgMs - 1000) / 1500));
  const familiarity = Math.min(1, stat.correct / 6);
  return 1 + 4 * errorRate + slowness + (1 - familiarity) + (isNew ? 1.5 : 0);
}

type Rnd = () => number;

function weightedPick(ids: ItemId[], weights: number[], rnd: Rnd): ItemId {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rnd() * total;
  for (let i = 0; i < ids.length; i++) {
    r -= weights[i];
    if (r <= 0) return ids[i];
  }
  return ids[ids.length - 1];
}

export function nameOptions(id: ItemId, rnd: Rnd): string[] {
  const answer = itemLetter(id);
  const others: string[] = LETTERS.filter((l) => l !== answer);
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  // Keep the buttons in musical order (C D E F G A B) so he isn't hunting for a letter.
  const order: string[] = [...LETTERS];
  return [answer, ...others.slice(0, 3)].sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

const PATTERN: ChallengeKind[] = ['name', 'play', 'play', 'name', 'play', 'burst'];
const CHECKPOINT_PATTERN: ChallengeKind[] = ['play', 'play', 'burst', 'name', 'play', 'burst'];

export function buildLesson(
  lesson: LessonDef,
  stats: Record<ItemId, ItemStat>,
  { mic, rnd = Math.random, length }: { mic: boolean; rnd?: Rnd; length?: number },
): Challenge[] {
  const out: Challenge[] = [];
  for (const id of lesson.newNotes) {
    if (!stats[id]?.seen) out.push({ kind: 'meet', items: [id] });
  }
  const count = length ?? (lesson.checkpoint ? 15 : 12);
  const pattern = lesson.checkpoint ? CHECKPOINT_PATTERN : PATTERN;
  const weights = lesson.pool.map((id) => needWeight(stats[id], lesson.newNotes.includes(id)));
  let prev: ItemId | null = null;
  const pickOne = (exclude: ItemId | null, clef?: string): ItemId => {
    const inClef = lesson.pool.filter((id) => !clef || itemClef(id) === clef);
    const ids = inClef.length > 1 ? inClef.filter((id) => id !== exclude) : inClef;
    const w = ids.map((id) => weights[lesson.pool.indexOf(id)]);
    return weightedPick(ids, w, rnd);
  };

  for (let i = 0; i < count; i++) {
    let kind = mic ? pattern[i % pattern.length] : 'name';
    if (kind === 'burst' && lesson.pool.length < 3) kind = 'play';
    if (kind === 'burst') {
      const first = pickOne(prev);
      const items = [first];
      while (items.length < 3) items.push(pickOne(items[items.length - 1], itemClef(first)));
      out.push({ kind, items });
      prev = items[2];
    } else {
      const id = pickOne(prev);
      out.push(kind === 'name' ? { kind, items: [id], options: nameOptions(id, rnd) } : { kind, items: [id] });
      prev = id;
    }
  }
  return out;
}
