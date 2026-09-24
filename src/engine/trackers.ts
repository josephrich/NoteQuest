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
  // 'heard': the first quick reading. 'sure': the same note has since held steady like a piano note
  // (see NoteTracker), so it is safe to tell him he played it even if it's wrong.
  stage: 'heard' | 'sure';
}

// Confirms a single note once several consecutive pitch readings agree. The clarity bar is high
// because when a previous note is still ringing, the mixture reads as a low-clarity "phantom"
// pitch (often an octave or fifth below both notes) for a few frames.
//
// A hard key strike can register as two attacks ~100ms apart (seen on a real iPad), so a repeat of
// the same note within `repeatMs` of the previous one is treated as the same key press.
//
// Voices: speech often has a clear pitch too, so a parent talking can read as a note. A piano note
// is different in two ways: its pitch is locked from the moment it's struck, and it only gets
// quieter. A voice drifts in pitch and swells in volume. So each note is reported twice: 'heard' as
// soon as it's confirmed, and 'sure' once it has held for `sureMs` with a steady pitch and no swell.
// Lessons accept a right note when it's heard, but only mark a wrong note once it's sure.
export class NoteTracker {
  refA4: number;
  private readonly minClarity: number;
  private readonly confirmFrames: number;
  private readonly settleMs: number;
  private readonly repeatMs: number;
  private readonly sureMs: number;
  private readonly maxDriftCents: number;
  private last: { midi: number; onsetT: number } | null = null;
  private onsetT: number | null = null;
  private candidate: { midi: number; count: number; firstT: number } | null = null;
  // Readings of the current candidate note, and levels since the attack.
  private readings: number[] = [];
  private levels: { t: number; rms: number }[] = [];
  // After 'heard': still watching the note to see if it is piano-like.
  private following: NoteEvent | null = null;
  private done = false;

  constructor({ refA4 = 440, minClarity = 0.9, confirmFrames = 3, settleMs = 25, repeatMs = 250, sureMs = 120, maxDriftCents = 15 } = {}) {
    this.refA4 = refA4;
    this.minClarity = minClarity;
    this.confirmFrames = confirmFrames;
    this.settleMs = settleMs;
    this.repeatMs = repeatMs;
    this.sureMs = sureMs;
    this.maxDriftCents = maxDriftCents;
  }

  reset(): void {
    this.onsetT = null;
    this.candidate = null;
    this.readings = [];
    this.levels = [];
    this.following = null;
    this.done = false;
  }

  update({ t, onset, silent, pitch, rms = 0 }: { t: number; onset: boolean; silent: boolean; pitch: Pitch | null; rms?: number }): NoteEvent | null {
    // A second attack on the note being followed is the same key press (see repeatMs), not a new note.
    const reattack = onset && this.following !== null && t - this.following.onsetT < this.repeatMs && this.readsAs(pitch, this.following.midi);
    if (onset && !reattack) {
      this.reset();
      this.onsetT = t;
    } else if (silent) {
      this.reset();
      return null;
    }
    if (this.onsetT !== null) this.levels.push({ t, rms });
    if (this.following) return this.follow(t, pitch);
    if (this.done) return null;
    if (this.onsetT !== null && t - this.onsetT < this.settleMs) return null;
    if (!pitch || pitch.clarity < this.minClarity) {
      this.candidate = null;
      this.readings = [];
      return null;
    }
    const mf = freqToMidiFloat(pitch.freq, this.refA4);
    const midi = Math.round(mf);
    if (this.candidate && this.candidate.midi === midi) this.candidate.count++;
    else {
      this.candidate = { midi, count: 1, firstT: t };
      this.readings = [];
    }
    this.readings.push(mf);
    if (this.candidate.count < this.confirmFrames) return null;
    this.done = true;
    const onsetT = this.onsetT ?? this.candidate.firstT;
    const echo = this.last !== null && this.last.midi === midi && onsetT - this.last.onsetT < this.repeatMs;
    this.last = { midi, onsetT };
    if (echo) return null;
    const ev: NoteEvent = { midi, cents: Math.round((mf - midi) * 100), freq: pitch.freq, onsetT, t, stage: 'heard' };
    this.following = ev;
    return ev;
  }

  private readsAs(pitch: Pitch | null, midi: number): boolean {
    return pitch !== null && pitch.clarity >= this.minClarity && Math.round(freqToMidiFloat(pitch.freq, this.refA4)) === midi;
  }

  private follow(t: number, pitch: Pitch | null): NoteEvent | null {
    const ev = this.following!;
    const mf = pitch && pitch.clarity >= this.minClarity ? freqToMidiFloat(pitch.freq, this.refA4) : null;
    if (mf === null || Math.round(mf) !== ev.midi) {
      // The note faded, changed or wobbled before it could prove itself: not sure.
      this.following = null;
      return null;
    }
    this.readings.push(mf);
    if (t - this.candidate!.firstT < this.sureMs) return null;
    this.following = null;
    return this.pianoLike() ? { ...ev, t, stage: 'sure' } : null;
  }

  private pianoLike(): boolean {
    // Pitch locked: every reading within a small band.
    const drift = (Math.max(...this.readings) - Math.min(...this.readings)) * 100;
    if (drift > this.maxDriftCents) return false;
    // Needs a real attack that peaks early and is already fading: a held voice stays loud.
    if (this.onsetT === null || this.levels.length < 2) return false;
    const peak = this.levels.reduce((a, b) => (b.rms > a.rms ? b : a));
    const now = this.levels[this.levels.length - 1].rms;
    return peak.t - this.onsetT <= 100 && now <= 0.92 * peak.rms;
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
