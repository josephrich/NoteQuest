// Note spelling, MIDI conversion and random target generation.

export type Clef = 'treble' | 'bass';
export type Acc = -1 | 0 | 1;

// A spelled note: letter index 0-6 (C..B), accidental, scientific octave. `natural`: a plain note
// written with a natural sign (♮), cancelling an earlier sharp or flat.
export interface Note {
  letter: number;
  octave: number;
  acc: Acc;
  natural?: boolean;
}

export interface Target {
  clef: Clef;
  key?: KeyName;
  notes: Note[];
  midis: number[];
  label: string;
}

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function note(letter: number, octave: number, acc: Acc = 0): Note {
  return { letter, octave, acc };
}

// Parse "C4", "F#3", "Bb4", or "Fn4" for F written with a natural sign.
export function parseNote(s: string): Note {
  const m = /^([A-G])([#bn]?)(-?\d)$/.exec(s);
  if (!m) throw new Error(`bad note ${s}`);
  const acc: Acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  const n = note(LETTERS.indexOf(m[1] as (typeof LETTERS)[number]), Number(m[3]), acc);
  return m[2] === 'n' ? { ...n, natural: true } : n;
}

// "F♯", "B♭" or "F": a note's name without its octave.
export function noteName(n: Note): string {
  return LETTERS[n.letter] + (n.acc === 1 ? '♯' : n.acc === -1 ? '♭' : '');
}

export function toMidi(n: Note): number {
  return 12 * (n.octave + 1) + LETTER_PC[n.letter] + n.acc;
}

export function spell(n: Note): string {
  return LETTERS[n.letter] + (n.acc === 1 ? '#' : n.acc === -1 ? 'b' : '') + n.octave;
}

export function vexKey(n: Note): string {
  return LETTERS[n.letter].toLowerCase() + (n.acc === 1 ? '#' : n.acc === -1 ? 'b' : '') + '/' + n.octave;
}

export function midiName(midi: number): string {
  return SHARP_NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
}

export function midiToFreq(midi: number, refA4 = 440): number {
  return refA4 * 2 ** ((midi - 69) / 12);
}

export function freqToMidiFloat(freq: number, refA4 = 440): number {
  return 69 + 12 * Math.log2(freq / refA4);
}

// Accidentals implied by each key signature, keyed by letter index.
export const KEYS = {
  C: { tonic: 0, acc: {} },
  G: { tonic: 4, acc: { 3: 1 } },
  D: { tonic: 1, acc: { 3: 1, 0: 1 } },
  A: { tonic: 5, acc: { 3: 1, 0: 1, 4: 1 } },
  F: { tonic: 3, acc: { 6: -1 } },
  Bb: { tonic: 6, acc: { 6: -1, 2: -1 } },
  Eb: { tonic: 2, acc: { 6: -1, 2: -1, 5: -1 } },
} satisfies Record<string, { tonic: number; acc: Partial<Record<number, Acc>> }>;
export type KeyName = keyof typeof KEYS;

// Note ranges by clef, as [lowest, highest] spelled naturals.
export const RANGES: Record<Clef, [Note, Note]> = {
  treble: [note(0, 4), note(4, 5)], // C4..G5
  bass: [note(3, 2), note(0, 4)], // F2..C4
};

function naturalsBetween(lo: Note, hi: Note): Note[] {
  const out: Note[] = [];
  for (let oct = lo.octave; oct <= hi.octave; oct++) {
    for (let l = 0; l < 7; l++) {
      const n = note(l, oct);
      const m = toMidi(n);
      if (m >= toMidi(lo) && m <= toMidi(hi)) out.push(n);
    }
  }
  return out;
}

type Rnd = () => number;
const pick = <T>(arr: readonly T[], rnd: Rnd): T => arr[Math.floor(rnd() * arr.length)];

// Random single-note target.
export function randomNote({
  clefs = ['treble'] as Clef[],
  accidentals = false,
  avoidMidi = null as number | null,
  rnd = Math.random as Rnd,
} = {}): Target {
  for (let tries = 0; tries < 50; tries++) {
    const clef = pick(clefs, rnd);
    const [lo, hi] = RANGES[clef];
    const n = { ...pick(naturalsBetween(lo, hi), rnd) };
    if (accidentals && rnd() < 0.35) {
      const acc: Acc = rnd() < 0.5 ? 1 : -1;
      const letterName = LETTERS[n.letter];
      const invalid = acc === 1 ? letterName === 'E' || letterName === 'B' : letterName === 'C' || letterName === 'F';
      if (!invalid) n.acc = acc;
    }
    if (toMidi(n) !== avoidMidi) return { clef, notes: [n], midis: [toMidi(n)], label: spell(n) };
  }
  throw new Error('could not pick a note');
}

const ROMAN: Record<number, string> = { 0: 'I', 3: 'IV', 4: 'V' };
const INVERSION_NAMES = ['root position', '1st inversion', '2nd inversion'];

// Random primary triad (I, IV or V) in one of the given keys.
export function randomTriad({
  keys = ['C', 'G', 'F'] as KeyName[],
  clefs = ['treble'] as Clef[],
  inversions = false,
  avoidLabel = null as string | null,
  rnd = Math.random as Rnd,
} = {}): Target {
  for (let tries = 0; tries < 50; tries++) {
    const keyName = pick(keys, rnd);
    const key = KEYS[keyName];
    const keyAcc = key.acc as Partial<Record<number, Acc>>;
    const degree = pick([0, 3, 4], rnd);
    const clef = pick(clefs, rnd);
    const inversion = inversions ? Math.floor(rnd() * 3) : 0;
    const rootLetter = (key.tonic + degree) % 7;
    const octave = clef === 'treble' ? 4 : 3;
    const notes: Note[] = [];
    for (let i = 0; i < 3; i++) {
      const letterIdx = rootLetter + 2 * i;
      const n = note(letterIdx % 7, octave + Math.floor(letterIdx / 7));
      n.acc = keyAcc[n.letter] ?? 0;
      notes.push(n);
    }
    // Invert by moving the lowest note to the top, then re-voice so each note sits above the previous one.
    for (let i = 0; i < inversion; i++) notes.push(notes.shift()!);
    for (let i = 1; i < 3; i++) {
      while (toMidi(notes[i]) <= toMidi(notes[i - 1])) notes[i].octave++;
    }
    // Keep bass-clef chords from floating above middle C and treble chords from going too high.
    const top = toMidi(notes[2]);
    if (clef === 'bass' && top > 64) notes.forEach((n) => n.octave--);
    if (clef === 'treble' && top > 81) notes.forEach((n) => n.octave--);
    const label = `${keyName} major ${ROMAN[degree]} (${notes.map(spell).join('-')}, ${INVERSION_NAMES[inversion]})`;
    if (label === avoidLabel) continue;
    return { clef, key: keyName, notes, midis: notes.map(toMidi), label };
  }
  throw new Error('could not pick a triad');
}
