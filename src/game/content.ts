// The course: units of lessons, each introducing a few notes around "landmark" notes.
// An item id is `<clef>:<note>`, e.g. "treble:G4", because the same pitch looks different in each clef.
import { LETTERS, noteName, parseNote, toMidi, type Clef, type Note } from '../engine/music';
import { GUIDES } from './guides';

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
  // A mini-lesson that explains a concept (see guides.ts) instead of a practice lesson.
  guide?: string;
  // Chord lessons: read and play three-note chords.
  chords?: ChordSpec;
  // Major or minor 3rd? Read (and play) 3rds and tell them apart by size.
  thirds?: ThirdsSpec;
}

// A chord, by its root (bottom note) and quality: "treble:D4:minor" is D F A, "treble:D4:major" is
// D F♯ A.
export type ChordRef = string;

export interface ChordSpec {
  // The chords in play. The lesson's pool is their roots.
  roots: ChordRef[];
  // Chords introduced here (they get a "meet" card first).
  newRoots: ChordRef[];
}

export interface ThirdsSpec {
  // The 3rds in play, as [lower, upper] notes.
  pairs: [ItemId, ItemId][];
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
  1: 'Same place, same note. Play the key again.',
  2: 'Line to the next space: a step. The next white key.',
  3: 'Line to the next line: a skip. Jump over one white key.',
  4: 'Line to space, two notes in between: a 4th.',
  5: 'Line to line, over one line: a 5th. Thumb to little finger!',
  8: 'The same letter, 8 notes away: an octave. Stretch!',
};

export function intervalExample(size: number, clef: Clef): [ItemId, ItemId] {
  const start = clef === 'treble' ? (size === 8 || size === 5 ? 'C4' : size === 4 ? 'G4' : 'E4') : size === 8 ? 'C3' : size === 5 ? 'F2' : 'G2';
  const a = `${clef}:${start}`;
  return [a, shiftItem(a, size - 1)];
}

// Chords (triads): a root with a 3rd and a 5th stacked on it, all on lines or all in spaces. What
// makes a chord major or minor is its 3rd: a major 3rd (4 semitones) sounds bright, a minor 3rd (3
// semitones) sounds darker. The 5th is 7 semitones above the root either way.
// Chord stats are kept as "chord:treble:D4:minor".
export const chordItem = (ref: ChordRef): ItemId => `chord:${ref}`;
export const isChordItem = (id: ItemId): boolean => id.startsWith('chord:') && id.split(':').length === 4;
export const chordRef = (id: ItemId): ChordRef => id.slice('chord:'.length);
export const chordRoot = (ref: ChordRef): ItemId => ref.split(':').slice(0, 2).join(':');
export const chordQuality = (ref: ChordRef): 'major' | 'minor' => (ref.endsWith(':minor') ? 'minor' : 'major');

const SEMITONES = { third: { major: 4, minor: 3 }, fifth: 7 } as const;

// The note `letters` letter names above `root`, spelled with whatever sharp or flat puts it exactly
// `semitones` above.
function spelledAbove(root: ItemId, letters: number, semitones: number): ItemId {
  const plain = shiftItem(root, letters);
  const acc = itemMidi(root) + semitones - itemMidi(plain);
  const n = itemNote(plain);
  return `${itemClef(root)}:${LETTERS[n.letter]}${acc === 1 ? '#' : acc === -1 ? 'b' : ''}${n.octave}`;
}

export function triad(ref: ChordRef): ItemId[] {
  const root = chordRoot(ref);
  return [root, spelledAbove(root, 2, SEMITONES.third[chordQuality(ref)]), spelledAbove(root, 4, SEMITONES.fifth)];
}

export const chordRefOf = (root: ItemId, quality: 'major' | 'minor'): ChordRef => `${root}:${quality}`;

// "D minor".
export function chordName(ref: ChordRef): string {
  return `${itemName(chordRoot(ref))} ${chordQuality(ref)}`;
}

export function chordTip(ref: ChordRef): string {
  const [r, t] = triad(ref);
  const [a, b, c] = triad(ref).map(itemName);
  const q = chordQuality(ref);
  const fingers = itemClef(r) === 'bass' ? 'Left hand: fingers 5, 3 and 1.' : 'Fingers 1, 3 and 5.';
  return `${chordName(ref)} is ${a}, ${b} and ${c}. ${a} to ${itemName(t)} is a ${q} 3rd: ${SEMITONES.third[q]} semitones. ${fingers}`;
}

// 3rds: "Major 3rd" or "Minor 3rd", from how many semitones apart the notes are.
export const thirdQuality = (lower: ItemId, upper: ItemId): 'major' | 'minor' => (itemMidi(upper) - itemMidi(lower) === 4 ? 'major' : 'minor');
export const thirdLabel = (q: 'major' | 'minor'): string => (q === 'major' ? 'Major 3rd' : 'Minor 3rd');
export const thirdItem = (q: 'major' | 'minor'): ItemId => `third:${q}`;

export function itemClef(id: ItemId): Clef {
  return id.split(':')[0] as Clef;
}

export function itemNote(id: ItemId): Note {
  return parseNote(id.split(':')[1]);
}

export function itemMidi(id: ItemId): number {
  return toMidi(itemNote(id));
}

// "F♯", "B♭", or plain "F" (also for a note written with a natural sign).
export function itemName(id: ItemId): string {
  return noteName(itemNote(id));
}

// The note's pitch without any natural sign, for keeping its stats: F♮ is just F.
export const plainItem = (id: ItemId): ItemId => id.replace(/([A-G])n(-?\d)$/, '$1$2');

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

function chordLesson(id: string, title: string, roots: ChordRef[], newRoots: ChordRef[]): LessonDef {
  return { id, title, pool: [...new Set(roots.map(chordRoot))], newNotes: [], chords: { roots, newRoots } };
}

function thirdsLesson(id: string, title: string, pairs: [ItemId, ItemId][]): LessonDef {
  return { id, title, pool: [...new Set(pairs.flat())], newNotes: [], thirds: { pairs } };
}

const maj = (...roots: ItemId[]) => roots.map((r) => chordRefOf(r, 'major'));
const min = (...roots: ItemId[]) => roots.map((r) => chordRefOf(r, 'minor'));
const pair = (clef: 'treble' | 'bass', a: string, b: string): [ItemId, ItemId] => [`${clef}:${a}`, `${clef}:${b}`];

function guideLesson(guideId: string): LessonDef {
  return { id: `guide-${guideId}`, title: GUIDES[guideId].title, pool: [], newNotes: [], guide: guideId };
}

// Puts each guide just before the lesson that needs it. `first` adds a second guide before that one.
function withGuides(lessons: LessonDef[], before: Record<string, string>, first: Record<string, string> = {}): LessonDef[] {
  return lessons.flatMap((l) => [...(first[l.id] ? [guideLesson(first[l.id])] : []), ...(before[l.id] ? [guideLesson(before[l.id])] : []), l]);
}

export const isGuide = (lesson: LessonDef): boolean => lesson.guide !== undefined;

export const UNITS: UnitDef[] = [
  {
    id: 'treble',
    title: 'Treble Landmarks',
    subtitle: 'Right-hand notes, found from Middle C, G and C',
    color: '#f5a524',
    lessons: withGuides(
      progressive(
        'treble',
        ['Middle C & the G line', 'Treble C', 'Next-door notes', 'Around the G line', 'Filling the gaps', 'Top of the staff'],
        [t('C4', 'G4'), t('C5'), t('D4', 'B4', 'D5'), t('F4', 'A4'), t('E4', 'E5'), t('F5', 'G5')],
        'Treble challenge',
      ),
      { 'treble-1': 'staff', 'treble-3': 'steps', 'treble-5': 'face' },
    ),
  },
  {
    id: 'bass',
    title: 'Bass Landmarks',
    subtitle: 'Left-hand notes, found from Middle C, F and C',
    color: '#17c3b2',
    lessons: withGuides(
      progressive(
        'bass',
        ['Middle C & the F line', 'Bass C', 'Next-door notes', 'Around bass C', 'Filling the gaps', 'Bottom of the staff'],
        [b('C4', 'F3'), b('C3'), b('B3', 'G3', 'E3'), b('D3', 'B2'), b('A3', 'A2'), b('G2', 'F2')],
        'Bass challenge',
      ),
      { 'bass-1': 'bass', 'bass-5': 'bass-spaces' },
    ),
  },
  {
    id: 'both',
    title: 'Both Hands',
    subtitle: 'Switch between treble and bass without slowing down',
    color: '#7c5cff',
    lessons: [
      guideLesson('grand'),
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
    lessons: [
      guideLesson('ledger'),
      ...progressive(
        'ledger',
        ['High treble', 'Low treble', 'High bass', 'Low bass'],
        [t('A5', 'B5', 'C6'), t('A3', 'B3'), b('D4', 'E4'), b('E2', 'D2')],
        'Ledger line challenge',
      ),
    ],
  },
  {
    id: 'intervals',
    title: 'Steps, Skips & Leaps',
    subtitle: 'Read the jump from one note to the next',
    color: '#3d8bff',
    lessons: withGuides([
      intervalLesson('intervals-1', 'Steps', [1, 2], [1, 2], ['treble']),
      intervalLesson('intervals-2', 'Skips', [2, 3], [3], ['treble']),
      intervalLesson('intervals-3', 'Steps & skips in bass', [2, 3], [], ['bass']),
      intervalLesson('intervals-4', 'Leaps: 4ths & 5ths', [2, 3, 4, 5], [4, 5], ['treble']),
      intervalLesson('intervals-5', 'Leaps in bass', [3, 4, 5], [], ['bass']),
      intervalLesson('intervals-6', 'Octave jumps', [3, 5, 8], [8], ['treble', 'bass']),
      { ...intervalLesson('intervals-check', 'Shape challenge', [2, 3, 4, 5, 8], [], ['treble', 'bass']), checkpoint: true },
    ], { 'intervals-1': 'intervals', 'intervals-2': 'skips', 'intervals-4': 'leaps', 'intervals-6': 'octaves' }),
  },
  {
    id: 'accidentals',
    title: 'Sharps, Flats & Naturals',
    subtitle: 'Semitones, and the black keys',
    color: '#20a4a8',
    lessons: withGuides(
      [
        { id: 'acc-1', title: 'Sharps: F♯ & C♯', pool: t('F4', 'F#4', 'C5', 'C#5', 'G4', 'D5'), newNotes: t('F#4', 'C#5') },
        { id: 'acc-2', title: 'More sharps: G♯ & D♯', pool: t('G4', 'G#4', 'D5', 'D#5', 'F#4', 'C#5'), newNotes: t('G#4', 'D#5') },
        { id: 'acc-3', title: 'Flats: B♭ & E♭', pool: t('B4', 'Bb4', 'E5', 'Eb5', 'F#4', 'C#5'), newNotes: t('Bb4', 'Eb5') },
        { id: 'acc-4', title: 'More flats: A♭ & D♭', pool: t('A4', 'Ab4', 'D5', 'Db5', 'Bb4', 'Eb5'), newNotes: t('Ab4', 'Db5') },
        { id: 'acc-5', title: 'Naturals', pool: t('F#4', 'Fn4', 'Bb4', 'Bn4', 'C#5', 'Cn5', 'Eb5', 'En5'), newNotes: [] },
        {
          id: 'acc-6',
          title: 'Sharps & flats together',
          pool: t('F#4', 'C#5', 'G#4', 'D#5', 'Bb4', 'Eb5', 'Ab4', 'Db5', 'F4', 'C5', 'G4', 'B4'),
          newNotes: [],
        },
        { id: 'acc-7', title: 'Sharps & flats in bass', pool: b('F3', 'F#3', 'C3', 'C#3', 'B2', 'Bb2', 'E3', 'Eb3'), newNotes: b('F#3', 'C#3', 'Bb2', 'Eb3') },
        {
          id: 'acc-check',
          title: 'Sharps & flats challenge',
          pool: [...t('F#4', 'C#5', 'G#4', 'Bb4', 'Eb5', 'Ab4', 'Fn4', 'Bn4', 'G4', 'D5'), ...b('F#3', 'C#3', 'Bb2', 'Eb3', 'C3', 'E3')],
          newNotes: [],
          checkpoint: true,
        },
      ],
      { 'acc-1': 'sharps', 'acc-3': 'flats', 'acc-5': 'naturals' },
      { 'acc-1': 'semitones' },
    ),
  },
  {
    id: 'chords',
    title: 'Chords',
    subtitle: 'Major and minor chords, and what makes them sound that way',
    color: '#e0559a',
    lessons: withGuides(
      [
        chordLesson('chords-1', 'C, F & G major', maj(...t('C4', 'F4', 'G4')), maj(...t('C4', 'F4', 'G4'))),
        thirdsLesson('chords-2', 'Major or minor 3rd?', [
          pair('treble', 'C4', 'E4'),
          pair('treble', 'D4', 'F4'),
          pair('treble', 'E4', 'G4'),
          pair('treble', 'F4', 'A4'),
          pair('treble', 'G4', 'B4'),
          pair('treble', 'A4', 'C5'),
          pair('treble', 'B4', 'D5'),
          pair('treble', 'D4', 'F#4'),
          pair('treble', 'A4', 'C#5'),
        ]),
        chordLesson('chords-3', 'A, D & E minor', [...maj(...t('C4', 'F4', 'G4')), ...min(...t('A4', 'D4', 'E4'))], min(...t('A4', 'D4', 'E4'))),
        chordLesson('chords-4', 'D, A & E major', [...min(...t('A4', 'D4', 'E4')), ...maj(...t('D4', 'A4', 'E4'))], maj(...t('D4', 'A4', 'E4'))),
        chordLesson('chords-5', 'Left-hand major chords', maj(...b('C3', 'F2', 'G2')), maj(...b('C3', 'F2', 'G2'))),
        chordLesson('chords-6', 'Left-hand minor chords', [...maj(...b('C3', 'F2', 'G2')), ...min(...b('A2', 'D3', 'E3'))], min(...b('A2', 'D3', 'E3'))),
        chordLesson('chords-7', 'Major or minor?', [...maj(...t('C4', 'F4', 'G4', 'D4', 'A4')), ...min(...t('A4', 'D4', 'E4')), ...maj(...b('C3', 'F2', 'G2')), ...min(...b('A2', 'D3', 'E3'))], []),
        {
          ...chordLesson(
            'chords-check',
            'Chord challenge',
            [...maj(...t('C4', 'F4', 'G4', 'D4', 'A4', 'E4')), ...min(...t('A4', 'D4', 'E4')), ...maj(...b('C3', 'F2', 'G2')), ...min(...b('A2', 'D3', 'E3'))],
            [],
          ),
          checkpoint: true,
        },
      ],
      { 'chords-1': 'chords', 'chords-2': 'thirds', 'chords-3': 'major-minor', 'chords-4': 'make-major', 'chords-5': 'left-chords' },
    ),
  },
];

// Landmarks get hand-written tips; every other note is described relative to the nearest landmark.
const LANDMARK_TIPS: Record<ItemId, string> = {
  'treble:C4': 'Middle C sits on a little line below the staff, in the middle of the piano.',
  'treble:G4': 'The treble clef curls around the G line: the 2nd line up.',
  'treble:C5': 'Treble C is in the 3rd space, right in the middle of the staff.',
  'bass:C4': 'In the bass clef, middle C sits on a little line above the staff.',
  'bass:F3': 'The bass clef dots hug the F line: the 4th line up.',
  'bass:C3': 'Bass C is in the 2nd space, just below middle C.',
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
  const n = itemNote(id);
  const letter = LETTERS[n.letter];
  if (n.acc === 1) return `This is ${letter} sharp: ${letter} raised a semitone, to the key just right of ${letter}.`;
  if (n.acc === -1) return `This is ${letter} flat: ${letter} lowered a semitone, to the key just left of ${letter}.`;
  if (n.natural) return `The natural sign cancels a sharp or flat. This is plain ${letter}, a white key.`;
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

// Where a lesson sits, for a small "Unit 6 · Lesson 3 of 8" label. Mini-lessons aren't numbered.
export function lessonPosition(lessonId: string): string {
  const { unit, lesson } = findLesson(lessonId);
  const u = UNITS.indexOf(unit) + 1;
  if (lesson.guide) return `Unit ${u} · Mini-lesson`;
  const practice = unit.lessons.filter((l) => !l.guide);
  return `Unit ${u} · Lesson ${practice.indexOf(lesson) + 1} of ${practice.length}`;
}

// The Daily Review isn't part of the course path; it is built fresh from learned notes (see review.ts).
export const REVIEW_ID = 'review';

// Lessons in play order, used to work out which one is unlocked next.
export const LESSON_ORDER: string[] = UNITS.flatMap((u) => u.lessons.map((l) => l.id));
