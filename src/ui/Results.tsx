// End of lesson: XP, stats, a gem chest and streak news.
import { useMemo, useState } from 'react';
import { MyDragon } from './MyDragon';
import { useProgress } from './store';
import { Chest } from './Chest';
import { GoalRing } from './Home';
import { goalMs, today } from '../game/progress';
import type { ChestRoll } from '../game/rewards';
import type { Improvement } from '../game/bonuses';
import { intervalLabel, itemInterval } from '../game/content';
import { friendlyName } from '../game/review';
import type { Screen } from './App';
import { listener } from '../engine/listener';
import { unlockSound } from './sound';

export interface ResultsData {
  lessonTitle: string;
  unitColor: string;
  xp: number;
  chest: ChestRoll | null;
  // A mini-lesson: no accuracy or speed to show.
  guide?: boolean;
  // Played on the on-screen piano (half XP, no lightning bonus).
  onScreen?: boolean;
  // Bonuses included in `xp`: the lesson's place in this sitting and its "on a roll" extra, and notes
  // that got faster or more accurate.
  rollCount?: number;
  rollBonus?: number;
  improvements?: Improvement[];
  accuracy: number;
  fastestMs: number | null;
  bestCombo: number;
  perfect: boolean;
  streakExtended: boolean;
  streakCount: number;
  goalReachedNow: boolean;
  freezeEarned: boolean;
  freezesUsed: number;
  // To play the same lesson again, the way it was just played.
  again?: { lessonId: string; mic: boolean; screen: boolean };
  // What he found hardest this time (item ids, most missed first).
  tricky?: string[];
}

// Below this, the results gently suggest having another go.
export const TRY_AGAIN_BELOW = 0.7;

const IMPROVEMENT_TEXT: Record<Improvement['kind'], (name: string) => string> = {
  fluent: (n) => `🌟 You can read ${n} quickly now!`,
  faster: (n) => `🚀 Getting faster at ${n}!`,
  accurate: (n) => `🎯 You got ${n} right every time!`,
};

// "treble G", "middle C", "the C chord", or an interval as a plural: "skips", "4ths", "octaves".
function improvedName(id: string): string {
  if (id.startsWith('third:')) return `${id.split(':')[1]} 3rds`;
  const size = itemInterval(id);
  if (size === null) return friendlyName(id);
  return `${intervalLabel(size).split(' · ').pop()!.toLowerCase()}s`;
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
        <i
          key={i}
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            rotate: `${p.rotate}deg`,
          }}
        />
      ))}
    </div>
  );
}

export function Results({ data, go }: { data: ResultsData; go: (s: Screen) => void }) {
  const { progress } = useProgress();
  // A second burst of confetti for epic and legendary chests.
  const [bigWin, setBigWin] = useState(false);
  const day = today(progress, new Date());
  const goal = goalMs(progress);
  const tough = !data.guide && data.accuracy < TRY_AGAIN_BELOW;
  const tricky = [...new Set((data.tricky ?? []).map(improvedName))];

  // Straight back into the same lesson. Starting the microphone needs this tap.
  const tryAgain = async () => {
    const again = data.again!;
    unlockSound();
    if (again.mic) {
      try {
        await listener.start();
      } catch {
        return go({
          name: 'lesson',
          lessonId: again.lessonId,
          mic: false,
          screen: true,
          run: Date.now(),
        });
      }
    }
    go({
      name: 'lesson',
      lessonId: again.lessonId,
      mic: again.mic,
      screen: again.screen,
      run: Date.now(),
    });
  };

  return (
    <div className="results" style={{ ['--unit' as string]: data.unitColor }}>
      <Confetti />
      {bigWin && <Confetti key="big" />}
      <div className="results-main">
        <MyDragon mood="cheer" size={150} />
        <h1>{data.guide ? 'New skill learned!' : data.perfect ? 'Perfect lesson!' : tough ? 'Good effort!' : 'Lesson complete!'}</h1>
        <p className="results-sub">{data.lessonTitle}</p>
        {data.onScreen && <p className="results-screen">📱 On-screen piano: half XP. Play on a real piano for full XP and ⚡ bonuses!</p>}

        {data.guide ? (
          <div className="tiles">
            <div className="tile tile-xp">
              <span>Total XP</span>
              <strong>+{data.xp}</strong>
            </div>
            <div className="tile tile-acc">
              <span>Learned</span>
              <strong>📖 ✓</strong>
            </div>
          </div>
        ) : (
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
        )}

        {data.rollBonus || data.improvements?.length ? (
          <ul className="bonuses" aria-label="Bonus XP">
            {data.rollBonus ? (
              <li>
                <span>🔥 On a roll! Lesson {data.rollCount} in a row</span>
                <strong>+{data.rollBonus} XP</strong>
              </li>
            ) : null}
            {data.improvements?.map((i) => (
              <li key={i.id}>
                <span>{IMPROVEMENT_TEXT[i.kind](improvedName(i.id))}</span>
                <strong>+{i.xp} XP</strong>
              </li>
            ))}
          </ul>
        ) : null}

        {tough && data.again && (
          <div className="retry-card">
            <MyDragon mood="think" size={64} />
            <div>
              <strong>That was a tricky one!</strong>
              <p>
                Every go makes it easier
                {tricky.length ? `. Tricky today: ${tricky.join(', ')}` : ''}. Want to try it again while it's fresh?
              </p>
            </div>
          </div>
        )}
      </div>
      <div className="results-side">
        {data.chest && (
          <Chest
            roll={data.chest}
            totalAfter={progress.gems}
            onOpened={() => setBigWin(data.chest?.rarity === 'epic' || data.chest?.rarity === 'legendary' || data.chest?.rarity === 'treasure')}
          />
        )}

        {data.streakExtended ? (
          <div className="streak-card">
            <span className="streak-fire">🔥</span>
            <div>
              <strong>
                {data.streakCount} day streak
                {data.streakCount > 1 ? '!' : ' started!'}
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

        {tough && data.again ? (
          <>
            <button className="btn btn-primary btn-big" onClick={tryAgain}>
              🔁 Try it again
            </button>
            <button className="btn btn-secondary" onClick={() => go({ name: 'home' })}>
              Continue
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-primary btn-big" onClick={() => go({ name: 'home' })}>
              Continue
            </button>
            {data.again && !data.perfect && (
              <button className="btn btn-quiet" onClick={tryAgain}>
                🔁 Practise this lesson again
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
