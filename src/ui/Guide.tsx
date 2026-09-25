// A mini-lesson: a few short cards that explain one idea, with the odd quick question or "now play
// it" along the way. Wrong answers here just explain and let him try again.
import { useEffect, useMemo, useRef, useState } from 'react';
import { MyDragon } from './MyDragon';
import { ModeBanner, type Mode } from './ModeBanner';
import { GrandStaff, Staff } from './Staff';
import { useProgress } from './store';
import { sfx } from './sound';
import { praise } from './lines';
import { GUIDES, type GuideCard, type Picture } from '../game/guides';
import { findLesson } from '../game/content';
import { finishLesson } from '../game/progress';
import { rollChest } from '../game/rewards';
import { midiName, parseNote, toMidi } from '../engine/music';
import { listener } from '../engine/listener';
import type { Screen } from './App';
import type { ResultsData } from './Results';

const HIGHLIGHT = '#7c5cff';
const DONE = '#2fbf71';
const IGNORE_BEFORE_MS = 150;
// XP for reading a guide: more the first time, when it also earns a chest.
const GUIDE_XP = { first: 10, again: 3 };
const MAX_CARD_MS = 30_000;

function PictureView({ picture, played = 0 }: { picture: Picture; played?: number }) {
  const colors = (n: number) =>
    Array.from({ length: n }, (_, i) => (i < played ? DONE : picture.highlight?.includes(i) ? HIGHLIGHT : undefined));
  if (picture.clef === 'grand') {
    const toNotes = (ns: (string | null)[]) => ns.map((n) => (n ? parseNote(n) : null));
    const n = Math.max(picture.treble.length, picture.bass.length);
    return <GrandStaff treble={toNotes(picture.treble)} bass={toNotes(picture.bass)} labels={picture.labels} colors={colors(n)} label="Grand staff" />;
  }
  return (
    <Staff
      clef={picture.clef}
      groups={picture.notes.map((n) => [parseNote(n)])}
      labels={picture.labels}
      colors={colors(picture.notes.length)}
      label={picture.notes.join(', ')}
    />
  );
}

const letterOf = (midi: number) => midiName(midi).replace(/-?\d+$/, '').replace('#', '♯');
const modeOf = (card: GuideCard): Mode => (card.kind === 'quiz' ? 'tap' : card.kind === 'play' ? 'play' : 'learn');

export function GuideScreen({ lessonId, mic, go }: { lessonId: string; mic: boolean; go: (s: Screen) => void }) {
  const { progress, update } = useProgress();
  const { unit, lesson } = findLesson(lessonId);
  const guide = GUIDES[lesson.guide!];
  const [index, setIndex] = useState(0);
  // For a quiz: the wrong options tapped so far, and whether it's been answered right.
  const [wrongTaps, setWrongTaps] = useState<string[]>([]);
  // For a play card: how many of its notes have been played, and the wrong notes heard.
  const [played, setPlayed] = useState(0);
  const [misses, setMisses] = useState(0);
  const [heard, setHeard] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const shownAt = useRef(performance.now());
  const activeMs = useRef(0);
  const handledOnset = useRef<number | null>(null);

  const card = guide.cards[index];
  const last = index === guide.cards.length - 1;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cheer = useMemo(() => praise(), [index, done]);

  const finish = () => {
    const first = !progress.lessons[lessonId]?.completed;
    const outcome = {
      lessonId,
      xp: first ? GUIDE_XP.first : GUIDE_XP.again,
      chest: first ? rollChest({ perfect: false, commonStreak: progress.commonChests }) : null,
      ms: activeMs.current,
      accuracy: 1,
      answers: [],
    };
    const result = finishLesson(progress, outcome, new Date());
    update(() => result.progress);
    sfx.complete();
    const data: ResultsData = {
      lessonTitle: guide.title,
      unitColor: unit.color,
      xp: outcome.xp,
      chest: outcome.chest,
      guide: true,
      accuracy: 1,
      fastestMs: null,
      bestCombo: 0,
      perfect: false,
      streakExtended: result.streakExtended,
      streakCount: result.progress.streak.count,
      goalReachedNow: result.goalReachedNow,
      freezeEarned: result.freezeEarned,
      freezesUsed: result.freezesUsed,
    };
    go({ name: 'results', data });
  };

  const next = () => {
    activeMs.current += Math.min(MAX_CARD_MS, performance.now() - shownAt.current);
    if (last) return finish();
    setIndex(index + 1);
    setWrongTaps([]);
    setPlayed(0);
    setMisses(0);
    setHeard(null);
    setDone(false);
    shownAt.current = performance.now();
  };

  // Play cards listen for their notes in order. A right note counts as soon as it's heard; a wrong
  // one only once it's clearly a piano note (so talking doesn't count), as in lessons.
  useEffect(() => {
    if (!mic || card.kind !== 'play' || done) return;
    return listener.onNote(
      (ev) => {
        if (ev.onsetT < shownAt.current + IGNORE_BEFORE_MS || ev.onsetT === handledOnset.current) return;
        const target = toMidi(parseNote(card.play[played]));
        if (ev.midi !== target && ev.stage !== 'sure') return;
        handledOnset.current = ev.onsetT;
        if (ev.midi === target) {
          setHeard(null);
          if (played + 1 >= card.play.length) {
            setPlayed(card.play.length);
            setDone(true);
            sfx.correct();
          } else setPlayed(played + 1);
        } else {
          setHeard(letterOf(ev.midi));
          setMisses((m) => m + 1);
        }
      },
      { sure: true },
    );
  }, [mic, card, played, done]);

  const quit = () => {
    if (window.confirm('Stop this lesson?')) go({ name: 'home' });
  };

  const answered = card.kind === 'quiz' ? done : card.kind === 'play' ? done : true;

  return (
    <div className="guide lesson" data-mode={modeOf(card)} style={{ ['--unit' as string]: unit.color }}>
      <header className="lesson-top">
        <button className="btn btn-quiet btn-icon" onClick={quit} aria-label="Quit lesson">
          ✕
        </button>
        <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((index / guide.cards.length) * 100)}>
          <div className="bar-fill" style={{ width: `${(index / guide.cards.length) * 100}%` }} />
        </div>
      </header>

      <main className="lesson-body guide-body">
        <ModeBanner mode={modeOf(card)} text={card.kind === 'read' ? guide.title : undefined} />

        <div className="guide-talk">
          <MyDragon mood={card.kind === 'quiz' && wrongTaps.length ? 'think' : done ? 'cheer' : 'happy'} size={88} />
          <p className="guide-text">{card.text}</p>
        </div>

        {card.picture && (
          <div
            className="staff-card guide-picture"
            data-expected={card.kind === 'play' && played < card.play.length ? toMidi(parseNote(card.play[played])) : undefined}
          >
            <PictureView picture={card.picture} played={card.kind === 'play' ? played : 0} />
          </div>
        )}

        {card.kind === 'quiz' && (
          <div className="answers answers-words">
            {card.options.map((o) => {
              const state = done && o === card.answer ? 'right' : wrongTaps.includes(o) ? 'wrong' : '';
              return (
                <button
                  key={o}
                  className={`btn btn-answer ${state}`}
                  disabled={done || wrongTaps.includes(o)}
                  onClick={() => {
                    if (o === card.answer) {
                      sfx.correct();
                      setDone(true);
                    } else {
                      sfx.wrong();
                      setWrongTaps([...wrongTaps, o]);
                    }
                  }}
                >
                  {o}
                </button>
              );
            })}
          </div>
        )}
        {card.kind === 'quiz' && wrongTaps.length > 0 && !done && (
          <p className="try-again" role="status">
            Not quite. {card.why} Try again!
          </p>
        )}

        {card.kind === 'play' && !done && (
          <div className="listen">
            {mic && (
              <div className="mic">
                <span className="mic-icon" aria-hidden="true">
                  🎤
                </span>
                <span>Listening…</span>
              </div>
            )}
            {heard && (
              <p className="try-again" role="status">
                That was {heard}. Try again!
              </p>
            )}
            {misses >= 2 && <p className="hint">Hint: it's {card.play[played].replace(/\d/, '')}</p>}
            <button className="btn btn-quiet" onClick={next}>
              {mic ? 'Skip' : 'Next'}
            </button>
          </div>
        )}

        {card.kind === 'read' && (
          <button className="btn btn-primary btn-big" onClick={next}>
            {last ? 'Finish' : 'Next'}
          </button>
        )}
      </main>

      {card.kind !== 'read' && answered && (
        <footer className="sheet-feedback good" role="status">
          <div>
            <div className="fb-title">{cheer}</div>
            {card.kind === 'quiz' && <div className="fb-sub">{card.why}</div>}
          </div>
          <button className="btn btn-good" onClick={next}>
            {last ? 'Finish' : 'Continue'}
          </button>
        </footer>
      )}
    </div>
  );
}
