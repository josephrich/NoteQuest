// Builds a lesson's list of challenges, weighting practice towards the notes he reads slowest
// or gets wrong most.
import { LETTERS } from '../engine/music';
import {
  STAFF_NOTES,
  chordItem,
  chordName,
  chordQuality,
  chordRefOf,
  chordRoot,
  intervalItem,
  intervalLabel,
  itemClef,
  itemLetter,
  itemName,
  itemNote,
  plainItem,
  thirdItem,
  thirdLabel,
  thirdQuality,
  type ChordRef,
  shiftItem,
  intervalExample,
  isNoteItem,
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
  // Chord lessons: each item is a chord (see ChordRef). 'name' asks which chord it is, 'play' asks
  // for the chord, and 'burst' is a run of chords.
  chord?: boolean;
  // 3rds lessons: an 'interval' challenge asking major or minor 3rd, or a pair to play.
  third?: boolean;
}

// Whether a challenge is answered by tapping or by playing.
export const tapped = (c: Challenge): boolean => c.kind === 'name' || c.kind === 'interval';

// The right answer to tap, for 'name' and 'interval' challenges.
export function challengeAnswer(c: Challenge): string {
  if (c.chord) return chordName(c.items[0]);
  if (c.third) return thirdLabel(thirdQuality(c.items[0], c.items[1]));
  return c.kind === 'interval' ? intervalLabel(c.interval!) : itemName(c.items[0]);
}

// What a challenge's stats are kept under, for its item at `step`.
export function statItem(c: Challenge, step = 0): ItemId {
  if (c.third && c.kind === 'interval') return thirdItem(thirdQuality(c.items[0], c.items[1]));
  if (c.kind === 'interval') return intervalItem(c.interval!);
  const id = c.items[Math.min(step, c.items.length - 1)];
  return c.chord ? chordItem(id) : plainItem(id);
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

function shuffle<T>(arr: T[], rnd: Rnd): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Musical order for note names: C, C♯, D♭, D... (flat before natural before sharp on each letter).
const nameOrder = (name: string) => LETTERS.indexOf(name[0] as (typeof LETTERS)[number]) * 3 + (name.endsWith('♭') ? 0 : name.endsWith('♯') ? 2 : 1);

// Choices for naming a note, in musical order (C D E F G A B) so he isn't hunting for a letter. When
// the lesson has sharps or flats, the choices use them too, and always include the same letter
// with and without its sharp or flat, so the sign is what's being read.
export function nameOptions(id: ItemId, rnd: Rnd, pool: ItemId[] = []): string[] {
  const answer = itemName(id);
  const accidentals = [id, ...pool].some((p) => itemNote(p).acc !== 0 || itemNote(p).natural);
  if (!accidentals) {
    const others = shuffle(LETTERS.filter((l) => l !== answer), rnd);
    return [answer, ...others.slice(0, 3)].sort((a, b) => nameOrder(a) - nameOrder(b));
  }
  const letter = itemLetter(id);
  const names = [...new Set(pool.map(itemName))].filter((n) => n !== answer);
  // The same letter plain, sharp or flat (leaving out E♯, B♯, C♭ and F♭, which are white keys).
  const variants = [letter, 'EB'.includes(letter) ? null : `${letter}♯`, 'CF'.includes(letter) ? null : `${letter}♭`].filter((n): n is string => n !== null);
  const inLesson = names.filter((n) => n[0] === letter);
  const sameLetter = shuffle(
    (inLesson.length ? [...new Set([letter, ...inLesson])] : variants).filter((n) => n !== answer),
    rnd,
  ).slice(0, 1);
  const rest = shuffle(
    [...names, ...LETTERS].filter((n, i, all) => n !== answer && !sameLetter.includes(n) && all.indexOf(n) === i),
    rnd,
  ).slice(0, 3 - sameLetter.length);
  return [answer, ...sameLetter, ...rest].sort((a, b) => nameOrder(a) - nameOrder(b));
}

// How well he reads so far, from how many notes he reads quickly and accurately: 0 is starting out,
// 1 is getting there, 2 is confident. As it goes up, lessons have more runs of notes (not just single
// notes), and longer ones.
export type Level = 0 | 1 | 2;
export const LEVEL_AT = { 1: 8, 2: 18 } as const;

export function isFluent(s: ItemStat): boolean {
  return s.correct >= 6 && s.avgMs !== null && s.avgMs <= 2000 && s.wrong <= 0.2 * s.seen;
}

export function readingLevel(stats: Record<ItemId, ItemStat>): Level {
  const fluent = Object.entries(stats).filter(([id, s]) => isNoteItem(id) && isFluent(s)).length;
  return fluent >= LEVEL_AT[2] ? 2 : fluent >= LEVEL_AT[1] ? 1 : 0;
}

// Tapping and playing come in blocks rather than alternating, so he isn't switching modes every
// question. By level: how often a run of notes ('burst') comes up, and how long it is.
const PATTERNS: Record<Level, ChallengeKind[]> = {
  0: ['name', 'name', 'play', 'play', 'play', 'burst'],
  1: ['name', 'name', 'play', 'burst', 'play', 'burst'],
  2: ['name', 'name', 'burst', 'play', 'burst', 'burst'],
};
const CHECKPOINT_PATTERNS: Record<Level, ChallengeKind[]> = {
  0: ['name', 'name', 'play', 'play', 'burst', 'burst'],
  1: ['name', 'name', 'play', 'burst', 'burst', 'burst'],
  2: ['name', 'burst', 'burst', 'play', 'burst', 'burst'],
};
export const RUN_LENGTH: Record<Level, number> = { 0: 3, 1: 4, 2: 5 };

// A lesson with notes he hasn't met yet stays a little gentler.
function lessonLevel(lesson: LessonDef, stats: Record<ItemId, ItemStat>, level: Level | undefined): Level {
  const l = level ?? readingLevel(stats);
  return lesson.newNotes.some((id) => !stats[id]?.seen) ? (Math.min(l, 1) as Level) : l;
}

export interface BuildOptions {
  mic: boolean;
  rnd?: Rnd;
  length?: number;
  // Defaults to readingLevel(stats).
  level?: Level;
}

export function buildLesson(lesson: LessonDef, stats: Record<ItemId, ItemStat>, { mic, rnd = Math.random, length, level }: BuildOptions): Challenge[] {
  if (lesson.intervals) return buildIntervalLesson(lesson, stats, { mic, rnd, length, level });
  if (lesson.chords) return buildChordLesson(lesson, stats, { mic, rnd, length });
  if (lesson.thirds) return buildThirdsLesson(lesson, stats, { mic, rnd, length });
  const lvl = lessonLevel(lesson, stats, level);
  const out: Challenge[] = [];
  for (const id of lesson.newNotes) {
    if (!stats[id]?.seen) out.push({ kind: 'meet', items: [id] });
  }
  const count = length ?? (lesson.checkpoint ? 15 : 12);
  const pattern = (lesson.checkpoint ? CHECKPOINT_PATTERNS : PATTERNS)[lvl];
  const runLength = RUN_LENGTH[lvl];
  const weights = lesson.pool.map((id) => needWeight(stats[plainItem(id)], lesson.newNotes.includes(id)));
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
      while (items.length < runLength) items.push(pickOne(items[items.length - 1], itemClef(first)));
      out.push({ kind, items });
      prev = items[items.length - 1];
    } else {
      const id = pickOne(prev);
      out.push(kind === 'name' ? { kind, items: [id], options: nameOptions(id, rnd, lesson.pool) } : { kind, items: [id] });
      prev = id;
    }
  }
  return out;
}

type IntervalKind = 'interval' | 'pair' | 'melody';
const INTERVAL_PATTERNS: Record<Level, IntervalKind[]> = {
  0: ['interval', 'interval', 'interval', 'pair', 'pair', 'melody'],
  1: ['interval', 'interval', 'pair', 'melody', 'pair', 'melody'],
  2: ['interval', 'interval', 'melody', 'pair', 'melody', 'melody'],
};
export const MELODY_LENGTH: Record<Level, number> = { 0: 4, 1: 5, 2: 6 };

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

// A short melody on the staff, each jump one of `sizes` (all bigger than 1).
export function intervalMelody(clef: 'treble' | 'bass', sizes: number[], length: number, rnd: Rnd, pickSize: (sizes: number[]) => number = (s) => pickFrom(s, rnd)): ItemId[] {
  let items = [pickFrom(STAFF_NOTES[clef], rnd)];
  for (let tries = 0; items.length < length; tries++) {
    const next = jump(items[items.length - 1], pickSize(sizes), rnd);
    if (next) items.push(next);
    // A big leap can paint it into a corner; start again from a fresh note.
    else if (tries % 10 === 9) items = [pickFrom(STAFF_NOTES[clef], rnd)];
  }
  return items;
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
  { mic, rnd = Math.random, length, level }: BuildOptions,
): Challenge[] {
  const spec = lesson.intervals!;
  // New jumps he hasn't met yet keep the lesson gentler.
  const base = level ?? readingLevel(stats);
  const lvl = (spec.newSizes.some((sz) => !stats[intervalItem(sz)]?.seen) ? Math.min(base, 1) : base) as Level;
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
    const pattern = INTERVAL_PATTERNS[lvl];
    const kind = mic ? pattern[i % pattern.length] : 'interval';
    const clef = pickFrom(spec.clefs, rnd);
    if (kind === 'melody') {
      out.push({ kind: 'burst', items: intervalMelody(clef, playable, MELODY_LENGTH[lvl], rnd, pickSize) });
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

// Choices for "Which chord is this?": the answer, the same root with the other quality (so it's the
// 3rd being read, not just the root), and two others from the lesson, in musical order.
export function chordOptions(ref: ChordRef, refs: ChordRef[], rnd: Rnd): string[] {
  const answer = chordName(ref);
  const flipped = chordName(chordRefOf(chordRoot(ref), chordQuality(ref) === 'major' ? 'minor' : 'major'));
  const others = shuffle(
    [...new Set(refs.map(chordName))].filter((n) => n !== answer && n !== flipped),
    rnd,
  ).slice(0, 2);
  return [answer, flipped, ...others].sort((a, b) => nameOrder(a.split(' ')[0]) - nameOrder(b.split(' ')[0]) || a.localeCompare(b));
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
  const out: Challenge[] = [];
  for (const ref of spec.newRoots) {
    if (!stats[chordItem(ref)]?.seen) out.push({ kind: 'meet', items: [ref], chord: true });
  }
  const weights = spec.roots.map((r) => needWeight(stats[chordItem(r)], spec.newRoots.includes(r)));
  const pickOne = (exclude: ChordRef | null, clef?: string): ChordRef => {
    const inClef = spec.roots.filter((r) => !clef || itemClef(r) === clef);
    const ids = inClef.length > 1 ? inClef.filter((r) => r !== exclude) : inClef;
    return weightedPick(ids, ids.map((r) => weights[spec.roots.indexOf(r)]), rnd);
  };
  const count = length ?? (lesson.checkpoint ? 15 : 12);
  const pattern = lesson.checkpoint ? CHORD_CHECKPOINT_PATTERN : CHORD_PATTERN;
  let prev: ChordRef | null = null;
  for (let i = 0; i < count; i++) {
    const kind = mic ? pattern[i % pattern.length] : 'name';
    if (kind === 'burst') {
      const items: ChordRef[] = [pickOne(prev)];
      while (items.length < CHORD_RUN) items.push(pickOne(items[items.length - 1], itemClef(items[0])));
      out.push({ kind, items, chord: true });
      prev = items[items.length - 1];
      continue;
    }
    const ref = pickOne(prev);
    prev = ref;
    out.push(kind === 'name' ? { kind, items: [ref], chord: true, options: chordOptions(ref, spec.roots, rnd) } : { kind, items: [ref], chord: true });
  }
  return out;
}

export const THIRD_OPTIONS = [thirdLabel('major'), thirdLabel('minor')];
const THIRDS_PATTERN = ['interval', 'interval', 'interval', 'pair', 'pair', 'interval'] as const;

// Major or minor 3rd? Mostly read and named; with a piano, some are played too (the first note is
// given, then he finds the 3rd).
export function buildThirdsLesson(
  lesson: LessonDef,
  stats: Record<ItemId, ItemStat>,
  { mic, rnd = Math.random, length }: { mic: boolean; rnd?: Rnd; length?: number },
): Challenge[] {
  const pairs = lesson.thirds!.pairs;
  const q = (p: [ItemId, ItemId]) => thirdQuality(p[0], p[1]);
  const weights = pairs.map((p) => needWeight(stats[thirdItem(q(p))], false));
  const count = length ?? (lesson.checkpoint ? 15 : 12);
  const out: Challenge[] = [];
  let prev = -1;
  for (let i = 0; i < count; i++) {
    const kind = mic ? THIRDS_PATTERN[i % THIRDS_PATTERN.length] : 'interval';
    const idx = pairs.map((_, j) => j).filter((j) => j !== prev);
    const j = Number(weightedPick(idx.map(String), idx.map((k) => weights[k]), rnd));
    prev = j;
    const items = [...pairs[j]];
    out.push(kind === 'pair' ? { kind: 'burst', items, third: true, startHint: true } : { kind: 'interval', items, third: true, interval: 3, options: THIRD_OPTIONS });
  }
  return out;
}

// For the lesson sheet: "D" for a note, or a word like "Skip" for an interval.
export function describeNew(lesson: LessonDef): string[] {
  if (lesson.intervals) return lesson.intervals.newSizes.map(intervalLabel);
  if (lesson.chords) return lesson.chords.newRoots.map(chordName);
  return lesson.newNotes.map(itemLetter);
}
