// Note spelling, MIDI conversion and random target generation.

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// A spelled note: letter index 0-6 (C..B), accidental -1/0/+1, scientific octave.
export function note(letter, octave, acc = 0) {
  return { letter, octave, acc };
}

export function toMidi(n) {
  return 12 * (n.octave + 1) + LETTER_PC[n.letter] + n.acc;
}

export function spell(n) {
  return LETTERS[n.letter] + (n.acc === 1 ? '#' : n.acc === -1 ? 'b' : '') + n.octave;
}

export function vexKey(n) {
  return LETTERS[n.letter].toLowerCase() + (n.acc === 1 ? '#' : n.acc === -1 ? 'b' : '') + '/' + n.octave;
}

export function midiName(midi) {
  return SHARP_NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
}

export function midiToFreq(midi, refA4 = 440) {
  return refA4 * 2 ** ((midi - 69) / 12);
}

export function freqToMidiFloat(freq, refA4 = 440) {
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
};

// VexFlow key-signature names.
export const VEX_KEY_SIG = { C: 'C', G: 'G', D: 'D', A: 'A', F: 'F', Bb: 'Bb', Eb: 'Eb' };

// Note ranges by clef, as [lowest, highest] spelled naturals.
export const RANGES = {
  treble: [note(0, 4), note(4, 5)], // C4..G5
  bass: [note(3, 2), note(0, 4)], // F2..C4
};

function naturalsBetween(lo, hi) {
  const out = [];
  for (let oct = lo.octave; oct <= hi.octave; oct++) {
    for (let l = 0; l < 7; l++) {
      const n = note(l, oct);
      const m = toMidi(n);
      if (m >= toMidi(lo) && m <= toMidi(hi)) out.push(n);
    }
  }
  return out;
}

const pick = (arr, rnd) => arr[Math.floor(rnd() * arr.length)];

// Random single-note target. `clefs` is a list like ['treble'] or ['treble', 'bass'].
export function randomNote({ clefs = ['treble'], accidentals = false, avoidMidi = null, rnd = Math.random } = {}) {
  for (let tries = 0; tries < 50; tries++) {
    const clef = pick(clefs, rnd);
    const [lo, hi] = RANGES[clef];
    const n = { ...pick(naturalsBetween(lo, hi), rnd) };
    if (accidentals && rnd() < 0.35) {
      const acc = rnd() < 0.5 ? 1 : -1;
      const letterName = LETTERS[n.letter];
      const invalid = acc === 1 ? letterName === 'E' || letterName === 'B' : letterName === 'C' || letterName === 'F';
      if (!invalid) n.acc = acc;
    }
    if (toMidi(n) !== avoidMidi) return { clef, notes: [n], midis: [toMidi(n)], label: spell(n) };
  }
  throw new Error('could not pick a note');
}

const ROMAN = { 0: 'I', 3: 'IV', 4: 'V' };
const INVERSION_NAMES = ['root position', '1st inversion', '2nd inversion'];

// Random primary triad (I, IV or V) in one of the given keys.
export function randomTriad({ keys = ['C', 'G', 'F'], clefs = ['treble'], inversions = false, avoidLabel = null, rnd = Math.random } = {}) {
  for (let tries = 0; tries < 50; tries++) {
    const keyName = pick(keys, rnd);
    const key = KEYS[keyName];
    const degree = pick([0, 3, 4], rnd);
    const clef = pick(clefs, rnd);
    const inversion = inversions ? Math.floor(rnd() * 3) : 0;
    const rootLetter = (key.tonic + degree) % 7;
    const octave = clef === 'treble' ? 4 : 3;
    const notes = [];
    for (let i = 0; i < 3; i++) {
      const letterIdx = rootLetter + 2 * i;
      const n = note(letterIdx % 7, octave + Math.floor(letterIdx / 7));
      n.acc = key.acc[n.letter] ?? 0;
      notes.push(n);
    }
    // Invert by moving the lowest note to the top, then re-voice so each note sits above the previous one.
    for (let i = 0; i < inversion; i++) notes.push(notes.shift());
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
