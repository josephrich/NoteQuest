// App-wide progress state, persisted to this device.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { currentStreak, goalMs, loadProgress, saveProgress, today, type Progress } from '../game/progress';
import { updateReminder } from '../platform/reminders';
import { listener } from '../engine/listener';

interface Store {
  progress: Progress;
  update: (fn: (p: Progress) => Progress) => void;
}

const Ctx = createContext<Store | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState(loadProgress);
  const update = useCallback((fn: (p: Progress) => Progress) => setProgress((p) => fn(p)), []);

  useEffect(() => {
    saveProgress(progress);
    listener.setRefA4(progress.settings.refA4);
    const now = new Date();
    void updateReminder({
      enabled: progress.settings.reminders,
      at: progress.settings.reminderAt,
      goalDoneToday: today(progress, now).ms >= goalMs(progress),
      dragonName: progress.profile?.dragonName ?? 'Your dragon',
      streak: currentStreak(progress, now),
    });
  }, [progress]);

  return <Ctx.Provider value={{ progress, update }}>{children}</Ctx.Provider>;
}

export function useProgress(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error('useProgress outside ProgressProvider');
  return store;
}
