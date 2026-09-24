// Home: streak, gems, daily goal and the path of lessons.
import { useState } from 'react';
import { MyDragon } from './MyDragon';
import { useProgress } from './store';
import { greeting } from './lines';
import { UNITS, itemLetter, type LessonDef, type UnitDef } from '../game/content';
import { currentStreak, goalMs, isUnlocked, nextLessonId, today } from '../game/progress';
import { listener } from '../engine/listener';
import { unlockSound } from './sound';
import type { Screen } from './App';

// Horizontal offsets that make the path wind left and right.
const WIGGLE = [0, 56, 84, 56, 0, -56, -84, -56];

export function GoalRing({ fraction, label, size = 96 }: { fraction: number; label: string; size?: number }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const done = fraction >= 1;
  return (
    <svg className="goal-ring" viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={label}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--track)" strokeWidth="12" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={done ? 'var(--good)' : 'var(--fire)'}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${Math.min(1, fraction) * c} ${c}`}
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="58" textAnchor="middle" fontSize="26" fontWeight="800" fill="currentColor">
        {done ? '✓' : `${Math.round(Math.min(1, fraction) * 100)}%`}
      </text>
    </svg>
  );
}

export function Home({ go }: { go: (s: Screen) => void }) {
  const { progress } = useProgress();
  const now = new Date();
  const streak = currentStreak(progress, now);
  const day = today(progress, now);
  const goal = goalMs(progress);
  const minutes = Math.floor(day.ms / 60_000);
  const next = nextLessonId(progress);
  const [selected, setSelected] = useState<{ unit: UnitDef; lesson: LessonDef } | null>(null);
  const [starting, setStarting] = useState(false);

  const start = async (lessonId: string) => {
    unlockSound();
    setStarting(true);
    // Starting the mic needs this tap; if it fails the lesson becomes tap-only.
    let mic = true;
    try {
      await listener.start();
    } catch {
      mic = false;
    }
    go({ name: 'lesson', lessonId, mic, run: Date.now() });
  };

  return (
    <div className="home">
      <header className="topbar">
        <span className="pill pill-fire" title="Day streak">
          🔥 {streak}
        </span>
        <button className="pill pill-gem" title="Gems: open the shop" onClick={() => go({ name: 'shop' })}>
          💎 {progress.gems}
        </button>
        <span className="pill pill-xp" title="Total XP">
          ⚡ {progress.xp}
        </span>
        <span className="spacer" />
        <button className="btn btn-shop" onClick={() => go({ name: 'shop' })}>
          🛍️ Shop
        </button>
        <button className="btn btn-quiet" onClick={() => go({ name: 'parent' })}>
          ⚙︎ Grown-ups
        </button>
      </header>

      <section className="hero">
        <MyDragon mood={day.ms >= goal ? 'cheer' : 'happy'} size={130} title={progress.profile!.dragonName} />
        <div className="bubble">
          <strong>{progress.profile!.dragonName}:</strong> {greeting(progress.profile!.name, now.getHours(), streak)}
        </div>
        <div className="goal-card">
          <GoalRing fraction={day.ms / goal} label="Daily goal" />
          <div>
            <div className="goal-title">Daily goal</div>
            <div className="goal-sub">
              {minutes} of {progress.settings.dailyGoalMin} minutes
            </div>
            {progress.streak.freezes > 0 && <div className="goal-sub">🧊 {progress.streak.freezes} streak freeze{progress.streak.freezes > 1 ? 's' : ''}</div>}
          </div>
        </div>
      </section>

      <main className="path">
        {UNITS.map((unit, u) => (
          <section key={unit.id} className="unit">
            <div className="unit-banner" style={{ background: unit.color }}>
              <div className="unit-num">Unit {u + 1}</div>
              <h2>{unit.title}</h2>
              <p>{unit.comingSoon ? 'Coming soon' : unit.subtitle}</p>
            </div>
            <ol className="nodes">
              {unit.lessons.map((lesson, i) => {
                const record = progress.lessons[lesson.id];
                const unlocked = isUnlocked(progress, lesson.id);
                const current = lesson.id === next;
                const state = record?.completed ? 'done' : current ? 'current' : unlocked ? 'open' : 'locked';
                return (
                  <li key={lesson.id} style={{ transform: `translateX(${WIGGLE[i % WIGGLE.length]}px)` }}>
                    {current && <span className="start-tag">START</span>}
                    <button
                      className={`node node-${state} ${lesson.checkpoint ? 'node-check' : ''}`}
                      style={{ ['--unit' as string]: unit.color }}
                      disabled={!unlocked}
                      aria-label={`${lesson.title}${record?.completed ? ', completed' : unlocked ? '' : ', locked'}`}
                      onClick={() => setSelected({ unit, lesson })}
                    >
                      {lesson.checkpoint ? '🏆' : state === 'locked' ? '🔒' : record?.bestAccuracy === 1 ? '⭐' : record?.completed ? '✓' : '♪'}
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </main>

      {selected && (
        <div className="sheet-backdrop" onClick={() => setSelected(null)}>
          <div className="sheet" style={{ ['--unit' as string]: selected.unit.color }} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={selected.lesson.title}>
            <div className="sheet-unit">{selected.unit.title}</div>
            <h2>{selected.lesson.title}</h2>
            <p className="sheet-notes">
              {selected.lesson.newNotes.length
                ? `New notes: ${selected.lesson.newNotes.map(itemLetter).join(', ')}`
                : selected.lesson.checkpoint
                  ? 'Show what you know. Every note so far!'
                  : 'Practise the notes you know'}
            </p>
            <button className="btn btn-primary btn-big" disabled={starting} onClick={() => start(selected.lesson.id)}>
              {starting ? 'Getting ready…' : progress.lessons[selected.lesson.id]?.completed ? 'Practise again' : 'Start'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
