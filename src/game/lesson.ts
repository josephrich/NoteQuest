// Builds a lesson's list of challenges, weighting practice towards the notes he reads slowest
// or gets wrong most.
import { LETTERS } from '../engine/music';
import {
  STAFF_NOTES,
  chordItem,
  chordName,
  intervalItem,
  intervalLabel,
  itemClef,
  itemLetter,
  shiftItem,
  intervalExample,
  type ItemId,
  type LessonDef,
} from './content';

// 'interval' asks how far apart two notes are. Interval lessons also use 'meet' with two notes,
// and 'burst' for playing a pair (with the first note named) or a short melody.
export type ChallengeKind = 'meet' | 'name' | 'play' | 'burst' | 'interval';

export interface Challenge {
  kind: ChallengeKind;
  items: ItemId[];
  // Choices for 'name' (letters) and 'interval' (interval labels) challenges.
  options?: string[];
  // The interval size, for interval challenges and interval 'meet' cards.
  interval?: number;
  // For a pair to play: tell him the first note, so he reads the second one by its distance.
  startHint?: boolean;
  // Chord lessons: each item is a chord's bottom note, and the chord is its three notes. 'name' asks
  // which chord it is, 'play' asks for the chord, and 'burst' is a run of chords.
  chord?: boolean;
  // Chords are named in full ("C major") rather than by letter.
  full?: boolean;
}

// Whether a challenge is answered by tapping or by playing.
export const tapped = (c: Challenge): boolean => c.kind === 'name' || c.kind === 'interval';

// The right answer to tap, for 'name' and 'interval' challenges.
export function challengeAnswer(c: Challenge): string {
  if (c.chord) return chordName(c.items[0], c.full);
  return c.kind === 'interval' ? intervalLabel(c.interval!) : itemLetter(c.items[0]);
}

// What a challenge's stats are kept under, for its item at `step`.
export function statItem(c: Challenge, step = 0): ItemId {
  if (c.kind === 'interval') return intervalItem(c.interval!);
  const id = c.items[Math.min(step, c.items.length - 1)];
  return c.chord ? chordItem(id) : id;
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

// Tapping and playing come in blocks rather than alternating, so he isn't switching modes every
// question.
const PATTERN: ChallengeKind[] = ['name', 'name', 'play', 'play', 'play', 'burst'];
const CHECKPOINT_PATTERN: ChallengeKind[] = ['name', 'name', 'play', 'play', 'burst', 'burst'];

export function buildLesson(
  lesson: LessonDef,
  stats: Record<ItemId, ItemStat>,
  { mic, rnd = Math.random, length }: { mic: boolean; rnd?: Rnd; length?: number },
): Challenge[] {
  if (lesson.intervals) return buildIntervalLesson(lesson, stats, { mic, rnd, length });
  if (lesson.chords) return buildChordLesson(lesson, stats, { mic, rnd, length });
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

const INTERVAL_PATTERN = ['interval', 'interval', 'interval', 'pair', 'pair', 'melody'] as const;
const MELODY_LENGTH = 4;

// A note `size` apart from `from`, up or down, that stays on the staff; null if neither fits.
function jump(from: ItemId, size: number, rnd: Rnd): ItemId | null {
  const staff = STAFF_NOTES[itemClef(from)];
  const dirs = rnd() < 0.5 ? [1, -1] : [-1, 1];
  for (const d of dirs) {
    const to = shiftItem(from, d * (size - 1));
    if (staff.includes(to)) return to;
  }
  return null;
}

function pickFrom<T>(arr: readonly T[], rnd: Rnd): T {
  return arr[Math.floor(rnd() * arr.length)];
}

// Two notes a given interval apart, anywhere on the staff.
export function intervalPair(size: number, clef: 'treble' | 'bass', rnd: Rnd): [ItemId, ItemId] {
  for (let tries = 0; tries < 50; tries++) {
    const a = pickFrom(STAFF_NOTES[clef], rnd);
    const b = jump(a, size, rnd);
    if (b) return [a, b];
  }
  return intervalExample(size, clef);
}

export function intervalOptions(sizes: number[]): string[] {
  return [...sizes].sort((a, b) => a - b).map(intervalLabel);
}

export function buildIntervalLesson(
  lesson: LessonDef,
  stats: Record<ItemId, ItemStat>,
  { mic, rnd = Math.random, length }: { mic: boolean; rnd?: Rnd; length?: number },
): Challenge[] {
  const spec = lesson.intervals!;
  const options = intervalOptions(spec.sizes);
  const out: Challenge[] = [];
  for (const size of spec.newSizes) {
    if (!stats[intervalItem(size)]?.seen) out.push({ kind: 'meet', items: intervalExample(size, spec.clefs[0]), interval: size });
  }
  const weights = spec.sizes.map((s) => needWeight(stats[intervalItem(s)], spec.newSizes.includes(s)));
  const pickSize = (sizes: number[]) => {
    const ids = sizes.map(intervalItem);
    const w = sizes.map((s) => weights[spec.sizes.indexOf(s)]);
    return Number(weightedPick(ids, w, rnd).split(':')[1]);
  };
  // Repeated notes are only named, never played: a quick re-strike is the hardest thing to hear.
  const playable = spec.sizes.filter((s) => s > 1);
  const count = length ?? (lesson.checkpoint ? 15 : 12);
  let prevSize: number | null = null;
  for (let i = 0; i < count; i++) {
    const kind = mic ? INTERVAL_PATTERN[i % INTERVAL_PATTERN.length] : 'interval';
    const clef = pickFrom(spec.clefs, rnd);
    if (kind === 'melody') {
      let items = [pickFrom(STAFF_NOTES[clef], rnd)];
      for (let tries = 0; items.length < MELODY_LENGTH; tries++) {
        const next = jump(items[items.length - 1], pickSize(playable), rnd);
        if (next) items.push(next);
        // A big leap can paint it into a corner; start again from a fresh note.
        else if (tries % 10 === 9) items = [pickFrom(STAFF_NOTES[clef], rnd)];
      }
      out.push({ kind: 'burst', items });
      continue;
    }
    // Avoid asking the same interval twice in a row when there is a choice.
    const allowed = kind === 'pair' ? playable : spec.sizes;
    const choices = allowed.filter((s) => s !== prevSize);
    const size = pickSize(choices.length ? choices : allowed);
    prevSize = size;
    const items = intervalPair(size, clef, rnd);
    out.push(kind === 'pair' ? { kind: 'burst', items, interval: size, startHint: true } : { kind: 'interval', items, interval: size, options });
  }
  return out;
}

const LETTER_ORDER = 'CDEFGAB';
const byLetter = (a: string, b: string) => LETTER_ORDER.indexOf(a[0]) - LETTER_ORDER.indexOf(b[0]) || a.localeCompare(b);

// Choices for "Which chord is this?": the answer and up to three others from the lesson, in musical
// order. Named in full, one of them is the same letter with the other quality ("C minor" for
// "C major"), so it's the quality being read, not just the letter.
export function chordOptions(root: ItemId, roots: ItemId[], full: boolean, rnd: Rnd): string[] {
  const answer = chordName(root, full);
  const others = [...new Set(roots.map((r) => chordName(r, full)))].filter((n) => n !== answer);
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  const picks = full ? [`${itemLetter(root)} ${answer.endsWith('major') ? 'minor' : 'major'}`, ...others.slice(0, 2)] : others.slice(0, 3);
  return [answer, ...picks].sort(byLetter);
}

const CHORD_PATTERN = ['name', 'name', 'play', 'play', 'play', 'burst'] as const;
const CHORD_CHECKPOINT_PATTERN = ['name', 'name', 'play', 'play', 'burst', 'burst'] as const;
const CHORD_RUN = 3;

export function buildChordLesson(
  lesson: LessonDef,
  stats: Record<ItemId, ItemStat>,
  { mic, rnd = Math.random, length }: { mic: boolean; rnd?: Rnd; length?: number },
): Challenge[] {
  const spec = lesson.chords!;
  const full = spec.quality;
  const out: Challenge[] = [];
  for (const root of spec.newRoots) {
    if (!stats[chordItem(root)]?.seen) out.push({ kind: 'meet', items: [root], chord: true, full });
  }
  const weights = spec.roots.map((r) => needWeight(stats[chordItem(r)], spec.newRoots.includes(r)));
  const pickOne = (exclude: ItemId | null, clef?: string): ItemId => {
    const inClef = spec.roots.filter((r) => !clef || itemClef(r) === clef);
    const ids = inClef.length > 1 ? inClef.filter((r) => r !== exclude) : inClef;
    return weightedPick(ids, ids.map((r) => weights[spec.roots.indexOf(r)]), rnd);
  };
  const count = length ?? (lesson.checkpoint ? 15 : 12);
  const pattern = lesson.checkpoint ? CHORD_CHECKPOINT_PATTERN : CHORD_PATTERN;
  let prev: ItemId | null = null;
  for (let i = 0; i < count; i++) {
    const kind = mic ? pattern[i % pattern.length] : 'name';
    if (kind === 'burst') {
      const items: ItemId[] = [pickOne(prev)];
      while (items.length < CHORD_RUN) items.push(pickOne(items[items.length - 1], itemClef(items[0])));
      out.push({ kind, items, chord: true, full });
      prev = items[items.length - 1];
      continue;
    }
    const root = pickOne(prev);
    prev = root;
    out.push(kind === 'name' ? { kind, items: [root], chord: true, full, options: chordOptions(root, spec.roots, full, rnd) } : { kind, items: [root], chord: true, full });
  }
  return out;
}

// For the lesson sheet: "D" for a note, or a word like "Skip" for an interval.
export function describeNew(lesson: LessonDef): string[] {
  if (lesson.intervals) return lesson.intervals.newSizes.map(intervalLabel);
  if (lesson.chords) return lesson.chords.newRoots.map((r) => chordName(r));
  return lesson.newNotes.map(itemLetter);
}
