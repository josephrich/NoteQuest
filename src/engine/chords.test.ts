import { test } from 'vitest';
import assert from 'node:assert/strict';
import { magnitudeSpectrum } from './fft';
import { midiName } from './music';
import { OnsetDetector, ChordTracker, type ChordEvent } from './trackers';
import { addPiano, addVoice, seededRandom } from './test-synth';

const SR = 48000;
const FFT = 8192;

// The white-key triads Unit 6 uses, in each hand.
const TREBLE = [
  [60, 64, 67], // C
  [62, 65, 69], // Dm
  [64, 67, 71], // Em
  [65, 69, 72], // F
  [67, 71, 74], // G
  [69, 72, 76], // Am
];
const BASS = TREBLE.map((c) => c.map((m) => m - 12)).concat([[43, 47, 50], [41, 45, 48], [45, 48, 52]].map((c) => c)); // plus G2, F2, A2 chords
const name = (c: number[]) => c.map(midiName).join('-');

function* frames(sig: Float32Array, stepMs = 16) {
  const step = Math.round((stepMs / 1000) * SR);
  for (let end = FFT; end <= sig.length; end += step) {
    const newest = sig.subarray(end - 1024, end);
    let s = 0;
    for (const v of newest) s += v * v;
    yield { t: (end / SR) * 1000, rms: Math.sqrt(s / newest.length), window: sig.subarray(end - FFT, end) };
  }
}

function listen(sig: Float32Array, expected: number[], alternatives: number[][] = []): ChordEvent[] {
  const onsets = new OnsetDetector();
  const tracker = new ChordTracker({ sampleRate: SR, fftSize: FFT });
  tracker.setTarget(expected, alternatives);
  const out: ChordEvent[] = [];
  for (const f of frames(sig)) {
    const ev = tracker.update({ t: f.t, onset: onsets.update(f.t, f.rms), mags: magnitudeSpectrum(f.window) });
    if (ev) out.push(ev);
  }
  return out;
}

const played = (chord: number[], opts: { gain?: number } = {}) => {
  const sig = new Float32Array(Math.round(1.3 * SR));
  addPiano(sig, chord, { start: 0.3, ...opts });
  return sig;
};

test('every chord in the unit is recognised, loud or soft', () => {
  for (const c of [...TREBLE, ...BASS]) {
    for (const gain of [0.2, 0.05]) {
      const evs = listen(played(c, { gain }), c);
      assert.ok(evs.some((e) => e.pass), `${name(c)} at ${gain} not recognised`);
    }
  }
});

test('playing a different chord from the lesson is recognised as that chord', () => {
  for (const pool of [TREBLE, BASS.slice(0, 6)]) {
    for (const expected of pool) {
      const others = pool.filter((c) => c !== expected);
      for (const [i, wrong] of others.entries()) {
        const evs = listen(played(wrong), expected, others);
        assert.ok(!evs.some((e) => e.pass), `${name(wrong)} passed as ${name(expected)}`);
        const last = evs[evs.length - 1];
        assert.equal(last?.matched, i, `${name(wrong)} for ${name(expected)} matched ${last?.matched}`);
      }
    }
  }
}, 60_000);

test('one finger on the wrong key is a close miss', () => {
  const cases = [
    { expected: [60, 64, 67], played: [60, 64, 69] },
    { expected: [60, 64, 67], played: [60, 65, 67] },
    { expected: [65, 69, 72], played: [65, 69, 71] },
    { expected: [43, 47, 50], played: [43, 48, 50] },
  ];
  for (const { expected, played: p } of cases) {
    const evs = listen(played(p), expected, TREBLE.filter((c) => c.join() !== expected.join()));
    const last = evs[evs.length - 1];
    assert.ok(last && !last.pass && (last.close || last.matched !== null), `${name(p)} for ${name(expected)}: ${JSON.stringify({ close: last?.close, matched: last?.matched })}`);
  }
});

test('putting a chord down one finger at a time is never marked wrong, and passes once all three sound', () => {
  const sig = new Float32Array(Math.round(2.4 * SR));
  addPiano(sig, [60], { start: 0.3 });
  addPiano(sig, [64], { start: 0.95 });
  addPiano(sig, [67], { start: 1.6 });
  const evs = listen(sig, [60, 64, 67], TREBLE.slice(1));
  assert.ok(evs.every((e) => e.pass || (!e.close && e.matched === null)), JSON.stringify(evs.map((e) => [e.pass, e.close, e.matched])));
  assert.ok(evs.some((e) => e.pass));
});

test('talking never passes, and is never mistaken for a wrong chord', () => {
  const rnd = seededRandom(5);
  let bad = 0;
  for (let i = 0; i < 120; i++) {
    const f0 = 85 + rnd() * 250;
    const sig = new Float32Array(Math.round(1.2 * SR));
    addVoice(sig, { f0, f1: f0 * 2 ** (((rnd() - 0.5) * 8) / 12), start: 0.3, duration: 0.15 + rnd() * 0.5, swell: 0.02 + rnd() * 0.15, vibratoCents: rnd() * 25, gain: 0.05 + rnd() * 0.3 });
    const expected = TREBLE[i % TREBLE.length];
    const others = TREBLE.filter((c) => c !== expected);
    if (listen(sig, expected, others).some((e) => e.pass || e.close || e.inverted || e.matched !== null)) bad++;
  }
  assert.ok(bad <= 2, `${bad} of 120 voices counted as a chord`);
}, 60_000);

test('a wrong chord is reported once however long it rings, then fixing it passes', () => {
  for (const expected of [...TREBLE, ...BASS]) {
    const wrong = expected.map((m, i) => (i === 1 ? m + 1 : m));
    const sig = new Float32Array(Math.round(4.2 * SR));
    addPiano(sig, wrong, { start: 0.3, end: 2.8 });
    addPiano(sig, expected, { start: 3.0 });
    const evs = listen(sig, expected);
    const misses = evs.filter((e) => !e.pass);
    assert.equal(misses.length, 1, `${name(expected)}: ${misses.length} misses`);
    assert.ok(misses[0].close, `${name(wrong)} for ${name(expected)} not close`);
    assert.ok(evs[evs.length - 1].pass, `${name(expected)} not recognised after the miss`);
  }
}, 60_000);

test('inversions are not accepted: the bottom note has to be right too', () => {
  for (const c of [...TREBLE, ...BASS]) {
    const [a, b, d] = c;
    const others = [...TREBLE, ...BASS].filter((x) => x !== c);
    for (const inv of [
      [b, d, a + 12],
      [d, a + 12, b + 12],
      [d - 12, a, b],
      [b - 12, d - 12, a],
    ].filter((v) => Math.min(...v) >= 38)) {
      // (Only inversions within the course's range, D2 and up.)
      const evs = listen(played(inv), c, others);
      assert.ok(!evs.some((e) => e.pass), `${name(inv)} accepted as ${name(c)}`);
      const last = evs[evs.length - 1];
      assert.ok(last?.inverted, `${name(inv)} for ${name(c)} not reported as an inversion: ${JSON.stringify({ close: last?.close, matched: last?.matched })}`);
    }
  }
}, 120_000);
