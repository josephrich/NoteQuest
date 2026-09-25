// Runs the microphone analysis loop and turns frames into note / chord events.
// One Listener lives for the whole app session; screens subscribe to what they need.
import { Mic, FFT_SIZE } from './audio';
import { detectPitch, type Pitch } from './pitch';
import { OnsetDetector, NoteTracker, ChordTracker, type NoteEvent, type ChordEvent } from './trackers';

export interface LiveLevel {
  rms: number;
  pitch: Pitch | null;
  gate: number;
}

type NoteListener = (ev: NoteEvent) => void;
type ChordListener = (ev: ChordEvent) => void;
type LevelListener = (level: LiveLevel) => void;

export class Listener {
  private mic = new Mic();
  private onsets = new OnsetDetector();
  private notes = new NoteTracker();
  private chords = new ChordTracker();
  private noteSubs = new Set<NoteListener>();
  private chordSubs = new Set<ChordListener>();
  private levelSubs = new Set<LevelListener>();
  private chordTarget: number[] | null = null;
  private raf = 0;
  private frame = 0;
  private starting: Promise<void> | null = null;
  private refA4 = 440;
  // While the app itself is talking (read-aloud), notes aren't reported, until shortly after it stops.
  private heldUntil = 0;

  get running(): boolean {
    return this.mic.running;
  }

  get sampleRate(): number {
    return this.mic.sampleRate;
  }

  diagnostics() {
    return this.mic.diagnostics();
  }

  setRefA4(ref: number): void {
    this.refA4 = ref;
    this.notes.refA4 = ref;
    this.chords.refA4 = ref;
  }

  // Call from a tap handler. Safe to call repeatedly.
  start({ raw = true } = {}): Promise<void> {
    if (this.mic.running) return this.mic.resume();
    if (!this.starting) {
      this.starting = this.mic
        .start({ raw })
        .then(() => {
          this.onsets = new OnsetDetector();
          this.notes = new NoteTracker({ refA4: this.refA4 });
          this.chords = new ChordTracker({ refA4: this.refA4, sampleRate: this.mic.sampleRate, fftSize: FFT_SIZE });
          if (this.chordTarget) this.chords.setTarget(this.chordTarget);
          document.addEventListener('visibilitychange', this.onVisibility);
          this.loop();
        })
        .finally(() => {
          this.starting = null;
        });
    }
    return this.starting;
  }

  async stop(): Promise<void> {
    cancelAnimationFrame(this.raf);
    document.removeEventListener('visibilitychange', this.onVisibility);
    await this.mic.stop();
  }

  // Each note arrives once, when first heard. With `sure: true` the listener also gets the later
  // 'sure' event for piano-like notes (see NoteTracker), so it can treat wrong notes more carefully.
  onNote(fn: NoteListener, { sure = false } = {}): () => void {
    const sub: NoteListener = sure ? fn : (ev) => ev.stage === 'heard' && fn(ev);
    this.noteSubs.add(sub);
    return () => this.noteSubs.delete(sub);
  }

  private emitNote(ev: NoteEvent) {
    this.noteSubs.forEach((fn) => fn(ev));
  }

  onLevel(fn: LevelListener): () => void {
    this.levelSubs.add(fn);
    return () => this.levelSubs.delete(fn);
  }

  // Chord checking needs to know what to listen for; pass null to stop.
  listenForChord(midis: number[] | null, fn?: ChordListener): () => void {
    this.chordTarget = midis;
    if (midis) this.chords.setTarget(midis);
    if (fn) this.chordSubs.add(fn);
    return () => {
      if (fn) this.chordSubs.delete(fn);
      this.chordTarget = null;
    };
  }

  // Stop reporting notes (e.g. while reading aloud), and start again shortly after release, once
  // the voice has died away.
  hold(): void {
    this.heldUntil = Infinity;
  }

  release(): void {
    if (this.heldUntil === Infinity) this.heldUntil = performance.now() + 400;
  }

  get held(): boolean {
    return performance.now() < this.heldUntil;
  }

  // Pretend a note was played (used by automated tests via ?debug).
  simulate(midi: number): void {
    const t = performance.now();
    const ev: NoteEvent = { midi, cents: 0, freq: 440 * 2 ** ((midi - 69) / 12), onsetT: t, t, stage: 'heard' };
    this.emitNote(ev);
    this.emitNote({ ...ev, stage: 'sure' });
  }

  private onVisibility = () => {
    if (document.visibilityState === 'visible') void this.mic.resume();
  };

  private loop = () => {
    if (!this.mic.running) return;
    const f = this.mic.read();
    const onset = this.onsets.update(f.t, f.rms);
    const pitch = detectPitch(f.pitchWindow, this.mic.sampleRate);
    if (this.held) {
      this.notes.reset();
    } else {
      const noteEvent = this.notes.update({ t: f.t, onset, silent: f.rms < this.onsets.gate, pitch, rms: f.rms });
      if (noteEvent) this.emitNote(noteEvent);
    }
    if (this.chordTarget) {
      const chordEvent = this.chords.update({ t: f.t, onset, mags: f.mags });
      if (chordEvent) this.chordSubs.forEach((fn) => fn(chordEvent));
    }
    if (this.frame++ % 3 === 0 && this.levelSubs.size) {
      const level = { rms: f.rms, pitch, gate: this.onsets.gate };
      this.levelSubs.forEach((fn) => fn(level));
    }
    this.raf = requestAnimationFrame(this.loop);
  };
}

export const listener = new Listener();
