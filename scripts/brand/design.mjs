// The Clefwing logo: a treble clef with a pair of dragon wings. Everything is generated from this
// file by render.mjs.
import { CLEF } from './clef.mjs';

// One raised dragon wing in local coordinates (origin at the shoulder, y down, pointing right):
// the arm runs to the wrist, long fingers fan up and out to sharp tips, the membrane is
// scalloped between them.
const WING = [
  'M-140 -10', // root tucked behind the clef
  'Q-60 -40 0 -60',
  'C120 -200 220 -300 330 -330', // arm to the wrist
  'C360 -480 380 -620 430 -780', // first finger up to the top tip
  'Q520 -560 730 -620', // scallop
  'Q690 -430 880 -340',
  'Q720 -200 780 -30',
  'Q500 -60 360 50',
  'Q220 20 110 70',
  'Q-20 90 -140 -10Z',
].join(' ');
const BONES = 'M330 -330 Q520 -470 730 -620 M330 -330 Q600 -360 880 -340 M330 -330 Q560 -180 780 -30';

// The clef's visual centre line and where the wings join it.
const AXIS = 470;
const SHOULDER = { dx: 70, y: -1150 };
const WING_SCALE = 1.18;

export const BOX = { x: -660, y: -2130, w: 2260, h: 3120 };

const GOLD = `<linearGradient id="cw-gold" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#ffe9a8"/><stop offset="0.5" stop-color="#ffc542"/><stop offset="1" stop-color="#f0921a"/></linearGradient>
<linearGradient id="cw-wing" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd66e"/><stop offset="1" stop-color="#f28c1a"/></linearGradient>`;

export function mark(bg, id = 'cw') {
  const wing = (flip) =>
    `<g transform="translate(${flip ? AXIS - SHOULDER.dx : AXIS + SHOULDER.dx} ${SHOULDER.y}) scale(${flip ? -WING_SCALE : WING_SCALE} ${WING_SCALE})">
      <path d="${WING}" fill="url(#${id}-wing)"/>
      <path d="${BONES}" fill="none" stroke="black" stroke-width="20" stroke-linecap="round"/>
    </g>`;
  // Wings are cut away around the clef (and along the finger bones) with a mask, so the clef sits
  // cleanly in front on any background.
  return `<mask id="${id}-cut" maskUnits="userSpaceOnUse" x="-3000" y="-4000" width="6000" height="7000">
    <rect x="-3000" y="-4000" width="6000" height="7000" fill="white"/>
    <path d="${CLEF}" fill="black" stroke="black" stroke-width="56" stroke-linejoin="round"/>
    ${[false, true].map((flip) => `<g transform="translate(${flip ? AXIS - SHOULDER.dx : AXIS + SHOULDER.dx} ${SHOULDER.y}) scale(${flip ? -WING_SCALE : WING_SCALE} ${WING_SCALE})"><path d="${BONES}" fill="none" stroke="black" stroke-width="20" stroke-linecap="round"/></g>`).join('')}
  </mask>
  <g mask="url(#${id}-cut)">${[false, true].map((flip) => `<g transform="translate(${flip ? AXIS - SHOULDER.dx : AXIS + SHOULDER.dx} ${SHOULDER.y}) scale(${flip ? -WING_SCALE : WING_SCALE} ${WING_SCALE})"><path d="${WING}" fill="url(#${id}-wing)"/></g>`).join('')}</g>
  <path d="${CLEF}" fill="url(#${id}-gold)"/>`;
}

export function icon(size = 1024, frac = 0.84) {
  const s = (size * frac) / BOX.h;
  const tx = (size - BOX.w * s) / 2 - BOX.x * s;
  const ty = (size - BOX.h * s) / 2 - BOX.y * s;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <radialGradient id="bg" cx="0.5" cy="0.38" r="0.8"><stop offset="0" stop-color="#6a42ee"/><stop offset="0.65" stop-color="#3b1ea3"/><stop offset="1" stop-color="#1f0f58"/></radialGradient>
    ${GOLD}
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  <g transform="translate(${tx} ${ty}) scale(${s})">${mark()}</g>
</svg>`;
}

// Transparent mark for light backgrounds.
export function markSvg(bg = '#fff8ec') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${BOX.x} ${BOX.y} ${BOX.w} ${BOX.h}"><defs>${GOLD}</defs>${mark()}</svg>`;
}

