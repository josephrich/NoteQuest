// The on-screen piano's sound: a synthesised piano note (struck strings, each partial slightly
// sharp and fading at its own rate), made once per note and cached. Played through the shared,
// tap-unlocked audio context. It isn't affected by the sound-effects switch: it's the instrument.
import { audioContext, unlockSound } from './sound';
import { listener } from '../engine/listener';

const DURATION = 1.6;
const cache = new Map<number, AudioBuffer>();

function makeNote(ctx: AudioContext, midi: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const n = Math.round(DURATION * rate);
  const buffer = ctx.createBuffer(1, n, rate);
  const out = buffer.getChannelData(0);
  const f0 = 440 * 2 ** ((midi - 69) / 12);
  // Low notes have more, stronger upper partials; high notes are purer.
  const partials = midi < 48 ? 10 : midi < 72 ? 8 : 5;
  const B = 0.0004;
  for (let h = 1; h <= partials; h++) {
    const f = h * f0 * Math.sqrt(1 + B * h * h);
    if (f > rate / 2 - 500) break;
    const amp = 0.22 / h ** 1.1;
    const tau = (midi < 60 ? 1.4 : 0.9) / h ** 0.6;
    const w = (2 * Math.PI * f) / rate;
    for (let i = 0; i < n; i++) {
      const t = i / rate;
      out[i] += amp * Math.min(1, t / 0.003) * Math.exp(-t / tau) * Math.sin(w * i + h);
    }
  }
  // Fade out the tail so it never clicks.
  const fade = Math.round(0.15 * rate);
  for (let i = 0; i < fade; i++) out[n - 1 - i] *= i / fade;
  return buffer;
}

export function playPianoNote(midi: number): void {
  const ctx = audioContext();
  if (!ctx) return;
  let buffer = cache.get(midi);
  if (!buffer) {
    buffer = makeNote(ctx, midi);
    cache.set(midi, buffer);
  }
  void ctx.resume();
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(ctx.destination);
  src.start();
}

// Plays notes together, for "Hear it" buttons. The note listener is paused meanwhile, so the app
// doesn't hear its own chord as him playing.
export function hearChord(midis: number[]): void {
  hearSequence([midis]);
}

// Plays each group of notes (a note or a chord) in turn, the first straight away.
const GAP_MS = 1100;
let playing: number[] = [];
export function hearSequence(groups: number[][]): void {
  unlockSound();
  playing.forEach((t) => window.clearTimeout(t));
  listener.hold();
  playing = groups.map((g, i) => window.setTimeout(() => g.forEach(playPianoNote), i * GAP_MS));
  playing.push(window.setTimeout(() => listener.release(), (groups.length - 1) * GAP_MS + 1400));
}
