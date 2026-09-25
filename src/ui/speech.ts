// Reading text aloud, for players who are still learning to read. Lines that have a recording
// (made with scripts/voices.mjs and shipped inside the app in public/voice/) play that; anything
// else uses the device's built-in voice. Nothing is recorded or sent anywhere.
// While the voice is talking, the note listener is paused so the voice can't be heard as a note.
import { listener } from '../engine/listener';
import { audioContext, unlockSound } from './sound';
import { clipId, speakable } from '../voice/speakable';
import recorded from '../voice/clips.json';

export { speakable };

const synth: SpeechSynthesis | null = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
const clips = new Set<string>(recorded as string[]);

export const speechSupported = synth !== null || clips.size > 0;

let voice: SpeechSynthesisVoice | null = null;

// Prefer an Australian, then British, then any English voice; an "Enhanced"/"Premium" one if installed.
function pickVoice(): SpeechSynthesisVoice | null {
  if (!synth) return null;
  const voices = synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'));
  const score = (v: SpeechSynthesisVoice) =>
    (v.lang === 'en-AU' ? 30 : v.lang === 'en-GB' ? 20 : 10) + (/enhanced|premium/i.test(v.name) ? 5 : 0) + (v.localService ? 1 : 0);
  return voices.sort((a, b) => score(b) - score(a))[0] ?? null;
}

if (synth) {
  voice = pickVoice();
  synth.addEventListener?.('voiceschanged', () => (voice = pickVoice()));
}

let currentText: string | null = null;
let unlocked = false;
// Each speak() gets a token, so a clip that finishes after being replaced doesn't end the new one.
let token = 0;
let source: AudioBufferSourceNode | null = null;
const buffers = new Map<string, Promise<{ buffer: AudioBuffer; gain: number }>>();

// Which voice the last line used, and why the device voice if it fell back (for the voice check).
export type VoiceUsed = { source: 'recording' } | { source: 'device'; reason: string } | { source: 'none'; reason: string };
let lastVoice: VoiceUsed | null = null;
export const lastVoiceUsed = () => lastVoice;

// Listeners are told which text is being read (null when quiet), so the right button can light up.
const subs = new Set<(text: string | null) => void>();
const notify = (text: string | null) => {
  currentText = text;
  subs.forEach((fn) => fn(text));
};

export const speakingText = () => currentText;

export function onSpeaking(fn: (text: string | null) => void): () => void {
  subs.add(fn);
  return () => subs.delete(fn);
}

export const hasRecording = (text: string) => clips.has(clipId(text));

function silence() {
  try {
    source?.stop();
  } catch {
    /* already stopped */
  }
  source = null;
  synth?.cancel();
}

export function stopSpeaking(): void {
  token++;
  silence();
  listener.release();
  notify(null);
}

// Recordings are MP3s, named .mpga (the other standard extension for MP3 audio) rather than .mp3:
// inside the iOS app, Capacitor serves .mp3 files as "media" without an HTTP status, which fetch
// treats as a failure. Any other extension is served normally.
const CLIP_EXT = 'mpga';

// Recordings come out quiet, so each is turned up to near full volume (by its own peak) as it plays.
const TARGET_PEAK = 0.9;

function loadClip(ctx: AudioContext, id: string): Promise<{ buffer: AudioBuffer; gain: number }> {
  let p = buffers.get(id);
  if (!p) {
    p = fetch(`./voice/${id}.${CLIP_EXT}`)
      .then(async (r) => {
        // Inside the iOS app, Capacitor serves audio files without an HTTP status, so they arrive
        // with status 0. That's fine as long as the file itself came through.
        const data = r.ok || r.status === 0 ? await r.arrayBuffer() : null;
        if (!data?.byteLength) throw new Error(`couldn't load the recording (status ${r.status})`);
        return data;
      })
      .then((data) => ctx.decodeAudioData(data))
      .then((buffer) => {
        let peak = 0;
        for (let c = 0; c < buffer.numberOfChannels; c++) for (const v of buffer.getChannelData(c)) peak = Math.max(peak, Math.abs(v));
        return { buffer, gain: peak > 0.01 ? Math.min(4, TARGET_PEAK / peak) : 1 };
      });
    buffers.set(id, p);
    p.catch(() => buffers.delete(id));
  }
  return p;
}

function speakWithDevice(text: string, mine: number, reason: string) {
  if (!synth) {
    lastVoice = { source: 'none', reason };
    return finish(mine);
  }
  lastVoice = { source: 'device', reason };
  const u = new SpeechSynthesisUtterance(speakable(text));
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? 'en-AU';
  u.rate = 0.92;
  u.onend = u.onerror = () => finish(mine);
  synth.speak(u);
}

function finish(mine: number) {
  if (mine !== token) return;
  source = null;
  listener.release();
  notify(null);
}

export function speak(text: string): void {
  const mine = ++token;
  silence();
  listener.hold();
  notify(text);
  const id = clipId(text);
  const ctx = audioContext();
  if (!clips.has(id)) return speakWithDevice(text, mine, 'this line has no recording');
  if (!ctx) return speakWithDevice(text, mine, 'audio was not switched on by a tap yet');
  loadClip(ctx, id)
    .then(async ({ buffer, gain }) => {
      if (mine !== token) return;
      // iOS can pause audio when the microphone starts; wake it before playing.
      if (ctx.state !== 'running') await ctx.resume();
      if (mine !== token) return;
      if (ctx.state !== 'running') throw new Error(`audio is ${ctx.state}`);
      const node = ctx.createBufferSource();
      node.buffer = buffer;
      const g = ctx.createGain();
      g.gain.value = gain;
      node.connect(g).connect(ctx.destination);
      node.onended = () => finish(mine);
      source = node;
      lastVoice = { source: 'recording' };
      node.start();
    })
    // A clip that can't be loaded, decoded or played falls back to the device's voice.
    .catch((e: unknown) => mine === token && speakWithDevice(text, mine, e instanceof Error ? e.message : String(e)));
}

// iOS only lets audio start from a tap the first time; call this from any tap to allow it later.
export function unlockSpeech(): void {
  unlockSound();
  if (!synth || unlocked) return;
  unlocked = true;
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0;
  synth.speak(u);
}
