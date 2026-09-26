// Showing a wrong note where it sits on the staff (a faint "ghost" next to the right one), so he can
// see whether to go higher or lower. Notes far off the staff aren't drawn; he's told instead.
import { midiName, parseNote, type Clef, type Note } from '../engine/music';
import { keyboardKeys } from './PlayKeyboard';

export const GHOST_COLOR = 'rgba(80, 70, 105, 0.55)';
// A landmark shown for a hint.
export const MARK_COLOR = 'rgba(124, 92, 255, 0.75)';

// Within reach of the staff: the on-screen keyboard's range for that clef.
export function inReach(clef: Clef, midi: number): boolean {
  const keys = keyboardKeys(clef);
  return midi >= keys[0].midi && midi <= keys[keys.length - 1].midi + 1;
}

// The wrong note, spelled the way the message names it ("That was B♭").
export function ghostNote(midi: number, name?: string): Note {
  if (!name) return parseNote(midiName(midi));
  return parseNote(`${name.replace('♯', '#').replace('♭', 'b')}${Math.floor(midi / 12) - 1}`);
}

// "That was G (the grey note). Go lower!", or "That was way too high!" when it's off the staff.
export function ghostLine(clef: Clef, played: number, target: number, name: string): string {
  const direction = played < target ? 'higher' : 'lower';
  if (!inReach(clef, played)) return `That was way too ${played < target ? 'low' : 'high'}! Look where the note sits.`;
  if ((played - target) % 12 === 0) return `Right letter, wrong octave! Go ${direction}.`;
  return `That was ${name} (the grey note). Go ${direction}!`;
}
