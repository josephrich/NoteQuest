// The on-screen piano, for practising away from the real one. No letters on the keys (only middle
// C's dot, like the landmark on a real piano), so finding the key still means reading the note.
// The range is fixed per clef, so it never gives away where the answer is.
import { useState } from 'react';
import { toMidi, type Clef } from '../engine/music';
import { playPianoNote } from './pianoSound';

const WHITE_W = 40;
const WHITE_H = 150;
const BLACK_W = 24;
const BLACK_H = 92;
const MIDDLE_C = 60;
const HAS_BLACK = new Set([0, 1, 3, 4, 5]);

// White-key ranges, as [letter, octave] of the lowest and highest keys: comfortably around every
// note the course uses in that clef, ledger lines included.
export const KEYBOARD_RANGE: Record<Clef, [[number, number], [number, number]]> = {
  treble: [[5, 3], [0, 6]], // A3 to C6
  bass: [[1, 2], [2, 4]], // D2 to E4
};

export function keyboardKeys(clef: Clef) {
  const [[l0, o0], [l1, o1]] = KEYBOARD_RANGE[clef];
  const whites: { letter: number; midi: number }[] = [];
  for (let p = o0 * 7 + l0; p <= o1 * 7 + l1; p++) {
    const letter = p % 7;
    whites.push({ letter, midi: toMidi({ letter, octave: Math.floor(p / 7), acc: 0 }) });
  }
  return whites;
}

export function PlayKeyboard({ clef, onPress, disabled = false }: { clef: Clef; onPress: (midi: number) => void; disabled?: boolean }) {
  const whites = keyboardKeys(clef);
  const [down, setDown] = useState<number | null>(null);
  const width = whites.length * WHITE_W;
  const press = (midi: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    if (disabled) return;
    playPianoNote(midi);
    setDown(midi);
    window.setTimeout(() => setDown((d) => (d === midi ? null : d)), 160);
    onPress(midi);
  };
  return (
    <svg className={`play-keyboard ${disabled ? 'play-keyboard-off' : ''}`} viewBox={`-1 -1 ${width + 2} ${WHITE_H + 2}`} role="group" aria-label="On-screen piano">
      {whites.map((k, i) => (
        <g key={k.midi} data-midi={k.midi} onPointerDown={press(k.midi)} role="button" aria-label={k.midi === MIDDLE_C ? 'Middle C key' : 'Piano key'}>
          <rect x={i * WHITE_W} y={0} width={WHITE_W} height={WHITE_H} rx={5} fill={down === k.midi ? '#d9d0ff' : '#fff'} stroke="#3b3355" strokeWidth={2} />
          {k.midi === MIDDLE_C && <circle cx={i * WHITE_W + WHITE_W / 2} cy={WHITE_H - 18} r={6} fill="#f08c00" />}
        </g>
      ))}
      {whites.map((k, i) =>
        HAS_BLACK.has(k.letter) && i < whites.length - 1 ? (
          <rect
            key={`b${k.midi}`}
            data-midi={k.midi + 1}
            x={(i + 1) * WHITE_W - BLACK_W / 2}
            y={0}
            width={BLACK_W}
            height={BLACK_H}
            rx={3}
            fill={down === k.midi + 1 ? '#7c5cff' : '#2b2340'}
            onPointerDown={press(k.midi + 1)}
            role="button"
            aria-label="Black key"
          />
        ) : null,
      )}
    </svg>
  );
}
