// A big, coloured banner that says what to do right now: tap an answer, play the piano, or read.
// When the mode changes it pops and chimes, so switching between tapping and playing isn't missed.
import { useEffect, useRef, useState } from 'react';
import { sfx } from './sound';

export type Mode = 'tap' | 'play' | 'learn' | 'screen';

const MODES: Record<Mode, { icon: string; text: string }> = {
  tap: { icon: '👆', text: 'Tap the answer' },
  play: { icon: '🎹', text: 'Play it on the piano' },
  learn: { icon: '📖', text: 'Learn' },
  screen: { icon: '📱', text: 'Find it on the keyboard' },
};

export function ModeBanner({ mode, text }: { mode: Mode; text?: string }) {
  const prev = useRef(mode);
  const [switches, setSwitches] = useState(0);
  useEffect(() => {
    if (prev.current === mode) return;
    prev.current = mode;
    setSwitches((n) => n + 1);
    sfx.modeSwitch();
  }, [mode]);
  return (
    <div key={switches} className={`mode-banner mode-${mode} ${switches ? 'mode-switched' : ''}`} role="status">
      <span className="mode-icon" aria-hidden="true">
        {MODES[mode].icon}
      </span>
      <span>{text ?? MODES[mode].text}</span>
    </div>
  );
}
