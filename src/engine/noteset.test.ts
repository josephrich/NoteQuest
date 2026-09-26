import { test } from 'vitest';
import assert from 'node:assert/strict';
import { magnitudeSpectrum } from './fft';
import { midiName } from './music';
import { OnsetDetector, NoteSetTracker } from './trackers';
import { addPiano, addVoice, seededRandom } from './test-synth';

const SR = 48000;
const FFT = 8192;

function* frames(sig: Float32Array, stepMs = 16) {
  const step = Math.round((stepMs / 1000) * SR);
  for (let end = FFT; end <= sig.length; end += step) {
    const newest = sig.subarray(end - 1024, end);
    let s = 0;
    for (const v of newest) s += v * v;
    yield { t: (end / SR) * 1000, rms: Math.sqrt(s / newest.length), window: sig.subarray(end - FFT, end) };
  }
}

// Every note found, in the order found.
function listen(sig: Float32Array, candidates: number[]): number[] {
  const onsets = new OnsetDetector();
  const tracker = new NoteSetTracker({ sampleRate: SR, fftSize: FFT });
  tracker.setCandidates(candidates);
  const found: number[] = [];
  for (const f of frames(sig)) {
    const fresh = tracker.update({ t: f.t, onset: onsets.update(f.t, f.rms), mags: magnitudeSpectrum(f.window), rms: f.rms });
    if (fresh) found.push(...fresh);
  }
  return found;
}
const names = (ms: number[]) => [...ms].sort((a, b) => a - b).map(midiName).join(' ');

// The chords and key sets the mini-lessons show.
const CARDS = [
  [60, 64, 67],
  [65, 69, 72],
  [67, 71, 74],
  [69, 72, 76],
  [62, 65, 69],
  [62, 66, 69],
  [64, 68, 71],
  [48, 52, 55],
  [43, 47, 50],
  [45, 48, 52],
];

test('a chord played all at once lights all its keys', () => {
  for (const c of CARDS) {
    for (const gain of [0.2, 0.06]) {
      const sig = new Float32Array(Math.round(1.4 * SR));
      addPiano(sig, c, { start: 0.3, gain });
      assert.equal(names(listen(sig, c)), names(c), `${names(c)} at ${gain}`);
    }
  }
}, 60_000);

test('notes added one at a time, the others still ringing, are all found', () => {
  for (const c of CARDS) {
    const sig = new Float32Array(Math.round(2.6 * SR));
    c.forEach((m, i) => addPiano(sig, [m], { start: 0.3 + i * 0.6 }));
    assert.equal(names(listen(sig, c)), names(c), names(c));
  }
}, 60_000);

test('one note lights only its own key, not its octave', () => {
  const sig = new Float32Array(Math.round(1.4 * SR));
  addPiano(sig, [60], { start: 0.3 });
  assert.equal(names(listen(sig, [60, 72, 64])), 'C4');
}, 60_000);

test('notes not on the card, and talking, light nothing', () => {
  let sig = new Float32Array(Math.round(1.4 * SR));
  addPiano(sig, [62, 65, 69], { start: 0.3 }); // D minor
  assert.equal(names(listen(sig, [60, 64, 67])), '', 'D minor lit C major keys');
  const rnd = seededRandom(9);
  let lit = 0;
  for (let i = 0; i < 60; i++) {
    sig = new Float32Array(Math.round(1.2 * SR));
    const f0 = 100 + rnd() * 250;
    addVoice(sig, { f0, f1: f0 * 2 ** (((rnd() - 0.5) * 6) / 12), start: 0.3, duration: 0.2 + rnd() * 0.5, swell: 0.03 + rnd() * 0.12, vibratoCents: rnd() * 25, gain: 0.05 + rnd() * 0.3 });
    if (listen(sig, CARDS[i % CARDS.length]).length) lit++;
  }
  assert.ok(lit <= 3, `${lit} of 60 voices lit a key`);
}, 60_000);
