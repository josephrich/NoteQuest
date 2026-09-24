// The NoteQuest dragon. Moods change the face and animation; skins and accessories come from the shop.
import type { ReactElement } from 'react';
import type { Slot } from '../game/shop';

export type Mood = 'idle' | 'happy' | 'cheer' | 'think' | 'sad';

interface Palette {
  body: string;
  bodyDark: string;
  snout: string;
  belly: string;
  bellyLine: string;
  wingInner: string;
}

const BELLY = { belly: '#ffe08a', bellyLine: '#f2bf4f' };

export const PALETTES: Record<string, Palette> = {
  green: { body: '#3fc389', bodyDark: '#2a9c6a', snout: '#7fe0b1', wingInner: '#8ce8bc', ...BELLY },
  blue: { body: '#4aa8ff', bodyDark: '#2f7fd6', snout: '#93caff', wingInner: '#a9d6ff', ...BELLY },
  red: { body: '#ff6b5b', bodyDark: '#d9473a', snout: '#ffa196', wingInner: '#ffb8ae', ...BELLY },
  purple: { body: '#9b72ff', bodyDark: '#7250e0', snout: '#c3aaff', wingInner: '#d0bfff', ...BELLY },
  gold: { body: '#ffc233', bodyDark: '#e09a12', snout: '#ffe08a', wingInner: '#ffe39a', belly: '#fff4cc', bellyLine: '#f2d27a' },
  night: { body: '#3b4a78', bodyDark: '#26315a', snout: '#5d6fa8', wingInner: '#7f8fcf', belly: '#b9c4ff', bellyLine: '#8f9de6' },
};

const INK = '#2b2340';
const HORN = '#fff3d6';
const CHEEK = '#ff8fa3';

function Eye({ cx, mood }: { cx: number; mood: Mood }) {
  if (mood === 'happy' || mood === 'cheer') {
    return <path d={`M${cx - 11} 74 Q${cx} 60 ${cx + 11} 74`} stroke={INK} strokeWidth="5" strokeLinecap="round" fill="none" />;
  }
  const look = mood === 'think' ? { dx: 3, dy: -5 } : mood === 'sad' ? { dx: 0, dy: 3 } : { dx: 2, dy: 1 };
  return (
    <g>
      <ellipse cx={cx} cy={70} rx={12} ry={13} fill="#fff" />
      <circle cx={cx + look.dx} cy={71 + look.dy} r={7} fill={INK} />
      <circle cx={cx + look.dx + 3} cy={67 + look.dy} r={2.5} fill="#fff" />
    </g>
  );
}

function Mouth({ mood }: { mood: Mood }) {
  if (mood === 'cheer') return <path d="M88 101 Q100 124 112 101 Z" fill="#8a2c3f" stroke={INK} strokeWidth="3" strokeLinejoin="round" />;
  if (mood === 'sad') return <path d="M91 110 Q100 102 109 110" stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none" />;
  if (mood === 'think') return <path d="M93 106 H107" stroke={INK} strokeWidth="4" strokeLinecap="round" />;
  return <path d="M89 103 Q100 114 111 103" stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none" />;
}

function Wing({ c }: { c: Palette }) {
  return (
    <g className="dragon-wing">
      <path d="M66 112 C36 106 16 80 24 54 C34 68 44 72 52 70 C48 84 54 98 70 102 Z" fill={c.bodyDark} />
      <path d="M62 106 C42 100 30 84 32 68 C40 78 48 80 54 79 C52 88 56 96 66 100 Z" fill={c.wingInner} />
    </g>
  );
}

// Accessories, drawn in the dragon's coordinates.
export const ACCESSORY_ART: Record<string, ReactElement> = {
  party: (
    <g>
      <path d="M82 44 L100 4 L118 44 Z" fill="#ff5d8f" />
      <path d="M88 32 H112 M93 20 H107" stroke="#ffe08a" strokeWidth="4" />
      <circle cx="100" cy="5" r="6" fill="#ffe08a" />
    </g>
  ),
  crown: (
    <g>
      <path d="M74 46 L74 20 L87 33 L100 14 L113 33 L126 20 L126 46 Z" fill="#ffc542" stroke="#e0a526" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="100" cy="37" r="4.5" fill="#ff5a5f" />
      <circle cx="85" cy="40" r="3.5" fill="#29b6f6" />
      <circle cx="115" cy="40" r="3.5" fill="#2fbf71" />
    </g>
  ),
  wizard: (
    <g>
      <path d="M74 44 L108 -4 L126 44 Z" fill="#6a4cf0" />
      <ellipse cx="100" cy="45" rx="42" ry="7" fill="#5a3ee0" />
      <path d="M96 22 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z M110 32 l1.5 3.5 3.5 1.5 -3.5 1.5 -1.5 3.5 -1.5 -3.5 -3.5 -1.5 3.5 -1.5z" fill="#ffe08a" />
    </g>
  ),
  headphones: (
    <g>
      <path d="M50 80 Q50 28 100 28 Q150 28 150 80" stroke={INK} strokeWidth="7" fill="none" strokeLinecap="round" />
      <rect x="40" y="66" width="18" height="28" rx="8" fill="#ff5d8f" />
      <rect x="142" y="66" width="18" height="28" rx="8" fill="#ff5d8f" />
    </g>
  ),
  glasses: (
    <g>
      <circle cx="80" cy="70" r="16" fill="rgba(255,255,255,0.15)" stroke={INK} strokeWidth="4" />
      <circle cx="120" cy="70" r="16" fill="rgba(255,255,255,0.15)" stroke={INK} strokeWidth="4" />
      <path d="M96 69 Q100 65 104 69" stroke={INK} strokeWidth="4" fill="none" />
    </g>
  ),
  shades: (
    <g>
      <rect x="62" y="60" width="34" height="21" rx="8" fill="#1d1a2b" />
      <rect x="104" y="60" width="34" height="21" rx="8" fill="#1d1a2b" />
      <path d="M96 66 H104" stroke="#1d1a2b" strokeWidth="4" />
      <path d="M68 65 L76 65 M110 65 L118 65" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
    </g>
  ),
  bowtie: (
    <g>
      <path d="M100 122 L83 111 L83 133 Z M100 122 L117 111 L117 133 Z" fill="#ff5d8f" />
      <circle cx="100" cy="122" r="5.5" fill="#d93a6a" />
    </g>
  ),
  scarf: (
    <g>
      <path d="M64 108 Q100 126 136 108 L138 121 Q100 140 62 121 Z" fill="#ff5a5f" />
      <path d="M116 122 L126 158 L140 153 L131 118 Z" fill="#ff5a5f" />
      <path d="M78 116 L80 128 M96 120 V132 M114 118 L112 130 M121 138 L134 134" stroke="#fff" strokeWidth="3" opacity="0.7" />
    </g>
  ),
};

export interface DragonProps {
  mood?: Mood;
  size?: number;
  title?: string;
  skin?: string;
  outfit?: Partial<Record<Slot, string | undefined>>;
}

export function Dragon({ mood = 'idle', size = 160, title, skin = 'green', outfit = {} }: DragonProps) {
  const c = PALETTES[skin] ?? PALETTES.green;
  const art = (slot: Slot) => (outfit[slot] ? ACCESSORY_ART[outfit[slot]!] : null);
  return (
    <svg className={`dragon mood-${mood}`} viewBox="0 -8 200 208" width={size} height={size} role="img" aria-label={title ?? 'Dragon'}>
      <g className="dragon-all">
        {/* tail */}
        <path d="M138 168 C172 170 186 146 178 124" stroke={c.body} strokeWidth="14" strokeLinecap="round" fill="none" />
        <path d="M170 124 L186 104 L190 128 Z" fill={c.bodyDark} />
        {/* wings */}
        <Wing c={c} />
        <g transform="translate(200 0) scale(-1 1)">
          <Wing c={c} />
        </g>
        {/* body */}
        <ellipse cx="100" cy="144" rx="46" ry="42" fill={c.body} />
        <ellipse cx="100" cy="152" rx="28" ry="29" fill={c.belly} />
        <path d="M81 140 H119 M79 152 H121 M83 164 H117" stroke={c.bellyLine} strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="62" cy="142" rx="9" ry="14" transform="rotate(24 62 142)" fill={c.bodyDark} />
        <ellipse cx="138" cy="142" rx="9" ry="14" transform="rotate(-24 138 142)" fill={c.bodyDark} />
        <ellipse cx="78" cy="184" rx="15" ry="8" fill={c.bodyDark} />
        <ellipse cx="122" cy="184" rx="15" ry="8" fill={c.bodyDark} />
        {/* head */}
        <g className="dragon-head">
          <path d="M72 50 L62 18 L86 42 Z" fill={HORN} stroke="#e8d7b0" strokeWidth="2" strokeLinejoin="round" />
          <path d="M128 50 L138 18 L114 42 Z" fill={HORN} stroke="#e8d7b0" strokeWidth="2" strokeLinejoin="round" />
          <path d="M92 40 L100 26 L108 40 Z" fill={c.bodyDark} />
          <ellipse cx="100" cy="78" rx="46" ry="40" fill={c.body} />
          <ellipse cx="100" cy="97" rx="28" ry="18" fill={c.snout} />
          <ellipse cx="92" cy="92" rx="3" ry="2.2" fill={c.bodyDark} />
          <ellipse cx="108" cy="92" rx="3" ry="2.2" fill={c.bodyDark} />
          <circle cx="64" cy="90" r="7" fill={CHEEK} opacity="0.75" />
          <circle cx="136" cy="90" r="7" fill={CHEEK} opacity="0.75" />
          <Eye cx={80} mood={mood} />
          <Eye cx={120} mood={mood} />
          {mood === 'sad' && <path d="M68 54 L90 60 M132 54 L110 60" stroke={INK} strokeWidth="4" strokeLinecap="round" />}
          <Mouth mood={mood} />
          {art('face')}
          {art('head')}
        </g>
        {art('neck')}
        {mood === 'cheer' && (
          <g className="dragon-sparkles" fill="#ffb020">
            <path d="M28 30 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z" />
            <path d="M170 40 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" />
          </g>
        )}
      </g>
    </svg>
  );
}
