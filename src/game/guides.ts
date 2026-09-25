// Mini-lessons ("guides") that explain a concept before he practises it: a few short cards, each with
// a picture on the staff, sometimes a quick question or "now play it". They sit on the path just
// before the lessons that need them.
import type { Clef } from '../engine/music';

export type Picture =
  | { clef: Clef; notes: string[]; labels?: (string | undefined)[]; highlight?: number[] }
  | { clef: 'grand'; treble: (string | null)[]; bass: (string | null)[]; labels?: (string | undefined)[]; highlight?: number[] };

export type GuideCard =
  | { kind: 'read'; text: string; picture?: Picture }
  | { kind: 'quiz'; text: string; picture?: Picture; options: string[]; answer: string; why: string }
  // Play these notes (spelled, e.g. "C4") in order on the piano.
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
        text: 'Music is written on a staff: 5 lines, with 4 spaces in between. We count the lines from the bottom up.',
        picture: { clef: 'treble', notes: ['E4', 'G4', 'B4', 'D5', 'F5'], labels: ['1', '2', '3', '4', '5'] },
      },
      {
        kind: 'read',
        text: 'Every note sits ON a line (the line goes through its middle) or IN a space (between two lines).',
        picture: { clef: 'treble', notes: ['E4', 'F4'], labels: ['line', 'space'] },
      },
      {
        kind: 'quiz',
        text: 'Is this note on a line or in a space?',
        picture: { clef: 'treble', notes: ['G4'] },
        options: ['Line', 'Space'],
        answer: 'Line',
        why: 'The line goes right through the middle of the note.',
      },
      {
        kind: 'quiz',
        text: 'What about this one?',
        picture: { clef: 'treble', notes: ['A4'] },
        options: ['Line', 'Space'],
        answer: 'Space',
        why: 'It sits in the gap between two lines.',
      },
      {
        kind: 'read',
        text: 'Higher on the staff means higher on the piano: further to the RIGHT. Lower means further LEFT.',
        picture: { clef: 'treble', notes: ['C4', 'D4', 'E4', 'F4', 'G4'], labels: ['C', 'D', 'E', 'F', 'G'] },
      },
      {
        kind: 'read',
        text: 'The curly sign is the treble clef, for your right hand. It is really a fancy G: its curl wraps around the 2nd line, and that line is G.',
        picture: { clef: 'treble', notes: ['G4'], labels: ['G'], highlight: [0] },
      },
      {
        kind: 'read',
        text: 'Middle C sits on its own short line just under the staff. It is the C in the middle of the piano.',
        picture: { clef: 'treble', notes: ['C4'], labels: ['middle C'], highlight: [0] },
      },
      { kind: 'play', text: 'Find middle C on your piano and play it!', picture: { clef: 'treble', notes: ['C4'] }, play: ['C4'] },
    ],
  },

  steps: {
    id: 'steps',
    title: 'Counting from landmarks',
    cards: [
      {
        kind: 'read',
        text: "You don't have to learn every note by heart. Find a landmark note you know, then count from it.",
        picture: { clef: 'treble', notes: ['C4', 'G4', 'C5'], labels: ['middle C', 'G', 'treble C'], highlight: [0, 1, 2] },
      },
      {
        kind: 'read',
        text: 'From a line to the very next space is one step. On the piano, one step is the very next white key.',
        picture: { clef: 'treble', notes: ['G4', 'A4'], labels: ['G', 'A'] },
      },
      {
        kind: 'read',
        text: 'Music only uses 7 letters: A B C D E F G. After G, it starts again at A.',
        picture: { clef: 'treble', notes: ['E4', 'F4', 'G4', 'A4', 'B4'], labels: ['E', 'F', 'G', 'A', 'B'] },
      },
      {
        kind: 'quiz',
        text: 'The purple note is one step above the G line. What is it?',
        picture: { clef: 'treble', notes: ['G4', 'A4'], labels: ['G', '?'], highlight: [1] },
        options: letters('F', 'G', 'A', 'B'),
        answer: 'A',
        why: 'One step up from G is A.',
      },
      {
        kind: 'read',
        text: 'Going down, the letters go backwards: C, B, A, G…',
        picture: { clef: 'treble', notes: ['C5', 'B4', 'A4', 'G4'], labels: ['C', 'B', 'A', 'G'] },
      },
      {
        kind: 'quiz',
        text: 'The purple note is one step below treble C. What is it?',
        picture: { clef: 'treble', notes: ['C5', 'B4'], labels: ['C', '?'], highlight: [1] },
        options: letters('A', 'B', 'C', 'D'),
        answer: 'B',
        why: 'One step down from C is B.',
      },
      { kind: 'play', text: 'Play G, then step up to A.', picture: { clef: 'treble', notes: ['G4', 'A4'] }, play: ['G4', 'A4'] },
    ],
  },

  face: {
    id: 'face',
    title: 'Lines and spaces',
    cards: [
      {
        kind: 'read',
        text: 'The 4 spaces of the treble staff spell a word, from the bottom up: F A C E. FACE!',
        picture: { clef: 'treble', notes: ['F4', 'A4', 'C5', 'E5'], labels: ['F', 'A', 'C', 'E'] },
      },
      {
        kind: 'read',
        text: 'The 5 lines, from the bottom up, are E G B D F: Every Good Boy Deserves Fruit.',
        picture: { clef: 'treble', notes: ['E4', 'G4', 'B4', 'D5', 'F5'], labels: ['E', 'G', 'B', 'D', 'F'] },
      },
      {
        kind: 'quiz',
        text: 'Which space is this? Think F A C E.',
        picture: { clef: 'treble', notes: ['C5'] },
        options: ['F', 'A', 'C', 'E'],
        answer: 'C',
        why: 'F, A, C: the 3rd space up is C.',
      },
      {
        kind: 'quiz',
        text: 'Which line is this? Every Good Boy Deserves Fruit.',
        picture: { clef: 'treble', notes: ['D5'] },
        options: letters('E', 'G', 'B', 'D', 'F'),
        answer: 'D',
        why: 'E, G, B, D: the 4th line up is D.',
      },
      {
        kind: 'read',
        text: 'Rhymes help you check. But landmarks are faster, so keep using them!',
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
        text: 'Low notes, for your left hand, are written with the bass clef.',
        picture: { clef: 'bass', notes: ['C3', 'E3', 'G3'] },
      },
      {
        kind: 'read',
        text: 'The bass clef is really a fancy F. Its two dots hug the 4th line, and that line is F: the F just below middle C.',
        picture: { clef: 'bass', notes: ['F3'], labels: ['F'], highlight: [0] },
      },
      {
        kind: 'read',
        text: 'In the bass clef, middle C sits on its own little line just ABOVE the staff.',
        picture: { clef: 'bass', notes: ['C4'], labels: ['middle C'], highlight: [0] },
      },
      {
        kind: 'read',
        text: 'Watch out: each line has a different name in the bass clef! The lines are G B D F A: Good Boys Deserve Fruit Always.',
        picture: { clef: 'bass', notes: ['G2', 'B2', 'D3', 'F3', 'A3'], labels: ['G', 'B', 'D', 'F', 'A'] },
      },
      {
        kind: 'quiz',
        text: 'Bass clef! This note is on the line between the two dots. What is it?',
        picture: { clef: 'bass', notes: ['F3'] },
        options: letters('D', 'E', 'F', 'G'),
        answer: 'F',
        why: 'The bass clef dots hug the F line.',
      },
      { kind: 'play', text: 'Play the F line note with your left hand.', picture: { clef: 'bass', notes: ['F3'] }, play: ['F3'] },
    ],
  },

  'bass-spaces': {
    id: 'bass-spaces',
    title: 'Bass clef spaces',
    cards: [
      {
        kind: 'read',
        text: 'The spaces of the bass staff, from the bottom up, are A C E G: All Cows Eat Grass.',
        picture: { clef: 'bass', notes: ['A2', 'C3', 'E3', 'G3'], labels: ['A', 'C', 'E', 'G'] },
      },
      {
        kind: 'read',
        text: 'Bass C lives in the 2nd space. It is the C just below middle C.',
        picture: { clef: 'bass', notes: ['C3'], labels: ['bass C'], highlight: [0] },
      },
      {
        kind: 'quiz',
        text: 'Which note is in the top space of the bass staff?',
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
        text: 'Piano music uses two staves joined together: treble on top for your right hand, bass below for your left. This is the grand staff.',
        picture: { clef: 'grand', treble: ['G4', null], bass: [null, 'F3'], labels: ['G', 'F'] },
      },
      {
        kind: 'read',
        text: 'Middle C lives in between. It can be written just below the treble staff, or just above the bass staff. It is the same key!',
        picture: { clef: 'grand', treble: ['C4', null], bass: [null, 'C4'], labels: ['middle C', 'middle C'], highlight: [0, 1] },
      },
      {
        kind: 'read',
        text: 'Always check the clef first! The same spot on the staff is a different note in treble and in bass.',
        picture: { clef: 'grand', treble: ['G4', null], bass: [null, 'B2'], labels: ['G', 'B'] },
      },
      {
        kind: 'quiz',
        text: 'Look at the clef! What is this note?',
        picture: { clef: 'bass', notes: ['B2'] },
        options: letters('G', 'A', 'B', 'C'),
        answer: 'B',
        why: 'In the bass clef, the 2nd line up is B (Good Boys…).',
      },
    ],
  },

  ledger: {
    id: 'ledger',
    title: 'Ledger lines',
    cards: [
      {
        kind: 'read',
        text: 'When notes go higher or lower than the staff, we draw short extra lines just for them. These are ledger lines.',
        picture: { clef: 'treble', notes: ['A5', 'C6'], labels: ['1 ledger line', '2 ledger lines'] },
      },
      {
        kind: 'read',
        text: 'You already know one! Middle C sits on a ledger line.',
        picture: { clef: 'treble', notes: ['C4'], labels: ['middle C'], highlight: [0] },
      },
      {
        kind: 'read',
        text: 'Keep stepping up past the top of the staff: G sits on top, A on the 1st ledger line, B just above it, then C on the 2nd ledger line.',
        picture: { clef: 'treble', notes: ['G5', 'A5', 'B5', 'C6'], labels: ['G', 'A', 'B', 'C'] },
      },
      {
        kind: 'quiz',
        text: 'Count the ledger lines. What note is this?',
        picture: { clef: 'treble', notes: ['C6'] },
        options: letters('A', 'B', 'C', 'D'),
        answer: 'C',
        why: 'Two ledger lines above the treble staff is high C.',
      },
      {
        kind: 'read',
        text: 'Below the staff, count down the same way: line, space, line…',
        picture: { clef: 'treble', notes: ['C4', 'B3', 'A3'], labels: ['C', 'B', 'A'] },
      },
      { kind: 'play', text: 'Play high C: two octaves above middle C.', picture: { clef: 'treble', notes: ['C6'] }, play: ['C6'] },
    ],
  },

  intervals: {
    id: 'intervals',
    title: 'Reading the jumps',
    cards: [
      {
        kind: 'read',
        text: "Good readers don't name every single note. They look at the jump from one note to the next.",
        picture: { clef: 'treble', notes: ['C4', 'D4', 'E4', 'D4'] },
      },
      {
        kind: 'read',
        text: 'From a line to the very next space (or a space to the next line) is a STEP. Play the very next key.',
        picture: { clef: 'treble', notes: ['E4', 'F4'], labels: ['line', 'space'] },
      },
      {
        kind: 'read',
        text: 'If the next note is in exactly the same place, it is the SAME note. Play that key again.',
        picture: { clef: 'treble', notes: ['G4', 'G4'], labels: ['G', 'G'] },
      },
      {
        kind: 'quiz',
        text: 'Does the second note go up or down?',
        picture: { clef: 'treble', notes: ['A4', 'G4'] },
        options: ['Up', 'Down'],
        answer: 'Down',
        why: 'It is lower on the staff, so go down: to the left on the piano.',
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
        text: 'From a line to the next line (or a space to the next space) is a SKIP. It jumps over one key.',
        picture: { clef: 'treble', notes: ['E4', 'G4'], labels: ['line', 'line'] },
      },
      {
        kind: 'read',
        text: 'On the piano, a skip skips a finger: play it with fingers 1 and 3.',
        picture: { clef: 'treble', notes: ['C4', 'E4'], labels: ['finger 1', 'finger 3'] },
      },
      {
        kind: 'quiz',
        text: 'Step or skip?',
        picture: { clef: 'treble', notes: ['F4', 'A4'] },
        options: ['Step', 'Skip'],
        answer: 'Skip',
        why: 'Space to the next space is a skip.',
      },
      {
        kind: 'quiz',
        text: 'Step or skip?',
        picture: { clef: 'treble', notes: ['B4', 'C5'] },
        options: ['Step', 'Skip'],
        answer: 'Step',
        why: 'Line to the very next space is a step.',
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
        text: 'Bigger jumps are named by counting. Call the first note 1, then count every line AND space up to the second note.',
        picture: { clef: 'treble', notes: ['C4', 'D4', 'E4', 'F4'], labels: ['1', '2', '3', '4'], highlight: [0, 3] },
      },
      {
        kind: 'read',
        text: 'A 4th goes from a line to a space, or a space to a line. A 5th goes line to line, or space to space, jumping over one line.',
        picture: { clef: 'treble', notes: ['G4', 'C5', 'G4', 'D5'], labels: ['1', '4th', '1', '5th'] },
      },
      {
        kind: 'read',
        text: 'With your hand in a five-finger position, a 5th is thumb to little finger!',
        picture: { clef: 'treble', notes: ['C4', 'G4'], labels: ['thumb', 'little finger'] },
      },
      {
        kind: 'quiz',
        text: 'Count it! How far apart are these notes?',
        picture: { clef: 'treble', notes: ['E4', 'A4'] },
        options: ['3rd', '4th', '5th'],
        answer: '4th',
        why: 'E, F, G, A: that is 4 notes, so a 4th.',
      },
      { kind: 'play', text: 'Play a 5th: C, then G.', picture: { clef: 'treble', notes: ['C4', 'G4'], labels: ['C', undefined] }, play: ['C4', 'G4'] },
    ],
  },

  octaves: {
    id: 'octaves',
    title: 'Octaves',
    cards: [
      {
        kind: 'read',
        text: 'An octave jumps to the same letter, 8 notes away. One note is on a line and the other is in a space.',
        picture: { clef: 'treble', notes: ['C4', 'C5'], labels: ['C', 'C'] },
      },
      {
        kind: 'read',
        text: 'On the piano, the two notes sit in the same spot next to the black keys, just further along. Stretch your thumb and little finger wide!',
        picture: { clef: 'bass', notes: ['C3', 'C4'], labels: ['C', 'C'] },
      },
      { kind: 'play', text: 'Play middle C, then the C an octave higher.', picture: { clef: 'treble', notes: ['C4', 'C5'] }, play: ['C4', 'C5'] },
    ],
  },
};
