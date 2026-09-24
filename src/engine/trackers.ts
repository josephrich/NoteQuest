// Turn a stream of analysis frames into discrete "the player played X" events.
// Pure logic (no Web Audio), so it can be tested in Node with synthetic frames.
import { freqToMidiFloat } from './music';
import { verifyChord, type ChordCheck } from './chord';
import type { Pitch } from './pitch';

// Detects the attack of a new piano note from a jump in short-window RMS.
export class OnsetDetector {
  noiseFloor: number;
  private history: { t: number; rms: number }[] = [];
  private lastOnset = -Infinity;
  private readonly minGate: number;
  private readonly rise: number;
  private readonly lookbackMs: number;
  private readonly refractoryMs: number;

  constructor({ minGate = 0.003, rise = 1.8, lookbackMs = 120, refractoryMs = 90 } = {}) {
    this.minGate = minGate;
    this.rise = rise;
    this.lookbackMs = lookbackMs;
    this.refractoryMs = refractoryMs;
    this.noiseFloor = minGate / 4;
  }

  get gate(): number {
    return Math.max(this.minGate, this.noiseFloor * 4);
  }

  update(t: number, rms: number): boolean {
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

export interface NoteEvent {
  midi: number;
  cents: number;
  freq: number;
  onsetT: number;
  t: number;
}

// Confirms a single note once several consecutive pitch readings agree. The clarity bar is high
// because when a previous note is still ringing, the mixture reads as a low-clarity "phantom"
// pitch (often an octave or fifth below both notes) for a few frames.
//
// A hard key strike can register as two attacks ~100ms apart (seen on a real iPad), so a repeat of
// the same note within `repeatMs` of the previous one is treated as the same key press.
export class NoteTracker {
  refA4: number;
  private readonly minClarity: number;
  private readonly confirmFrames: number;
  private readonly settleMs: number;
  private readonly repeatMs: number;
  private last: { midi: number; onsetT: number } | null = null;
  private onsetT: number | null = null;
  private candidate: { midi: number; count: number; firstT: number } | null = null;
  private done = false;

  constructor({ refA4 = 440, minClarity = 0.9, confirmFrames = 3, settleMs = 25, repeatMs = 250 } = {}) {
    this.refA4 = refA4;
    this.minClarity = minClarity;
    this.confirmFrames = confirmFrames;
    this.settleMs = settleMs;
    this.repeatMs = repeatMs;
  }

  reset(): void {
    this.onsetT = null;
    this.candidate = null;
    this.done = false;
  }

  update({ t, onset, silent, pitch }: { t: number; onset: boolean; silent: boolean; pitch: Pitch | null }): NoteEvent | null {
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
    const echo = this.last !== null && this.last.midi === midi && onsetT - this.last.onsetT < this.repeatMs;
    this.last = { midi, onsetT };
    if (echo) return null;
    return { midi, cents: Math.round((mf - midi) * 100), freq: pitch.freq, onsetT, t };
  }
}

export interface ChordEvent extends ChordCheck {
  onsetT: number;
  t: number;
}

// Averages spectra after an onset and checks them against the expected chord.
export class ChordTracker {
  refA4: number;
  private readonly sampleRate: number;
  private readonly fftSize: number;
  private readonly startMs: number;
  private readonly decideAfterMs: number;
  private readonly giveUpMs: number;
  private target: number[] = [];
  private onsetT: number | null = null;
  private done = true;
  private acc = new Float64Array(0);
  private count = 0;

  constructor({ refA4 = 440, sampleRate = 48000, fftSize = 8192, startMs = 40, decideAfterMs = 110, giveUpMs = 500 } = {}) {
    this.refA4 = refA4;
    this.sampleRate = sampleRate;
    this.fftSize = fftSize;
    this.startMs = startMs;
    this.decideAfterMs = decideAfterMs;
    this.giveUpMs = giveUpMs;
  }

  setTarget(midis: number[]): void {
    this.target = midis;
    this.onsetT = null;
    this.done = true;
  }

  update({ t, onset, mags }: { t: number; onset: boolean; mags: ArrayLike<number> }): ChordEvent | null {
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
