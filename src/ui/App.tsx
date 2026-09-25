import { useEffect, useState } from 'react';
import { useProgress } from './store';
import { Welcome } from './Welcome';
import { Home } from './Home';
import { LessonScreen } from './Lesson';
import { GuideScreen } from './Guide';
import { REVIEW_ID, findLesson } from '../game/content';
import { Results, type ResultsData } from './Results';
import { Parent } from './Parent';
import { Shop } from './Shop';
import { Players } from './Players';
import { readyPlayers } from '../game/players';
import { setSoundEnabled } from './sound';
import { listener } from '../engine/listener';

export type Screen =
  | { name: 'home' }
  // `screen`: played on the on-screen piano instead of a real one (heard through `mic`).
  | { name: 'lesson'; lessonId: string; mic: boolean; screen: boolean; run: number }
  | { name: 'results'; data: ResultsData }
  | { name: 'parent' }
  | { name: 'shop' }
  | { name: 'players' };

export function App() {
  const { progress, household, switchTo } = useProgress();
  // With more than one player, start by asking who's playing.
  const [screen, setScreen] = useState<Screen>(() => (readyPlayers(household).length > 1 ? { name: 'players' } : { name: 'home' }));
  const others = readyPlayers(household).filter((p) => p.id !== household.active);

  useEffect(() => setSoundEnabled(progress.settings.sound), [progress.settings.sound]);

  // The microphone is only on during a lesson (and the sound check / tuning, which switch it off
  // themselves). Leaving a lesson turns it off, which also clears the iPad's orange mic indicator.
  useEffect(() => {
    if (screen.name !== 'lesson') void listener.stop();
  }, [screen.name]);

  if (!progress.profile)
    return (
      <Welcome
        onDone={() => setScreen({ name: 'home' })}
        // Adding a player can be cancelled, back to the players who already exist.
        onCancel={
          others.length
            ? () => {
                switchTo(others[0].id);
                setScreen({ name: 'players' });
              }
            : undefined
        }
      />
    );
  switch (screen.name) {
    case 'home':
      return <Home go={setScreen} />;
    case 'lesson':
      if (screen.lessonId !== REVIEW_ID && findLesson(screen.lessonId).lesson.guide)
        return <GuideScreen key={screen.run} lessonId={screen.lessonId} mic={screen.mic} onScreen={screen.screen} go={setScreen} />;
      return <LessonScreen key={screen.run} lessonId={screen.lessonId} mic={screen.mic} onScreen={screen.screen} go={setScreen} />;
    case 'results':
      return <Results data={screen.data} go={setScreen} />;
    case 'parent':
      return <Parent go={setScreen} />;
    case 'shop':
      return <Shop go={setScreen} />;
    case 'players':
      return <Players go={setScreen} />;
  }
}
