// A small piano keyboard with some keys lit up, drawn under the staff so he can see which key a
// written note is. Middle C is always marked with a small grey "middle C" caption underneath, as the
// landmark on the piano (in grey, not on the key, so it doesn't look like a key to play).
import { LETTERS, noteName, parseNote, toMidi } from '../engine/music';

const WHITE_W = 24;
const WHITE_H = 100;
const BLACK_W = 14;
const BLACK_H = 62;
const LABEL_H = 24;
// Letters (index into LETTERS) that have a black key just after them: C, D, F, G, A.
const HAS_BLACK = new Set([0, 1, 3, 4, 5]);
const MIDDLE_C = 60;
const PAD = 3;
const MIN_KEYS = 15;

const DONE = '#2fbf71';

// `done`: lit keys he has played (MIDI numbers), shown green. `onPress`: makes the keys tappable.
export function Keyboard({
  notes,
  labels,
  color = '#7c5cff',
  done = [],
  onPress,
}: {
  notes: string[];
  labels?: (string | undefined)[];
  color?: string;
  done?: number[];
  onPress?: (midi: number) => void;
}) {
  const fill = (midi: number) => (done.includes(midi) ? DONE : color);
  const press = (midi: number) => (onPress ? { onPointerDown: (e: React.PointerEvent) => (e.preventDefault(), onPress(midi)), style: { cursor: 'pointer' } } : {});
  const parsed = notes.map(parseNote);
  // White keys are counted as octave * 7 + letter. Show a few keys either side of the lit ones, and
  // at least MIN_KEYS in all, centred on them.
  const pos = parsed.map((n) => n.octave * 7 + n.letter);
  let from = Math.min(...pos) - PAD;
  let to = Math.max(...pos) + PAD;
  const short = MIN_KEYS - (to - from + 1);
  if (short > 0) {
    from -= Math.floor(short / 2);
    to += Math.ceil(short / 2);
  }
  const whites = Array.from({ length: to - from + 1 }, (_, i) => {
    const p = from + i;
    const letter = ((p % 7) + 7) % 7;
    const octave = Math.floor(p / 7);
    return { letter, octave, midi: toMidi({ letter, octave, acc: 0 }) };
  });
  const lit = new Map(parsed.map((n, i) => [toMidi(n), i]));
  const width = whites.length * WHITE_W;
  const labelOf = (midi: number) => {
    const idx = lit.get(midi);
    return idx !== undefined ? labels?.[idx] : undefined;
  };
  const middleC = whites.findIndex((k) => k.midi === MIDDLE_C);
  // Middle C gets a grey caption, unless labels on or next to it would collide with it.
  const markC = middleC >= 0 && [middleC - 1, middleC, middleC + 1].every((i) => !whites[i] || !labelOf(whites[i].midi));
  const hasLabels = labels?.some(Boolean) || markC;
  const height = WHITE_H + (hasLabels ? LABEL_H : 0) + 4;

  return (
    <svg className={`keyboard ${onPress ? 'keyboard-tap' : ''}`} viewBox={`-1 -1 ${width + 2} ${height}`} role="img" aria-label={`Piano keys: ${notes.join(', ')}`}>
      {whites.map((k, i) => {
        const on = lit.has(k.midi);
        return (
          <g key={k.midi}>
            <rect x={i * WHITE_W} y={0} width={WHITE_W} height={WHITE_H} rx={3} fill={on ? fill(k.midi) : '#fff'} stroke="#3b3355" strokeWidth={1.5} {...press(k.midi)} />
            {on && (
              <text x={i * WHITE_W + WHITE_W / 2} y={WHITE_H - 10} textAnchor="middle" fontSize={15} fontWeight={800} fill="#fff">
                {LETTERS[k.letter]}
              </text>
            )}
          </g>
        );
      })}
      {whites.map((k, i) =>
        HAS_BLACK.has(k.letter) && i < whites.length - 1 ? (
          <g key={`b${k.midi}`}>
            <rect
              x={(i + 1) * WHITE_W - BLACK_W / 2}
              y={0}
              width={BLACK_W}
              height={BLACK_H}
              rx={2}
              fill={lit.has(k.midi + 1) ? fill(k.midi + 1) : '#2b2340'}
              stroke="#2b2340"
              {...press(k.midi + 1)}
            />
            {lit.has(k.midi + 1) && (
              <text x={(i + 1) * WHITE_W} y={BLACK_H - 8} textAnchor="middle" fontSize={9} fontWeight={800} fill="#fff">
                {noteName(parsed[lit.get(k.midi + 1)!])}
              </text>
            )}
          </g>
        ) : null,
      )}
      {hasLabels &&
        whites.map((k, i) => {
          const label = labelOf(k.midi);
          return label ? (
            <text key={`l${k.midi}`} x={i * WHITE_W + WHITE_W / 2} y={WHITE_H + 18} textAnchor="middle" fontSize={13} fontWeight={800} fill={color}>
              {label}
            </text>
          ) : null;
        })}
      {hasLabels &&
        whites.map((k, i) => {
          const label = HAS_BLACK.has(k.letter) ? labelOf(k.midi + 1) : undefined;
          return label ? (
            <text key={`lb${k.midi}`} x={(i + 1) * WHITE_W} y={WHITE_H + 18} textAnchor="middle" fontSize={13} fontWeight={800} fill={color}>
              {label}
            </text>
          ) : null;
        })}
      {markC && (
        <text x={middleC * WHITE_W + WHITE_W / 2} y={WHITE_H + 18} textAnchor="middle" fontSize={11} fontWeight={700} fill="#9a93ad" aria-hidden="true">
          middle C
        </text>
      )}
    </svg>
  );
}
