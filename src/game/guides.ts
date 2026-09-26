// Mini-lessons ("guides") that explain a concept before it's practised: a few short cards, each with
// a picture on the staff and often the matching keys on a piano, sometimes a quick question or "now
// play it". Show more, say less: each card is one short sentence, and the pictures carry the rest.
// They sit on the path just before the lessons that need them.
import type { Clef } from '../engine/music';

// Each entry in `notes` is one note ("C4"), or a chord written as its notes with spaces ("C4 E4 G4").
export type Picture =
  | { clef: Clef; notes: string[]; labels?: (string | undefined)[]; highlight?: number[] }
  | { clef: 'grand'; treble: (string | null)[]; bass: (string | null)[]; labels?: (string | undefined)[]; highlight?: number[] };

// Piano keys to light up under the picture (spelled, e.g. "C4"), with optional labels under them.
export interface Keys {
  notes: string[];
  labels?: (string | undefined)[];
}

// `sound`: what a "Hear it" button plays, one entry after another. Each entry is a note ("C4") or
// notes played together ("C4 E4 G4").
export type GuideCard =
  | { kind: 'read'; text: string; picture?: Picture; keys?: Keys; sound?: string[] }
  | { kind: 'quiz'; text: string; picture?: Picture; keys?: Keys; sound?: string[]; options: string[]; answer: string; why: string }
  // Play these notes (spelled, e.g. "C4") in order on the piano. No keys shown: reading is the point.
  | { kind: 'play'; text: string; picture: Picture; play: string[] };

export interface Guide {
  id: string;
  title: string;
  cards: GuideCard[];
}

const LETTER_OPTIONS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const letters = (...ls: string[]) => LETTER_OPTIONS.filter((l) => ls.includes(l));

export const GUIDES: Record<string, Guide> = {
  staff: {
    id: 'staff',
    title: 'Meet the staff',
    cards: [
      {
        kind: 'read',
        text: 'Music is written on a staff: 5 lines, counted from the bottom.',
        picture: { clef: 'treble', notes: ['E4', 'G4', 'B4', 'D5', 'F5'], labels: ['1', '2', '3', '4', '5'] },
      },
      {
        kind: 'read',
        text: 'A note sits ON a line, or IN a space.',
        picture: { clef: 'treble', notes: ['E4', 'F4'], labels: ['line', 'space'] },
      },
      {
        kind: 'quiz',
        text: 'Line or space?',
        picture: { clef: 'treble', notes: ['G4'] },
        options: ['Line', 'Space'],
        answer: 'Line',
        why: 'The line goes through the middle of the note.',
      },
      {
        kind: 'quiz',
        text: 'Line or space?',
        picture: { clef: 'treble', notes: ['A4'] },
        options: ['Line', 'Space'],
        answer: 'Space',
        why: 'It sits in the gap between two lines.',
      },
      {
        kind: 'read',
        text: 'Higher on the staff means further right on the piano.',
        picture: { clef: 'treble', notes: ['C4', 'D4', 'E4', 'F4', 'G4'] },
        keys: { notes: ['C4', 'D4', 'E4', 'F4', 'G4'] },
      },
      {
        kind: 'read',
        text: 'The treble clef curls around the G line.',
        picture: { clef: 'treble', notes: ['G4'], labels: ['G'], highlight: [0] },
        keys: { notes: ['G4'] },
      },
      {
        kind: 'read',
        text: 'Middle C sits on a little line below the staff, in the middle of the piano.',
        picture: { clef: 'treble', notes: ['C4'], labels: ['middle C'], highlight: [0] },
        keys: { notes: ['C4'], labels: ['middle C'] },
      },
      { kind: 'play', text: 'Now play middle C!', picture: { clef: 'treble', notes: ['C4'] }, play: ['C4'] },
    ],
  },

  steps: {
    id: 'steps',
    title: 'Counting from landmarks',
    cards: [
      {
        kind: 'read',
        text: 'Find a landmark you know, then count from it.',
        picture: { clef: 'treble', notes: ['C4', 'G4', 'C5'], labels: ['C', 'G', 'C'], highlight: [0, 1, 2] },
        keys: { notes: ['C4', 'G4', 'C5'] },
      },
      {
        kind: 'read',
        text: 'Line to the next space is one step: the very next white key.',
        picture: { clef: 'treble', notes: ['G4', 'A4'], labels: ['G', 'A'] },
        keys: { notes: ['G4', 'A4'] },
      },
      {
        kind: 'read',
        text: 'Music uses 7 letters, A to G. Then it starts again.',
        picture: { clef: 'treble', notes: ['E4', 'F4', 'G4', 'A4', 'B4'], labels: ['E', 'F', 'G', 'A', 'B'] },
        keys: { notes: ['E4', 'F4', 'G4', 'A4', 'B4'] },
      },
      {
        kind: 'quiz',
        text: 'One step up from G. What is it?',
        picture: { clef: 'treble', notes: ['G4', 'A4'], labels: ['G', '?'], highlight: [1] },
        options: letters('F', 'G', 'A', 'B'),
        answer: 'A',
        why: 'After G comes A.',
      },
      {
        kind: 'read',
        text: 'Going down, the letters go backwards.',
        picture: { clef: 'treble', notes: ['C5', 'B4', 'A4', 'G4'], labels: ['C', 'B', 'A', 'G'] },
        keys: { notes: ['C5', 'B4', 'A4', 'G4'] },
      },
      {
        kind: 'quiz',
        text: 'One step down from treble C. What is it?',
        picture: { clef: 'treble', notes: ['C5', 'B4'], labels: ['C', '?'], highlight: [1] },
        options: letters('A', 'B', 'C', 'D'),
        answer: 'B',
        why: 'Before C comes B.',
      },
      { kind: 'play', text: 'Play G, then step up.', picture: { clef: 'treble', notes: ['G4', 'A4'], labels: ['G', undefined] }, play: ['G4', 'A4'] },
    ],
  },

  face: {
    id: 'face',
    title: 'Lines and spaces',
    cards: [
      {
        kind: 'read',
        text: 'The spaces spell FACE, from the bottom up.',
        picture: { clef: 'treble', notes: ['F4', 'A4', 'C5', 'E5'], labels: ['F', 'A', 'C', 'E'] },
        keys: { notes: ['F4', 'A4', 'C5', 'E5'] },
      },
      {
        kind: 'read',
        text: 'The lines are E G B D F: Every Good Boy Deserves Fruit.',
        picture: { clef: 'treble', notes: ['E4', 'G4', 'B4', 'D5', 'F5'], labels: ['E', 'G', 'B', 'D', 'F'] },
        keys: { notes: ['E4', 'G4', 'B4', 'D5', 'F5'] },
      },
      {
        kind: 'quiz',
        text: 'Which space? Think F A C E.',
        picture: { clef: 'treble', notes: ['C5'] },
        options: ['F', 'A', 'C', 'E'],
        answer: 'C',
        why: 'F, A, C: the 3rd space is C.',
      },
      {
        kind: 'quiz',
        text: 'Which line? Every Good Boy Deserves Fruit.',
        picture: { clef: 'treble', notes: ['D5'] },
        options: letters('E', 'G', 'B', 'D', 'F'),
        answer: 'D',
        why: 'E, G, B, D: the 4th line is D.',
      },
      {
        kind: 'read',
        text: 'Rhymes help you check. Landmarks are faster!',
        picture: { clef: 'treble', notes: ['C4', 'G4', 'C5'], labels: ['C', 'G', 'C'], highlight: [0, 1, 2] },
      },
    ],
  },

  bass: {
    id: 'bass',
    title: 'The bass clef',
    cards: [
      {
        kind: 'read',
        text: 'The bass clef is for low notes: your left hand.',
        picture: { clef: 'bass', notes: ['C3', 'E3', 'G3'] },
        keys: { notes: ['C3', 'E3', 'G3'] },
      },
      {
        kind: 'read',
        text: 'Its two dots hug the F line.',
        picture: { clef: 'bass', notes: ['F3'], labels: ['F'], highlight: [0] },
        keys: { notes: ['F3'] },
      },
      {
        kind: 'read',
        text: 'Here, middle C sits just ABOVE the staff.',
        picture: { clef: 'bass', notes: ['C4'], labels: ['middle C'], highlight: [0] },
        keys: { notes: ['C4'], labels: ['middle C'] },
      },
      {
        kind: 'read',
        text: 'Bass lines are G B D F A: Good Boys Deserve Fruit Always.',
        picture: { clef: 'bass', notes: ['G2', 'B2', 'D3', 'F3', 'A3'], labels: ['G', 'B', 'D', 'F', 'A'] },
        keys: { notes: ['G2', 'B2', 'D3', 'F3', 'A3'] },
      },
      {
        kind: 'quiz',
        text: 'The note between the dots. What is it?',
        picture: { clef: 'bass', notes: ['F3'] },
        options: letters('D', 'E', 'F', 'G'),
        answer: 'F',
        why: 'The dots hug the F line.',
      },
      { kind: 'play', text: 'Play the F line note.', picture: { clef: 'bass', notes: ['F3'] }, play: ['F3'] },
    ],
  },

  'bass-spaces': {
    id: 'bass-spaces',
    title: 'Bass clef spaces',
    cards: [
      {
        kind: 'read',
        text: 'Bass spaces are A C E G: All Cows Eat Grass.',
        picture: { clef: 'bass', notes: ['A2', 'C3', 'E3', 'G3'], labels: ['A', 'C', 'E', 'G'] },
        keys: { notes: ['A2', 'C3', 'E3', 'G3'] },
      },
      {
        kind: 'read',
        text: 'Bass C is in the 2nd space, just below middle C.',
        picture: { clef: 'bass', notes: ['C3', 'C4'], labels: ['bass C', 'middle C'], highlight: [0] },
        keys: { notes: ['C3', 'C4'], labels: ['bass C', 'middle C'] },
      },
      {
        kind: 'quiz',
        text: 'The top space. What is it?',
        picture: { clef: 'bass', notes: ['G3'] },
        options: letters('E', 'F', 'G', 'A'),
        answer: 'G',
        why: 'All Cows Eat Grass: the top space is G.',
      },
      { kind: 'play', text: 'Play bass C.', picture: { clef: 'bass', notes: ['C3'] }, play: ['C3'] },
    ],
  },

  grand: {
    id: 'grand',
    title: 'The grand staff',
    cards: [
      {
        kind: 'read',
        text: 'Treble on top for your right hand. Bass below for your left.',
        picture: { clef: 'grand', treble: ['G4', null], bass: [null, 'F3'], labels: ['G', 'F'] },
        keys: { notes: ['F3', 'G4'], labels: ['left', 'right'] },
      },
      {
        kind: 'read',
        text: 'Both of these are middle C: the same key!',
        picture: { clef: 'grand', treble: ['C4', null], bass: [null, 'C4'], labels: ['middle C', 'middle C'], highlight: [0, 1] },
        keys: { notes: ['C4'], labels: ['middle C'] },
      },
      {
        kind: 'read',
        text: 'Check the clef first! Same spot, different note.',
        picture: { clef: 'grand', treble: ['G4', null], bass: [null, 'B2'], labels: ['G', 'B'] },
        keys: { notes: ['B2', 'G4'] },
      },
      {
        kind: 'quiz',
        text: 'Look at the clef! What is this note?',
        picture: { clef: 'bass', notes: ['B2'] },
        options: letters('G', 'A', 'B', 'C'),
        answer: 'B',
        why: 'In bass clef, the 2nd line is B.',
      },
    ],
  },

  ledger: {
    id: 'ledger',
    title: 'Ledger lines',
    cards: [
      {
        kind: 'read',
        text: 'Ledger lines are little extra lines, above or below the staff.',
        picture: { clef: 'treble', notes: ['A5', 'C6'], labels: ['1 line', '2 lines'] },
      },
      {
        kind: 'read',
        text: 'Middle C sits on one!',
        picture: { clef: 'treble', notes: ['C4'], labels: ['middle C'], highlight: [0] },
        keys: { notes: ['C4'], labels: ['middle C'] },
      },
      {
        kind: 'read',
        text: 'Above the staff, keep stepping up: G, A, B, C.',
        picture: { clef: 'treble', notes: ['G5', 'A5', 'B5', 'C6'], labels: ['G', 'A', 'B', 'C'] },
        keys: { notes: ['G5', 'A5', 'B5', 'C6'] },
      },
      {
        kind: 'quiz',
        text: 'Count the ledger lines. What is it?',
        picture: { clef: 'treble', notes: ['C6'] },
        options: letters('A', 'B', 'C', 'D'),
        answer: 'C',
        why: 'Two ledger lines up is high C.',
      },
      {
        kind: 'read',
        text: 'Below the staff, count down: C, B, A.',
        picture: { clef: 'treble', notes: ['C4', 'B3', 'A3'], labels: ['C', 'B', 'A'] },
        keys: { notes: ['C4', 'B3', 'A3'] },
      },
      { kind: 'play', text: 'Play high C!', picture: { clef: 'treble', notes: ['C6'] }, play: ['C6'] },
    ],
  },

  intervals: {
    id: 'intervals',
    title: 'Reading the jumps',
    cards: [
      {
        kind: 'read',
        text: "Don't name every note. Look at the jump!",
        picture: { clef: 'treble', notes: ['C4', 'D4', 'E4', 'D4'] },
      },
      {
        kind: 'read',
        text: 'Line to the next space is a STEP: the next white key.',
        picture: { clef: 'treble', notes: ['E4', 'F4'], labels: ['line', 'space'] },
        keys: { notes: ['E4', 'F4'] },
      },
      {
        kind: 'read',
        text: 'Same place means the SAME note. Play it again.',
        picture: { clef: 'treble', notes: ['G4', 'G4'], labels: ['G', 'G'] },
        keys: { notes: ['G4'] },
      },
      {
        kind: 'quiz',
        text: 'Up or down?',
        picture: { clef: 'treble', notes: ['A4', 'G4'] },
        options: ['Up', 'Down'],
        answer: 'Down',
        why: 'It is lower on the staff, so go left.',
      },
      { kind: 'play', text: 'Play C, then step up.', picture: { clef: 'treble', notes: ['C4', 'D4'], labels: ['C', undefined] }, play: ['C4', 'D4'] },
    ],
  },

  skips: {
    id: 'skips',
    title: 'Skips',
    cards: [
      {
        kind: 'read',
        text: 'Line to the next line is a SKIP. It jumps over a white key.',
        picture: { clef: 'treble', notes: ['E4', 'G4'], labels: ['line', 'line'] },
        keys: { notes: ['E4', 'G4'] },
      },
      {
        kind: 'read',
        text: 'Play a skip with fingers 1 and 3.',
        picture: { clef: 'treble', notes: ['C4', 'E4'] },
        keys: { notes: ['C4', 'E4'], labels: ['1', '3'] },
      },
      {
        kind: 'quiz',
        text: 'Step or skip?',
        picture: { clef: 'treble', notes: ['F4', 'A4'] },
        options: ['Step', 'Skip'],
        answer: 'Skip',
        why: 'Space to space is a skip.',
      },
      {
        kind: 'quiz',
        text: 'Step or skip?',
        picture: { clef: 'treble', notes: ['B4', 'C5'] },
        options: ['Step', 'Skip'],
        answer: 'Step',
        why: 'Line to the next space is a step.',
      },
      { kind: 'play', text: 'Play E, then skip up.', picture: { clef: 'treble', notes: ['E4', 'G4'], labels: ['E', undefined] }, play: ['E4', 'G4'] },
    ],
  },

  leaps: {
    id: 'leaps',
    title: 'Counting bigger jumps',
    cards: [
      {
        kind: 'read',
        text: 'Count every line and space. The first note is 1.',
        picture: { clef: 'treble', notes: ['C4', 'D4', 'E4', 'F4'], labels: ['1', '2', '3', '4'], highlight: [0, 3] },
        keys: { notes: ['C4', 'D4', 'E4', 'F4'], labels: ['1', '2', '3', '4'] },
      },
      {
        kind: 'read',
        text: 'A 4th: line to space. A 5th: line to line.',
        picture: { clef: 'treble', notes: ['G4', 'C5', 'G4', 'D5'], labels: ['1', '4th', '1', '5th'] },
      },
      {
        kind: 'read',
        text: 'A 5th is thumb to little finger!',
        picture: { clef: 'treble', notes: ['C4', 'G4'] },
        keys: { notes: ['C4', 'G4'], labels: ['thumb', 'little'] },
      },
      {
        kind: 'quiz',
        text: 'Count it! How far apart?',
        picture: { clef: 'treble', notes: ['E4', 'A4'] },
        options: ['3rd', '4th', '5th'],
        answer: '4th',
        why: 'E, F, G, A: 4 notes, so a 4th.',
      },
      { kind: 'play', text: 'Play C, then leap up a 5th.', picture: { clef: 'treble', notes: ['C4', 'G4'], labels: ['C', undefined] }, play: ['C4', 'G4'] },
    ],
  },

  octaves: {
    id: 'octaves',
    title: 'Octaves',
    cards: [
      {
        kind: 'read',
        text: 'An octave: the same letter, 8 notes away.',
        picture: { clef: 'treble', notes: ['C4', 'C5'], labels: ['C', 'C'] },
        keys: { notes: ['C4', 'C5'] },
      },
      {
        kind: 'read',
        text: 'Stretch your hand wide!',
        picture: { clef: 'bass', notes: ['C3', 'C4'], labels: ['C', 'C'] },
        keys: { notes: ['C3', 'C4'] },
      },
      { kind: 'play', text: 'Play middle C, then leap up an octave.', picture: { clef: 'treble', notes: ['C4', 'C5'] }, play: ['C4', 'C5'] },
    ],
  },

  semitones: {
    id: 'semitones',
    title: 'Semitones and tones',
    cards: [
      {
        kind: 'read',
        text: 'A semitone is the smallest step: to the very next key, black or white.',
        keys: { notes: ['C4', 'C#4'] },
        sound: ['C4', 'C#4'],
      },
      {
        kind: 'read',
        text: 'Two semitones make a tone. C to D is a tone.',
        picture: { clef: 'treble', notes: ['C4', 'D4'], labels: ['C', 'D'] },
        keys: { notes: ['C4', 'C#4', 'D4'], labels: [undefined, '1', '2'] },
        sound: ['C4', 'D4'],
      },
      {
        kind: 'read',
        text: "E to F has no black key between. It's just a semitone!",
        picture: { clef: 'treble', notes: ['E4', 'F4'], labels: ['E', 'F'] },
        keys: { notes: ['E4', 'F4'] },
        sound: ['E4', 'F4'],
      },
      {
        kind: 'read',
        text: 'B to C is a semitone too.',
        picture: { clef: 'treble', notes: ['B4', 'C5'], labels: ['B', 'C'] },
        keys: { notes: ['B4', 'C5'] },
      },
      {
        kind: 'quiz',
        text: 'Tone or semitone?',
        picture: { clef: 'treble', notes: ['F4', 'G4'] },
        keys: { notes: ['F4', 'G4'] },
        options: ['Tone', 'Semitone'],
        answer: 'Tone',
        why: 'There is a black key between F and G.',
      },
      {
        kind: 'quiz',
        text: 'Tone or semitone?',
        picture: { clef: 'treble', notes: ['E5', 'F5'] },
        options: ['Tone', 'Semitone'],
        answer: 'Semitone',
        why: 'There is no black key between E and F.',
      },
      {
        kind: 'read',
        text: "Semitones are how we measure on the piano. You'll need them for chords!",
        keys: { notes: ['C4', 'C#4', 'D4', 'D#4', 'E4'], labels: [undefined, '1', '2', '3', '4'] },
      },
    ],
  },

  sharps: {
    id: 'sharps',
    title: 'Sharps',
    cards: [
      {
        kind: 'read',
        text: 'A sharp ♯ raises a note by one semitone.',
        picture: { clef: 'treble', notes: ['F4', 'F#4'], labels: ['F', 'F♯'] },
        keys: { notes: ['F4', 'F#4'] },
        sound: ['F4', 'F#4'],
      },
      {
        kind: 'read',
        text: 'F sharp is the black key just right of F.',
        picture: { clef: 'treble', notes: ['F#4'], labels: ['F♯'], highlight: [0] },
        keys: { notes: ['F#4'] },
      },
      {
        kind: 'read',
        text: 'The sharp sits just before the note, on the same line or space.',
        picture: { clef: 'treble', notes: ['F#4', 'C#5'], labels: ['F♯', 'C♯'] },
        keys: { notes: ['F#4', 'C#5'] },
      },
      {
        kind: 'quiz',
        text: 'What is this note?',
        picture: { clef: 'treble', notes: ['C#5'] },
        options: ['C', 'C♯', 'D'],
        answer: 'C♯',
        why: 'The sharp raises C by a semitone.',
      },
      { kind: 'play', text: 'Play F, then F sharp.', picture: { clef: 'treble', notes: ['F4', 'F#4'] }, play: ['F4', 'F#4'] },
    ],
  },

  flats: {
    id: 'flats',
    title: 'Flats',
    cards: [
      {
        kind: 'read',
        text: 'A flat ♭ lowers a note by one semitone.',
        picture: { clef: 'treble', notes: ['B4', 'Bb4'], labels: ['B', 'B♭'] },
        keys: { notes: ['B4', 'Bb4'] },
        sound: ['B4', 'Bb4'],
      },
      {
        kind: 'read',
        text: 'B flat is the black key just left of B.',
        picture: { clef: 'treble', notes: ['Bb4'], labels: ['B♭'], highlight: [0] },
        keys: { notes: ['Bb4'] },
      },
      {
        kind: 'read',
        text: 'One black key has two names: A sharp is also B flat.',
        picture: { clef: 'treble', notes: ['A#4', 'Bb4'], labels: ['A♯', 'B♭'] },
        keys: { notes: ['Bb4'] },
      },
      {
        kind: 'quiz',
        text: 'What is this note?',
        picture: { clef: 'treble', notes: ['Eb5'] },
        options: ['D', 'E♭', 'E'],
        answer: 'E♭',
        why: 'The flat lowers E by a semitone.',
      },
      { kind: 'play', text: 'Play B, then B flat.', picture: { clef: 'treble', notes: ['B4', 'Bb4'] }, play: ['B4', 'Bb4'] },
    ],
  },

  naturals: {
    id: 'naturals',
    title: 'Naturals',
    cards: [
      {
        kind: 'read',
        text: 'A natural ♮ cancels a sharp or flat. Back to the plain note.',
        picture: { clef: 'treble', notes: ['F#4', 'Fn4'], labels: ['F♯', 'F'] },
        keys: { notes: ['F4', 'F#4'] },
        sound: ['F#4', 'F4'],
      },
      {
        kind: 'read',
        text: 'A sharp or flat lasts to the end of the bar, unless a natural cancels it.',
      },
      {
        kind: 'quiz',
        text: 'What is the second note?',
        picture: { clef: 'treble', notes: ['Bb4', 'Bn4'], labels: ['B♭', '?'], highlight: [1] },
        options: ['B♭', 'B', 'C'],
        answer: 'B',
        why: 'The natural cancels the flat: plain B.',
      },
      { kind: 'play', text: 'Play F sharp, then F natural.', picture: { clef: 'treble', notes: ['F#4', 'Fn4'] }, play: ['F#4', 'F4'] },
    ],
  },

  chords: {
    id: 'chords',
    title: 'Stacking chords',
    cards: [
      {
        kind: 'read',
        text: 'A chord is three notes played together.',
        picture: { clef: 'treble', notes: ['C4 E4 G4'] },
        keys: { notes: ['C4', 'E4', 'G4'] },
        sound: ['C4 E4 G4'],
      },
      {
        kind: 'read',
        text: 'Stack them line, line, line, like a snowman.',
        picture: { clef: 'treble', notes: ['C4', 'E4', 'G4', 'C4 E4 G4'], labels: ['C', 'E', 'G', undefined] },
        keys: { notes: ['C4', 'E4', 'G4'] },
      },
      {
        kind: 'read',
        text: 'Or space, space, space.',
        picture: { clef: 'treble', notes: ['F4 A4 C5'] },
        keys: { notes: ['F4', 'A4', 'C5'], labels: ['F', 'A', 'C'] },
        sound: ['F4 A4 C5'],
      },
      {
        kind: 'read',
        text: 'The bottom note is the root. It gives the chord its name.',
        picture: { clef: 'treble', notes: ['G4 B4 D5'], labels: ['G major'] },
        keys: { notes: ['G4', 'B4', 'D5'], labels: ['root', undefined, undefined] },
      },
      {
        kind: 'read',
        text: 'The middle note is the 3rd. The top one is the 5th.',
        picture: { clef: 'treble', notes: ['C4 E4 G4'] },
        keys: { notes: ['C4', 'E4', 'G4'], labels: ['root', '3rd', '5th'] },
      },
      {
        kind: 'quiz',
        text: 'What is the root of this chord?',
        picture: { clef: 'treble', notes: ['F4 A4 C5'] },
        options: ['C', 'F', 'G'],
        answer: 'F',
        why: 'The root is the bottom note: F, in the first space.',
      },
      {
        kind: 'read',
        text: 'Use fingers 1, 3 and 5. Skip a white key between each.',
        picture: { clef: 'treble', notes: ['C4 E4 G4'] },
        keys: { notes: ['C4', 'E4', 'G4'], labels: ['1', '3', '5'] },
      },
      { kind: 'play', text: 'Play C, E and G, one at a time.', picture: { clef: 'treble', notes: ['C4', 'E4', 'G4'] }, play: ['C4', 'E4', 'G4'] },
      {
        kind: 'read',
        text: 'Now press all three at once. This is the C major chord!',
        picture: { clef: 'treble', notes: ['C4 E4 G4'], labels: ['C major'] },
        keys: { notes: ['C4', 'E4', 'G4'] },
        sound: ['C4 E4 G4'],
      },
    ],
  },

  thirds: {
    id: 'thirds',
    title: 'Major & minor 3rds',
    cards: [
      {
        kind: 'read',
        text: 'A 3rd is a skip: line to line, or space to space.',
        picture: { clef: 'treble', notes: ['C4', 'E4'], labels: ['C', 'E'] },
        keys: { notes: ['C4', 'E4'] },
      },
      {
        kind: 'read',
        text: 'Remember: a semitone is one key to the very next key, black or white.',
        keys: { notes: ['C4', 'C#4'], labels: ['C', '1'] },
        sound: ['C4', 'C#4'],
      },
      {
        kind: 'read',
        text: 'Start on C. Count every key up to E: 1, 2, 3, 4.',
        picture: { clef: 'treble', notes: ['C4', 'E4'], labels: ['C', 'E'] },
        keys: { notes: ['C4', 'C#4', 'D4', 'D#4', 'E4'], labels: ['start', '1', '2', '3', '4'] },
      },
      {
        kind: 'read',
        text: 'C to E is 4 semitones. That is a major 3rd.',
        picture: { clef: 'treble', notes: ['C4 E4'], labels: ['major 3rd'] },
        keys: { notes: ['C4', 'E4'], labels: ['C', 'E'] },
        sound: ['C4 E4'],
      },
      {
        kind: 'read',
        text: 'Now start on D. Count every key up to F: 1, 2, 3.',
        picture: { clef: 'treble', notes: ['D4', 'F4'], labels: ['D', 'F'] },
        keys: { notes: ['D4', 'D#4', 'E4', 'F4'], labels: ['start', '1', '2', '3'] },
      },
      {
        kind: 'read',
        text: 'D to F is only 3 semitones. That is a minor 3rd.',
        picture: { clef: 'treble', notes: ['D4 F4'], labels: ['minor 3rd'] },
        keys: { notes: ['D4', 'F4'], labels: ['D', 'F'] },
        sound: ['D4 F4'],
      },
      {
        kind: 'read',
        text: 'Both look like a skip on the staff. Only counting keys tells them apart.',
        picture: { clef: 'treble', notes: ['C4 E4', 'D4 F4'], labels: ['major', 'minor'] },
      },
      {
        kind: 'read',
        text: 'Listen: the major 3rd sounds bright. The minor 3rd sounds darker.',
        picture: { clef: 'treble', notes: ['C4 E4', 'D4 F4'], labels: ['major', 'minor'] },
        sound: ['C4 E4', 'D4 F4'],
      },
      {
        kind: 'quiz',
        text: 'Start on E and count the keys up to G. Major or minor?',
        picture: { clef: 'treble', notes: ['E4', 'G4'], labels: ['E', 'G'] },
        keys: { notes: ['E4', 'G4'], labels: ['start', 'end'] },
        options: ['Major 3rd', 'Minor 3rd'],
        answer: 'Minor 3rd',
        why: 'E to G is 3 semitones: a minor 3rd.',
      },
      {
        kind: 'quiz',
        text: 'Start on F and count up to A. Major or minor?',
        picture: { clef: 'treble', notes: ['F4', 'A4'], labels: ['F', 'A'] },
        keys: { notes: ['F4', 'A4'], labels: ['start', 'end'] },
        options: ['Major 3rd', 'Minor 3rd'],
        answer: 'Major 3rd',
        why: 'F to A is 4 semitones: a major 3rd.',
      },
    ],
  },

  'major-minor': {
    id: 'major-minor',
    title: 'Major & minor chords',
    cards: [
      {
        kind: 'read',
        text: 'Major chords sound bright and happy.',
        picture: { clef: 'treble', notes: ['C4 E4 G4'], labels: ['C major'] },
        keys: { notes: ['C4', 'E4', 'G4'] },
        sound: ['C4 E4 G4'],
      },
      {
        kind: 'read',
        text: 'Minor chords sound darker, a bit sad.',
        picture: { clef: 'treble', notes: ['A4 C5 E5'], labels: ['A minor'] },
        keys: { notes: ['A4', 'C5', 'E5'] },
        sound: ['A4 C5 E5'],
      },
      {
        kind: 'quiz',
        text: 'Listen! Happy or sad?',
        picture: { clef: 'treble', notes: ['D4 F4 A4'] },
        sound: ['D4 F4 A4'],
        options: ['Happy', 'Sad'],
        answer: 'Sad',
        why: 'D, F and A make D minor: it sounds sad.',
      },
      {
        kind: 'read',
        text: 'What makes the difference? The 3rd!',
        picture: { clef: 'treble', notes: ['C4 E4 G4'] },
        keys: { notes: ['C4', 'E4', 'G4'], labels: ['root', '3rd', '5th'] },
      },
      {
        kind: 'read',
        text: 'A major chord has a major 3rd: 4 semitones from the root.',
        picture: { clef: 'treble', notes: ['C4 E4 G4'], labels: ['C major'] },
        keys: { notes: ['C4', 'C#4', 'D4', 'D#4', 'E4', 'G4'], labels: ['C', '1', '2', '3', '4', undefined] },
      },
      {
        kind: 'read',
        text: 'A minor chord has a minor 3rd: only 3 semitones.',
        picture: { clef: 'treble', notes: ['A4 C5 E5'], labels: ['A minor'] },
        keys: { notes: ['A4', 'A#4', 'B4', 'C5', 'E5'], labels: ['A', '1', '2', '3', undefined] },
      },
      {
        kind: 'quiz',
        text: 'D to F is 3 semitones. So D, F, A is...',
        picture: { clef: 'treble', notes: ['D4 F4 A4'] },
        options: ['D major', 'D minor'],
        answer: 'D minor',
        why: 'A minor 3rd from the root makes a minor chord.',
      },
      {
        kind: 'quiz',
        text: 'Count from the root to the 3rd. Major or minor?',
        picture: { clef: 'treble', notes: ['G4 B4 D5'] },
        options: ['G major', 'G minor'],
        answer: 'G major',
        why: 'G to B is 4 semitones: a major 3rd, so G major.',
      },
    ],
  },

  'make-major': {
    id: 'make-major',
    title: 'Making major chords',
    cards: [
      {
        kind: 'read',
        text: 'D minor is D, F and A. Its 3rd is a minor 3rd.',
        picture: { clef: 'treble', notes: ['D4 F4 A4'], labels: ['D minor'] },
        keys: { notes: ['D4', 'F4', 'A4'] },
        sound: ['D4 F4 A4'],
      },
      {
        kind: 'read',
        text: "Raise the 3rd a semitone, to F sharp. Now it's a major 3rd!",
        picture: { clef: 'treble', notes: ['D4 F#4 A4'], labels: ['D major'] },
        keys: { notes: ['D4', 'F#4', 'A4'] },
        sound: ['D4 F#4 A4'],
      },
      {
        kind: 'read',
        text: 'Hear the difference? D minor, then D major.',
        picture: { clef: 'treble', notes: ['D4 F4 A4', 'D4 F#4 A4'], labels: ['D minor', 'D major'] },
        sound: ['D4 F4 A4', 'D4 F#4 A4'],
      },
      {
        kind: 'read',
        text: 'A major needs C sharp. E major needs G sharp.',
        picture: { clef: 'treble', notes: ['A4 C#5 E5', 'E4 G#4 B4'], labels: ['A major', 'E major'] },
        sound: ['A4 C#5 E5', 'E4 G#4 B4'],
      },
      {
        kind: 'quiz',
        text: 'Which chord is this?',
        picture: { clef: 'treble', notes: ['E4 G#4 B4'] },
        options: ['E minor', 'E major'],
        answer: 'E major',
        why: 'E to G sharp is 4 semitones: a major 3rd.',
      },
    ],
  },

  'left-chords': {
    id: 'left-chords',
    title: 'Left-hand chords',
    cards: [
      {
        kind: 'read',
        text: 'Bass clef chords stack the same way.',
        picture: { clef: 'bass', notes: ['C3 E3 G3'], labels: ['C major'] },
        keys: { notes: ['C3', 'E3', 'G3'] },
        sound: ['C3 E3 G3'],
      },
      {
        kind: 'read',
        text: 'Your left hand is the other way round: little finger on the bottom.',
        picture: { clef: 'bass', notes: ['C3 E3 G3'] },
        keys: { notes: ['C3', 'E3', 'G3'], labels: ['5', '3', '1'] },
      },
      {
        kind: 'quiz',
        text: 'Check the clef! What is the root?',
        picture: { clef: 'bass', notes: ['G2 B2 D3'] },
        options: ['E', 'F', 'G', 'A'],
        answer: 'G',
        why: 'In bass clef, the bottom line is G.',
      },
      { kind: 'play', text: 'Play bass C, E and G, one at a time.', picture: { clef: 'bass', notes: ['C3', 'E3', 'G3'] }, play: ['C3', 'E3', 'G3'] },
    ],
  },
};
