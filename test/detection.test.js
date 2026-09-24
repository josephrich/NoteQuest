import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectPitch } from '../src/pitch.js';
import { verifyChord } from '../src/chord.js';
import { magnitudeSpectrum } from '../src/fft.js';
import { freqToMidiFloat, midiName } from '../src/music.js';
import { OnsetDetector, NoteTracker, ChordTracker } from '../src/trackers.js';
import { pianoNotes, addPiano } from './synth.js';

const SR = 48000;
const PITCH_WINDOW = 2048;
const FFT = 8192;

const slice = (buf, startSec, len) => buf.subarray(Math.round(startSec * SR), Math.round(startSec * SR) + len);

test('single notes are detected in the right octave across the grade 1-3 range', () => {
  for (let midi = 41; midi <= 84; midi++) {
    const sig = pianoNotes([midi]);
    const res = detectPitch(slice(sig, 0.08, PITCH_WINDOW), SR);
    assert.ok(res, `no pitch for ${midiName(midi)}`);
    const mf = freqToMidiFloat(res.freq);
    assert.equal(Math.round(mf), midi, `${midiName(midi)} heard as ${midiName(Math.round(mf))}`);
    assert.ok(res.clarity >= 0.9, `${midiName(midi)} clarity only ${res.clarity.toFixed(2)}`);
    assert.ok(Math.abs(mf - midi) < 0.3, `${midiName(midi)} off by ${((mf - midi) * 100).toFixed(0)} cents`);
  }
});

test('a flat piano is matched once calibrated', () => {
  const refA4 = 432; // ~32 cents flat
  const sig = pianoNotes([64], { refA4 });
  const res = detectPitch(slice(sig, 0.08, PITCH_WINDOW), SR);
  assert.equal(Math.round(freqToMidiFloat(res.freq, refA4)), 64);
});

test('silence gives no pitch', () => {
  assert.equal(detectPitch(new Float32Array(PITCH_WINDOW), SR), null);
});

const spectrumOf = (midis, opts) => magnitudeSpectrum(slice(pianoNotes(midis, opts), 0.1, FFT));

test('correct triads pass verification', () => {
  const chords = [
    [60, 64, 67], // C major
    [65, 69, 72], // F major
    [67, 71, 74], // G major
    [62, 66, 69], // D major
    [64, 67, 72], // C major 1st inversion
    [48, 52, 55], // C major, bass clef
    [55, 59, 62], // G major, bass clef
  ];
  for (const c of chords) {
    const res = verifyChord(spectrumOf(c), SR, FFT, c);
    assert.ok(res.pass, `${c.map(midiName)} failed: explained=${res.explained.toFixed(2)} presence=${res.presence.map((p) => p.toFixed(2))}`);
  }
});

test('a wrong note in the chord fails verification', () => {
  const cases = [
    { expected: [60, 64, 67], played: [60, 64, 69] }, // A instead of G
    { expected: [60, 64, 67], played: [60, 65, 67] }, // F instead of E
    { expected: [65, 69, 72], played: [65, 70, 72] }, // Bb instead of A
    { expected: [62, 66, 69], played: [62, 65, 69] }, // forgot the F#
    { expected: [67, 71, 74], played: [67, 72, 74] }, // C instead of B
  ];
  for (const { expected, played } of cases) {
    const res = verifyChord(spectrumOf(played), SR, FFT, expected);
    assert.ok(!res.pass, `${played.map(midiName)} wrongly accepted as ${expected.map(midiName)}`);
  }
});

test('a missing chord note fails verification', () => {
  const res = verifyChord(spectrumOf([60, 64]), SR, FFT, [60, 64, 67]);
  assert.ok(!res.pass);
});

// Simulate the browser frame loop: ~60fps, RMS on the newest 1024 samples.
function* frames(sig, { stepMs = 16 } = {}) {
  const step = Math.round((stepMs / 1000) * SR);
  for (let end = FFT; end <= sig.length; end += step) {
    const newest = sig.subarray(end - 1024, end);
    let s = 0;
    for (const v of newest) s += v * v;
    yield { t: (end / SR) * 1000, rms: Math.sqrt(s / newest.length), window: sig.subarray(end - FFT, end) };
  }
}

test('note tracker reports each played note once', () => {
  const sig = new Float32Array(Math.round(2.2 * SR));
  // Legato-ish: each key is released 30ms after the next one is struck.
  addPiano(sig, [60], { start: 0.3, end: 1.03 });
  addPiano(sig, [67], { start: 1.0, end: 1.63 });
  addPiano(sig, [53], { start: 1.6 });
  const onsets = new OnsetDetector();
  const tracker = new NoteTracker();
  const heard = [];
  for (const f of frames(sig)) {
    const onset = onsets.update(f.t, f.rms);
    const pitch = detectPitch(f.window.subarray(FFT - PITCH_WINDOW), SR);
    const ev = tracker.update({ t: f.t, onset, silent: f.rms < onsets.gate, pitch });
    if (ev) heard.push(ev);
  }
  assert.deepEqual(heard.map((e) => midiName(e.midi)), ['C4', 'G4', 'F3']);
  for (const e of heard) assert.ok(e.t - e.onsetT < 150, `detection took ${e.t - e.onsetT}ms`);
});

test('a double attack on one key press is reported once', () => {
  const tracker = new NoteTracker();
  const pitch = { freq: 349.23, clarity: 0.98 }; // F4
  const events = [];
  // Attack at 0ms, a spurious second attack at 100ms, then a genuine repeat at 600ms.
  for (let t = 0; t <= 900; t += 16) {
    const onset = t === 0 || t === 96 || t === 592;
    const ev = tracker.update({ t, onset, silent: false, pitch });
    if (ev) events.push(ev.onsetT);
  }
  assert.deepEqual(events, [0, 592]);
});

test('chord tracker accepts the right chord and rejects a wrong one', () => {
  const run = (played, expected) => {
    const sig = new Float32Array(Math.round(1.2 * SR));
    addPiano(sig, played, { start: 0.3 });
    const onsets = new OnsetDetector();
    const tracker = new ChordTracker({ sampleRate: SR, fftSize: FFT });
    tracker.setTarget(expected);
    for (const f of frames(sig)) {
      const onset = onsets.update(f.t, f.rms);
      const ev = tracker.update({ t: f.t, onset, mags: magnitudeSpectrum(f.window) });
      if (ev) return ev;
    }
    return null;
  };
  assert.equal(run([60, 64, 67], [60, 64, 67])?.pass, true);
  assert.equal(run([60, 64, 69], [60, 64, 67])?.pass, false);
});
