// Renders notes on a single stave with VexFlow. The SVG scales to its container.
import { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } from 'vexflow';
import { vexKey, type Clef, type KeyName, type Note } from './music';

export interface StaffSpec {
  clef: Clef;
  key?: KeyName;
  // Each group is one note or chord, drawn left to right.
  groups: Note[][];
  // Optional colour per group (e.g. current / done / wrong).
  colors?: (string | undefined)[];
  label: string;
}

// Logical drawing size; the SVG is scaled to fill its container. A single note gets a narrower
// stave so it's drawn larger.
const HEIGHT = 150;

export function renderStaff(el: HTMLElement, spec: StaffSpec): void {
  el.innerHTML = '';
  const width = spec.groups.length === 1 ? 220 : 320;
  const renderer = new Renderer(el as HTMLDivElement, Renderer.Backends.SVG);
  renderer.resize(width, HEIGHT);
  const ctx = renderer.getContext();
  const stave = new Stave(8, 22, width - 16);
  stave.addClef(spec.clef);
  if (spec.key) stave.addKeySignature(spec.key);
  stave.setContext(ctx).draw();

  const single = spec.groups.length === 1;
  const notes = spec.groups.map((group, i) => {
    const n = new StaveNote({ clef: spec.clef, keys: group.map(vexKey), duration: single ? 'w' : 'q', align_center: single });
    // With a key signature showing, notes that follow it need no accidental.
    group.forEach((g, j) => {
      if (g.acc !== 0 && !spec.key) n.addModifier(new Accidental(g.acc === 1 ? '#' : 'b'), j);
    });
    const color = spec.colors?.[i];
    if (color) n.setStyle({ fillStyle: color, strokeStyle: color });
    return n;
  });
  const voice = new Voice({ num_beats: Math.max(1, notes.length), beat_value: 4 });
  voice.setMode(Voice.Mode.SOFT);
  voice.addTickables(notes);
  const available = stave.getNoteEndX() - stave.getNoteStartX() - 20;
  new Formatter().joinVoices([voice]).format([voice], available);
  voice.draw(ctx, stave);

  const svg = el.querySelector('svg');
  if (svg) {
    svg.setAttribute('viewBox', `0 0 ${width} ${HEIGHT}`);
    svg.setAttribute('width', '100%');
    svg.removeAttribute('height');
    svg.removeAttribute('style');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', spec.label);
  }
}
