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
const buffers = new Map<string, Promise<AudioBuffer>>();

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

function loadClip(ctx: AudioContext, id: string): Promise<AudioBuffer> {
  let p = buffers.get(id);
  if (!p) {
    p = fetch(`./voice/${id}.mp3`)
      .then((r) => {
        if (!r.ok) throw new Error(`clip ${id}: ${r.status}`);
        return r.arrayBuffer();
      })
      .then((data) => ctx.decodeAudioData(data));
    buffers.set(id, p);
    p.catch(() => buffers.delete(id));
  }
  return p;
}

function speakWithDevice(text: string, mine: number) {
  if (!synth) return finish(mine);
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
  if (!clips.has(id) || !ctx) return speakWithDevice(text, mine);
  loadClip(ctx, id)
    .then((buffer) => {
      if (mine !== token) return;
      const node = ctx.createBufferSource();
      node.buffer = buffer;
      node.connect(ctx.destination);
      node.onended = () => finish(mine);
      source = node;
      void ctx.resume();
      node.start();
    })
    // A clip that can't be loaded or decoded falls back to the device's voice.
    .catch(() => mine === token && speakWithDevice(text, mine));
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
