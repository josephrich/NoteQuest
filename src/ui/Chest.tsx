// The end-of-lesson treasure chest: tap, it shakes while its glow flickers through the rarity
// colours like a slot machine, then bursts open with gems and counts them up.
import { useEffect, useMemo, useRef, useState } from 'react';
import { RARITIES, type ChestRoll, type Rarity } from '../game/rewards';
import { sfx } from './sound';

export const RARITY_STYLE: Record<Rarity, { color: string; label: string }> = {
  common: { color: '#29b6f6', label: 'Nice haul!' },
  rare: { color: '#2fbf71', label: 'Rare chest!' },
  epic: { color: '#a259ff', label: 'EPIC chest!' },
  legendary: { color: '#ffb020', label: 'LEGENDARY!' },
};

// Gaps between flickers get longer, so the "reels" slow down before landing.
const FLICKER_GAPS = [70, 70, 75, 80, 90, 100, 115, 135, 160, 195, 240, 300];
const COUNT_MS = 900;

function ChestArt() {
  return (
    <svg className="chest-art" viewBox="0 0 160 140" aria-hidden="true">
      <ellipse className="chest-inner-glow" cx="80" cy="64" rx="54" ry="10" />
      <g className="chest-body">
        <rect x="20" y="62" width="120" height="66" rx="10" fill="#c07a3a" />
        <path d="M24 84 H136 M24 106 H136" stroke="#a5642c" strokeWidth="3" />
        <rect x="20" y="62" width="120" height="9" fill="#ffc542" />
        <rect x="34" y="62" width="12" height="66" fill="#ffc542" />
        <rect x="114" y="62" width="12" height="66" fill="#ffc542" />
        <rect x="68" y="68" width="24" height="26" rx="5" fill="#ffd66e" stroke="#e0a526" strokeWidth="2" />
        <circle cx="80" cy="79" r="3.5" fill="#7a4a1c" />
        <path d="M80 81 V87" stroke="#7a4a1c" strokeWidth="3" strokeLinecap="round" />
      </g>
      <g className="chest-lid">
        <path d="M20 64 V46 Q20 18 80 18 Q140 18 140 46 V64 Z" fill="#b06a2c" />
        <path d="M28 40 Q80 26 132 40" stroke="#9a5a24" strokeWidth="3" fill="none" />
        <rect x="20" y="55" width="120" height="9" fill="#ffc542" />
        <path d="M34 64 V34 Q34 24 46 22 V64 Z M114 22 Q126 24 126 34 V64 H114 Z" fill="#ffc542" />
      </g>
    </svg>
  );
}

export function Chest({ roll, totalAfter, onOpened }: { roll: ChestRoll; totalAfter: number; onOpened?: () => void }) {
  const [state, setState] = useState<'closed' | 'shaking' | 'open'>('closed');
  const [flicker, setFlicker] = useState<Rarity>('common');
  const [shown, setShown] = useState(0);
  const timers = useRef<number[]>([]);
  const style = RARITY_STYLE[state === 'open' ? roll.rarity : flicker];
  const sparks = useMemo(
    () =>
      Array.from({ length: roll.rarity === 'legendary' ? 22 : roll.rarity === 'epic' ? 16 : 11 }, () => {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3;
        const dist = 90 + Math.random() * 90;
        return { dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist, delay: Math.random() * 0.15, size: 18 + Math.random() * 14 };
      }),
    [roll.rarity],
  );

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));

  const open = () => {
    if (state !== 'closed') return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return reveal();
    setState('shaking');
    let t = 0;
    FLICKER_GAPS.forEach((gap, i) => {
      t += gap;
      const last = i === FLICKER_GAPS.length - 1;
      later(t, () => {
        // Cycle through the rarities, landing on the real one at the end.
        setFlicker(last ? roll.rarity : RARITIES[(i + Math.floor(Math.random() * 3)) % RARITIES.length]);
        sfx.tick(i);
      });
    });
    later(t + 250, reveal);
  };

  const reveal = () => {
    setState('open');
    sfx.reveal(roll.rarity);
    const start = performance.now();
    const step = () => {
      const f = Math.min(1, (performance.now() - start) / COUNT_MS);
      const eased = 1 - (1 - f) ** 3;
      setShown(Math.round(eased * roll.gems));
      if (f < 1) {
        sfx.count();
        later(55, step);
      } else onOpened?.();
    };
    later(250, step);
  };

  return (
    <div className={`chest-stage chest-${state} rarity-${state === 'open' ? roll.rarity : 'hidden'}`} style={{ ['--glow' as string]: style.color }}>
      <button className="chest-button" onClick={open} disabled={state !== 'closed'} aria-label={state === 'open' ? `${roll.gems} gems` : 'Open treasure chest'}>
        <span className="chest-glow" aria-hidden="true" />
        <ChestArt />
        {state === 'open' && (
          <span className="chest-sparks" aria-hidden="true">
            {sparks.map((s, i) => (
              <i key={i} style={{ ['--dx' as string]: `${s.dx}px`, ['--dy' as string]: `${s.dy}px`, animationDelay: `${s.delay}s`, fontSize: `${s.size}px` }}>
                💎
              </i>
            ))}
          </span>
        )}
      </button>
      <div className="chest-caption" aria-live="polite">
        {state === 'closed' && 'Tap the chest to open it!'}
        {state === 'shaking' && '…'}
        {state === 'open' && (
          <>
            <div className="chest-rarity">{RARITY_STYLE[roll.rarity].label}</div>
            <div className="chest-gems">+{shown} 💎</div>
            {roll.freeze && <div className="chest-bonus">+ a streak freeze 🧊</div>}
            <div className="chest-total">You have {totalAfter - roll.gems + shown} gems</div>
          </>
        )}
      </div>
    </div>
  );
}
