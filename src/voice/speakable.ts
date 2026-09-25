// Turning written text into what should be said, and naming the recorded clip for it. Pure, so the
// recording script (scripts/voices.mjs) and the app agree exactly.

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

// A short, stable name for the recording of a line: FNV-1a hash of what is spoken.
export function clipId(text: string): string {
  const s = speakable(text);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
