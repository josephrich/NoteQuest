// A lesson: a run of challenges, judged from the microphone or from taps.
import { useEffect, useReducer, useRef, useState } from 'react';
import { Staff } from './Staff';
import { MyDragon } from './MyDragon';
import { ModeBanner } from './ModeBanner';
import { Keyboard } from './Keyboard';
import { PlayKeyboard } from './PlayKeyboard';
import { SpeakButton } from './SpeakButton';
import { PROMPTS } from '../voice/lines';
import { spell } from '../engine/music';
import { useProgress } from './store';
import { sfx } from './sound';
import { praise, lightning as lightningLine, encourage } from './lines';
import { hearChord } from './pianoSound';
import {
  INTERVAL_TIPS,
  chordLabel,
  chordName,
  chordTip,
  findLesson,
  intervalLabel,
  intervalWord,
  itemClef,
  itemLetter,
  itemMidi,
  itemNote,
  noteTip,
  triad,
  type ItemId,
} from '../game/content';
import { buildLesson, challengeAnswer, tapped as isTapChallenge, type Challenge, type ItemStat } from '../game/lesson';
import { REVIEW_COLOR, REVIEW_ID, REVIEW_TITLE, buildReview, learnedChords } from '../game/review';
import { HINT_AFTER, LessonRun, type Feedback } from '../game/run';
import { finishLesson } from '../game/progress';
import { listener } from '../engine/listener';
import type { Screen } from './App';
import type { ResultsData } from './Results';

const COLORS = { done: '#2fbf71', missed: '#ff8a3d', current: '#7c5cff' };
// Ignore sound that started before (or just as) a challenge appeared: it's the tail of the last note.
const IGNORE_BEFORE_MS = 150;

// A course lesson, or the Daily Review built fresh from the notes he knows. `chords`: in a chord
// lesson, every chord in it, so a wrong chord can be recognised as one of the others.
function lessonSetup(lessonId: string, stats: Record<string, ItemStat>, mic: boolean): { title: string; color: string; challenges: Challenge[]; chords: ItemId[] } {
  if (lessonId === REVIEW_ID) return { title: REVIEW_TITLE, color: REVIEW_COLOR, challenges: buildReview(stats, { mic }), chords: learnedChords(stats) };
  const { unit, lesson } = findLesson(lessonId);
  return { title: lesson.title, color: unit.color, challenges: buildLesson(lesson, stats, { mic }), chords: lesson.chords?.roots ?? [] };
}

const chordMidis = (root: ItemId) => triad(root).map(itemMidi);
const sameKeys = (a: number[], b: number[]) => a.length === b.length && a.every((m) => b.includes(m));

// `onScreen`: notes are played on the on-screen piano rather than heard through the microphone.
export function LessonScreen({ lessonId, mic, onScreen = false, go }: { lessonId: string; mic: boolean; onScreen?: boolean; go: (s: Screen) => void }) {
  const { progress, update } = useProgress();
  const [setup] = useState(() => lessonSetup(lessonId, progress.items, mic || onScreen));
  const [run] = useState(() => new LessonRun(lessonId, setup.challenges, performance.now(), Math.random, onScreen));
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const [message, setMessage] = useState<{ title: string; sub?: string } | null>(null);
  const [shake, setShake] = useState(0);
  const [tapped, setTapped] = useState<string | null>(null);
  // Keys pressed so far on the on-screen piano, when building a chord.
  const [picked, setPicked] = useState<number[]>([]);
  const shownAt = useRef(performance.now());
  // The attack time of the last note acted on, so its later 'sure' report isn't judged again.
  const handledOnset = useRef<number | null>(null);
  const levelRef = useRef<HTMLDivElement>(null);
  const advanceTimer = useRef<number | undefined>(undefined);

  const c = run.current;
  const tapToAnswer = c && isTapChallenge(c);
  const listening = mic && run.phase === 'asking' && c && !tapToAnswer;

  const finish = () => {
    const outcome = run.outcome(progress.commonChests);
    const result = finishLesson(progress, outcome, new Date());
    update(() => result.progress);
    sfx.complete();
    const data: ResultsData = {
      lessonTitle: setup.title,
      unitColor: setup.color,
      xp: result.xp,
      rollCount: result.rollCount,
      rollBonus: result.rollBonus,
      improvements: result.improvements,
      chest: outcome.chest,
      onScreen,
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
    setPicked([]);
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
      const met = c.chord ? chordLabel(c.items[0], c.full) : c.interval ? intervalWord(c.interval) : itemLetter(c.items[0]);
      setMessage({ title: c.kind === 'meet' ? `That's ${met}!` : fb.lightning ? `⚡ ${lightningLine()}` : praise(), sub: parts.join(' · ') });
      advanceTimer.current = window.setTimeout(advance, 1100);
    } else if (!fb.correct) {
      if (c.kind === 'name' || c.kind === 'interval') sfx.wrong();
      setShake((n) => n + 1);
    }
    rerender();
  };

  useEffect(() => {
    if (!listening || c.chord) return;
    return listener.onNote(
      (ev) => {
        if (ev.onsetT < shownAt.current + IGNORE_BEFORE_MS || ev.onsetT === handledOnset.current) return;
        // A right note counts straight away. A wrong one is only shown once it has held steady like a
        // piano note, so talking near the iPad doesn't get marked as a mistake.
        if (ev.midi !== itemMidi(run.expected) && ev.stage !== 'sure') return;
        handledOnset.current = ev.onsetT;
        react(run.play(ev.midi, ev.onsetT));
      },
      { sure: true },
    );
  });

  // Chords: listen for the chord being asked for. Another chord from the lesson, or the chord with one
  // wrong note, is marked wrong; anything else (a missing note, talking) is ignored.
  useEffect(() => {
    if (!listening || !c.chord) return;
    const root = run.expected;
    const others = setup.chords.filter((r) => r !== root && itemClef(r) === itemClef(root));
    return listener.listenForChord(
      chordMidis(root),
      (ev) => {
        if (ev.onsetT < shownAt.current + IGNORE_BEFORE_MS) return;
        if (ev.pass) return react(run.playChord({ correct: true }, ev.onsetT));
        if (ev.matched === null && !ev.close && !ev.inverted) return;
        react(
          run.playChord(
            { correct: false, heard: ev.matched !== null ? chordLabel(others[ev.matched], c.full) : undefined, close: ev.close, inverted: ev.inverted },
            ev.onsetT,
          ),
        );
      },
      others.map(chordMidis),
    );
    // Only re-arm when the chord being asked for changes, so a ringing chord isn't judged twice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening, run.index, run.step]);

  // On the on-screen piano a chord is built key by key; once three are down it's judged.
  const pressChord = (midi: number) => {
    const keys = picked.includes(midi) ? picked.filter((m) => m !== midi) : [...picked, midi];
    setPicked(keys);
    if (keys.length < 3) return;
    const target = chordMidis(run.expected);
    const correct = sameKeys(keys, target);
    const other = correct ? undefined : setup.chords.find((r) => sameKeys(chordMidis(r), keys));
    const letters = (ms: number[]) => ms.map((m) => m % 12).sort((x, y) => x - y).join();
    const inverted = !correct && letters(keys) === letters(target) && Math.min(...keys) % 12 !== Math.min(...target) % 12;
    const close = !correct && !other && !inverted && target.filter((m) => keys.includes(m)).length === 2;
    window.setTimeout(() => setPicked([]), 450);
    react(run.playChord({ correct, heard: other ? chordLabel(other, c.full) : undefined, close, inverted }, performance.now()));
  };

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
  const mode = tapToAnswer ? 'tap' : c.kind === 'meet' ? 'learn' : onScreen ? 'screen' : 'play';
  const stepwise = c.items.length > 1 && !tapToAnswer;
  const colors = stepwise ? c.items.map((_, i) => (i < run.step ? (run.stepResults[i] ? COLORS.done : COLORS.missed) : i === run.step ? COLORS.current : undefined)) : undefined;
  const prompt = c.chord
    ? c.kind === 'meet'
      ? PROMPTS.meetChord
      : c.kind === 'name'
        ? PROMPTS.chordName
        : c.kind === 'burst'
          ? PROMPTS.chordRun
          : PROMPTS.chord
    : c.kind === 'meet'
      ? c.interval
        ? PROMPTS.meetJump
        : PROMPTS.meetNote
      : c.kind === 'name'
        ? PROMPTS.name
        : c.kind === 'interval'
          ? PROMPTS.interval
          : c.startHint
            ? PROMPTS.pair
            : c.kind === 'burst'
              ? PROMPTS.burst
              : PROMPTS.play;
  const wrong = run.feedback && !run.feedback.correct ? run.feedback : null;
  const tip = c.kind === 'meet' ? (c.chord ? chordTip(c.items[0]) : c.interval ? INTERVAL_TIPS[c.interval] : noteTip(c.items[0])) : '';
  // The note to play right now (for hints), and the full answer for tap challenges and reveals.
  const answer = itemLetter(expected);
  const fullAnswer = tapToAnswer ? challengeAnswer(c) : answer;
  // The answer in words: "C", "a skip", "the C chord" or "A minor".
  const sayAnswer = c.chord ? chordLabel(expected, c.full) : c.kind === 'interval' ? intervalWord(c.interval!) : fullAnswer;
  const [n1, n2, n3] = triad(expected).map(itemLetter);
  const hint = c.chord ? `${n1}, ${n2} and ${n3}` : `it's ${answer}`;
  const target = c.chord ? chordMidis(expected) : [];

  return (
    <div className="lesson" data-mode={mode} style={{ ['--unit' as string]: setup.color }}>
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
        <ModeBanner mode={mode} text={mode === 'learn' ? (c.chord ? 'New chord' : c.interval ? 'New jump' : 'New note') : undefined} />
        {/* Read out when the question changes (not every repeat of "Play this note"); new-note cards read their tip instead. */}
        <h1 className="prompt">
          {prompt} <SpeakButton text={prompt} auto={progress.settings.readAloud && c.kind !== 'meet'} />
        </h1>

        <div
          key={shake}
          className={`staff-card ${wrong && run.phase === 'asking' ? 'shake' : ''}`}
          data-expected={c.chord ? undefined : itemMidi(expected)}
          data-chord={c.chord ? target.join(',') : undefined}
        >
          <Staff
            clef={clef}
            groups={c.items.map((id) => (c.chord ? triad(id) : [id]).map(itemNote))}
            colors={colors}
            label={c.items.length > 1 ? `${c.items.length} ${c.chord ? 'chords' : 'notes'}` : c.chord ? `${chordName(expected)} chord` : `${answer}`}
          />
          {c.kind === 'meet' && <div className="meet-name">{c.chord ? `${chordName(expected, c.full)} chord` : c.interval ? intervalLabel(c.interval) : answer}</div>}
          {c.kind === 'meet' && <Keyboard notes={(c.chord ? triad(expected) : c.items).map((id) => spell(itemNote(id)))} />}
          {c.kind === 'meet' && c.chord && (
            <button className="btn btn-quiet hear-it" onClick={() => hearChord(target)}>
              🔊 Hear it
            </button>
          )}
        </div>

        {c.kind === 'meet' && (
          <div className="meet">
            <MyDragon mood="think" size={72} />
            <p>{tip}</p>
            <SpeakButton text={tip} auto={progress.settings.readAloud} />
          </div>
        )}

        {tapToAnswer && (
          <div className={`answers ${c.kind === 'interval' || c.full ? 'answers-words' : ''}`}>
            {c.options!.map((o) => {
              const state =
                run.phase === 'wrong' ? (o === fullAnswer ? 'right' : o === tapped ? 'wrong' : '') : run.phase === 'correct' && o === fullAnswer ? 'right' : '';
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

        {!tapToAnswer && run.phase === 'asking' && (
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
                <span>{c.kind === 'meet' ? (c.items.length > 1 ? 'Play them on your piano' : 'Play it on your piano') : 'Listening…'}</span>
              </div>
            ) : null}
            {wrong && (
              <p className="try-again" role="status">
                {wrong.octaveSlip
                  ? 'Right letter, wrong octave! Look where it sits.'
                  : wrong.inverted
                    ? `Right notes, wrong order! ${n1} goes at the bottom.`
                    : wrong.close
                      ? 'Close! One note is off. Check all three.'
                      : wrong.heard
                        ? `That was ${wrong.heard}. ${c.chord ? 'Look at the bottom note.' : encourage()}`
                        : `Not quite. ${encourage()}`}
              </p>
            )}
            {c.startHint && !wrong && (
              <p className="start-hint">
                It starts on <strong>{itemLetter(c.items[0])}</strong>. Then read the jump!
              </p>
            )}
            {c.kind !== 'meet' && run.tries >= HINT_AFTER && <p className="hint">Hint: {hint}</p>}
            {c.chord && onScreen && !wrong && <p className="start-hint">Tap all three keys.</p>}
            {c.kind === 'meet' && (
              <button className="btn btn-secondary" onClick={() => react(run.tap(null, performance.now()))}>
                Got it
              </button>
            )}
          </div>
        )}

        {!tapToAnswer && onScreen && (
          <PlayKeyboard
            clef={clef}
            disabled={run.phase !== 'asking'}
            picked={c.chord ? picked : undefined}
            onPress={(midi) => (c.chord ? pressChord(midi) : react(run.play(midi, performance.now())))}
          />
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
            <div className="fb-title">{run.phase === 'wrong' ? `Not quite, it's ${sayAnswer}` : `It's ${sayAnswer}!`}</div>
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
