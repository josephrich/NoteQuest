// Turn a stream of analysis frames into discrete "the player played X" events.
// Pure logic (no Web Audio), so it can be tested in Node with synthetic frames.
import { freqToMidiFloat } from './music.js';
import { verifyChord } from './chord.js';

// Detects the attack of a new piano note from a jump in short-window RMS.
export class OnsetDetector {
  constructor({ minGate = 0.003, rise = 1.8, lookbackMs = 120, refractoryMs = 90 } = {}) {
    Object.assign(this, { minGate, rise, lookbackMs, refractoryMs });
    this.noiseFloor = minGate / 4;
    this.history = [];
    this.lastOnset = -Infinity;
  }

  get gate() {
    return Math.max(this.minGate, this.noiseFloor * 4);
  }

  update(t, rms) {
    if (rms < this.gate) this.noiseFloor = 0.97 * this.noiseFloor + 0.03 * rms;
    this.history = this.history.filter((h) => t - h.t <= this.lookbackMs);
    const prior = this.history.filter((h) => t - h.t >= 15);
    const floor = prior.length ? Math.min(...prior.map((h) => h.rms)) : 0;
    this.history.push({ t, rms });
    const onset = rms >= this.gate && rms > this.rise * Math.max(floor, this.noiseFloor) && t - this.lastOnset >= this.refractoryMs;
    if (onset) {
      // Measure the next attack against levels after this one, not the silence before it.
      this.lastOnset = t;
      this.history = [{ t, rms }];
    }
    return onset;
  }
}

// Confirms a single note once several consecutive pitch readings agree. The clarity bar is high
// because when a previous note is still ringing, the mixture reads as a low-clarity "phantom"
// pitch (often an octave or fifth below both notes) for a few frames.
//
// A hard key strike can register as two attacks ~100ms apart (seen on a real iPad), so a repeat of
// the same note within `repeatMs` of the previous one is treated as the same key press.
export class NoteTracker {
  constructor({ refA4 = 440, minClarity = 0.9, confirmFrames = 3, settleMs = 25, repeatMs = 250 } = {}) {
    Object.assign(this, { refA4, minClarity, confirmFrames, settleMs, repeatMs });
    this.last = null;
    this.reset();
  }

  reset() {
    this.onsetT = null;
    this.candidate = null;
    this.done = false;
  }

  // frame: { t, onset, silent, pitch: {freq, clarity} | null }
  update(frame) {
    const { t, onset, silent, pitch } = frame;
    if (onset) {
      this.onsetT = t;
      this.candidate = null;
      this.done = false;
    } else if (silent) {
      this.reset();
      return null;
    }
    if (this.done) return null;
    if (this.onsetT !== null && t - this.onsetT < this.settleMs) return null;
    if (!pitch || pitch.clarity < this.minClarity) {
      this.candidate = null;
      return null;
    }
    const mf = freqToMidiFloat(pitch.freq, this.refA4);
    const midi = Math.round(mf);
    if (this.candidate && this.candidate.midi === midi) this.candidate.count++;
    else this.candidate = { midi, count: 1, firstT: t };
    if (this.candidate.count < this.confirmFrames) return null;
    this.done = true;
    const onsetT = this.onsetT ?? this.candidate.firstT;
    const echo = this.last && this.last.midi === midi && onsetT - this.last.onsetT < this.repeatMs;
    this.last = { midi, onsetT };
    if (echo) return null;
    return { midi, cents: Math.round((mf - midi) * 100), freq: pitch.freq, onsetT, t };
  }
}

// Averages spectra after an onset and checks them against the expected chord.
export class ChordTracker {
  constructor({ refA4 = 440, sampleRate = 48000, fftSize = 8192, startMs = 40, decideAfterMs = 110, giveUpMs = 500 } = {}) {
    Object.assign(this, { refA4, sampleRate, fftSize, startMs, decideAfterMs, giveUpMs });
    this.target = [];
    this.onsetT = null;
    this.done = true;
  }

  setTarget(midis) {
    this.target = midis;
    this.onsetT = null;
    this.done = true;
  }

  // frame: { t, onset, mags }
  update(frame) {
    const { t, onset, mags } = frame;
    if (onset) {
      this.onsetT = t;
      this.done = false;
      this.acc = new Float64Array(mags.length);
      this.count = 0;
    }
    if (this.done || this.onsetT === null) return null;
    const dt = t - this.onsetT;
    if (dt < this.startMs) return null;
    for (let i = 0; i < mags.length; i++) this.acc[i] += mags[i];
    this.count++;
    if (dt < this.decideAfterMs) return null;
    const avg = this.acc.map((v) => v / this.count);
    const res = verifyChord(avg, this.sampleRate, this.fftSize, this.target, { refA4: this.refA4 });
    if (res.pass || dt >= this.giveUpMs) {
      this.done = true;
      return { ...res, onsetT: this.onsetT, t };
    }
    return null;
  }
}
