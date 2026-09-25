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
import { setSoundEnabled } from './sound';
import { listener } from '../engine/listener';

export type Screen =
  | { name: 'home' }
  | { name: 'lesson'; lessonId: string; mic: boolean; run: number }
  | { name: 'results'; data: ResultsData }
  | { name: 'parent' }
  | { name: 'shop' };

export function App() {
  const { progress } = useProgress();
  const [screen, setScreen] = useState<Screen>({ name: 'home' });

  useEffect(() => setSoundEnabled(progress.settings.sound), [progress.settings.sound]);

  // The microphone is only on during a lesson (and the sound check / tuning, which switch it off
  // themselves). Leaving a lesson turns it off, which also clears the iPad's orange mic indicator.
  useEffect(() => {
    if (screen.name !== 'lesson') void listener.stop();
  }, [screen.name]);

  if (!progress.profile) return <Welcome />;
  switch (screen.name) {
    case 'home':
      return <Home go={setScreen} />;
    case 'lesson':
      if (screen.lessonId !== REVIEW_ID && findLesson(screen.lessonId).lesson.guide)
        return <GuideScreen key={screen.run} lessonId={screen.lessonId} mic={screen.mic} go={setScreen} />;
      return <LessonScreen key={screen.run} lessonId={screen.lessonId} mic={screen.mic} go={setScreen} />;
    case 'results':
      return <Results data={screen.data} go={setScreen} />;
    case 'parent':
      return <Parent go={setScreen} />;
    case 'shop':
      return <Shop go={setScreen} />;
  }
}
