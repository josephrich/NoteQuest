// The course: units of lessons, each introducing a few notes around "landmark" notes.
// An item id is `<clef>:<note>`, e.g. "treble:G4", because the same pitch looks different in each clef.
import { LETTERS, parseNote, toMidi, type Clef, type Note } from '../engine/music';

export type ItemId = string;

export interface LessonDef {
  id: string;
  title: string;
  // Notes that can appear in this lesson.
  pool: ItemId[];
  // Notes introduced here (they get a "meet the note" card first).
  newNotes: ItemId[];
  checkpoint?: boolean;
  // Interval lessons: read the distance between notes rather than naming each one.
  intervals?: IntervalSpec;
}

export interface IntervalSpec {
  // Interval sizes in play, counted the musical way: 2 = a 2nd (step), 3 = a 3rd (skip)...
  sizes: number[];
  // Sizes introduced here (they get a "meet" card first).
  newSizes: number[];
  clefs: Clef[];
}

export interface UnitDef {
  id: string;
  title: string;
  subtitle: string;
  color: string;
  lessons: LessonDef[];
  comingSoon?: boolean;
}

// Interval stats are kept alongside note stats, as "interval:3" and so on.
export const intervalItem = (size: number): ItemId => `interval:${size}`;

export function isNoteItem(id: ItemId): boolean {
  return id.startsWith('treble:') || id.startsWith('bass:');
}

export function itemInterval(id: ItemId): number | null {
  return id.startsWith('interval:') ? Number(id.split(':')[1]) : null;
}

const INTERVAL_LABELS: Record<number, string> = { 1: 'Same note', 2: '2nd · step', 3: '3rd · skip', 4: '4th', 5: '5th', 6: '6th', 7: '7th', 8: 'Octave' };
const INTERVAL_WORDS: Record<number, string> = { 1: 'the same note', 2: 'a step', 3: 'a skip', 4: 'a 4th', 5: 'a 5th', 6: 'a 6th', 7: 'a 7th', 8: 'an octave' };

export const intervalLabel = (size: number): string => INTERVAL_LABELS[size] ?? `${size}th`;
export const intervalWord = (size: number): string => INTERVAL_WORDS[size] ?? `${size} notes apart`;

// Moves a note up (or down, for negative steps) by letter names, staying in its clef.
export function shiftItem(id: ItemId, steps: number): ItemId {
  const n = itemNote(id);
  const pos = n.octave * 7 + n.letter + steps;
  return `${itemClef(id)}:${LETTERS[((pos % 7) + 7) % 7]}${Math.floor(pos / 7)}`;
}

// How each interval looks, and an example pair to show when it is introduced.
export const INTERVAL_TIPS: Record<number, string> = {
  1: 'When a note repeats, it stays in exactly the same place. Play the same key again.',
  2: 'A step goes from a line to the very next space, or a space to the very next line. On the piano it is the next white key.',
  3: 'A skip goes from a line to the next line, or a space to the next space. It jumps over one white key.',
  4: 'A 4th goes from a line to a space (or a space to a line), with two notes in between. It is bigger than a skip.',
  5: 'A 5th goes from a line to a line two lines away (or space to space). In a five-finger position it is thumb to little finger.',
  8: 'An octave lands on the same letter, eight notes away. One note is on a line and the other is in a space. Stretch your hand!',
};

export function intervalExample(size: number, clef: Clef): [ItemId, ItemId] {
  const start = clef === 'treble' ? (size === 8 || size === 5 ? 'C4' : size === 4 ? 'G4' : 'E4') : size === 8 ? 'C3' : size === 5 ? 'F2' : 'G2';
  const a = `${clef}:${start}`;
  return [a, shiftItem(a, size - 1)];
}

export function itemClef(id: ItemId): Clef {
  return id.split(':')[0] as Clef;
}

export function itemNote(id: ItemId): Note {
  return parseNote(id.split(':')[1]);
}

export function itemMidi(id: ItemId): number {
  return toMidi(itemNote(id));
}

export function itemLetter(id: ItemId): string {
  return LETTERS[itemNote(id).letter];
}

const t = (...notes: string[]) => notes.map((n) => `treble:${n}`);
const b = (...notes: string[]) => notes.map((n) => `bass:${n}`);

// Builds a unit where each lesson adds `adds[i]` to everything learned so far, then a checkpoint.
function progressive(id: string, titles: string[], adds: ItemId[][], checkpointTitle: string) {
  const lessons: LessonDef[] = [];
  let pool: ItemId[] = [];
  adds.forEach((add, i) => {
    pool = [...pool, ...add];
    lessons.push({ id: `${id}-${i + 1}`, title: titles[i], pool, newNotes: add });
  });
  lessons.push({ id: `${id}-check`, title: checkpointTitle, pool, newNotes: [], checkpoint: true });
  return lessons;
}

// Notes on the staff (no ledger lines) that interval lessons draw from.
export const STAFF_NOTES: Record<Clef, ItemId[]> = {
  treble: t('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5'),
  bass: b('F2', 'G2', 'A2', 'B2', 'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4'),
};

function intervalLesson(id: string, title: string, sizes: number[], newSizes: number[], clefs: Clef[]): LessonDef {
  return { id, title, pool: clefs.flatMap((c) => STAFF_NOTES[c]), newNotes: [], intervals: { sizes, newSizes, clefs } };
}

export const UNITS: UnitDef[] = [
  {
    id: 'treble',
    title: 'Treble Landmarks',
    subtitle: 'Right-hand notes, found from Middle C, G and C',
    color: '#f5a524',
    lessons: progressive(
      'treble',
      ['Middle C & the G line', 'Treble C', 'Next-door notes', 'Around the G line', 'Filling the gaps', 'Top of the staff'],
      [t('C4', 'G4'), t('C5'), t('D4', 'B4', 'D5'), t('F4', 'A4'), t('E4', 'E5'), t('F5', 'G5')],
      'Treble challenge',
    ),
  },
  {
    id: 'bass',
    title: 'Bass Landmarks',
    subtitle: 'Left-hand notes, found from Middle C, F and C',
    color: '#17c3b2',
    lessons: progressive(
      'bass',
      ['Middle C & the F line', 'Bass C', 'Next-door notes', 'Around bass C', 'Filling the gaps', 'Bottom of the staff'],
      [b('C4', 'F3'), b('C3'), b('B3', 'G3', 'E3'), b('D3', 'B2'), b('A3', 'A2'), b('G2', 'F2')],
      'Bass challenge',
    ),
  },
  {
    id: 'both',
    title: 'Both Hands',
    subtitle: 'Switch between treble and bass without slowing down',
    color: '#7c5cff',
    lessons: [
      { id: 'both-1', title: 'Landmark mix', pool: [...t('C4', 'G4', 'C5'), ...b('C4', 'F3', 'C3')], newNotes: [] },
      { id: 'both-2', title: 'Middle of the piano', pool: [...t('C4', 'D4', 'E4', 'F4', 'G4', 'A4')], newNotes: [] },
      { id: 'both-3', title: 'Middle, both clefs', pool: [...t('C4', 'D4', 'E4', 'F4', 'G4'), ...b('C4', 'B3', 'A3', 'G3', 'F3')], newNotes: [] },
      { id: 'both-4', title: 'The whole range', pool: [...t('C4', 'E4', 'G4', 'B4', 'D5', 'F5'), ...b('F2', 'A2', 'C3', 'E3', 'G3', 'B3')], newNotes: [] },
      {
        id: 'both-check',
        title: 'Grand staff challenge',
        pool: [...t('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5'), ...b('F2', 'G2', 'A2', 'B2', 'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4')],
        newNotes: [],
        checkpoint: true,
      },
    ],
  },
  {
    id: 'ledger',
    title: 'Ledger Lines',
    subtitle: 'Notes above and below the staff',
    color: '#ff5d8f',
    lessons: progressive(
      'ledger',
      ['High treble', 'Low treble', 'High bass', 'Low bass'],
      [t('A5', 'B5', 'C6'), t('A3', 'B3'), b('D4', 'E4'), b('E2', 'D2')],
      'Ledger line challenge',
    ),
  },
  {
    id: 'intervals',
    title: 'Steps, Skips & Leaps',
    subtitle: 'Read the jump from one note to the next',
    color: '#3d8bff',
    lessons: [
      intervalLesson('intervals-1', 'Steps', [1, 2], [1, 2], ['treble']),
      intervalLesson('intervals-2', 'Skips', [2, 3], [3], ['treble']),
      intervalLesson('intervals-3', 'Steps & skips in bass', [2, 3], [], ['bass']),
      intervalLesson('intervals-4', 'Leaps: 4ths & 5ths', [2, 3, 4, 5], [4, 5], ['treble']),
      intervalLesson('intervals-5', 'Leaps in bass', [3, 4, 5], [], ['bass']),
      intervalLesson('intervals-6', 'Octave jumps', [3, 5, 8], [8], ['treble', 'bass']),
      { ...intervalLesson('intervals-check', 'Shape challenge', [2, 3, 4, 5, 8], [], ['treble', 'bass']), checkpoint: true },
    ],
  },
  { id: 'triads', title: 'Chords', subtitle: 'Play three notes at once', color: '#8a8aa3', lessons: [], comingSoon: true },
];

// Landmarks get hand-written tips; every other note is described relative to the nearest landmark.
const LANDMARK_TIPS: Record<ItemId, string> = {
  'treble:C4': 'Middle C sits on its own little line just below the treble staff. It lives right in the middle of the piano.',
  'treble:G4': 'The treble clef is really a fancy G. Its curl wraps around the 2nd line up, and that line is G.',
  'treble:C5': 'Treble C lives in the 3rd space, right in the middle of the staff. It is the C just above middle C.',
  'bass:C4': 'In the bass clef, middle C sits on its own little line just above the staff.',
  'bass:F3': 'The bass clef is really a fancy F. Its two dots hug the 4th line up, and that line is F.',
  'bass:C3': 'Bass C lives in the 2nd space. It is the C just below middle C.',
};

// Ledger-line notes are easier to learn by counting lines than by stepping from a landmark.
const LEDGER_TIPS: Record<ItemId, string> = {
  'treble:A5': 'A sits on the first little ledger line above the treble staff.',
  'treble:B5': 'B sits just above the first ledger line over the treble staff.',
  'treble:C6': 'High C sits on the second ledger line above the treble staff: two octaves above middle C.',
  'treble:B3': 'B hangs just below middle C\'s ledger line in the treble clef.',
  'treble:A3': 'A sits on the second ledger line below the treble staff, one below middle C\'s line.',
  'bass:D4': 'D sits just above middle C\'s ledger line in the bass clef.',
  'bass:E4': 'E sits on the second ledger line above the bass staff.',
  'bass:E2': 'Low E sits on the first ledger line below the bass staff.',
  'bass:D2': 'Low D hangs just below the first ledger line under the bass staff.',
};

const LANDMARK_NAMES: Record<ItemId, string> = {
  'treble:C4': 'middle C',
  'bass:C4': 'middle C',
  'treble:G4': 'the G line',
  'treble:C5': 'treble C',
  'bass:F3': 'the F line',
  'bass:C3': 'bass C',
};

const LANDMARKS = Object.keys(LANDMARK_TIPS);
const STEP_WORDS: Record<number, string> = { 1: 'one step', 2: 'a skip (two steps)', 3: 'three steps', 4: 'four steps', 7: 'an octave' };

function staffPosition(n: Note): number {
  return n.octave * 7 + n.letter;
}

function isLine(id: ItemId): boolean {
  // Bottom line of treble is E4, of bass is G2; lines are an even number of positions above them.
  const bottom = itemClef(id) === 'treble' ? staffPosition(parseNote('E4')) : staffPosition(parseNote('G2'));
  return (staffPosition(itemNote(id)) - bottom) % 2 === 0;
}

export function noteTip(id: ItemId): string {
  if (LANDMARK_TIPS[id]) return LANDMARK_TIPS[id];
  if (LEDGER_TIPS[id]) return LEDGER_TIPS[id];
  const pos = staffPosition(itemNote(id));
  const clef = itemClef(id);
  let best: { id: ItemId; dist: number } | null = null;
  for (const lm of LANDMARKS) {
    if (itemClef(lm) !== clef) continue;
    const dist = pos - staffPosition(itemNote(lm));
    if (!best || Math.abs(dist) < Math.abs(best.dist)) best = { id: lm, dist };
  }
  const letter = itemLetter(id);
  const where = isLine(id) ? 'on a line' : 'in a space';
  if (!best || best.dist === 0) return `This is ${letter}, ${where}.`;
  const lmName = LANDMARK_NAMES[best.id];
  const steps = STEP_WORDS[Math.abs(best.dist)] ?? `${Math.abs(best.dist)} steps`;
  return `This is ${letter}, ${where}. It is ${steps} ${best.dist > 0 ? 'above' : 'below'} ${lmName}.`;
}

export function findLesson(lessonId: string): { unit: UnitDef; lesson: LessonDef; index: number } {
  for (const unit of UNITS) {
    const index = unit.lessons.findIndex((l) => l.id === lessonId);
    if (index >= 0) return { unit, lesson: unit.lessons[index], index };
  }
  throw new Error(`unknown lesson ${lessonId}`);
}

// The Daily Review isn't part of the course path; it is built fresh from learned notes (see review.ts).
export const REVIEW_ID = 'review';

// Lessons in play order, used to work out which one is unlocked next.
export const LESSON_ORDER: string[] = UNITS.flatMap((u) => u.lessons.map((l) => l.id));
