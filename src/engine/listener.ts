// Runs the microphone analysis loop and turns frames into note / chord events.
// One Listener lives for the whole app session; screens subscribe to what they need.
import { Mic, FFT_SIZE } from './audio';
import { detectPitch, type Pitch } from './pitch';
import { OnsetDetector, NoteTracker, ChordTracker, NoteSetTracker, type NoteEvent, type ChordEvent } from './trackers';

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
  private noteSet = new NoteSetTracker();
  private noteSetSubs = new Set<(midis: number[]) => void>();
  private chordAlternatives: number[][] = [];
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
    this.noteSet.refA4 = ref;
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
          this.noteSet = new NoteSetTracker({ refA4: this.refA4, sampleRate: this.mic.sampleRate, fftSize: FFT_SIZE });
          if (this.chordTarget) this.chords.setTarget(this.chordTarget, this.chordAlternatives);
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

  // Chord checking needs to know what to listen for (and, optionally, other chords to recognise if
  // it's not that one); pass null to stop.
  listenForChord(midis: number[] | null, fn?: ChordListener, alternatives: number[][] = []): () => void {
    this.chordTarget = midis;
    this.chordAlternatives = alternatives;
    if (midis) this.chords.setTarget(midis, alternatives);
    if (fn) this.chordSubs.add(fn);
    return () => {
      if (fn) this.chordSubs.delete(fn);
      this.chordTarget = null;
    };
  }

  // Listen for any of these notes, played alone or together (see NoteSetTracker): each is reported
  // once, when first heard. Pass null to stop.
  listenForNotes(midis: number[] | null, fn?: (found: number[]) => void): () => void {
    this.noteSet.setCandidates(midis ?? []);
    if (fn) this.noteSetSubs.add(fn);
    return () => {
      if (fn) this.noteSetSubs.delete(fn);
      this.noteSet.setCandidates([]);
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

  // Pretend several notes were played together (automated tests).
  simulateNotes(midis: number[]): void {
    this.noteSetSubs.forEach((fn) => fn(midis));
  }

  // Pretend a chord was played (automated tests): it passes if it's the chord being listened for.
  simulateChord(midis: number[]): void {
    const t = performance.now();
    const key = (a: number[]) => [...a].sort((x, y) => x - y).join(',');
    const same = (a: number[]) => key(a) === key(midis);
    const pass = this.chordTarget !== null && same(this.chordTarget);
    const matched = this.chordAlternatives.findIndex(same);
    const target = this.chordTarget ?? [];
    const inverted = !pass && key(midis.map((m) => m % 12)) === key(target.map((m) => m % 12)) && Math.min(...midis) % 12 !== Math.min(...target) % 12;
    const ev: ChordEvent = {
      pass,
      explained: pass ? 1 : 0.5,
      presence: [],
      unexplained: [],
      chroma: new Float64Array(12),
      onsetT: t,
      t,
      matched: pass || inverted || matched < 0 ? null : matched,
      close: !pass && !inverted && matched < 0,
      inverted,
      played: midis,
    };
    this.chordSubs.forEach((fn) => fn(ev));
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
      // As with notes, nothing is reported while the app is talking or playing a chord itself.
      const chordEvent = this.chords.update({ t: f.t, onset: onset && !this.held, mags: f.mags });
      if (chordEvent && !this.held) this.chordSubs.forEach((fn) => fn(chordEvent));
    }
    if (this.noteSetSubs.size) {
      const found = this.noteSet.update({ t: f.t, onset: onset && !this.held, mags: f.mags, rms: f.rms });
      if (found && !this.held) this.noteSetSubs.forEach((fn) => fn(found));
    }
    if (this.frame++ % 3 === 0 && this.levelSubs.size) {
      const level = { rms: f.rms, pitch, gate: this.onsets.gate };
      this.levelSubs.forEach((fn) => fn(level));
    }
    this.raf = requestAnimationFrame(this.loop);
  };
}

export const listener = new Listener();
