// 🔊: reads some text aloud. With `auto`, it also reads it as soon as it appears (or changes), for
// players who have "read aloud" switched on.
import { useEffect, useState } from 'react';
import { onSpeaking, speak, speakingText, speechSupported, stopSpeaking } from './speech';

export function SpeakButton({ text, auto = false, label = 'Read aloud' }: { text: string; auto?: boolean; label?: string }) {
  const [speaking, setSpeaking] = useState(speakingText() === text);
  useEffect(() => onSpeaking((t) => setSpeaking(t === text)), [text]);
  useEffect(() => {
    if (auto) speak(text);
  }, [auto, text]);
  // Stop talking when this text goes away (next card, leaving the lesson).
  useEffect(() => () => {
    if (speakingText() === text) stopSpeaking();
  }, [text]);
  if (!speechSupported) return null;
  return (
    <button
      type="button"
      className={`btn-speak ${speaking ? 'speaking' : ''}`}
      aria-label={speaking ? 'Stop reading' : label}
      aria-pressed={speaking}
      onClick={() => (speaking ? stopSpeaking() : speak(text))}
    >
      <span aria-hidden="true">{speaking ? '⏹' : '🔊'}</span>
    </button>
  );
}
