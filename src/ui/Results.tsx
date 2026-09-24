// End of lesson: XP, stats, a gem chest and streak news.
import { useMemo, useState } from 'react';
import { Dragon } from './Dragon';
import { useProgress } from './store';
import { sfx } from './sound';
import { GoalRing } from './Home';
import { goalMs, today } from '../game/progress';
import type { Screen } from './App';

export interface ResultsData {
  lessonTitle: string;
  unitColor: string;
  xp: number;
  gems: number;
  accuracy: number;
  fastestMs: number | null;
  bestCombo: number;
  perfect: boolean;
  streakExtended: boolean;
  streakCount: number;
  goalReachedNow: boolean;
  freezeEarned: boolean;
  freezesUsed: number;
}

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 1.8 + Math.random() * 1.2,
        color: ['#ffb020', '#7c5cff', '#2fbf71', '#ff5d8f', '#29b6f6'][i % 5],
        rotate: Math.random() * 360,
      })),
    [],
  );
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <i key={i} style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s`, rotate: `${p.rotate}deg` }} />
      ))}
    </div>
  );
}

export function Results({ data, go }: { data: ResultsData; go: (s: Screen) => void }) {
  const { progress } = useProgress();
  const [chestOpen, setChestOpen] = useState(false);
  const day = today(progress, new Date());
  const goal = goalMs(progress);

  return (
    <div className="results" style={{ ['--unit' as string]: data.unitColor }}>
      <Confetti />
      <Dragon mood="cheer" size={150} />
      <h1>{data.perfect ? 'Perfect lesson!' : 'Lesson complete!'}</h1>
      <p className="results-sub">{data.lessonTitle}</p>

      <div className="tiles">
        <div className="tile tile-xp">
          <span>Total XP</span>
          <strong>+{data.xp}</strong>
        </div>
        <div className="tile tile-acc">
          <span>Accuracy</span>
          <strong>{Math.round(data.accuracy * 100)}%</strong>
        </div>
        <div className="tile tile-speed">
          <span>Fastest read</span>
          <strong>{data.fastestMs !== null ? `${(data.fastestMs / 1000).toFixed(1)}s` : '–'}</strong>
        </div>
        <div className="tile tile-combo">
          <span>Best combo</span>
          <strong>🔥 {data.bestCombo}</strong>
        </div>
      </div>

      <button
        className={`chest ${chestOpen ? 'chest-open' : ''}`}
        onClick={() => {
          if (!chestOpen) sfx.chest();
          setChestOpen(true);
        }}
        aria-label={chestOpen ? `${data.gems} gems` : 'Open treasure chest'}
      >
        <span className="chest-icon">{chestOpen ? '💎' : '🎁'}</span>
        <span>{chestOpen ? `+${data.gems} gems!` : 'Tap to open your chest'}</span>
      </button>

      {data.streakExtended ? (
        <div className="streak-card">
          <span className="streak-fire">🔥</span>
          <div>
            <strong>
              {data.streakCount} day streak{data.streakCount > 1 ? '!' : ' started!'}
            </strong>
            <div>Daily goal complete. See you tomorrow!</div>
            {data.freezesUsed > 0 && <div>A streak freeze 🧊 saved your streak.</div>}
            {data.freezeEarned && <div>You earned a streak freeze 🧊 for a whole week!</div>}
          </div>
        </div>
      ) : (
        <div className="streak-card quiet">
          <GoalRing fraction={day.ms / goal} label="Daily goal" size={64} />
          <div>
            {day.ms >= goal ? (
              <strong>Daily goal done. Extra practice!</strong>
            ) : (
              <>
                <strong>{Math.max(1, Math.ceil((goal - day.ms) / 60_000))} more minutes</strong> to reach today's goal
              </>
            )}
          </div>
        </div>
      )}

      <button className="btn btn-primary btn-big" onClick={() => go({ name: 'home' })}>
        Continue
      </button>
    </div>
  );
}
