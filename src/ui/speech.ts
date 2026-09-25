// Reading text aloud with the device's built-in voices (the same ones as Siri / Spoken Content), for
// players who are still learning to read. Nothing is recorded or sent anywhere.
// While the voice is talking, the note listener is paused so the voice can't be heard as a note.
import { listener } from '../engine/listener';

const synth: SpeechSynthesis | null = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;

export const speechSupported = synth !== null;

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

const LETTER_SOUNDS: Record<string, string> = { A: 'ay', B: 'bee', C: 'see', D: 'dee', E: 'ee', F: 'eff', G: 'gee' };

// Written text as it should be spoken: note letters as letter names (so "is A" isn't read as "is uh"),
// sharps as "sharp", and the odd symbol dropped.
export function speakable(text: string): string {
  return (
    text
      .replace(/([A-G])♯/g, '$1 sharp')
      // A lone capital B-G is a note name. So is A, except as the word "a" ("A step", "A 4th").
      .replace(/\b([B-G])\b/g, (_, l: string) => LETTER_SOUNDS[l])
      .replace(/\bA\b(?!\s+[a-z0-9])/g, LETTER_SOUNDS.A)
      .replace(/[·•]/g, ',')
      .replace(/[^\p{L}\p{N}\s.,!?'’:;-]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

let current: SpeechSynthesisUtterance | null = null;
let currentText: string | null = null;
let unlocked = false;
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

export function stopSpeaking(): void {
  if (!synth) return;
  current = null;
  synth.cancel();
  listener.release();
  notify(null);
}

export function speak(text: string): void {
  if (!synth) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(speakable(text));
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? 'en-AU';
  u.rate = 0.92;
  const done = () => {
    if (current !== u) return;
    current = null;
    listener.release();
    notify(null);
  };
  u.onend = done;
  u.onerror = done;
  current = u;
  listener.hold();
  notify(text);
  synth.speak(u);
}

// iOS only lets speech start from a tap the first time; call this from any tap to allow it later.
export function unlockSpeech(): void {
  if (!synth || unlocked) return;
  unlocked = true;
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0;
  synth.speak(u);
}
