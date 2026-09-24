// A lesson: a run of challenges, judged from the microphone or from taps.
import { useEffect, useReducer, useRef, useState } from 'react';
import { Staff } from './Staff';
import { Dragon } from './Dragon';
import { useProgress } from './store';
import { sfx } from './sound';
import { praise, lightning as lightningLine, encourage } from './lines';
import { findLesson, itemClef, itemLetter, itemMidi, itemNote, noteTip } from '../game/content';
import { buildLesson } from '../game/lesson';
import { LessonRun, type Feedback } from '../game/run';
import { finishLesson } from '../game/progress';
import { listener } from '../engine/listener';
import type { Screen } from './App';
import type { ResultsData } from './Results';

const COLORS = { done: '#2fbf71', missed: '#ff8a3d', current: '#7c5cff' };
// Ignore sound that started before (or just as) a challenge appeared: it's the tail of the last note.
const IGNORE_BEFORE_MS = 150;

export function LessonScreen({ lessonId, mic, go }: { lessonId: string; mic: boolean; go: (s: Screen) => void }) {
  const { progress, update } = useProgress();
  const { unit, lesson } = findLesson(lessonId);
  const [run] = useState(() => new LessonRun(lessonId, buildLesson(lesson, progress.items, { mic }), performance.now()));
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const [message, setMessage] = useState<{ title: string; sub?: string } | null>(null);
  const [shake, setShake] = useState(0);
  const [tapped, setTapped] = useState<string | null>(null);
  const shownAt = useRef(performance.now());
  const levelRef = useRef<HTMLDivElement>(null);
  const advanceTimer = useRef<number | undefined>(undefined);

  const c = run.current;
  const listening = mic && run.phase === 'asking' && c && c.kind !== 'name';

  const finish = () => {
    const outcome = run.outcome(progress.commonChests);
    const result = finishLesson(progress, outcome, new Date());
    update(() => result.progress);
    sfx.complete();
    const data: ResultsData = {
      lessonTitle: lesson.title,
      unitColor: unit.color,
      xp: outcome.xp,
      chest: outcome.chest,
      accuracy: outcome.accuracy,
      fastestMs: run.fastestMs,
      bestCombo: outcome.bestCombo,
      perfect: outcome.perfect,
      streakExtended: result.streakExtended,
      streakCount: result.progress.streak.count,
      goalReachedNow: result.goalReachedNow,
      freezeEarned: result.freezeEarned,
      freezesUsed: result.freezesUsed,
    };
    go({ name: 'results', data });
  };

  const advance = () => {
    window.clearTimeout(advanceTimer.current);
    setMessage(null);
    setTapped(null);
    const more = run.next(performance.now());
    shownAt.current = performance.now();
    if (!more) finish();
    else rerender();
  };

  const react = (fb: Feedback | null) => {
    if (!fb) return;
    if (fb.correct && run.phase === 'correct') {
      if (fb.lightning) sfx.lightning();
      else sfx.correct();
      const parts = [];
      if (fb.xp) parts.push(`+${fb.xp} XP`);
      if (fb.comboBonus) parts.push(`🔥 ${run.combo} in a row!`);
      setMessage({ title: c.kind === 'meet' ? `That's ${itemLetter(c.items[0])}!` : fb.lightning ? `⚡ ${lightningLine()}` : praise(), sub: parts.join(' · ') });
      advanceTimer.current = window.setTimeout(advance, 1100);
    } else if (!fb.correct) {
      if (c.kind === 'name') sfx.wrong();
      setShake((n) => n + 1);
    }
    rerender();
  };

  useEffect(() => {
    if (!listening) return;
    return listener.onNote((ev) => {
      if (ev.onsetT < shownAt.current + IGNORE_BEFORE_MS) return;
      react(run.play(ev.midi, ev.onsetT));
    });
  });

  useEffect(() => {
    if (!mic) return;
    return listener.onLevel(({ rms, gate }) => {
      const v = Math.min(1, Math.sqrt(Math.max(0, rms - gate / 2)) * 3);
      levelRef.current?.style.setProperty('--level', v.toFixed(2));
    });
  }, [mic]);

  useEffect(() => () => window.clearTimeout(advanceTimer.current), []);

  const quit = () => {
    if (window.confirm('Stop this lesson? You will lose the progress from this lesson.')) go({ name: 'home' });
  };

  if (!c) return null;
  const expected = run.expected;
  const clef = itemClef(c.items[0]);
  const colors = c.kind === 'burst' ? c.items.map((_, i) => (i < run.step ? (run.stepResults[i] ? COLORS.done : COLORS.missed) : i === run.step ? COLORS.current : undefined)) : undefined;
  const prompt =
    c.kind === 'meet' ? 'New note!' : c.kind === 'name' ? 'What note is this?' : c.kind === 'burst' ? 'Play these notes in order' : 'Play this note';
  const wrong = run.feedback && !run.feedback.correct ? run.feedback : null;
  const answer = itemLetter(expected);

  return (
    <div className="lesson" style={{ ['--unit' as string]: unit.color }}>
      <header className="lesson-top">
        <button className="btn btn-quiet btn-icon" onClick={quit} aria-label="Quit lesson">
          ✕
        </button>
        <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(run.progress * 100)}>
          <div className="bar-fill" style={{ width: `${run.progress * 100}%` }} />
        </div>
        <div className={`combo ${run.combo >= 2 ? 'combo-on' : ''}`} aria-live="polite">
          {run.combo >= 2 ? `🔥 ${run.combo}` : ''}
        </div>
      </header>

      <main className="lesson-body">
        <h1 className="prompt">{prompt}</h1>

        <div key={shake} className={`staff-card ${wrong && run.phase === 'asking' ? 'shake' : ''}`} data-expected={itemMidi(expected)}>
          <Staff clef={clef} groups={c.items.map((id) => [itemNote(id)])} colors={colors} label={c.kind === 'burst' ? 'Three notes' : `${answer}`} />
          {c.kind === 'meet' && <div className="meet-name">{answer}</div>}
        </div>

        {c.kind === 'meet' && (
          <div className="meet">
            <Dragon mood="think" size={72} />
            <p>{noteTip(c.items[0])}</p>
          </div>
        )}

        {c.kind === 'name' && (
          <div className="answers">
            {c.options!.map((o) => {
              const state = run.phase === 'wrong' ? (o === answer ? 'right' : o === tapped ? 'wrong' : '') : run.phase === 'correct' && o === answer ? 'right' : '';
              return (
                <button
                  key={o}
                  className={`btn btn-answer ${state}`}
                  disabled={run.phase !== 'asking'}
                  onClick={() => {
                    setTapped(o);
                    react(run.tap(o, performance.now()));
                  }}
                >
                  {o}
                </button>
              );
            })}
          </div>
        )}

        {c.kind !== 'name' && run.phase === 'asking' && (
          <div className="listen">
            {mic ? (
              <div className="mic" ref={levelRef}>
                <span className="mic-icon" aria-hidden="true">
                  🎤
                </span>
                <span className="mic-bars" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                <span>{c.kind === 'meet' ? 'Play it on your piano' : 'Listening…'}</span>
              </div>
            ) : null}
            {wrong && (
              <p className="try-again" role="status">
                {wrong.octaveSlip ? 'Right letter, wrong octave! Look where it sits.' : `That was ${wrong.heard}. ${encourage()}`}
              </p>
            )}
            {c.kind !== 'meet' && run.tries >= 2 && <p className="hint">Hint: it's {answer}</p>}
            {c.kind === 'meet' && (
              <button className="btn btn-secondary" onClick={() => react(run.tap(null, performance.now()))}>
                Got it
              </button>
            )}
          </div>
        )}
      </main>

      {message && (
        <footer className="sheet-feedback good" role="status">
          <div>
            <div className="fb-title">{message.title}</div>
            {message.sub && <div className="fb-sub">{message.sub}</div>}
          </div>
          <button className="btn btn-good" onClick={advance}>
            Continue
          </button>
        </footer>
      )}
      {(run.phase === 'wrong' || run.phase === 'reveal') && (
        <footer className="sheet-feedback bad" role="status">
          <div>
            <div className="fb-title">{run.phase === 'wrong' ? `Not quite, it's ${answer}` : `It's ${answer}!`}</div>
            <div className="fb-sub">{run.phase === 'wrong' ? "We'll try that one again later." : 'Look for it next time.'}</div>
          </div>
          <button className="btn btn-bad" onClick={advance}>
            Continue
          </button>
        </footer>
      )}
    </div>
  );
}
