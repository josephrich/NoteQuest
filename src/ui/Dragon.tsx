// The NoteQuest dragon. Moods change the face and the animation.
export type Mood = 'idle' | 'happy' | 'cheer' | 'think' | 'sad';

const C = {
  body: '#3fc389',
  bodyDark: '#2a9c6a',
  snout: '#7fe0b1',
  belly: '#ffe08a',
  bellyLine: '#f2bf4f',
  wing: '#2a9c6a',
  wingInner: '#8ce8bc',
  horn: '#fff3d6',
  cheek: '#ff8fa3',
  ink: '#2b2340',
};

function Eye({ cx, mood }: { cx: number; mood: Mood }) {
  if (mood === 'happy' || mood === 'cheer') {
    return <path d={`M${cx - 11} 74 Q${cx} 60 ${cx + 11} 74`} stroke={C.ink} strokeWidth="5" strokeLinecap="round" fill="none" />;
  }
  const look = mood === 'think' ? { dx: 3, dy: -5 } : mood === 'sad' ? { dx: 0, dy: 3 } : { dx: 2, dy: 1 };
  return (
    <g>
      <ellipse cx={cx} cy={70} rx={12} ry={13} fill="#fff" />
      <circle cx={cx + look.dx} cy={71 + look.dy} r={7} fill={C.ink} />
      <circle cx={cx + look.dx + 3} cy={67 + look.dy} r={2.5} fill="#fff" />
    </g>
  );
}

function Mouth({ mood }: { mood: Mood }) {
  if (mood === 'cheer') return <path d="M88 101 Q100 124 112 101 Z" fill="#8a2c3f" stroke={C.ink} strokeWidth="3" strokeLinejoin="round" />;
  if (mood === 'sad') return <path d="M91 110 Q100 102 109 110" stroke={C.ink} strokeWidth="4" strokeLinecap="round" fill="none" />;
  if (mood === 'think') return <path d="M93 106 H107" stroke={C.ink} strokeWidth="4" strokeLinecap="round" />;
  return <path d="M89 103 Q100 114 111 103" stroke={C.ink} strokeWidth="4" strokeLinecap="round" fill="none" />;
}

function Wing() {
  return (
    <g className="dragon-wing">
      <path d="M66 112 C36 106 16 80 24 54 C34 68 44 72 52 70 C48 84 54 98 70 102 Z" fill={C.wing} />
      <path d="M62 106 C42 100 30 84 32 68 C40 78 48 80 54 79 C52 88 56 96 66 100 Z" fill={C.wingInner} />
    </g>
  );
}

export function Dragon({ mood = 'idle', size = 160, title }: { mood?: Mood; size?: number; title?: string }) {
  return (
    <svg className={`dragon mood-${mood}`} viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={title ?? 'Dragon'}>
      <g className="dragon-all">
        {/* tail */}
        <path d="M138 168 C172 170 186 146 178 124" stroke={C.body} strokeWidth="14" strokeLinecap="round" fill="none" />
        <path d="M170 124 L186 104 L190 128 Z" fill={C.bodyDark} />
        {/* wings */}
        <Wing />
        <g transform="translate(200 0) scale(-1 1)">
          <Wing />
        </g>
        {/* body */}
        <ellipse cx="100" cy="144" rx="46" ry="42" fill={C.body} />
        <ellipse cx="100" cy="152" rx="28" ry="29" fill={C.belly} />
        <path d="M81 140 H119 M79 152 H121 M83 164 H117" stroke={C.bellyLine} strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="62" cy="142" rx="9" ry="14" transform="rotate(24 62 142)" fill={C.bodyDark} />
        <ellipse cx="138" cy="142" rx="9" ry="14" transform="rotate(-24 138 142)" fill={C.bodyDark} />
        <ellipse cx="78" cy="184" rx="15" ry="8" fill={C.bodyDark} />
        <ellipse cx="122" cy="184" rx="15" ry="8" fill={C.bodyDark} />
        {/* head */}
        <g className="dragon-head">
          <path d="M72 50 L62 18 L86 42 Z" fill={C.horn} stroke="#e8d7b0" strokeWidth="2" strokeLinejoin="round" />
          <path d="M128 50 L138 18 L114 42 Z" fill={C.horn} stroke="#e8d7b0" strokeWidth="2" strokeLinejoin="round" />
          <path d="M92 40 L100 26 L108 40 Z" fill={C.bodyDark} />
          <ellipse cx="100" cy="78" rx="46" ry="40" fill={C.body} />
          <ellipse cx="100" cy="97" rx="28" ry="18" fill={C.snout} />
          <ellipse cx="92" cy="92" rx="3" ry="2.2" fill={C.bodyDark} />
          <ellipse cx="108" cy="92" rx="3" ry="2.2" fill={C.bodyDark} />
          <circle cx="64" cy="90" r="7" fill={C.cheek} opacity="0.75" />
          <circle cx="136" cy="90" r="7" fill={C.cheek} opacity="0.75" />
          <Eye cx={80} mood={mood} />
          <Eye cx={120} mood={mood} />
          {mood === 'sad' && (
            <path d="M68 54 L90 60 M132 54 L110 60" stroke={C.ink} strokeWidth="4" strokeLinecap="round" />
          )}
          <Mouth mood={mood} />
        </g>
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
