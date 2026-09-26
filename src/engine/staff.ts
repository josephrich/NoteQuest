// Renders notes on a single stave, or on a grand staff, with VexFlow. The SVG scales to its container.
import { Renderer, Stave, StaveNote, StaveConnector, Voice, Formatter, Accidental, Annotation, GhostNote, type RenderContext } from 'vexflow';
import { vexKey, type Clef, type KeyName, type Note } from './music';

export interface StaffSpec {
  clef: Clef;
  key?: KeyName;
  // Each group is one note or chord, drawn left to right.
  groups: Note[][];
  // Optional colour per group (e.g. current / done / wrong).
  colors?: (string | undefined)[];
  // Optional text under each group, e.g. a note name in an explainer.
  labels?: (string | undefined)[];
  // Optional extra notes drawn faintly in a group, e.g. the wrong notes he played, to show where they
  // sit compared with the right ones.
  ghosts?: (Note[] | undefined)[];
  ghostColor?: string;
  // Optional landmark notes drawn in a group for a hint (e.g. middle C, in purple).
  marks?: (Note[] | undefined)[];
  markColor?: string;
  // Optional colour for each note of a group (in the order given), e.g. green for a chord's notes he
  // got right. Overrides the group's colour.
  keyColors?: ((string | undefined)[] | undefined)[];
  // In a run of notes, the one to play now: marked with a soft band behind it and an arrow under it.
  current?: number;
  label: string;
}

// A grand staff: treble above bass, joined by a brace. Columns line up across the two staves; a
// null leaves that column empty on that stave.
export interface GrandSpec {
  treble: (Note | null)[];
  bass: (Note | null)[];
  colors?: (string | undefined)[];
  labels?: (string | undefined)[];
  label: string;
}

// Logical drawing size; the SVG is scaled to fill its container. A single note gets a narrower
// stave so it's drawn larger.
const HEIGHT = 150;
const LABELLED_HEIGHT = 180;

function makeNote(
  clef: Clef,
  notes: Note[],
  opts: {
    single: boolean;
    key?: KeyName;
    color?: string;
    label?: string;
    labelAbove?: boolean;
    ghosts?: Note[];
    ghostColor?: string;
    marks?: Note[];
    markColor?: string;
    keyColors?: (string | undefined)[];
  },
) {
  // VexFlow wants a chord's notes from low to high; any ghosts or marks go in with them (unless
  // they're already there).
  const same = (a: Note, b: Note) => a.letter === b.letter && a.octave === b.octave && a.acc === b.acc;
  const ghosts = opts.ghosts ?? [];
  const marks = (opts.marks ?? []).filter((m) => ![...notes, ...ghosts].some((x) => same(x, m)));
  const group = [...notes, ...ghosts, ...marks].sort((a, b) => a.octave * 7 + a.letter - (b.octave * 7 + b.letter) || a.acc - b.acc);
  const n = new StaveNote({ clef, keys: group.map(vexKey), duration: opts.single ? 'w' : 'q', align_center: opts.single });
  // With a key signature showing, notes that follow it need no accidental.
  group.forEach((g, j) => {
    if (g.acc !== 0 && !opts.key) n.addModifier(new Accidental(g.acc === 1 ? '#' : 'b'), j);
    else if (g.natural) n.addModifier(new Accidental('n'), j);
  });
  if (opts.color) n.setStyle({ fillStyle: opts.color, strokeStyle: opts.color });
  const styleKey = (note: Note, color: string) => {
    const i = group.indexOf(note);
    const style = { fillStyle: color, strokeStyle: color };
    n.setKeyStyle(i, style);
    n.getModifiersByType('Accidental')
      .find((m) => m.getIndex() === i)
      ?.setStyle(style);
  };
  notes.forEach((note, i) => opts.keyColors?.[i] && styleKey(note, opts.keyColors[i]!));
  ghosts.forEach((g) => styleKey(g, opts.ghostColor ?? '#aaa'));
  marks.forEach((m) => styleKey(m, opts.markColor ?? '#7c5cff'));
  if (opts.label) {
    const a = new Annotation(opts.label).setVerticalJustification(opts.labelAbove ? Annotation.VerticalJustify.TOP : Annotation.VerticalJustify.BOTTOM);
    a.setFont('Arial', 13, 'bold');
    n.addModifier(a, 0);
  }
  return n;
}

function setup(el: HTMLElement, width: number, height: number): RenderContext {
  el.innerHTML = '';
  const renderer = new Renderer(el as HTMLDivElement, Renderer.Backends.SVG);
  renderer.resize(width, height);
  return renderer.getContext();
}

function finish(el: HTMLElement, width: number, height: number, label: string) {
  const svg = el.querySelector('svg');
  if (svg) {
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', '100%');
    svg.removeAttribute('height');
    svg.removeAttribute('style');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', label);
  }
}

export function renderStaff(el: HTMLElement, spec: StaffSpec): void {
  // Longer runs get a wider stave, so the notes don't crowd together.
  const width = spec.groups.length === 1 ? 220 : 320 + Math.max(0, spec.groups.length - 4) * 45;
  const height = spec.labels ? LABELLED_HEIGHT : HEIGHT;
  const ctx = setup(el, width, height);
  const stave = new Stave(8, 22, width - 16);
  stave.addClef(spec.clef);
  if (spec.key) stave.addKeySignature(spec.key);
  stave.setContext(ctx).draw();

  const single = spec.groups.length === 1;
  const notes = spec.groups.map((group, i) =>
    makeNote(spec.clef, group, {
      single,
      key: spec.key,
      color: spec.colors?.[i],
      label: spec.labels?.[i],
      ghosts: spec.ghosts?.[i],
      ghostColor: spec.ghostColor,
      marks: spec.marks?.[i],
      markColor: spec.markColor,
      keyColors: spec.keyColors?.[i],
    }),
  );
  const voice = new Voice({ num_beats: Math.max(1, notes.length), beat_value: 4 });
  voice.setMode(Voice.Mode.SOFT);
  voice.addTickables(notes);
  const available = stave.getNoteEndX() - stave.getNoteStartX() - 20;
  new Formatter().joinVoices([voice]).format([voice], available);
  voice.draw(ctx, stave);
  if (spec.current !== undefined && notes[spec.current]) markCurrent(el, notes[spec.current], height);
  finish(el, width, height, spec.label);
}

const CURRENT = '#7c5cff';

// A soft band behind the note to play now, and an arrow pointing up at it from under the staff.
function markCurrent(el: HTMLElement, note: StaveNote, height: number) {
  const svg = el.querySelector('svg');
  if (!svg) return;
  const ns = 'http://www.w3.org/2000/svg';
  const x0 = note.getNoteHeadBeginX() - 9;
  const x1 = note.getNoteHeadEndX() + 9;
  const band = document.createElementNS(ns, 'rect');
  band.setAttribute('x', String(x0));
  band.setAttribute('y', '2');
  band.setAttribute('width', String(x1 - x0));
  band.setAttribute('height', String(height - 22));
  band.setAttribute('rx', '10');
  band.setAttribute('fill', CURRENT);
  band.setAttribute('fill-opacity', '0.12');
  band.setAttribute('class', 'current-band');
  svg.insertBefore(band, svg.firstChild);
  const cx = (x0 + x1) / 2;
  const arrow = document.createElementNS(ns, 'path');
  arrow.setAttribute('d', `M${cx - 8} ${height - 4} L${cx} ${height - 16} L${cx + 8} ${height - 4} Z`);
  arrow.setAttribute('fill', CURRENT);
  arrow.setAttribute('class', 'current-arrow');
  svg.appendChild(arrow);
}

export function renderGrandStaff(el: HTMLElement, spec: GrandSpec): void {
  const width = 320;
  const height = 250;
  const ctx = setup(el, width, height);
  const x = 26;
  const treble = new Stave(x, 10, width - x - 8).addClef('treble');
  const bass = new Stave(x, 120, width - x - 8).addClef('bass');
  treble.setContext(ctx).draw();
  bass.setContext(ctx).draw();
  new StaveConnector(treble, bass).setType('brace').setContext(ctx).draw();
  new StaveConnector(treble, bass).setType('singleLeft').setContext(ctx).draw();
  new StaveConnector(treble, bass).setType('singleRight').setContext(ctx).draw();

  const columns = Math.max(spec.treble.length, spec.bass.length);
  const voiceFor = (clef: Clef, notes: (Note | null)[]) => {
    const tickables = Array.from({ length: columns }, (_, i) => {
      const n = notes[i];
      if (!n) return new GhostNote({ duration: 'q' });
      // Bass labels go above their notes, so labels sit in the gap between the staves.
      return makeNote(clef, [n], { single: false, color: spec.colors?.[i], label: spec.labels?.[i], labelAbove: clef === 'bass' });
    });
    const v = new Voice({ num_beats: columns, beat_value: 4 });
    v.setMode(Voice.Mode.SOFT);
    v.addTickables(tickables);
    return v;
  };
  const tv = voiceFor('treble', spec.treble);
  const bv = voiceFor('bass', spec.bass);
  const available = treble.getNoteEndX() - treble.getNoteStartX() - 20;
  new Formatter().joinVoices([tv]).joinVoices([bv]).format([tv, bv], available);
  tv.draw(ctx, treble);
  bv.draw(ctx, bass);
  finish(el, width, height, spec.label);
}
