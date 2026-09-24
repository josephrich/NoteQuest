// The treble clef outline, taken from the Bravura music font bundled with VexFlow.
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../../node_modules/vexflow/build/cjs/vexflow-font-bravura.js', import.meta.url), 'utf8');
const o = src.match(/gClef:\{x_min[^}]*o:"([^"]+)"/)[1];
// VexFlow outline: m x y | l x y | b x y c1x c1y c2x c2y (end point first) | q x y cx cy | z ; y is up.
const t = o.trim().split(/\s+/);
let d = '', i = 0;
const n = () => Number(t[i++]);
const f = (x, y) => `${x} ${-y}`;
while (i < t.length) {
  const c = t[i++];
  if (c === 'm') { const x = n(), y = n(); d += `M${f(x, y)}`; }
  else if (c === 'l') { const x = n(), y = n(); d += `L${f(x, y)}`; }
  else if (c === 'b') { const x = n(), y = n(), a = n(), b = n(), c2 = n(), e = n(); d += `C${f(a, b)} ${f(c2, e)} ${f(x, y)}`; }
  else if (c === 'q') { const x = n(), y = n(), a = n(), b = n(); d += `Q${f(a, b)} ${f(x, y)}`; }
  else if (c === 'z') d += 'Z';
}
export const CLEF = d;
