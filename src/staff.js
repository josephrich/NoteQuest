// Renders a target note or chord on a single stave using VexFlow (loaded globally from vendor/).
import { vexKey, VEX_KEY_SIG } from './music.js';

export function renderTarget(el, target) {
  const { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } = window.Vex.Flow;
  el.innerHTML = '';
  const width = Math.min(el.clientWidth || 320, 420);
  const height = 190;
  const renderer = new Renderer(el, Renderer.Backends.SVG);
  renderer.resize(width, height);
  const ctx = renderer.getContext();
  ctx.scale(1.35, 1.35);
  const staveWidth = width / 1.35 - 10;
  const stave = new Stave(5, 18, staveWidth);
  stave.addClef(target.clef);
  const keySig = target.key ? VEX_KEY_SIG[target.key] : null;
  if (keySig) stave.addKeySignature(keySig);
  stave.setContext(ctx).draw();

  const note = new StaveNote({ clef: target.clef, keys: target.notes.map(vexKey), duration: 'w', align_center: true });
  // With a key signature showing, notes that follow it need no accidental.
  target.notes.forEach((n, i) => {
    if (n.acc !== 0 && !keySig) note.addModifier(new Accidental(n.acc === 1 ? '#' : 'b'), i);
  });
  const voice = new Voice({ num_beats: 4, beat_value: 4 }).addTickables([note]);
  new Formatter().joinVoices([voice]).format([voice], staveWidth - (keySig ? 110 : 70));
  voice.draw(ctx, stave);
  const svg = el.querySelector('svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', target.label);
}
