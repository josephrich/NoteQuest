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

// `sound`: notes (spelled) that a "Hear it" button plays together, for hearing what a chord sounds like.
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
        text: 'Line to the next space is a STEP: the next key.',
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
        text: 'Line to the next line is a SKIP. It jumps over a key.',
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

  chords: {
    id: 'chords',
    title: 'Stacking chords',
    cards: [
      {
        kind: 'read',
        text: 'A chord is three notes played together.',
        picture: { clef: 'treble', notes: ['C4 E4 G4'] },
        keys: { notes: ['C4', 'E4', 'G4'] },
        sound: ['C4', 'E4', 'G4'],
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
        sound: ['F4', 'A4', 'C5'],
      },
      {
        kind: 'read',
        text: 'The bottom note names the chord. This is the G chord.',
        picture: { clef: 'treble', notes: ['G4 B4 D5'], labels: ['G chord'] },
        keys: { notes: ['G4', 'B4', 'D5'], labels: ['G', undefined, undefined] },
      },
      {
        kind: 'quiz',
        text: 'Which chord is this? Look at the bottom note.',
        picture: { clef: 'treble', notes: ['F4 A4 C5'] },
        options: ['C', 'F', 'G'],
        answer: 'F',
        why: 'The bottom note is F, in the first space.',
      },
      {
        kind: 'read',
        text: 'Use fingers 1, 3 and 5. Skip a key between each.',
        picture: { clef: 'treble', notes: ['C4 E4 G4'] },
        keys: { notes: ['C4', 'E4', 'G4'], labels: ['1', '3', '5'] },
      },
      { kind: 'play', text: 'Play C, E and G, one at a time.', picture: { clef: 'treble', notes: ['C4', 'E4', 'G4'] }, play: ['C4', 'E4', 'G4'] },
      {
        kind: 'read',
        text: 'Now press all three at once. That is the C chord!',
        picture: { clef: 'treble', notes: ['C4 E4 G4'], labels: ['C chord'] },
        keys: { notes: ['C4', 'E4', 'G4'] },
        sound: ['C4', 'E4', 'G4'],
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
        picture: { clef: 'bass', notes: ['C3 E3 G3'], labels: ['C chord'] },
        keys: { notes: ['C3', 'E3', 'G3'] },
        sound: ['C3', 'E3', 'G3'],
      },
      {
        kind: 'read',
        text: 'Your left hand is the other way round: little finger on the bottom.',
        picture: { clef: 'bass', notes: ['C3 E3 G3'] },
        keys: { notes: ['C3', 'E3', 'G3'], labels: ['5', '3', '1'] },
      },
      {
        kind: 'quiz',
        text: 'Check the clef! Which chord is this?',
        picture: { clef: 'bass', notes: ['G2 B2 D3'] },
        options: ['E', 'F', 'G', 'A'],
        answer: 'G',
        why: 'In bass clef, the bottom line is G.',
      },
      { kind: 'play', text: 'Play bass C, E and G, one at a time.', picture: { clef: 'bass', notes: ['C3', 'E3', 'G3'] }, play: ['C3', 'E3', 'G3'] },
    ],
  },

  'major-minor': {
    id: 'major-minor',
    title: 'Happy & sad chords',
    cards: [
      {
        kind: 'read',
        text: 'Some chords sound happy. They are called major.',
        picture: { clef: 'treble', notes: ['C4 E4 G4'], labels: ['C major'] },
        keys: { notes: ['C4', 'E4', 'G4'] },
        sound: ['C4', 'E4', 'G4'],
      },
      {
        kind: 'read',
        text: 'Some sound sad. They are called minor.',
        picture: { clef: 'treble', notes: ['A4 C5 E5'], labels: ['A minor'] },
        keys: { notes: ['A4', 'C5', 'E5'] },
        sound: ['A4', 'C5', 'E5'],
      },
      {
        kind: 'quiz',
        text: 'Listen! Happy or sad?',
        picture: { clef: 'treble', notes: ['D4 F4 A4'] },
        sound: ['D4', 'F4', 'A4'],
        options: ['Happy', 'Sad'],
        answer: 'Sad',
        why: 'The D chord is minor: it sounds sad.',
      },
      {
        kind: 'read',
        text: 'On the white keys, C, F and G chords are major.',
        picture: { clef: 'treble', notes: ['C4 E4 G4', 'F4 A4 C5', 'G4 B4 D5'], labels: ['C', 'F', 'G'] },
        sound: ['F4', 'A4', 'C5'],
      },
      {
        kind: 'read',
        text: 'D, E and A chords are minor.',
        picture: { clef: 'treble', notes: ['D4 F4 A4', 'E4 G4 B4', 'A4 C5 E5'], labels: ['D', 'E', 'A'] },
        sound: ['E4', 'G4', 'B4'],
      },
      {
        kind: 'quiz',
        text: 'Which chord is this?',
        picture: { clef: 'treble', notes: ['F4 A4 C5'] },
        options: ['F major', 'F minor', 'A minor'],
        answer: 'F major',
        why: 'The bottom note is F, and F chords are major.',
      },
      {
        kind: 'quiz',
        text: 'And this one?',
        picture: { clef: 'bass', notes: ['A2 C3 E3'] },
        options: ['C major', 'A major', 'A minor'],
        answer: 'A minor',
        why: 'The bottom note is A, and A chords are minor.',
      },
    ],
  },
};
